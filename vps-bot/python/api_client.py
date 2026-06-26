from __future__ import annotations

import requests
from config import BACKEND_URL, BOT_API_SECRET

_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {BOT_API_SECRET}",
}
_TIMEOUT = 15


def _get(path: str, params: dict | None = None) -> dict:
    resp = requests.get(f"{BACKEND_URL}{path}", params=params, headers=_HEADERS, timeout=_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _post(path: str, body: dict | None = None) -> dict:
    resp = requests.post(f"{BACKEND_URL}{path}", json=body or {}, headers=_HEADERS, timeout=_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def get_pending_jobs(game: str) -> list[dict]:
    data = _get("/api/bot/jobs/pending", params={"game": game})
    return data.get("jobs", [])


def start_job(job_id: str) -> dict:
    return _post(f"/api/bot/jobs/{job_id}/start")


def trade_detected(job_id: str, detected_items: list[dict], proof_text: str | None = None) -> dict:
    return _post(f"/api/bot/jobs/{job_id}/trade-detected", {
        "detectedItems": detected_items,
        "proofText": proof_text,
    })


def complete_job(job_id: str, detected_items: list[dict], proof_text: str | None = None) -> dict:
    return _post(f"/api/bot/jobs/{job_id}/complete", {
        "detectedItems": detected_items,
        "proofText": proof_text,
        "requireDetection": True,
    })


def fail_job(job_id: str, error: str, retryable: bool = False) -> dict:
    return _post(f"/api/bot/jobs/{job_id}/fail", {
        "error": error,
        "retryable": retryable,
    })
