"""
Authentication & Role Management Routes (Requirement 1)
Supports signup & login for:
  - PATIENT (personal details, emergency contact, blood group, allergies, medical history, meds, surgeries)
  - HOSPITAL_STAFF (staff details, designation, hospital selection/details, facilities, ICU info)
  - NETWORK_ADMIN (organization, permissions)
"""

import json
import uuid
from flask import Blueprint, jsonify, request
from app.services.db import get_cursor, record_audit_event

bp = Blueprint("auth", __name__)


@bp.post("/auth/register")
def register():
    data = request.get_json(force=True) or {}
    role = data.get("role", "PATIENT").upper()
    email = data.get("email", "").strip().lower()
    display_name = data.get("name") or data.get("display_name") or email.split("@")[0] or "User"
    hospital_id = data.get("hospital_id")

    if not email:
        return jsonify({"error": "email is required"}), 400

    if role not in ("PATIENT", "HOSPITAL_STAFF", "NETWORK_ADMIN"):
        return jsonify({"error": f"Invalid role: {role}"}), 400

    user_id = str(uuid.uuid4())
    details = {
        "role": role,
        "phone": data.get("phone") or "",
        "created_via": "self_registration",
    }
    hospital_name = None

    if role == "PATIENT":
        # Do not invent information: if not provided, store None (Requirement 4)
        raw_age = data.get("age")
        clean_age = int(raw_age) if (raw_age is not None and str(raw_age).strip() != "") else None
        clean_bg = data.get("blood_group") if (data.get("blood_group") and data.get("blood_group") not in ("Unknown", "NA", "")) else None
        clean_allergies = data.get("allergies") if (data.get("allergies") and data.get("allergies").strip() != "") else None
        clean_history = data.get("medical_history") if (data.get("medical_history") and data.get("medical_history").strip() != "") else None
        clean_meds = data.get("current_medications") if (data.get("current_medications") and data.get("current_medications").strip() != "") else None
        clean_surgeries = data.get("previous_surgeries") if (data.get("previous_surgeries") and data.get("previous_surgeries").strip() != "") else None
        clean_em_name = data.get("emergency_contact_name") if (data.get("emergency_contact_name") and data.get("emergency_contact_name").strip() != "") else None
        clean_em_phone = data.get("emergency_contact_phone") if (data.get("emergency_contact_phone") and data.get("emergency_contact_phone").strip() != "") else None

        details.update({
            "age": clean_age,
            "gender": data.get("gender") or None,
            "blood_group": clean_bg,
            "emergency_contact_name": clean_em_name,
            "emergency_contact_phone": clean_em_phone,
            "allergies": clean_allergies,
            "medical_history": clean_history,
            "current_medications": clean_meds,
            "previous_surgeries": clean_surgeries,
            "reports": data.get("reports", []),
        })
        # Insert actual patient record
        with get_cursor(commit=True) as cur:
            cur.execute(
                """
                insert into patients (id, display_name, age, sex, blood_group, allergies,
                                     medical_history, current_medications, previous_surgeries,
                                     emergency_contact_name, emergency_contact_phone)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (id) do update set
                    display_name = excluded.display_name,
                    age = excluded.age,
                    sex = excluded.sex,
                    blood_group = excluded.blood_group,
                    allergies = excluded.allergies,
                    medical_history = excluded.medical_history,
                    current_medications = excluded.current_medications,
                    previous_surgeries = excluded.previous_surgeries
                """,
                (
                    user_id, display_name, clean_age, data.get("gender") or None,
                    clean_bg, clean_allergies, clean_history, clean_meds,
                    clean_surgeries, clean_em_name, clean_em_phone
                ),
            )

    elif role == "HOSPITAL_STAFF":
        # Hospital Worker Signup (Requirement 1, 5, 6)
        if hospital_id and hospital_id not in ("NEW_OR_OTHER", "OTHER", ""):
            # Existing hospital selected from system dropdown
            with get_cursor() as cur:
                cur.execute("select id, name from hospitals where id = %s", (hospital_id,))
                h_row = cur.fetchone()
                if h_row:
                    hospital_name = h_row["name"]
        else:
            # Registering a new hospital or "Other / Not Registered"
            raw_hosp_name = (data.get("hospital_name") or "New Hospital").strip()
            new_hosp_id = str(uuid.uuid4())
            h_type = data.get("hospital_type") or "GENERAL"
            h_address = data.get("address") or data.get("city") or "Address NA"
            
            # Do NOT automatically assign beds if not provided (Requirement 5)
            raw_total_beds = data.get("bed_capacity_total") or data.get("total_beds")
            clean_total_beds = int(raw_total_beds) if (raw_total_beds is not None and str(raw_total_beds).strip() != "") else None
            
            raw_occ_beds = data.get("bed_capacity_occupied") or data.get("occupied_beds")
            clean_occ_beds = int(raw_occ_beds) if (raw_occ_beds is not None and str(raw_occ_beds).strip() != "") else None

            with get_cursor(commit=True) as cur:
                cur.execute(
                    """
                    insert into hospitals (id, name, address, latitude, longitude, type, is_verified, verification_status,
                                          bed_capacity_total, bed_capacity_occupied)
                    values (%s, %s, %s, 28.6139, 77.2090, %s, true, 'VERIFIED', %s, %s)
                    """,
                    (new_hosp_id, raw_hosp_name, h_address, h_type, clean_total_beds, clean_occ_beds),
                )
                # Capabilities / Facilities if provided
                raw_facs = data.get("facilities") or []
                if isinstance(raw_facs, str):
                    raw_facs = [f.strip() for f in raw_facs.split(",") if f.strip()]
                for fac in raw_facs:
                    cur.execute(
                        "insert into hospital_capabilities (hospital_id, capability) values (%s, %s) on conflict do nothing",
                        (new_hosp_id, fac.upper()),
                    )
            hospital_id = new_hosp_id
            hospital_name = raw_hosp_name

        details.update({
            "designation": data.get("designation") or "Staff Physician",
            "department": data.get("department") or "Emergency Medicine",
            "hospital_name": hospital_name,
            "hospital_id": hospital_id,
            "facilities": data.get("facilities") or [],
            "icu_info": data.get("icu_info") or None,
            "emergency_phone": data.get("emergency_phone") or None,
        })

    elif role == "NETWORK_ADMIN":
        details.update({
            "organization": data.get("organization") or "National Health Authority",
            "permissions": data.get("permissions") or ["VERIFY_HOSPITALS", "MANAGE_NETWORK", "VIEW_AUDIT_LOGS"],
        })

    with get_cursor(commit=True) as cur:
        cur.execute(
            """
            insert into user_accounts (id, email, role, display_name, hospital_id, details)
            values (%s, %s, %s, %s, %s, %s)
            on conflict (email) do update set
              display_name = excluded.display_name,
              details = excluded.details,
              hospital_id = excluded.hospital_id
            returning id, email, role, display_name, hospital_id, details, created_at
            """,
            (user_id, email, role, display_name, hospital_id, json.dumps(details)),
        )
        user_row = cur.fetchone()

    record_audit_event(user_id, role, "USER_REGISTERED", "user", user_id, {"role": role, "email": email})

    return jsonify({
        "ok": True,
        "user": {
            "id": user_row["id"],
            "email": user_row["email"],
            "role": user_row["role"],
            "display_name": user_row["display_name"],
            "hospital_id": user_row["hospital_id"],
            "hospital_name": hospital_name,
            "details": user_row["details"],
        }
    }), 201


