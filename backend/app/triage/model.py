"""
Stage-1 medical-triage model loader — google/medgemma-1.5-4b-it
(step 4.4 / section 41S).

MedGemma is a generative, multimodal (text + image) instruction-
tuned model, not a text-classification model with a fixed label head.
That changes how "inference" works here compared to a classifier:

  - There are no native class scores. We prompt the model with a
    strict instruction to answer with exactly one of a small fixed
    vocabulary of tokens, then parse the first matching token out of
    its response. If the response doesn't contain a recognized token,
    we treat it as ASSESSMENT_UNAVAILABLE (step 4.5) rather than
    guessing.
  - `model_scores_optional` is therefore always None for this model.
  - Because MedGemma is multimodal, this same model is reused by
    app/triage/document_parser.py to read a scanned referral letter.

API-only mode (HF_USE_HOSTED_INFERENCE_API=true): calls a dedicated HF
Inference Endpoint's OpenAI-compatible Messages API. MedGemma is NOT
on HF's free shared serverless API, so HF_INFERENCE_ENDPOINT_URL must
be set — see config.py.
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
    label: str
    scores: Optional[dict] = None
    model_name: str = ""
    model_version: str = ""


def is_ready() -> bool:
    cfg = get_config()
    if cfg.HF_USE_HOSTED_INFERENCE_API:
        return bool(cfg.HF_API_TOKEN) and bool(cfg.HF_INFERENCE_ENDPOINT_URL)
    return _model_state["loaded"]


def warm_up():
    cfg = get_config()
    if cfg.HF_USE_HOSTED_INFERENCE_API:
        _model_state["model_name"] = cfg.HF_TRIAGE_MODEL_NAME
        _model_state["model_revision"] = cfg.HF_TRIAGE_MODEL_REVISION
        if not cfg.HF_INFERENCE_ENDPOINT_URL:
            _model_state["load_error"] = (
                "HF_USE_HOSTED_INFERENCE_API=true but HF_INFERENCE_ENDPOINT_URL "
                "is not set. MedGemma is not on HF's free shared serverless "
                "API — deploy a dedicated Inference Endpoint at "
                "https://ui.endpoints.huggingface.co/ and set its URL."
            )
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
    except Exception as exc:
        _model_state["loaded"] = False
        _model_state["load_error"] = str(exc)


def get_load_metrics() -> dict:
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


def _to_openai_content(content_items: list) -> list:
    converted = []
    for item in content_items:
        if item["type"] == "image":
            converted.append({"type": "image_url", "image_url": {"url": item["image"]}})
        else:
            converted.append(item)
    return converted


def _run_chat(messages: list) -> str:
    cfg = get_config()
    if cfg.HF_USE_HOSTED_INFERENCE_API:
        if not cfg.HF_INFERENCE_ENDPOINT_URL:
            raise RuntimeError(
                "HF_INFERENCE_ENDPOINT_URL is not set. Deploy a dedicated "
                "HF Inference Endpoint and set its URL."
            )
        url = f"{cfg.HF_INFERENCE_ENDPOINT_URL.rstrip('/')}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {cfg.HF_API_TOKEN}",
            "Content-Type": "application/json",
        }
        openai_messages = [
            {"role": m["role"], "content": _to_openai_content(m["content"])}
            for m in messages
        ]
        payload = {"model": "tgi", "messages": openai_messages, "max_tokens": 64}

        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    clf = _model_state["pipeline"]
    if clf is None:
        raise RuntimeError("MedGemma model not loaded")
    output = clf(text=messages, max_new_tokens=64)
    generated = output[0]["generated_text"]
    if isinstance(generated, list):
        return generated[-1].get("content", "") if isinstance(generated[-1], dict) else str(generated[-1])
    return str(generated)


def infer(text: str) -> TriageResult:
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