"""
GET /notifications
Returns role-specific and user-specific notifications:
  - PATIENT: Only notifications belonging to this specific patient (dispatches, requests, acceptances).
  - HOSPITAL_STAFF: Only notifications belonging to this specific hospital facility (incoming requests, bed allocations).
  - NETWORK_ADMIN: All system and network-wide notifications and alerts across facilities.
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from app.services.db import get_cursor

import uuid

bp = Blueprint("notifications", __name__)


def _is_uuid(val):
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError):
        return False


def _time_ago(dt):
    if not dt:
        return "Just now"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return "Recently"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = (now - dt).total_seconds()
    if diff < 60:
        return "Just now"
    elif diff < 3600:
        mins = max(1, int(diff // 60))
        return f"{mins} min{'s' if mins > 1 else ''} ago"
    elif diff < 86400:
        hrs = max(1, int(diff // 3600))
        return f"{hrs} hour{'s' if hrs > 1 else ''} ago"
    else:
        days = max(1, int(diff // 86400))
        return f"{days} day{'s' if days > 1 else ''} ago"


@bp.get("/notifications")
def get_notifications():
    raw_user_id = request.args.get("user_id")
    role = (request.args.get("role") or "PATIENT").upper()
    hospital_id = request.args.get("hospital_id")

    items = []

    try:
        with get_cursor() as cur:
            user_id = None
            if raw_user_id:
                if _is_uuid(raw_user_id):
                    user_id = raw_user_id
                else:
                    cur.execute("select id from user_accounts where email = %s or id::text = %s limit 1", (raw_user_id, raw_user_id))
                    row = cur.fetchone()
                    if row:
                        user_id = row["id"]

            if role == "PATIENT":
                # 1. Ambulance Dispatches for this patient
                if user_id:
                    cur.execute(
                        """
                        select ed.id, ed.status, ed.created_at, h.name as hospital_name
                        from emergency_dispatches ed
                        left join hospitals h on h.id = ed.dispatched_hospital_id
                        where ed.patient_id = %s
                        order by ed.created_at desc limit 5
                        """,
                        (user_id,),
                    )
                    for r in cur.fetchall():
                        h_txt = f" from {r['hospital_name']}" if r.get("hospital_name") else ""
                        items.append({
                            "id": f"disp-{r['id']}",
                            "title": "108 Ambulance Dispatched",
                            "message": f"Emergency ambulance dispatched{h_txt}. Status: {r.get('status') or 'DISPATCHED'}.",
                            "time": _time_ago(r["created_at"]),
                            "category": "URGENT",
                            "unread": True,
                            "link": "/patient/emergency-status",
                            "actionLabel": "Track Ambulance",
                        })

                # 2. Hospital acceptances for this patient's requests
                if user_id:
                    cur.execute(
                        """
                        select prr.id as resp_id, prr.request_id, prr.status as resp_status, prr.responded_at,
                               h.name as hospital_name
                        from patient_request_responses prr
                        join patient_requests pr on pr.id = prr.request_id
                        join hospitals h on h.id = prr.hospital_id
                        where pr.patient_id = %s and prr.status = 'ACCEPTED'
                        order by prr.responded_at desc limit 5
                        """,
                        (user_id,),
                    )
                    for r in cur.fetchall():
                        items.append({
                            "id": f"acc-{r['resp_id']}",
                            "title": "Hospital Accepted Emergency Request",
                            "message": f"{r['hospital_name']} has accepted your emergency intake. Bed reserved in Emergency Bay.",
                            "time": _time_ago(r["responded_at"]),
                            "category": "TRANSFER",
                            "unread": True,
                            "link": f"/patient/options?request_id={r['request_id']}",
                            "actionLabel": "Choose Hospital",
                        })

                # 3. Active patient requests
                if user_id:
                    cur.execute(
                        """
                        select id, symptom_summary, urgency, status, created_at
                        from patient_requests
                        where patient_id = %s
                        order by created_at desc limit 5
                        """,
                        (user_id,),
                    )
                    for r in cur.fetchall():
                        items.append({
                            "id": f"req-{r['id']}",
                            "title": f"Triage Request Submitted ({r['urgency']})",
                            "message": f"Your symptoms request was broadcast to top candidate facilities. Status: {r['status']}.",
                            "time": _time_ago(r["created_at"]),
                            "category": "INFO",
                            "unread": False,
                            "link": f"/patient/options?request_id={r['id']}",
                            "actionLabel": "View Matching",
                        })

            elif role == "HOSPITAL_STAFF":
                # Hospital staff only sees events for their hospital
                actual_hosp_id = hospital_id if _is_uuid(hospital_id) else "a1111111-1111-1111-1111-111111111111"

                # 1. Incoming Stage-1 Patient Requests
                cur.execute(
                    """
                    select prr.id as resp_id, prr.status as resp_status, prr.created_at,
                           pr.symptom_summary, pr.urgency, p.display_name as patient_name
                    from patient_request_responses prr
                    join patient_requests pr on pr.id = prr.request_id
                    left join patients p on p.id = pr.patient_id
                    where prr.hospital_id = %s
                    order by prr.created_at desc limit 10
                    """,
                    (actual_hosp_id,),
                )
                for r in cur.fetchall():
                    is_pending = r["resp_status"] == "PENDING"
                    items.append({
                        "id": f"h-resp-{r['resp_id']}",
                        "title": f"Incoming Patient Triage Request ({r.get('urgency') or 'Critical'})" if is_pending else f"Intake Request {r['resp_status']}",
                        "message": f"Patient {r.get('patient_name') or 'Anonymous'}: {r.get('symptom_summary') or 'Emergency intake required'}.",
                        "time": _time_ago(r["created_at"]),
                        "category": "URGENT" if is_pending else "INFO",
                        "unread": is_pending,
                        "link": "/hospital",
                        "actionLabel": "Open Operations Board",
                    })

                # 2. Incoming Referrals
                cur.execute(
                    """
                    select rr.id as resp_id, rr.status as resp_status, ref.created_at,
                           ref.reason_for_referral, ref.clinical_summary,
                           p.display_name as patient_name
                    from referral_responses rr
                    join referrals ref on ref.id = rr.referral_id
                    left join patients p on p.id = ref.patient_id
                    where rr.hospital_id = %s
                    order by ref.created_at desc limit 10
                    """,
                    (actual_hosp_id,),
                )
                for r in cur.fetchall():
                    items.append({
                        "id": f"h-ref-{r['resp_id']}",
                        "title": f"Inter-Hospital Referral ({r['resp_status']})",
                        "message": f"{r.get('patient_name') or 'Patient'}: {r.get('reason_for_referral') or 'Emergency transfer requested'}.",
                        "time": _time_ago(r["created_at"]),
                        "category": "TRANSFER",
                        "unread": r["resp_status"] == "PENDING",
                        "link": "/hospital",
                        "actionLabel": "Review Referral",
                    })

            elif role == "NETWORK_ADMIN":
                # Network admin sees ALL network-wide notifications
                # 1. All emergency dispatches
                cur.execute(
                    """
                    select ed.id, ed.status, ed.created_at, p.display_name as patient_name, h.name as hospital_name
                    from emergency_dispatches ed
                    left join patients p on p.id = ed.patient_id
                    left join hospitals h on h.id = ed.dispatched_hospital_id
                    order by ed.created_at desc limit 10
                    """
                )
                for r in cur.fetchall():
                    h_txt = f" to {r['hospital_name']}" if r.get("hospital_name") else ""
                    items.append({
                        "id": f"adm-disp-{r['id']}",
                        "title": "Network Emergency 108 Dispatch",
                        "message": f"Ambulance dispatched for {r.get('patient_name') or 'Citizen'}{h_txt}. Status: {r['status']}.",
                        "time": _time_ago(r["created_at"]),
                        "category": "URGENT",
                        "unread": True,
                        "link": "/admin",
                        "actionLabel": "Inspect Network",
                    })

                # 2. All patient requests
                cur.execute(
                    """
                    select pr.id, pr.urgency, pr.status, pr.created_at, p.display_name as patient_name
                    from patient_requests pr
                    left join patients p on p.id = pr.patient_id
                    order by pr.created_at desc limit 10
                    """
                )
                for r in cur.fetchall():
                    items.append({
                        "id": f"adm-req-{r['id']}",
                        "title": f"Patient Intake Broadcast ({r['urgency']})",
                        "message": f"Broadcast active across network facilities for {r.get('patient_name') or 'Citizen'}. Status: {r['status']}.",
                        "time": _time_ago(r["created_at"]),
                        "category": "TRANSFER",
                        "unread": False,
                        "link": "/admin",
                        "actionLabel": "View Overview",
                    })

                # 3. All hospital registrations
                cur.execute("select id, name, type, is_verified, created_at from hospitals order by created_at desc limit 10")
                for r in cur.fetchall():
                    items.append({
                        "id": f"adm-hosp-{r['id']}",
                        "title": "Hospital Facility Connected",
                        "message": f"{r['name']} ({r.get('type') or 'Tertiary Center'}) verified in network directory.",
                        "time": _time_ago(r["created_at"]),
                        "category": "VERIFICATION",
                        "unread": False,
                        "link": "/admin",
                        "actionLabel": "Hospital Directory",
                    })

    except Exception as exc:
        return jsonify({"error": str(exc), "notifications": []}), 500

    return jsonify({"notifications": items}), 200
