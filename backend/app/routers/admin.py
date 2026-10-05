from fastapi import APIRouter, Depends
from ..db import get_db, rows
from ..security import require
from .. import config

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/metrics")
def metrics(user=Depends(require("admin")), con=Depends(get_db)):
    one = lambda q, *a: con.execute(q, a).fetchone()[0]
    return {
        "travelers": one("SELECT COUNT(*) FROM users WHERE role='traveler'"),
        "travelers_plus": one("SELECT COUNT(*) FROM users WHERE role='traveler' AND plan='plus'"),
        "businesses": one("SELECT COUNT(*) FROM users WHERE role='business'"),
        "questions_today": one("SELECT COALESCE(SUM(count),0) FROM usage WHERE day=?", config.today().isoformat()),
        "question_log_total": one("SELECT COUNT(*) FROM question_log WHERE synthetic=0"),
        "share_data_pct": round(100 * one("SELECT AVG(share_data) FROM users WHERE role='traveler'") or 0),
        "places": one("SELECT COUNT(*) FROM places"),
        "places_to_reverify": one("SELECT COUNT(*) FROM places WHERE verified_at IS NULL OR verified_at < date(?, '-60 day')", config.today().isoformat()),
        "flagged_answers": rows(con.execute("SELECT place, note, created_at FROM feedback WHERE kind='wrong' ORDER BY id DESC LIMIT 20")),
        "useful_pct": round(100 * (one("SELECT AVG(kind='useful') FROM feedback") or 0)),
        "ai_provider": config.AI_PROVIDER,
    }
