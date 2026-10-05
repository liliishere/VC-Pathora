"""All settings in one place. Override any of them with environment variables."""
import os

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv("TI_DB_PATH", os.path.join(BASE, "..", "data", "tourism.db"))
FRONTEND_DIR = os.getenv("TI_FRONTEND_DIR", os.path.join(BASE, "..", "..", "frontend"))

# Which AI answers questions: "rules" (built-in engine, works offline) or "custom" (your own model)
AI_PROVIDER = os.getenv("TI_AI_PROVIDER", "rules")
MODEL_URL = os.getenv("TI_MODEL_URL", "http://localhost:9000/generate")   # used when AI_PROVIDER=custom
MODEL_TIMEOUT = float(os.getenv("TI_MODEL_TIMEOUT", "20"))

# Daily question limits per plan (None = unlimited)
QUOTA = {"guest": 5, "free": 15, "plus": None, "starter": 50, "growth": 50, "api": None, "admin": None}
TRIAL_DAYS = {"plus": 7, "starter": 14, "growth": 14}

# The app's "today". Fixed so demo data lines up with the designs. Set TI_TODAY="" to use the real date.
TODAY = os.getenv("TI_TODAY", "2026-09-28")

def today():
    import datetime as dt
    return dt.date.fromisoformat(TODAY) if TODAY else dt.date.today()
