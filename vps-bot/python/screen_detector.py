from __future__ import annotations

import time
import logging
from pathlib import Path
from typing import Callable

import cv2
import numpy as np
import pyautogui
import pytesseract

from config import TESSERACT_CMD

log = logging.getLogger(__name__)

pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

ASSETS = Path(__file__).parent / "assets"
MATCH_THRESHOLD = 0.82


def _load_template(name: str) -> np.ndarray:
    path = ASSETS / name
    if not path.exists():
        raise FileNotFoundError(
            f"Template '{name}' not found in {ASSETS}. "
            "Capture it from MM2 in-game and save as PNG."
        )
    return cv2.imread(str(path), cv2.IMREAD_COLOR)


def find_template(
    template_name: str,
    frame: np.ndarray,
    threshold: float = MATCH_THRESHOLD,
) -> tuple[int, int] | None:
    """
    Return the center (x, y) of the best template match in frame,
    or None if confidence is below threshold.
    """
    template = _load_template(template_name)
    gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray_tmpl = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)

    result = cv2.matchTemplate(gray_frame, gray_tmpl, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(result)

    if max_val < threshold:
        log.debug(f"[screen] '{template_name}' confidence {max_val:.2f} < {threshold}")
        return None

    h, w = gray_tmpl.shape
    return (max_loc[0] + w // 2, max_loc[1] + h // 2)


def find_text(frame: np.ndarray, text: str, confidence: int = 55) -> tuple[int, int] | None:
    """
    Locate `text` (case-insensitive substring) in `frame` using Tesseract OCR.
    Returns center (x, y) of the matched word box, or None.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 175, 255, cv2.THRESH_BINARY)

    data = pytesseract.image_to_data(thresh, output_type=pytesseract.Output.DICT)
    target = text.lower()

    for i, word in enumerate(data["text"]):
        if not word:
            continue
        if target in word.lower() and int(data["conf"][i]) >= confidence:
            x = data["left"][i] + data["width"][i] // 2
            y = data["top"][i] + data["height"][i] // 2
            return (x, y)

    return None


def click_at(rel_x: int, rel_y: int, win_offset: tuple[int, int]) -> None:
    """Click at a position relative to the Roblox window."""
    ox, oy = win_offset
    pyautogui.moveTo(ox + rel_x, oy + rel_y, duration=0.15)
    pyautogui.click()
    time.sleep(0.3)


def click_template(
    template_name: str,
    frame: np.ndarray,
    win_offset: tuple[int, int],
    threshold: float = MATCH_THRESHOLD,
) -> bool:
    """Find template and click its center. Returns False if not found."""
    pos = find_template(template_name, frame, threshold)
    if pos is None:
        return False
    click_at(pos[0], pos[1], win_offset)
    return True


def wait_for_template(
    template_name: str,
    get_frame: Callable[[], np.ndarray | None],
    timeout: float = 30.0,
    interval: float = 1.5,
) -> tuple[int, int] | None:
    """Poll until template appears or timeout. Returns center position or None."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        frame = get_frame()
        if frame is not None:
            pos = find_template(template_name, frame)
            if pos:
                return pos
        time.sleep(interval)
    return None
