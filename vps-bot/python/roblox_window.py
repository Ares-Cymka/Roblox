from __future__ import annotations

import time
import numpy as np
import win32api
import win32gui
import win32con
import win32process
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

    # Windows blocks SetForegroundWindow from a background process (e.g. this
    # script's console) unless its thread's input state is attached to the
    # current foreground thread's. Attach/detach around the call to bypass it.
    current_thread = win32api.GetCurrentThreadId()
    fg_thread, _ = win32process.GetWindowThreadProcessId(win32gui.GetForegroundWindow())

    attached = False
    if fg_thread and fg_thread != current_thread:
        attached = win32process.AttachThreadInput(fg_thread, current_thread, True)

    try:
        win32gui.BringWindowToTop(hwnd)
        win32gui.SetForegroundWindow(hwnd)
    finally:
        if attached:
            win32process.AttachThreadInput(fg_thread, current_thread, False)

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
