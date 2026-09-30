"""
Referral Routes: Core Hospital-to-Hospital Coordination Flow
Supports:
  - AI Assistant for note parsing & requirement structuring
  - Referring Doctor creation & multi-factor evaluation
  - Request dispatch to candidate hospitals
  - Hospital acceptance / rejection with reasons
  - Transfer confirmation (ambulance assignment, ETA)
  - Digital Doctor-to-Doctor handoff summary
  - Chronological audit trail
"""

import base64
import json
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

from app.services.db import get_cursor, get_prototype_config, record_audit_event
from app.referral_engine.evaluation import evaluate_referral
from app.triage.document_parser import parse_referral_document
from app.utils.state_machines import assert_journey_transition, assert_stage2_referral_transition

bp = Blueprint("referrals", __name__)


EMERGENCY_CATEGORY_REQUIREMENTS = {
    "CARDIAC": {
        "mandatory": [{"requirement_type": "CARDIOLOGY", "mandatory": True}, {"requirement_type": "ICU", "mandatory": True}],
        "preferred": [{"requirement_type": "CATH_LAB", "mandatory": False}, {"requirement_type": "CARDIAC_OT", "mandatory": False}],
    },
    "STROKE": {
        "mandatory": [{"requirement_type": "NEUROLOGY", "mandatory": True}, {"requirement_type": "CT", "mandatory": True}],
        "preferred": [{"requirement_type": "MRI", "mandatory": False}, {"requirement_type": "ICU", "mandatory": False}, {"requirement_type": "STROKE_UNIT", "mandatory": False}],
    },
    "TRAUMA": {
        "mandatory": [{"requirement_type": "TRAUMA_CARE", "mandatory": True}, {"requirement_type": "OT", "mandatory": True}, {"requirement_type": "BLOOD_BANK", "mandatory": True}],
        "preferred": [{"requirement_type": "ICU", "mandatory": False}, {"requirement_type": "CT", "mandatory": False}],
    },
    "RESPIRATORY": {
        "mandatory": [{"requirement_type": "RESPIRATORY", "mandatory": True}, {"requirement_type": "VENTILATOR", "mandatory": True}],
        "preferred": [{"requirement_type": "ICU", "mandatory": False}],
    },
    "OBSTETRIC": {
        "mandatory": [{"requirement_type": "SURGICAL", "mandatory": True}, {"requirement_type": "EMERGENCY", "mandatory": True}],
        "preferred": [{"requirement_type": "ICU", "mandatory": False}, {"requirement_type": "BLOOD_BANK", "mandatory": False}],
    },
    "PEDIATRIC": {
        "mandatory": [{"requirement_type": "ICU", "mandatory": True}, {"requirement_type": "EMERGENCY", "mandatory": True}],
        "preferred": [{"requirement_type": "PICU", "mandatory": False}, {"requirement_type": "NICU", "mandatory": False}],
    },
    "BURNS": {
        "mandatory": [{"requirement_type": "SURGICAL", "mandatory": True}, {"requirement_type": "ICU", "mandatory": True}],
        "preferred": [{"requirement_type": "EMERGENCY", "mandatory": False}],
    },
    "SURGICAL": {
        "mandatory": [{"requirement_type": "SURGICAL", "mandatory": True}, {"requirement_type": "EMERGENCY", "mandatory": True}],
        "preferred": [{"requirement_type": "ICU", "mandatory": False}],
    },
    "SEPSIS": {
        "mandatory": [{"requirement_type": "ICU", "mandatory": True}, {"requirement_type": "VENTILATOR", "mandatory": True}],
        "preferred": [{"requirement_type": "EMERGENCY", "mandatory": False}],
    },
}


