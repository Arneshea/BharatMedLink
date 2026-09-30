"""
GET /journeys/<id>

Not in the original section 32 API list by name, but needed by every
tracking/dashboard screen to read the parent workflow record (step
4.9). Read-only; all journey status transitions happen as side
effects of the Stage-1/Stage-2/transfer routes, never written here.
"""

from flask import Blueprint, jsonify

from app.services.db import get_cursor, record_audit_event
from app.utils.state_machines import assert_journey_transition

bp = Blueprint("journeys", __name__)


@bp.get("/journeys/<journey_id>")
def get_journey(journey_id):
    with get_cursor() as cur:
        cur.execute("select * from journeys where journey_id = %s", (journey_id,))
        journey = cur.fetchone()
        if journey is None:
            return jsonify({"error": "NOT_FOUND"}), 404

        stage1_hosp_id = journey.get("stage1_hospital_id")
        if not stage1_hosp_id and journey.get("stage1_request_id"):
            cur.execute("select selected_hospital_id_optional from patient_requests where id = %s", (journey["stage1_request_id"],))
            pr_row = cur.fetchone()
            if pr_row and pr_row["selected_hospital_id_optional"]:
                stage1_hosp_id = pr_row["selected_hospital_id_optional"]
            else:
                cur.execute("select hospital_id from patient_request_responses where request_id = %s and status = 'ACCEPTED' order by responded_at desc limit 1", (journey["stage1_request_id"],))
                acc_row = cur.fetchone()
                if acc_row:
                    stage1_hosp_id = acc_row["hospital_id"]

        stage2_hosp_id = journey.get("stage2_hospital_id")
        if not stage2_hosp_id and journey.get("referral_id"):
            cur.execute("select accepted_by_hospital_id_optional from referrals where id = %s", (journey["referral_id"],))
            ref_row = cur.fetchone()
            if ref_row and ref_row["accepted_by_hospital_id_optional"]:
                stage2_hosp_id = ref_row["accepted_by_hospital_id_optional"]
            else:
                cur.execute("select hospital_id from referral_responses where referral_id = %s and status = 'ACCEPTED' order by responded_at desc limit 1", (journey["referral_id"],))
                ref_acc = cur.fetchone()
                if ref_acc:
                    stage2_hosp_id = ref_acc["hospital_id"]

        cur.execute("select id, name, latitude, longitude, address from hospitals where id = %s", (stage1_hosp_id,)) if stage1_hosp_id else None
        stage1_hospital = cur.fetchone() if stage1_hosp_id else None

        cur.execute("select id, name, latitude, longitude, address from hospitals where id = %s", (stage2_hosp_id,)) if stage2_hosp_id else None
        stage2_hospital = cur.fetchone() if stage2_hosp_id else None

        patient_loc = None
        if journey.get("stage1_request_id"):
            cur.execute("select location_lat, location_lon from patient_requests where id = %s", (journey["stage1_request_id"],))
            pr = cur.fetchone()
            if pr and pr["location_lat"] is not None and pr["location_lon"] is not None:
                patient_loc = {"latitude": float(pr["location_lat"]), "longitude": float(pr["location_lon"])}
        if not patient_loc and journey.get("referral_id"):
            cur.execute("select origin_lat, origin_lon from referrals where id = %s", (journey["referral_id"],))
            ref_pr = cur.fetchone()
            if ref_pr and ref_pr["origin_lat"] is not None and ref_pr["origin_lon"] is not None:
                patient_loc = {"latitude": float(ref_pr["origin_lat"]), "longitude": float(ref_pr["origin_lon"])}
        if not patient_loc and journey.get("patient_id"):
            cur.execute("select location_lat, location_lon from patient_requests where patient_id = %s order by created_at desc limit 1", (journey["patient_id"],))
            pr = cur.fetchone()
            if pr and pr["location_lat"] is not None and pr["location_lon"] is not None:
                patient_loc = {"latitude": float(pr["location_lat"]), "longitude": float(pr["location_lon"])}

        transfer = None
        if journey["referral_id"]:
            cur.execute("select * from transfers where journey_id = %s order by created_at desc limit 1", (journey_id,))
            transfer = cur.fetchone()

    result = dict(journey)
    result["created_at"] = result["created_at"].isoformat()
    result["updated_at"] = result["updated_at"].isoformat()
    result["stage1_hospital"] = dict(stage1_hospital) if stage1_hospital else None
    result["stage2_hospital"] = dict(stage2_hospital) if stage2_hospital else None
    result["patient_location"] = patient_loc
    if transfer:
        t = dict(transfer)
        for f in ("started_at", "en_route_at", "received_at", "handoff_completed_at", "created_at", "updated_at"):
            if t.get(f):
                t[f] = t[f].isoformat()
        result["transfer"] = t
    else:
        result["transfer"] = None

    return jsonify(result), 200


