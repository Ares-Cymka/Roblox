from __future__ import annotations

import time
import numpy as np
import win32gui
import win32con
import mss

ROBLOX_WINDOW_TITLE = "Roblox"


def find_hwnd() -> int | None:
    hwnd = win32gui.FindWindow(None, ROBLOX_WINDOW_TITLE)
    return hwnd if hwnd else None


def focus() -> bool:
    hwnd = find_hwnd()
    if not hwnd:
        return False
    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
    win32gui.SetForegroundWindow(hwnd)
    time.sleep(0.4)
    return True


def get_rect() -> tuple[int, int, int, int] | None:
    """Returns (left, top, right, bottom) of the Roblox window."""
    hwnd = find_hwnd()
    if not hwnd:
        return None
    return win32gui.GetWindowRect(hwnd)


def screenshot() -> np.ndarray | None:
    """Capture Roblox window as BGR numpy array (cv2-compatible)."""
    rect = get_rect()
    if not rect:
        return None
    left, top, right, bottom = rect
    with mss.mss() as sct:
        region = {"top": top, "left": left, "width": right - left, "height": bottom - top}
        raw = sct.grab(region)
        # mss returns BGRA; drop alpha channel → BGR
        return np.array(raw)[:, :, :3]


def offset() -> tuple[int, int]:
    """Returns (left, top) of the Roblox window for converting relative → absolute coords."""
    rect = get_rect()
    return (rect[0], rect[1]) if rect else (0, 0)
