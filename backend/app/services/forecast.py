"""
14-day demand forecast for a hotel's area (baseline model).
index = 100 × day-of-week effect × local events × traveler-interest signal.   100 = a normal day for this time of year.
Replace `index_for()` with a trained model later; the API shape stays the same.
"""
import datetime as dt, hashlib
from .. import config

DOW = [0.92, 0.91, 0.94, 0.97, 1.04, 1.08, 1.01]          # Mon..Sun
EVENTS = {"2026-10-03": ("Village ceremony, Peliatan", 1.0), "2026-10-10": ("Dry weekend, school holidays abroad", 1.03),
          "2026-10-17": ("Long weekend in Australia", 1.02)}

def _noise(key: str) -> float:
    return (int(hashlib.md5(key.encode()).hexdigest()[:4], 16) % 7 - 3) / 100   # ±3%, stable per day

def interest_signal(con, area: str, day: dt.date) -> float:
    """Days that travelers ask about MORE than average get a boost (and less → a dip), capped at ±8%."""
    start = config.today()
    n = con.execute("SELECT COUNT(*) FROM question_log WHERE area=? AND for_date=?", (area, day.isoformat())).fetchone()[0]
    avg = con.execute("SELECT COUNT(*) / 21.0 FROM question_log WHERE area=? AND for_date BETWEEN ? AND ?",
                      (area, start.isoformat(), (start + dt.timedelta(days=20)).isoformat())).fetchone()[0] or 0
    if avg < 5: return 0.0          # not enough data to say anything
    return max(-0.08, min(0.08, (n / avg - 1) * 0.1))

def index_for(con, area: str, day: dt.date) -> int:
    ev = EVENTS.get(day.isoformat(), (None, 1.0))[1]
    return round(100 * DOW[day.weekday()] * ev * (1 + interest_signal(con, area, day) + _noise(area + day.isoformat())))

def suggested_rate(base: int, idx: int) -> int | None:
    if idx < 105: return None
    return int(round(base * (1 + (idx - 100) * 0.0075) / 50000) * 50000)

def booked_pct(day: dt.date, start: dt.date) -> int:
    ahead = (day - start).days
    return max(20, min(95, 72 - ahead * 2 + (8 if day.weekday() >= 4 else 0) + int(_noise(day.isoformat()) * 100)))

def forecast(con, prop: dict, days: int = 14) -> list[dict]:
    start = config.today()
    saved = {r["date"]: r["rate"] for r in con.execute("SELECT date, rate FROM rates WHERE property_id=?", (prop["id"],))}
    out = []
    for i in range(days):
        d = start + dt.timedelta(days=i)
        idx = index_for(con, prop["area"], d)
        rate = saved.get(d.isoformat(), prop["base_rate"])
        sug = suggested_rate(prop["base_rate"], idx)
        applied = d.isoformat() in saved
        out.append({"date": d.isoformat(), "d": d.strftime("%a"), "n": d.day, "idx": idx, "rate": rate, "booked": booked_pct(d, start),
                    "sug": None if applied or not sug or sug <= rate else sug, "applied": applied,
                    "event": EVENTS.get(d.isoformat(), (None,))[0]})
    return out
