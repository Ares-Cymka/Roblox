import os
from dotenv import load_dotenv

load_dotenv()


def _required(key: str) -> str:
    val = os.getenv(key, "").strip()
    if not val:
        raise RuntimeError(f"Missing required env var: {key}")
    return val


BACKEND_URL: str = _required("BACKEND_URL").rstrip("/")
BOT_API_SECRET: str = _required("BOT_API_SECRET")
BOT_ROBLOX_USERNAME: str = _required("BOT_ROBLOX_USERNAME")
GAME: str = os.getenv("GAME", "MM2").strip()

JOB_POLL_INTERVAL: float = float(os.getenv("JOB_POLL_INTERVAL_SECONDS", "5"))
TRADE_TIMEOUT: float = float(os.getenv("TRADE_TIMEOUT_SECONDS", "120"))

# Path to Tesseract-OCR executable (Windows default install path).
# Override via env var if installed elsewhere.
TESSERACT_CMD: str = os.getenv(
    "TESSERACT_CMD",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
)
