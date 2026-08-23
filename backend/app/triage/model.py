"""
Stage-1 medical-triage model loader — google/medgemma-4b-it
(step 4.4 / section 41S).

MedGemma 4B is a generative, multimodal (text + image) instruction-
tuned model, not a text-classification model with a fixed label head.
That changes how "inference" works here compared to a classifier:

  - There are no native class scores. We prompt the model with a
    strict instruction to answer with exactly one of a small fixed
    vocabulary of tokens, then parse the first matching token out of
    its response. If the response doesn't contain a recognized token,
    we treat it as ASSESSMENT_UNAVAILABLE (step 4.5) rather than
    guessing.
  - `model_scores_optional` is therefore always None for this model —
    it never fabricates a confidence figure the model didn't actually
    produce.
  - Because MedGemma is multimodal, this same loaded model/processor is
    reused by app/triage/document_parser.py to read a scanned referral
    letter (image input). The model is loaded exactly once at process
    startup either way (never per request).

This is still a broad pre-triage signal, not a diagnostic system
(section 0.5) — the strict system prompt below asks only for an
urgency bucket, never a diagnosis.
"""

import re
import time
from dataclasses import dataclass
from typing import Optional, Dict

import requests

from app.config import get_config

_model_state: Dict = {
    "loaded": False,
    "pipeline": None,
    "load_seconds": None,
    "model_name": None,
    "model_revision": None,
}

TRIAGE_LABELS = ["URGENT", "CONSULT_GP", "SELF_MONITOR"]

TRIAGE_SYSTEM_PROMPT = (
    "You are a broad pre-triage assistant. You do NOT diagnose. Read the "
    "patient's description and reply with EXACTLY ONE WORD from this list, "
    "nothing else, no punctuation, no explanation: "
    "URGENT, CONSULT_GP, SELF_MONITOR. "
    "Use URGENT for anything suggesting a medical emergency (e.g. stroke, "
    "heart attack, severe trauma, breathing difficulty, loss of "
    "consciousness). Use CONSULT_GP for concerning but non-emergency "
    "symptoms. Use SELF_MONITOR for mild/minor symptoms."
)


@dataclass
class TriageResult:
    label: str  # one of TRIAGE_LABELS, or "ASSESSMENT_UNAVAILABLE"
    scores: Optional[dict] = None  # always None for MedGemma — see module docstring
    model_name: str = ""
    model_version: str = ""


def is_ready() -> bool:
    """Used by GET /ready — never report ready if the model isn't usable."""
    cfg = get_config()
    if cfg.HF_USE_HOSTED_INFERENCE_API:
        return bool(cfg.HF_API_TOKEN)
    return _model_state["loaded"]


def warm_up():
    """
    Call once at process startup (see app/__init__.py). Loads the
    pinned model/revision into memory so the first real request isn't
    also paying model-load latency.

    google/medgemma-4b-it is a GATED model on Hugging Face: your
    HF_API_TOKEN's account must have accepted Google's license on the
    model page, or this will fail with a 401/403 — that failure is
    caught and surfaced through get_load_metrics()["load_error"], not
    raised, so the rest of the app can still start.
    """
    cfg = get_config()
    if cfg.HF_USE_HOSTED_INFERENCE_API:
        # Nothing to preload locally; readiness just checks the token exists.
        _model_state["model_name"] = cfg.HF_TRIAGE_MODEL_NAME
        _model_state["model_revision"] = cfg.HF_TRIAGE_MODEL_REVISION
        return

    start = time.time()
    try:
        from transformers import pipeline

        clf = pipeline(
            "image-text-to-text",
            model=cfg.HF_TRIAGE_MODEL_NAME,
            revision=cfg.HF_TRIAGE_MODEL_REVISION,
            token=cfg.HF_API_TOKEN or None,
        )
        _model_state["pipeline"] = clf
        _model_state["loaded"] = True
        _model_state["model_name"] = cfg.HF_TRIAGE_MODEL_NAME
        _model_state["model_revision"] = cfg.HF_TRIAGE_MODEL_REVISION
        _model_state["load_seconds"] = time.time() - start
    except Exception as exc:  # noqa: BLE001 - deliberate: log and stay not-ready
        _model_state["loaded"] = False
        _model_state["load_error"] = str(exc)


def get_load_metrics() -> dict:
    """Section 41S: measure load time / memory during development."""
    return {
        "loaded": _model_state["loaded"],
        "load_seconds": _model_state.get("load_seconds"),
        "model_name": _model_state.get("model_name"),
        "model_revision": _model_state.get("model_revision"),
        "load_error": _model_state.get("load_error"),
    }


def _parse_label(generated_text: str) -> Optional[str]:
    upper = generated_text.upper()
    for label in TRIAGE_LABELS:
        if re.search(rf"\b{label}\b", upper):
            return label
    return None


def _run_chat(messages: list) -> str:
    """Shared chat-completion call used by both triage and document parsing."""
    cfg = get_config()
    if cfg.HF_USE_HOSTED_INFERENCE_API:
        url = f"https://api-inference.huggingface.co/models/{cfg.HF_TRIAGE_MODEL_NAME}"
        headers = {"Authorization": f"Bearer {cfg.HF_API_TOKEN}"}
        resp = requests.post(url, headers=headers, json={"inputs": messages}, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        if isinstance(payload, list) and payload:
            return payload[0].get("generated_text", "")
        return str(payload)

    clf = _model_state["pipeline"]
    if clf is None:
        raise RuntimeError("MedGemma model not loaded")
    output = clf(text=messages, max_new_tokens=64)
    # image-text-to-text pipeline returns [{"generated_text": [...chat turns...]}]
    generated = output[0]["generated_text"]
    if isinstance(generated, list):
        # last turn is the assistant's reply
        return generated[-1].get("content", "") if isinstance(generated[-1], dict) else str(generated[-1])
    return str(generated)


def infer(text: str) -> TriageResult:
    """
    Run triage inference. On any failure — model not loaded, gated-
    access error, malformed/unparseable output — returns
    ASSESSMENT_UNAVAILABLE rather than fabricating an urgency result
    (step 4.5).
    """
    cfg = get_config()
    try:
        if not text or not text.strip():
            raise ValueError("empty input")

        messages = [
            {"role": "system", "content": [{"type": "text", "text": TRIAGE_SYSTEM_PROMPT}]},
            {"role": "user", "content": [{"type": "text", "text": text}]},
        ]
        raw = _run_chat(messages)
        label = _parse_label(raw)
        if label is None:
            raise ValueError(f"unparseable model output: {raw!r}")

        return TriageResult(
            label=label,
            scores=None,
            model_name=cfg.HF_TRIAGE_MODEL_NAME,
            model_version=cfg.HF_TRIAGE_MODEL_REVISION,
        )
    except Exception:
        return TriageResult(
            label="ASSESSMENT_UNAVAILABLE",
            scores=None,
            model_name=cfg.HF_TRIAGE_MODEL_NAME,
            model_version=cfg.HF_TRIAGE_MODEL_REVISION,
        )
