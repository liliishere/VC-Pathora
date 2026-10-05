"""
Place recommendation engine (rule-based baseline).

Scores each curated place on four things only — the same four the landing page promises:
  1. Quiet at your time   (crowd estimate for the chosen day and hour)
  2. Worth the trip       (team rating + recently verified by our team)
  3. Easy to reach        (travel time from where the traveler is staying)
  4. Good for locals      (local business, or a local business nearby)
Popularity / virality is deliberately NOT an input.
"""
import datetime as dt, math, re
from .geo import travel_min, travel_label
from .. import config

TOPICS = {
    "waterfall": r"waterfall|air terjun|curug",
    "rice":      r"rice|terrace|sawah",
    "food":      r"food|eat|warung|vegetarian|makan|breakfast|lunch|dinner|coffee",
    "indoor":    r"rain|hujan|indoor|workshop|class|massage|spa",
    "temple":    r"temple|pura|spring|holy",
    "walk":      r"walk|hike|trek|sunrise|ridge",
}
DAYS = {"monday":0,"tuesday":1,"wednesday":2,"thursday":3,"friday":4,"saturday":5,"sunday":6,
        "senin":0,"selasa":1,"rabu":2,"kamis":3,"jumat":4,"sabtu":5,"minggu":6}

def detect_topic(text: str) -> str:
    t = text.lower()
    for k, rx in TOPICS.items():
        if re.search(rx, t): return k
    return "general"

def detect_date(text: str, today: dt.date) -> dt.date:
    t = text.lower()
    if "tomorrow" in t or "besok" in t: return today + dt.timedelta(days=1)
    if "weekend" in t: return today + dt.timedelta(days=(5 - today.weekday()) % 7 or 7)
    for name, wd in DAYS.items():
        if name in t: return today + dt.timedelta(days=(wd - today.weekday()) % 7 or 7)
    return today

def crowd_at(place: dict, day: dt.date, hour: int) -> int:
    """0–100 crowd estimate: a bell curve around the place's peak hour, higher on weekends."""
    spread = 2.6
    level = place["base_level"] + (place["peak_level"] - place["base_level"]) * math.exp(-((hour - place["peak_h"]) ** 2) / (2 * spread ** 2))
    if day.weekday() >= 5: level *= 1.18
    return max(0, min(100, round(level)))

def crowd_label(level: int, is_local: bool) -> str:
    if is_local and level < 70: return "local"
    return "quiet" if level < 40 else ("mid" if level < 70 else "busy")

def best_hour(place: dict, day: dt.date) -> tuple[int, int]:
    last_start = max(place["open_h"], place["close_h"] - math.ceil(place["duration_h"]))
    hours = range(place["open_h"], last_start + 1)
    h = min(hours, key=lambda x: (crowd_at(place, day, x), x))
    return h, crowd_at(place, day, h)

def score(place: dict, day: dt.date, stay_area: str) -> dict:
    hour, crowd = best_hour(place, day)
    mins = travel_min(stay_area, place["area"])
    verified = bool(place["verified_at"]) and (day - dt.date.fromisoformat(place["verified_at"])).days <= 90
    s = (100 - crowd) * 0.45                           # quiet at your time
    s += (place["team_rating"] / 5) * 30 + (5 if verified else 0)   # worth the trip
    s += max(0, 20 - mins / 6)                         # easy to reach
    s += 10 if (place["is_local"] or place["local_nearby"]) else 0  # good for locals
    return {"place": place, "score": round(s, 1), "hour": hour, "crowd": crowd, "mins": mins, "verified": verified}

def reasons(r: dict, day: dt.date) -> str:
    p = r["place"]; parts = []
    parts.append(f"Usually quiet around {r['hour']:02d}:00" if r["crowd"] < 40 else f"Least busy around {r['hour']:02d}:00")
    if r["verified"]: parts.append("checked by our team recently")
    if p["team_rating"] >= 4.5: parts.append("rated highly by locals")
    if p["note"]: parts.append(p["note"])
    return ". ".join(s[0].upper() + s[1:] for s in parts) + "."

def recommend(con, question: str, stay_area: str = "Ubud", limit: int = 2) -> dict:
    today = config.today()
    topic, day = detect_topic(question), detect_date(question, today)
    cats = {"general": None, "walk": ("walk", "nature")}.get(topic, (topic,))
    q = "SELECT * FROM places" + ("" if cats is None else f" WHERE category IN ({','.join('?'*len(cats))})")
    places = [dict(x) for x in con.execute(q, cats or ()).fetchall()]
    ranked = sorted((score(p, day, stay_area) for p in places), key=lambda r: -r["score"])[:limit]
    return {"topic": topic, "date": day.isoformat(), "candidates": ranked}

def as_answer(rec: dict, stay_area: str) -> dict:
    """Shape used by the frontend renderAnswer()."""
    day = dt.date.fromisoformat(rec["date"])
    titles = {"waterfall": "Quiet waterfalls near {a}", "rice": "Rice terraces with more space", "food": "Local places to eat near {a}",
              "indoor": "Good ideas for a rainy afternoon", "temple": "Temples to visit at a calm time", "walk": "Quiet walks near {a}",
              "general": "Quiet places near {a}"}
    places = []
    for r in rec["candidates"]:
        p = r["place"]
        info = f"{p['area']} · {travel_label(r['mins'])} · {'Free' if not p['cost'] else 'Rp{:,}'.format(p['cost']).replace(',', '.')}"
        places.append({"id": p["id"], "name": p["name"], "info": info, "crowd": crowd_label(r["crowd"], bool(p["is_local"])),
                       "best_time": f"{r['hour']:02d}:00", "local": p["local_nearby"] or "Local business", "why": reasons(r, day)})
    when = day.strftime("%A %-d %b")
    text = f"For {when}. Picked for quiet times, travel time from {stay_area}, places our team has checked, and local businesses nearby." if places \
        else "I couldn't find a good match yet. Try asking about waterfalls, rice terraces, food or rainy-day ideas."
    return {"title": titles[rec["topic"]].format(a=stay_area), "text": text, "places": places, "topic": rec["topic"], "date": rec["date"]}