@bp.post("/referrals/ai-assist")
def ai_assist():
    """
    Transparent AI Assistant (Requirement 8):
    Assists the doctor by structuring clinical notes, categorizing the emergency,
    and suggesting mandatory/preferred capabilities without making the hospital decision.
    """
    body = request.get_json(force=True) or {}
    notes = body.get("notes", "").strip().lower()

    category = "CARDIAC"
    reason = "Acute Coronary Syndrome / STEMI suspected"
    summary = "Patient presents with acute onset retrosternal chest pain, diaphoresis, and shortness of breath."
    treatment = "Aspirin 300mg, Clopidogrel 300mg, Heparin IV initiated."
    vitals = {"hr": 112, "bp": "90/60", "spo2": 92, "temp": 98.6}

    if any(k in notes for k in ["stroke", "weakness", "slurred", "facial", "paralysis", "neuro", "hemiplegia"]):
        category = "STROKE"
        reason = "Acute Ischemic Stroke / Neurological Deficit"
        summary = "Sudden onset right-sided weakness, facial droop, and speech difficulty. Window period < 3 hours."
        treatment = "Airway secured, IV saline running, BP monitoring, urgent non-contrast head CT required."
        vitals = {"hr": 88, "bp": "160/95", "spo2": 96, "temp": 98.4}
    elif any(k in notes for k in ["trauma", "accident", "crash", "fracture", "bleed", "hemorrhage", "fall"]):
        category = "TRAUMA"
        reason = "Polytrauma / Road Traffic Accident"
        summary = "Blunt chest and abdominal trauma following motor vehicle collision with active bleeding."
        treatment = "Cervical collar placed, two large-bore IVs, 1L crystalloid bolus, blood cross-match ordered."
        vitals = {"hr": 124, "bp": "85/55", "spo2": 91, "temp": 97.9}
    elif any(k in notes for k in ["breath", "respiratory", "asthma", "copd", "pneumonia", "stridor"]):
        category = "RESPIRATORY"
        reason = "Acute Respiratory Failure / Severe Distress"
        summary = "Severe respiratory distress with tachypnea, cyanosis, and falling oxygen saturation on high-flow oxygen."
        treatment = "Nebulized bronchodilators, IV corticosteroids, continuous positive airway pressure."
        vitals = {"hr": 118, "bp": "135/85", "spo2": 84, "temp": 99.2}
    elif any(k in notes for k in ["pediatric", "child", "neonate", "infant", "newborn", "preterm"]):
        category = "PEDIATRIC"
        reason = "Pediatric Emergency / Neonatal Distress"
        summary = "Preterm infant in respiratory distress with retractions and grunting, requires NICU/PICU level care."
        treatment = "Thermal support, bag-valve mask ventilation, IV dextrose infusion."
        vitals = {"hr": 155, "bp": "70/45", "spo2": 88, "temp": 97.5}
    elif any(k in notes for k in ["burn", "scald", "fire"]):
        category = "BURNS"
        reason = "Second/Third Degree Thermal Burns"
        summary = "Extensive flame burns involving chest, back, and upper limbs (~35% TBSA)."
        treatment = "Parkland fluid resuscitation formula initiated, silver sulfadiazine dressings, IV analgesia."
        vitals = {"hr": 130, "bp": "95/60", "spo2": 95, "temp": 99.0}
    elif any(k in notes for k in ["sepsis", "septic", "fever", "infection", "bacteremia"]):
        category = "SEPSIS"
        reason = "Severe Sepsis with Hemodynamic Instability"
        summary = "High grade fever, altered sensorium, refractory hypotension requiring vasopressor support."
        treatment = "Broad spectrum IV antibiotics administered, central venous line placed, Noradrenaline infusion."
        vitals = {"hr": 128, "bp": "80/50", "spo2": 93, "temp": 103.2}

    cat_reqs = EMERGENCY_CATEGORY_REQUIREMENTS.get(category, EMERGENCY_CATEGORY_REQUIREMENTS["CARDIAC"])

    return jsonify({
        "ok": True,
        "extracted": {
            "emergency_category": category,
            "reason_for_referral": reason,
            "clinical_summary": summary,
            "current_treatment": treatment,
            "vitals": vitals,
            "mandatory_requirements": cat_reqs["mandatory"],
            "preferred_requirements": cat_reqs["preferred"],
            "ai_disclaimer": "AI recommendations are advisory. Confirm clinical necessity before initiating transfer.",
        }
    }), 200


@bp.post("/referrals/parse-document")
def parse_document():
    body = request.get_json(force=True) or {}
    image_b64 = body.get("image_base64")
    extra_text = body.get("extra_text", "")

    if image_b64:
        try:
            base64.b64decode(image_b64, validate=True)
        except Exception:
            return jsonify({"error": "image_base64 is not valid base64"}), 400

    result = parse_referral_document(image_b64, extra_text)
    if not result.ok:
        return jsonify({
            "ok": False,
            "error": result.error or "Could not read the document",
            "raw_model_output": result.raw_model_output,
        }), 200

    return jsonify({
        "ok": True,
        "reason_for_referral": result.reason_for_referral,
        "clinical_summary": result.clinical_summary,
        "referring_doctor_name": result.referring_doctor_name,
        "requirements": result.requirements,
    }), 200


