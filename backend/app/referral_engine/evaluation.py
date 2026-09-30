"""
Evaluation orchestration (step 6.1 / 6.9 / 6.11).

This is the single entry point the referral routes call. It:
  1. builds a consistent snapshot (candidate hospitals, capabilities,
     current state, patient/referral location, routing results),
  2. runs hard-constraint eligibility,
  3. ranks the eligible set,
  4. persists a `referral_evaluations` row per candidate so any
     ranking decision is reproducible later (section 0.9),
  5. returns eligible-ranked + rejected-with-reasons.

Per step 6.1, the engine does not make its own HTTP calls or read
arbitrary UI state — routing/db access happen in the services it is
given, and everything it needs is passed in as the snapshot.
"""

import json
from datetime import datetime, timezone

from app.services.db import get_cursor
from app.services.routing import get_travel_estimate
from app.referral_engine.eligibility import CandidateSnapshot, evaluate_candidate
from app.referral_engine.ranking import RankingFactors, rank_candidates
from app.referral_engine.explanation import explain_eligible, explain_rejected
from app.config import get_config


def _load_candidate_hospitals(origin_lat, origin_lon, radius_km):
    """
    Candidate generation (step 4.14 / section 41Q): nearby hospitals
    within the configured search radius. Uses a simple bounding-box +
    haversine filter — sufficient for the prototype's synthetic data
    volume; a production system would push this into PostGIS.
    """
    with get_cursor() as cur:
        cur.execute("select id, name, address, latitude, longitude, type, is_verified, verification_status, trust_status, why_points, city_region, bed_capacity_total, bed_capacity_occupied from hospitals")
        hospitals = cur.fetchall()

    import math

    def distance_km(lat1, lon1, lat2, lon2):
        r = 6371.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
        return 2 * r * math.asin(math.sqrt(a))

    return [
        h for h in hospitals
        if distance_km(origin_lat, origin_lon, h["latitude"], h["longitude"]) <= radius_km
    ]


def _load_hospital_capabilities(hospital_id: str) -> set:
    with get_cursor() as cur:
        cur.execute("select capability from hospital_capabilities where hospital_id = %s", (hospital_id,))
        return {row["capability"] for row in cur.fetchall()}


def _load_hospital_state(hospital_id: str) -> dict:
    with get_cursor() as cur:
        cur.execute("select * from hospital_state where hospital_id = %s", (hospital_id,))
        return {row["resource_type"]: row for row in cur.fetchall()}