@bp.post("/auth/login")
def login():
    data = request.get_json(force=True) or {}
    email = data.get("email", "").strip().lower()
    role = data.get("role")

    if not email:
        return jsonify({"error": "email is required"}), 400

    with get_cursor() as cur:
        cur.execute("select * from user_accounts where email = %s", (email,))
        user = cur.fetchone()

    if not user:
        # Auto-provision user if logging in directly
        user_id = str(uuid.uuid4())
        default_role = role or "HOSPITAL_STAFF"
        display_name = email.split("@")[0].title()
        details = {"role": default_role, "auto_provisioned": True}
        
        with get_cursor(commit=True) as cur:
            cur.execute(
                """
                insert into user_accounts (id, email, role, display_name, details)
                values (%s, %s, %s, %s, %s)
                returning id, email, role, display_name, hospital_id, details
                """,
                (user_id, email, default_role, display_name, json.dumps(details)),
            )
            user = cur.fetchone()

            if default_role == "PATIENT":
                cur.execute(
                    """
                    insert into patients (id, display_name)
                    values (%s, %s)
                    on conflict (id) do nothing
                    """,
                    (user_id, display_name),
                )

    user_dict = dict(user)
    if isinstance(user_dict.get("details"), str):
        try:
            user_dict["details"] = json.loads(user_dict["details"])
        except Exception:
            pass

    # Ensure actual registered hospital name is resolved
    hosp_name = None
    if user_dict.get("hospital_id"):
        with get_cursor() as cur:
            cur.execute("select name from hospitals where id = %s", (user_dict["hospital_id"],))
            h = cur.fetchone()
            if h:
                hosp_name = h["name"]
    if not hosp_name and isinstance(user_dict.get("details"), dict):
        hosp_name = user_dict["details"].get("hospital_name")

    return jsonify({
        "ok": True,
        "user": {
            "id": user_dict["id"],
            "email": user_dict["email"],
            "role": user_dict["role"],
            "display_name": user_dict["display_name"],
            "hospital_id": user_dict.get("hospital_id"),
            "hospital_name": hosp_name,
            "details": user_dict.get("details") or {},
        }
    }), 200


@bp.get("/auth/demo-users")
def get_demo_users():
    """Returns pre-configured demo personas for fast switching in the UI."""
    return jsonify({
        "personas": [
            {
                "role": "HOSPITAL_STAFF",
                "label": "Referring Doctor (Dr. Anjali Reyes - Emergency)",
                "display_name": "Dr. Anjali Reyes",
                "designation": "Emergency Physician & Referral Lead",
                "email": "dr.reyes@cityemergency.org",
                "hospital_name": "City Emergency Hub",
                "hospital_id": "a1111111-1111-1111-1111-111111111111",
            },
            {
                "role": "HOSPITAL_STAFF",
                "label": "Receiving Doctor (Dr. Sameer Sharma - Fortis)",
                "display_name": "Dr. Sameer Sharma",
                "designation": "Chief Interventional Cardiologist",
                "email": "dr.sharma@fortishealthcare.com",
                "hospital_name": "Fortis Memorial Research Institute",
                "hospital_id": "c3333333-3333-3333-3333-333333333333",
            },
            {
                "role": "NETWORK_ADMIN",
                "label": "Network Administrator (Super Administrator)",
                "display_name": "Admin User",
                "designation": "Super Administrator",
                "email": "admin@bharatmedlink.gov.in",
                "organization": "National Referral & Navigation Authority",
            },
            {
                "role": "PATIENT",
                "label": "Patient (Rajesh Kumar, 45M)",
                "display_name": "Rajesh Kumar",
                "uhid": "HOSP-98234-AX",
                "email": "rajesh.kumar@example.com",
                "age": 45,
                "gender": "Male",
                "blood_group": "B+",
                "allergies": "Penicillin",
                "medical_history": "Hypertension (Controlled), Type 2 Diabetes",
                "current_medications": "Amlodipine 5mg OD, Metformin 500mg BD",
            },
        ]
    }), 200