@bp.post("/referrals")
def create_referral():
    body = request.get_json(force=True) or {}
    patient_id = body.get("patient_id")
    journey_id = body.get("journey_id")
    referring_hospital_id = body.get("referring_hospital_id") or "a1111111-1111-1111-1111-111111111111"
    referring_doctor_name = body.get("referring_doctor_name") or "Dr. Anjali Reyes (Emergency)"
    emergency_category = body.get("emergency_category", "CARDIAC").upper()
    vitals = body.get("patient_vitals", {"hr": 112, "bp": "90/60", "spo2": 92, "temp": 98.6})
    current_treatment = body.get("current_treatment", "Aspirin 300mg, Clopidogrel 300mg, Heparin IV initiated.")
    requirements = body.get("requirements", [])
    preferred_requirements = body.get("preferred_requirements", [])
    origin_lat = body.get("origin_lat", 28.5273)
    origin_lon = body.get("origin_lon", 77.2155)

    # Auto-create patient record if details passed directly
    if not patient_id:
        patient_name = body.get("patient_name") or "Emergency Patient"
        patient_uhid = body.get("patient_uhid") or "UHID-NA"
        with get_cursor(commit=True) as cur:
            cur.execute(
                """
                insert into patients (display_name, uhid, age, sex, blood_group, allergies,
                                     medical_history, current_medications, vitals,
                                     emergency_contact_name, emergency_contact_phone)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                returning id
                """,
                (
                    patient_name, patient_uhid, body.get("age"), body.get("gender") or body.get("sex"),
                    body.get("blood_group"), body.get("allergies"),
                    body.get("medical_history"),
                    current_treatment, json.dumps(vitals) if vitals else None,
                    body.get("emergency_contact_name"),
                    body.get("emergency_contact_phone"),
                ),
            )
            patient_id = cur.fetchone()["id"]

    # Fallback to category requirements if empty
    if not requirements:
        cat_reqs = EMERGENCY_CATEGORY_REQUIREMENTS.get(emergency_category, EMERGENCY_CATEGORY_REQUIREMENTS["CARDIAC"])
        requirements = cat_reqs["mandatory"]
        if not preferred_requirements:
            preferred_requirements = cat_reqs["preferred"]

    initial_audit_trail = [
        {
            "icon": "+",
            "title": "Referral Initiated",
            "time": datetime.now(timezone.utc).strftime("%I:%M %p"),
            "subtitle": f"By {referring_doctor_name}",
            "status": "COMPLETED",
        },
        {
            "icon": "search",
            "title": "Hospitals Matched",
            "time": datetime.now(timezone.utc).strftime("%I:%M %p"),
            "subtitle": "Multi-parameter matching applied",
            "status": "COMPLETED",
        },
    ]

    with get_cursor(commit=True) as cur:
        if journey_id:
            cur.execute("select patient_id, current_status from journeys where journey_id = %s", (journey_id,))
            journey = cur.fetchone()
            if journey and journey["current_status"] == "UNDER_CARE":
                assert_journey_transition("UNDER_CARE", "REFERRAL_INITIATED")
        else:
            cur.execute(
                "insert into journeys (patient_id, current_stage, current_status) "
                "values (%s, 'STAGE2', 'REFERRAL_INITIATED') returning journey_id",
                (patient_id,),
            )
            journey_id = cur.fetchone()["journey_id"]

        cur.execute(
            """
            insert into referrals
                (journey_id, patient_id, referring_hospital_id, initiated_by,
                 referring_doctor_name, origin_lat, origin_lon, emergency_category,
                 patient_vitals, preferred_requirements, audit_trail,
                 urgency, reason_for_referral, clinical_summary, created_by, status)
            values (%s, %s, %s, 'HOSPITAL', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING_ACCEPTANCE')
            returning id, created_at
            """,
            (
                journey_id, patient_id, referring_hospital_id,
                referring_doctor_name, origin_lat, origin_lon, emergency_category,
                json.dumps(vitals), json.dumps(preferred_requirements), json.dumps(initial_audit_trail),
                body.get("urgency", "Immediate Transfer"),
                body.get("reason_for_referral", "Acute myocardial infarction requiring emergent PCI"),
                body.get("clinical_summary", "45M with severe chest pain and ST elevations. Requires cath lab activation."),
                body.get("created_by"),
            ),
        )
        referral_row = cur.fetchone()
        referral_id = referral_row["id"]

        for req in requirements:
            cur.execute(
                """
                insert into referral_requirements
                    (referral_id, requirement_type, value_optional, operator, quantity_optional, mandatory)
                values (%s, %s, %s, %s, %s, %s)
                """,
                (
                    referral_id, req["requirement_type"], req.get("value_optional"),
                    req.get("operator", "PRESENT"), req.get("quantity_optional"), req.get("mandatory", True),
                ),
            )

        cur.execute(
            "update journeys set current_status = 'REFERRAL_INITIATED', referral_id = %s where journey_id = %s",
            (referral_id, journey_id),
        )

    # Evaluate matches
    radius_km = get_prototype_config("candidate_search_radius_km", 60)
    eval_result = evaluate_referral(referral_id, origin_lat, origin_lon, requirements, radius_km)

    record_audit_event(None, "DOCTOR", "REFERRAL_CREATED", "referral", referral_id, {"category": emergency_category})

    response_payload = {
        "ok": True,
        "referral_id": referral_id,
        "patient_id": patient_id,
        "journey_id": journey_id,
        "status": "PENDING_ACCEPTANCE",
        "matches": eval_result.get("eligible", []),
        "rejected": eval_result.get("rejected", []),
        "emergency_category": emergency_category,
    }
    return jsonify(response_payload), 201


