"""
Central configuration. Per section 0.10, prototype assumptions
(search radius, timeouts, staleness thresholds, ranking weights,
tie-breakers, routing fallback) live here and in the
`prototype_config` table — never scattered through source files.

Values here are process-start defaults / secrets. Tunable *policy*
values that the referral engine and Stage-1 matching use are read
from the `prototype_config` table at runtime (see services/db.py),
so they can change without a redeploy and every decision can record
which policy_version was in effect.
"""

import os
from dotenv import load_dotenv

# Ensure we always load the latest .env from the backend directory, overriding cached shell vars
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"), override=True)

class Config:
    # --- Supabase / Postgres --------------------------------------------------
    # Use the Supabase "connection pooling" URI for the backend service role.
    # This is a *server-side secret* — never ship it to the frontend.
    SUPABASE_DB_URL = os.environ.get("SUPABASE_DB_URL", "")
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    # --- Hugging Face Stage-1 triage transformer -------------------------------
    # Pin the exact model + revision so every assessment can record which
    # model/version produced it (step 4.4 / section 0.6).
    #
    # MedGemma 4B (google/medgemma-4b-it) is a Google multimodal
    # instruction-tuned model built on Gemma 3, trained on medical
    # text/image data. It is NOT a text-classification model with fixed
    # output labels the way the previous default was — it's a generative
    # chat model, so app/triage/model.py prompts it to answer with one
    # of a small fixed set of tokens and parses the response (see that
    # module's docstring). It is also multimodal, which is why
    # app/triage/document_parser.py reuses the same loaded model to read
    # scanned referral letters (requirement: patients bring their own
    # referral documents — see docs/DECISIONS.md).
    #
    # IMPORTANT: this is a gated model on Hugging Face. You must accept
    # Google's usage license on the model page and use a HF_API_TOKEN
    # that has been granted access, or local loading will fail with a
    # 403/permission error.
    HF_TRIAGE_MODEL_NAME = os.environ.get("HF_TRIAGE_MODEL_NAME", "google/medgemma-4b-it")
    HF_TRIAGE_MODEL_REVISION = os.environ.get("HF_TRIAGE_MODEL_REVISION", "main")
    HF_API_TOKEN = os.environ.get("HF_API_TOKEN", "")
    # If true, call the hosted HF Inference API instead of loading the model
    # in-process. Either way the model is warmed up once at startup, never
    # per-request (step 4.4 / section 41S).
    #
    # NOTE: MedGemma is a gated model and is often NOT available on the
    # shared serverless Inference API — you may need a dedicated HF
    # Inference Endpoint instead. See docs/PROTOTYPE_LIMITATIONS.md.
    HF_USE_HOSTED_INFERENCE_API = os.environ.get(
        "HF_USE_HOSTED_INFERENCE_API", "false"
    ).lower() == "true"
    TRIAGE_POLICY_VERSION = os.environ.get("TRIAGE_POLICY_VERSION", "triage-policy-v2-medgemma")

    # --- OSRM routing ------------------------------------------------------------
    OSRM_BASE_URL = os.environ.get("OSRM_BASE_URL", "https://router.project-osrm.org")
    OSRM_TIMEOUT_SECONDS = float(os.environ.get("OSRM_TIMEOUT_SECONDS", "3.0"))

    # --- Ranking policy version (section 0.9 / step 6.6) -------------------------
    RANKING_POLICY_VERSION = os.environ.get("RANKING_POLICY_VERSION", "ranking-policy-v1")

    # --- CORS --------------------------------------------------------------------
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

    # --- Demo/admin simulator boundary (section 41V) -----------------------------
    # A shared secret required on every /simulator/* call, distinct from normal
    # hospital-staff auth, so the simulator is never confused with production
    # hospital write access.
    DEMO_ADMIN_TOKEN = os.environ.get("DEMO_ADMIN_TOKEN", "demo-admin-token-change-me")


def get_config() -> Config:
    return Config()
