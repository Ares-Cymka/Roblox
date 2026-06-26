"""
RngBlox VPS Bot — Python delivery automation service.

Polls GET /api/bot/jobs/pending for QUEUED MM2 delivery jobs,
runs the in-game trade via PyAutoGUI + OpenCV, and reports
success/failure back to the backend.

Run:
    python main.py

Requirements:
    pip install -r requirements.txt
    Tesseract-OCR installed at TESSERACT_CMD path (see config.py).
"""
from __future__ import annotations

import logging
import sys
import time

import api_client as backend
import mm2_automation
from config import GAME, JOB_POLL_INTERVAL, BOT_ROBLOX_USERNAME

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# Jobs currently being processed (prevents picking up the same job twice
# during a long delivery while the poller ticks again).
_active_job_ids: set[str] = set()


def _process_job(job: dict) -> None:
    job_id: str = job["jobId"]
    customer: str = job["customerRobloxUsername"]
    items: list[dict] = job["items"]

    log.info(f"[job:{job_id}] Picked up | customer={customer} | items={[i['name'] for i in items]}")
    _active_job_ids.add(job_id)

    try:
        # Notify backend: job is now PROCESSING
        backend.start_job(job_id)

        # Run in-game trade automation
        delivered = mm2_automation.run_delivery(job)

        # Report trade screen detected
        backend.trade_detected(
            job_id,
            detected_items=delivered,
            proof_text=f"[AUTO] Trade accepted by {customer}.",
        )

        # Confirm delivery complete
        backend.complete_job(
            job_id,
            detected_items=delivered,
            proof_text=f"[AUTO] Delivery confirmed for {customer}.",
        )

        log.info(f"[job:{job_id}] Delivery complete.")

    except TimeoutError as exc:
        log.warning(f"[job:{job_id}] Trade timeout: {exc}")
        backend.fail_job(job_id, error=str(exc), retryable=True)

    except RuntimeError as exc:
        log.error(f"[job:{job_id}] Delivery failed: {exc}")
        backend.fail_job(job_id, error=str(exc), retryable=False)

    except Exception as exc:
        log.exception(f"[job:{job_id}] Unexpected error")
        backend.fail_job(job_id, error=f"Unexpected error: {exc}", retryable=False)

    finally:
        _active_job_ids.discard(job_id)


def _poll() -> None:
    try:
        jobs = backend.get_pending_jobs(GAME)
    except Exception as exc:
        log.error(f"[poll] Failed to fetch pending jobs: {exc}")
        return

    new_jobs = [j for j in jobs if j["jobId"] not in _active_job_ids]
    if not new_jobs:
        return

    # Process one job per tick to avoid concurrent window control.
    _process_job(new_jobs[0])


def main() -> None:
    log.info(f"[main] Python bot started | game={GAME} | bot={BOT_ROBLOX_USERNAME}")
    log.info(f"[main] Poll interval: {JOB_POLL_INTERVAL}s")

    while True:
        _poll()
        time.sleep(JOB_POLL_INTERVAL)


if __name__ == "__main__":
    main()