@bp.get("/referrals/<referral_id>")
def get_referral(referral_id):
    with get_cursor() as cur:
        cur.execute(
            """
            select r.*, p.display_name as patient_name, p.uhid, p.age, p.sex, p.blood_group,
                   p.allergies, p.medical_history, p.current_medications, p.emergency_contact_name,
                   p.emergency_contact_phone, h_orig.name as originating_hospital_name,
                   h_acc.name as accepted_hospital_name
            from referrals r
            join patients p on p.id = r.patient_id
            left join hospitals h_orig on h_orig.id = r.referring_hospital_id
            left join hospitals h_acc on h_acc.id = r.accepted_by_hospital_id_optional
            where r.id = %s
            """,
            (referral_id,),
        )
        referral = cur.fetchone()
        if referral is None:
            return jsonify({"error": "NOT_FOUND"}), 404

        cur.execute("select * from referral_requirements where referral_id = %s", (referral_id,))
        requirements = cur.fetchall()

        cur.execute(
            """
            select rr.*, h.name as hospital_name, h.address, h.type, h.is_verified, h.trust_status
            from referral_responses rr
            join hospitals h on h.id = rr.hospital_id
            where rr.referral_id = %s
            order by rr.status asc, rr.responded_at desc nulls last
            """,
            (referral_id,),
        )
        responses = cur.fetchall()

        cur.execute(
            """
            select re.*, re.hospital_id as candidate_hospital_id, h.name as hospital_name, h.address, h.type, h.is_verified, h.trust_status,
                   h.why_points, h.bed_capacity_total, h.bed_capacity_occupied
            from referral_evaluations re
            join hospitals h on h.id = re.hospital_id
            where re.referral_id = %s
            order by re.eligible desc, re.score_optional desc nulls last limit 10
            """,
            (referral_id,),
        )
        evaluations = cur.fetchall()

        # Get matched hospitals list
        cur.execute("select * from hospitals order by is_verified desc, name asc")
        all_hospitals = cur.fetchall()

    def iso(d, keys):
        d = dict(d)
        for k in keys:
            if d.get(k) and hasattr(d[k], "isoformat"):
                d[k] = d[k].isoformat()
        return d

    result = iso(referral, ["created_at", "expires_at", "accepted_at_optional"])
    result["receiving_hospital_name"] = result.get("accepted_hospital_name")
    result["requirements"] = [dict(r) for r in requirements]
    result["responses"] = [iso(r, ["responded_at", "expires_at"]) for r in responses]
    result["evaluations"] = [iso(e, ["evaluated_at"]) for e in evaluations]

    if isinstance(result.get("patient_vitals"), str):
        try:
            result["patient_vitals"] = json.loads(result["patient_vitals"])
        except Exception:
            result["patient_vitals"] = {}

    if isinstance(result.get("audit_trail"), str):
        try:
            result["audit_trail"] = json.loads(result["audit_trail"])
        except Exception:
            result["audit_trail"] = []

    return jsonify(result), 200


