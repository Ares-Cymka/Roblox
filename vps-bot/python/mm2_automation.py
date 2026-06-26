"""
MM2 in-game trade automation.

Template images required in python/assets/:
  mm2_leaderboard_button.png   — the player list / leaderboard icon in the MM2 HUD
  mm2_trade_button.png         — "Trade" option in the player context menu
  mm2_ready_button.png         — "Ready" button inside the trade window
  mm2_trade_accepted.png       — the trade completion / accepted screen
  mm2_trade_close_button.png   — the close / OK button on the trade accepted screen
  mm2_item_<name>.png          — one image per deliverable item (name = product name,
                                  lowercase, spaces → underscores, e.g. mm2_item_swirly_blade.png)

How to capture templates:
  1. Launch MM2 on the VPS, open each UI element, screenshot with Snipping Tool.
  2. Crop to the exact button/icon and save as the filename above in python/assets/.
"""
from __future__ import annotations

import logging
import time

import pyautogui

import roblox_window as rbx
from screen_detector import (
    click_template,
    find_text,
    find_template,
    click_at,
    wait_for_template,
)

log = logging.getLogger(__name__)

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.05

_CLICK_DELAY = 0.45
_STEP_DELAY = 0.8


def _frame():
    return rbx.screenshot()


def _off():
    return rbx.offset()


# ── Internal steps ────────────────────────────────────────────────────────────


def _open_player_list() -> None:
    """Click the MM2 leaderboard / player list button in the HUD."""
    frame = _frame()
    if frame is None:
        raise RuntimeError("Roblox window not found when opening player list")

    if not click_template("mm2_leaderboard_button.png", frame, _off()):
        raise RuntimeError(
            "mm2_leaderboard_button.png not found on screen. "
            "Ensure the template is captured and Roblox is in focus."
        )
    time.sleep(_STEP_DELAY)


def _click_player_in_list(username: str) -> None:
    """
    Locate the customer's username in the MM2 player list via OCR and click it.
    Raises RuntimeError if the player is not visible.
    """
    frame = _frame()
    if frame is None:
        raise RuntimeError("Roblox window not found when searching for player in list")

    pos = find_text(frame, username)
    if pos is None:
        raise RuntimeError(
            f"Player '{username}' not found in MM2 player list via OCR. "
            "They may have left the server."
        )

    click_at(pos[0], pos[1], _off())
    time.sleep(_CLICK_DELAY)


def _click_trade_in_context_menu() -> None:
    """Click the Trade option that appears in the player context menu."""
    frame = _frame()
    if frame is None:
        raise RuntimeError("Roblox window not found when clicking Trade button")

    if not click_template("mm2_trade_button.png", frame, _off()):
        raise RuntimeError(
            "mm2_trade_button.png not found. "
            "The player context menu may not be open."
        )
    time.sleep(_STEP_DELAY)


def _add_item_to_trade(item_name: str, quantity: int) -> None:
    """
    Click the item slot inside the MM2 trade window `quantity` times.
    Template filename: mm2_item_<name_lowered_underscored>.png
    """
    template = f"mm2_item_{item_name.lower().replace(' ', '_')}.png"
    for _ in range(quantity):
        frame = _frame()
        if frame is None:
            raise RuntimeError("Roblox window not found while adding item to trade")
        if not click_template(template, frame, _off()):
            raise RuntimeError(
                f"Item template '{template}' not found in trade UI. "
                "Capture the item icon from the MM2 trade screen."
            )
        time.sleep(_CLICK_DELAY)


def _click_ready() -> None:
    """Click the Ready button to submit the trade offer to the customer."""
    frame = _frame()
    if frame is None:
        raise RuntimeError("Roblox window not found when clicking Ready")

    if not click_template("mm2_ready_button.png", frame, _off()):
        raise RuntimeError("mm2_ready_button.png not found — trade may not be open.")
    time.sleep(_CLICK_DELAY)


def _wait_for_acceptance(timeout: float) -> None:
    """
    Block until the 'trade accepted' screen appears.
    Raises TimeoutError if the customer doesn't accept within `timeout` seconds.
    """
    pos = wait_for_template(
        "mm2_trade_accepted.png",
        get_frame=_frame,
        timeout=timeout,
        interval=1.5,
    )
    if pos is None:
        raise TimeoutError(
            f"Trade not accepted by customer within {timeout:.0f}s."
        )

    time.sleep(0.5)

    # Dismiss the trade accepted screen.
    frame = _frame()
    if frame is not None:
        click_template("mm2_trade_close_button.png", frame, _off())
    time.sleep(_CLICK_DELAY)


# ── Public API ────────────────────────────────────────────────────────────────


def run_delivery(job: dict) -> list[dict]:
    """
    Execute a complete MM2 trade delivery for the given pending job dict.

    Sequence:
      1. Focus Roblox window.
      2. Open MM2 player list.
      3. Locate customer via OCR → click.
      4. Click Trade in context menu.
      5. Add each item to the trade window.
      6. Click Ready (sends trade offer to customer).
      7. Wait for customer to accept.
      8. Close the accepted screen.

    Returns a list of delivered items (mirrors job items) for the backend report.
    Raises RuntimeError / TimeoutError on any failure.
    """
    customer: str = job["customerRobloxUsername"]
    items: list[dict] = job["items"]

    log.info(f"[mm2] Delivering to {customer}: {[i['name'] for i in items]}")

    if not rbx.focus():
        raise RuntimeError("Roblox window not found — is Roblox running on the VPS?")
    time.sleep(1.0)

    _open_player_list()
    _click_player_in_list(customer)
    _click_trade_in_context_menu()

    for item in items:
        _add_item_to_trade(item["name"], item.get("quantity", 1))

    _click_ready()

    from config import TRADE_TIMEOUT
    _wait_for_acceptance(TRADE_TIMEOUT)

    delivered = [{"name": i["name"], "quantity": i["quantity"]} for i in items]
    log.info(f"[mm2] Trade accepted by {customer}. Delivered: {delivered}")
    return delivered
