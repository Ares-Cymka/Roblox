"""
MM2 in-game trade automation.

Template images required in python/assets/:
  mm2_trade_button.png      — "Trade" option in the player context menu
                               (screenshot the Profile/Trade popup, crop just the Trade button)
  mm2_accept_button.png     — green "ACCEPT" button inside the trade window
  mm2_item_<name>.png       — item icon in the left inventory panel of the trade window
                               e.g. mm2_item_swirly_blade.png for "Swirly Blade"

How to capture templates (use Windows Snipping Tool or Win+Shift+S):
  1. Launch MM2 in Roblox as the bot account.
  2. Click on any player → the Profile/Trade menu appears → snip just the "Trade" button
     → save as mm2_trade_button.png
  3. Open a trade → snip the item icon from the LEFT inventory panel (not YOUR OFFER side)
     → save as mm2_item_swirly_blade.png  (or mm2_item_<your_item>.png)
  4. Snip the green ACCEPT button at the bottom of the trade window
     → save as mm2_accept_button.png
  All files go in:  vps-bot/python/assets/

Note: The MM2 player panel is always visible on the right side of the screen —
there is NO separate leaderboard button to click.
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


def _find_and_click_player(username: str) -> None:
    """
    Find the customer's username via OCR in the MM2 player panel (always
    visible on the right side of the screen) and click it to open the
    Profile / Trade context menu.
    """
    frame = _frame()
    if frame is None:
        raise RuntimeError("Roblox window not found when searching for player")

    pos = find_text(frame, username)
    if pos is None:
        raise RuntimeError(
            f"Player '{username}' not visible in MM2 player panel. "
            "They may have left the server or not yet joined."
        )

    click_at(pos[0], pos[1], _off())
    time.sleep(_STEP_DELAY)


def _click_trade_in_context_menu() -> None:
    """Click the 'Trade' option in the player context menu."""
    frame = _frame()
    if frame is None:
        raise RuntimeError("Roblox window not found when clicking Trade button")

    if not click_template("mm2_trade_button.png", frame, _off()):
        raise RuntimeError(
            "mm2_trade_button.png not found — context menu may not be open, "
            "or the template needs to be (re)captured."
        )
    time.sleep(_STEP_DELAY)


def _add_item_to_trade(item_name: str, quantity: int) -> None:
    """
    Click the item icon in the LEFT inventory panel of the trade window
    `quantity` times. Each click adds one copy to YOUR OFFER.
    Template: mm2_item_<item_name_lowercased_underscored>.png
    """
    template = f"mm2_item_{item_name.lower().replace(' ', '_')}.png"
    for _ in range(quantity):
        frame = _frame()
        if frame is None:
            raise RuntimeError("Roblox window not found while adding item to trade")
        if not click_template(template, frame, _off()):
            raise RuntimeError(
                f"Item template '{template}' not found in the trade inventory panel. "
                "Capture the item icon from the LEFT panel of the open trade window "
                f"and save it as vps-bot/python/assets/{template}"
            )
        time.sleep(_CLICK_DELAY)


def _click_accept() -> None:
    """Click the green ACCEPT button to submit the bot's trade offer."""
    frame = _frame()
    if frame is None:
        raise RuntimeError("Roblox window not found when clicking Accept")

    if not click_template("mm2_accept_button.png", frame, _off()):
        raise RuntimeError(
            "mm2_accept_button.png not found — trade window may not be open, "
            "or the template needs to be (re)captured."
        )
    time.sleep(_CLICK_DELAY)


def _wait_for_trade_complete(timeout: float) -> None:
    """
    After bot clicks ACCEPT, wait for:
      Phase 1 — 'YOU HAVE ACCEPTED.' text appears  (our click registered).
      Phase 2 — trade window closes                (customer also accepted).

    Raises TimeoutError if either phase exceeds `timeout` seconds total.
    """
    deadline = time.monotonic() + timeout

    # Phase 1: confirm our accept registered
    log.debug("[mm2] Waiting for 'YOU HAVE ACCEPTED.' confirmation...")
    while time.monotonic() < deadline:
        frame = _frame()
        if frame is not None and find_text(frame, "ACCEPTED") is not None:
            log.debug("[mm2] Bot ACCEPT confirmed.")
            break
        time.sleep(1.0)
    else:
        raise TimeoutError(
            f"'YOU HAVE ACCEPTED.' did not appear within {timeout:.0f}s — "
            "the ACCEPT click may have missed the button."
        )

    # Phase 2: wait for customer to also accept (ACCEPT button disappears = window closed)
    log.debug("[mm2] Waiting for customer to accept...")
    while time.monotonic() < deadline:
        frame = _frame()
        if frame is not None:
            if find_template("mm2_accept_button.png", frame, threshold=0.78) is None:
                log.debug("[mm2] Trade window closed — trade complete.")
                return
        time.sleep(1.5)

    raise TimeoutError(
        f"Customer did not accept the trade within {timeout:.0f}s."
    )


# ── Public API ────────────────────────────────────────────────────────────────


def run_delivery(job: dict) -> list[dict]:
    """
    Execute a complete MM2 trade delivery for the given pending job dict.

    Sequence:
      1. Focus Roblox window.
      2. OCR-find the customer in the right-side MM2 player panel → click.
      3. Click 'Trade' in the context menu.
      4. Click each item to add to YOUR OFFER.
      5. Click ACCEPT.
      6. Wait for 'YOU HAVE ACCEPTED.' then for the trade window to close.

    Returns a list of delivered items for the backend report.
    Raises RuntimeError / TimeoutError on any failure.
    """
    customer: str = job["customerRobloxUsername"]
    items: list[dict] = job["items"]

    log.info(f"[mm2] Delivering to {customer}: {[i['name'] for i in items]}")

    if not rbx.focus():
        raise RuntimeError("Roblox window not found — is Roblox running?")
    time.sleep(1.0)

    _find_and_click_player(customer)
    _click_trade_in_context_menu()

    for item in items:
        _add_item_to_trade(item["name"], item.get("quantity", 1))

    _click_accept()

    from config import TRADE_TIMEOUT
    _wait_for_trade_complete(TRADE_TIMEOUT)

    delivered = [{"name": i["name"], "quantity": i["quantity"]} for i in items]
    log.info(f"[mm2] Trade complete for {customer}. Delivered: {delivered}")
    return delivered