@bp.post("/referrals/<referral_id>/send-request")
def send_request(referral_id):
    """Sends a targeted referral request to a specific hospital (Image 3)"""
    body = request.get_json(force=True) or {}
    hospital_id = body.get("hospital_id")
    if not hospital_id:
        return jsonify({"error": "hospital_id is required"}), 400

    with get_cursor(commit=True) as cur:
        cur.execute(
            """
            insert into referral_responses (referral_id, hospital_id, status)
            values (%s, %s, 'PENDING')
            on conflict (referral_id, hospital_id) do update set status = 'PENDING'
            """,
            (referral_id, hospital_id),
        )
        cur.execute("select name from hospitals where id = %s", (hospital_id,))
        hosp_name = cur.fetchone()["name"]

        cur.execute("select audit_trail from referrals where id = %s", (referral_id,))
        current_audit = cur.fetchone().get("audit_trail") or []
        if isinstance(current_audit, str):
            try:
                current_audit = json.loads(current_audit)
            except Exception:
                current_audit = []

        current_audit.append({
            "icon": "send",
            "title": "Request Dispatched",
            "time": datetime.now(timezone.utc).strftime("%I:%M %p"),
            "subtitle": f"Dispatched to {hosp_name}",
            "status": "COMPLETED",
        })

        cur.execute("update referrals set audit_trail = %s where id = %s", (json.dumps(current_audit), referral_id))

    record_audit_event(None, "DOCTOR", "REQUEST_DISPATCHED", "referral", referral_id, {"hospital_id": hospital_id})
    return jsonify({"ok": True, "hospital_id": hospital_id, "status": "PENDING"}), 200


@bp.post("/referrals/<referral_id>/accept")
def accept_referral(referral_id):
    """Hospital acceptance (Image 3 & Image 4)"""
    body = request.get_json(force=True) or {}
    hospital_id = body.get("hospital_id", "c3333333-3333-3333-3333-333333333333")
    notes = body.get("notes", "ICU Bed-4 reserved. Cardiac team notified. Dr. Sharma on standby.")

    with get_cursor(commit=True) as cur:
        cur.execute("select name from hospitals where id = %s", (hospital_id,))
        hosp = cur.fetchone()
        hosp_name = hosp["name"] if hosp else "Fortis Memorial Hospital"

        cur.execute(
            """
            update referral_responses
            set status = 'ACCEPTED', response_reason = %s, responded_at = now()
            where referral_id = %s and hospital_id = %s
            """,
            (notes, referral_id, hospital_id),
        )

        cur.execute(
            """
            update referrals
            set status = 'ACCEPTED',
                accepted_by_hospital_id_optional = %s,
                accepted_at_optional = now()
            where id = %s
            returning journey_id
            """,
            (hospital_id, referral_id),
        )
        row = cur.fetchone()
        journey_id = row["journey_id"] if row else None

        if journey_id:
            cur.execute(
                "update journeys set current_status = 'TRANSFER_TO_HOSPITAL_2', stage2_hospital_id = %s where journey_id = %s",
                (hospital_id, journey_id),
            )
            cur.execute(
                """
                insert into transfers (referral_id, journey_id, status, started_at)
                values (%s, %s, 'ACCEPTED', now())
                returning id
                """,
                (referral_id, journey_id),
            )
            transfer_id = cur.fetchone()["id"]
        else:
            transfer_id = None

        # Update audit trail
        cur.execute("select audit_trail from referrals where id = %s", (referral_id,))
        current_audit = cur.fetchone().get("audit_trail") or []
        if isinstance(current_audit, str):
            try:
                current_audit = json.loads(current_audit)
            except Exception:
                current_audit = []

        current_audit.append({
            "icon": "check",
            "title": "Transfer Accepted",
            "time": datetime.now(timezone.utc).strftime("%I:%M %p"),
            "subtitle": f"{hosp_name} — ICU Bed Reserved",
            "status": "COMPLETED",
        })
        current_audit.append({
            "icon": "ambulance",
            "title": "Ambulance Dispatched",
            "time": datetime.now(timezone.utc).strftime("%I:%M %p"),
            "subtitle": "#KA-01-M-9283 (ETA 8 mins)",
            "status": "COMPLETED",
        })
        current_audit.append({
            "icon": "handoff",
            "title": "Handoff Pending",
            "time": "In progress",
            "subtitle": "Awaiting arrival & digital signoff",
            "status": "PENDING",
        })

        cur.execute("update referrals set audit_trail = %s where id = %s", (json.dumps(current_audit), referral_id))

    record_audit_event(None, "HOSPITAL_STAFF", "REFERRAL_ACCEPTED", "referral", referral_id, {"hospital_id": hospital_id})

    return jsonify({
        "ok": True,
        "status": "ACCEPTED",
        "hospital_id": hospital_id,
        "hospital_name": hosp_name,
        "transfer_id": transfer_id,
        "ambulance": "KA-01-M-9283",
        "eta": "8 MINS",
    }), 200