@bp.get("/patients/<patient_id>/active-journey")
def get_patient_active_journey(patient_id):
    with get_cursor() as cur:
        cur.execute(
            """
            select journey_id from journeys
            where patient_id = %s and current_status != 'COMPLETED'
            order by updated_at desc limit 1
            """,
            (patient_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"active_journey": None}), 200
    return get_journey(row["journey_id"])


def _advance(journey_id, target_status):
    """
    Shared helper for the manual clinical-progression transitions
    (step 5.1/5.3): the application never infers "patient arrived" or
    "referral required" automatically — a human explicitly advances
    the journey through these endpoints.
    """
    with get_cursor(commit=True) as cur:
        cur.execute("select current_status from journeys where journey_id = %s", (journey_id,))
        journey = cur.fetchone()
        if journey is None:
            return None, ("NOT_FOUND", 404)

        try:
            assert_journey_transition(journey["current_status"], target_status)
        except Exception as exc:
            return None, (str(exc), 409)

        cur.execute("update journeys set current_status = %s where journey_id = %s", (target_status, journey_id))
    return target_status, None


@bp.post("/journeys/<journey_id>/mark-en-route")
def mark_en_route(journey_id):
    status, err = _advance(journey_id, "EN_ROUTE_TO_HOSPITAL_1")
    if err:
        return jsonify({"error": err[0]}), err[1]
    record_audit_event(None, None, "JOURNEY_EN_ROUTE_TO_HOSPITAL_1", "journey", journey_id)
    return jsonify({"status": status}), 200


@bp.post("/journeys/<journey_id>/mark-arrived")
def mark_arrived(journey_id):
    status, err = _advance(journey_id, "ARRIVED_AT_HOSPITAL_1")
    if err:
        return jsonify({"error": err[0]}), err[1]
    record_audit_event(None, None, "JOURNEY_ARRIVED_AT_HOSPITAL_1", "journey", journey_id)
    return jsonify({"status": status}), 200


@bp.post("/journeys/<journey_id>/mark-under-care")
def mark_under_care(journey_id):
    status, err = _advance(journey_id, "UNDER_CARE")
    if err:
        return jsonify({"error": err[0]}), err[1]
    record_audit_event(None, None, "JOURNEY_UNDER_CARE", "journey", journey_id)
    return jsonify({"status": status}), 200


@bp.get("/hospitals/<hospital_id>/journeys")
def list_hospital_journeys(hospital_id):
    """
    Journeys relevant to a given hospital, for the Hospital-1 and
    Receiving-hospital dashboards (step 5.2 / section 31).
    """
    with get_cursor() as cur:
        cur.execute(
            """
            select j.*, p.display_name as patient_display_name
            from journeys j
            join patients p on p.id = j.patient_id
            where j.stage1_hospital_id = %s or j.stage2_hospital_id = %s
            order by j.updated_at desc
            """,
            (hospital_id, hospital_id),
        )
        rows = cur.fetchall()

    result = []
    for r in rows:
        d = dict(r)
        d["created_at"] = d["created_at"].isoformat()
        d["updated_at"] = d["updated_at"].isoformat()
        result.append(d)
    return jsonify(result), 200