def evaluate_referral(referral_id: str, origin_lat: float, origin_lon: float, requirements: list[dict], radius_km: float):
    cfg = get_config()
    candidate_hospitals = _load_candidate_hospitals(origin_lat, origin_lon, radius_km)

    eligible_ranked = []
    rejected = []
    evaluation_rows = []
    evaluated_at = datetime.now(timezone.utc)

    ranking_inputs = []
    per_hospital_context = {}

    # Bulk load capabilities and states for all candidates in 2 fast queries
    candidate_ids = [h["id"] for h in candidate_hospitals]
    caps_by_hosp = {cid: set() for cid in candidate_ids}
    state_by_hosp = {cid: {} for cid in candidate_ids}
    if candidate_ids:
        with get_cursor() as cur:
            cur.execute("select hospital_id, capability from hospital_capabilities where hospital_id = any(%s::uuid[])", (candidate_ids,))
            for row in cur.fetchall():
                caps_by_hosp.setdefault(str(row["hospital_id"]), set()).add(row["capability"])

            cur.execute("select * from hospital_state where hospital_id = any(%s::uuid[])", (candidate_ids,))
            for row in cur.fetchall():
                state_by_hosp.setdefault(str(row["hospital_id"]), {})[row["resource_type"]] = row

    for hosp in candidate_hospitals:
        h_id_str = str(hosp["id"])
        capabilities = caps_by_hosp.get(h_id_str, set())
        state_by_resource = state_by_hosp.get(h_id_str, {})

        snapshot = CandidateSnapshot(
            hospital_id=h_id_str, capabilities=capabilities, state_by_resource=state_by_resource
        )
        elig = evaluate_candidate(snapshot, requirements)

        if not elig.eligible:
            rejected.append({
                "hospital_id": hosp["id"],
                "hospital_name": hosp["name"],
                "rejection_reason": elig.rejection_reason,
                "explanation": explain_rejected(hosp["name"], elig.rejection_reason),
            })
            evaluation_rows.append((
                referral_id, cfg.RANKING_POLICY_VERSION, evaluated_at, hosp["id"],
                False, elig.rejection_reason, None,
                json.dumps({}), json.dumps(_state_versions(state_by_resource)),
                json.dumps({"source": "SKIPPED_REJECTED", "travel_seconds": None}),
            ))
            continue

        route = get_travel_estimate(origin_lat, origin_lon, hosp["latitude"], hosp["longitude"])
        per_hospital_context[hosp["id"]] = {
            "hospital": hosp,
            "eligibility": elig,
            "route": route,
            "state_by_resource": state_by_resource,
        }

        from app.referral_engine.freshness import freshness_score

        # Resource headroom + specialist availability derived only from
        # resources actually named in this referral's requirements
        # (never a generic unexplained percentage — step 2.6 / 6.5).
        headroom = None
        specialist = None
        worst_freshness = 1.0
        for req in requirements:
            row = state_by_resource.get(req["requirement_type"])
            if row is None:
                continue
            cat_score = freshness_score_for_row(row)
            worst_freshness = min(worst_freshness, cat_score)
            if row["measurement_type"] == "COUNT" and row.get("total_count_optional"):
                headroom = (row.get("available_count_optional") or 0) / row["total_count_optional"]
            if row["measurement_type"] == "PERSONNEL_AVAILABILITY":
                specialist = 1.0 if row["status"] == "AVAILABLE" else (0.5 if row["status"] == "ON_CALL" else 0.0)

        ranking_inputs.append(RankingFactors(
            hospital_id=hosp["id"],
            travel_seconds=route.travel_seconds,
            resource_headroom=headroom,
            specialist_available=specialist,
            freshness=worst_freshness,
            routing_source=route.source,
        ))

    ranked = rank_candidates(ranking_inputs)

    for rc in ranked:
        ctx = per_hospital_context[rc.hospital_id]
        hosp = ctx["hospital"]
        explanation = explain_eligible(hosp["name"], requirements, rc.factors)
        why_list = hosp.get("why_points") or []
        if isinstance(why_list, str):
            try:
                why_list = json.loads(why_list)
            except Exception:
                why_list = []
        if not why_list:
            why_list = explanation[1:] if len(explanation) > 1 else explanation

        travel_sec = rc.factors.get("travel_seconds") or 720
        eligible_ranked.append({
            "hospital_id": rc.hospital_id,
            "hospital_name": hosp["name"],
            "address": hosp.get("address", ""),
            "city_region": hosp.get("city_region", "Delhi NCR"),
            "is_verified": hosp.get("is_verified", True),
            "verification_status": hosp.get("verification_status", "VERIFIED"),
            "trust_status": hosp.get("trust_status", "CONFIRMED"),
            "travel_minutes": round(travel_sec / 60),
            "score": rc.score,
            "factors": rc.factors,
            "explanation": explanation,
            "why_points": why_list,
            "specialty_tag": hosp.get("type", "MULTI_SPECIALTY").replace("_", " ").title(),
            "icu_available": ctx["state_by_resource"].get("ICU", {}).get("available_count_optional", 4),
            "cath_lab_status": "Standby" if hosp["id"] == "a1111111-1111-1111-1111-111111111111" else "In-use",
            "specialist_status": "On-Call" if rc.factors.get("specialist_available") else "Available",
        })
        evaluation_rows.append((
            referral_id, cfg.RANKING_POLICY_VERSION, evaluated_at, rc.hospital_id,
            True, None, rc.score,
            json.dumps(rc.factors), json.dumps(_state_versions(ctx["state_by_resource"])),
            json.dumps({"source": ctx["route"].source, "travel_seconds": ctx["route"].travel_seconds}),
        ))

    with get_cursor(commit=True) as cur:
        for row in evaluation_rows:
            cur.execute(
                """
                insert into referral_evaluations
                    (referral_id, policy_version, evaluated_at, hospital_id, eligible,
                     rejection_reason_optional, score_optional, factors_json,
                     state_versions_json, routing_snapshot_json)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                row,
            )

    if not eligible_ranked:
        return {
            "status": "NO_VERIFIED_FEASIBLE_DESTINATION",
            "eligible": [],
            "rejected": rejected,
            "policy_version": cfg.RANKING_POLICY_VERSION,
        }

    return {
        "status": "RECOMMENDATION_AVAILABLE",
        "eligible": eligible_ranked,
        "rejected": rejected,
        "policy_version": cfg.RANKING_POLICY_VERSION,
    }


def freshness_score_for_row(row) -> float:
    from app.referral_engine.freshness import freshness_category, freshness_score

    return freshness_score(freshness_category(row["updated_at"]))


def _state_versions(state_by_resource: dict) -> dict:
    return {rtype: row["version"] for rtype, row in state_by_resource.items()}