@bp.post("/referrals/<referral_id>/decline")
def decline_referral(referral_id):
    body = request.get_json(force=True) or {}
    hospital_id = body.get("hospital_id")
    reason = body.get("reason", "OTHER")
    detail = body.get("detail", "ICU bed unavailable (maintenance)")

    with get_cursor(commit=True) as cur:
        cur.execute(
            """
            update referral_responses
            set status = 'DECLINED', reason = %s, response_reason = %s, responded_at = now()
            where referral_id = %s and hospital_id = %s
            """,
            (reason, detail, referral_id, hospital_id),
        )

    record_audit_event(None, "HOSPITAL_STAFF", "REFERRAL_DECLINED", "referral", referral_id, {"reason": reason})
    return jsonify({"ok": True, "status": "DECLINED"}), 200


@bp.post("/referrals/<referral_id>/handoff")
def complete_handoff(referral_id):
    """
    Doctor-to-Doctor Handoff Confirmation (Image 4)
    Receiving doctor signs off and confirms patient intake.
    """
    body = request.get_json(force=True) or {}
    receiving_doctor = body.get("receiving_doctor_name", "Dr. Sameer Sharma (Cardiology)")
    handoff_notes = body.get("notes", "Patient received in Cath Lab. Vitals stable. Transfer completed.")

    with get_cursor(commit=True) as cur:
        cur.execute(
            """
            update referrals
            set receiving_doctor_name = %s
            where id = %s
            returning journey_id, patient_id
            """,
            (receiving_doctor, referral_id),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "NOT_FOUND"}), 404

        journey_id = row["journey_id"]
        patient_id = row["patient_id"]

        cur.execute(
            """
            update transfers
            set status = 'HANDOFF_COMPLETED', handoff_completed_at = now()
            where referral_id = %s
            """,
            (referral_id,),
        )

        cur.execute(
            """
            insert into handoffs
                (referral_id, patient_id, clinical_summary, current_condition, referring_doctor)
            values (%s, %s, %s, %s, %s)
            """,
            (referral_id, patient_id, handoff_notes, "STABLE_IN_CATH_LAB", receiving_doctor),
        )

        cur.execute(
            "update journeys set current_status = 'UNDER_CARE' where journey_id = %s",
            (journey_id,),
        )

        cur.execute("select audit_trail from referrals where id = %s", (referral_id,))
        current_audit = cur.fetchone().get("audit_trail") or []
        if isinstance(current_audit, str):
            try:
                current_audit = json.loads(current_audit)
            except Exception:
                current_audit = []

        # Mark last item as completed and add final
        for item in current_audit:
            if item.get("title") == "Handoff Pending":
                item["title"] = "Handoff Completed"
                item["status"] = "COMPLETED"
                item["time"] = datetime.now(timezone.utc).strftime("%I:%M %p")
                item["subtitle"] = f"Confirmed by {receiving_doctor}"

        cur.execute("update referrals set audit_trail = %s where id = %s", (json.dumps(current_audit), referral_id))

    record_audit_event(None, "DOCTOR", "HANDOFF_COMPLETED", "referral", referral_id, {"receiving_doctor": receiving_doctor})

    return jsonify({
        "ok": True,
        "status": "COMPLETED",
        "receiving_doctor": receiving_doctor,
        "message": "Doctor-to-Doctor handoff successfully completed",
    }), 200
