"""Rising traveler interests near a property, from the anonymous question log."""
import datetime as dt
from .. import config

LABELS = {"waterfall": ("Quiet waterfalls", "Waterfall trip before 09:00"), "food": ("Local food", "Breakfast at a local warung"),
          "indoor": ("Rainy-day ideas", "Weaving workshop"), "rice": ("Rice terraces", "Rice terrace walk"),
          "temple": ("Temples at calm times", "Early temple visit"), "walk": ("Sunrise walks", "Guided sunrise walk"),
          "general": ("General trip questions", "Local guide")}

def trends(con, area: str, top: int = 4) -> list[dict]:
    today = config.today()
    a, b, c = (today - dt.timedelta(days=7)).isoformat(), today.isoformat(), (today - dt.timedelta(days=14)).isoformat()
    def counts(start, end):
        return {r[0]: r[1] for r in con.execute(
            "SELECT topic, COUNT(*) FROM question_log WHERE area=? AND asked_on>? AND asked_on<=? GROUP BY topic", (area, start, end))}
    now, before = counts(a, b), counts(c, a)
    out = []
    for topic, n in now.items():
        if topic == "general": continue
        prev = before.get(topic, 0)
        ratio = n / prev if prev else 3.0
        change = f"{ratio:.0f}×" if ratio >= 2 else f"{(ratio - 1) * 100:+.0f}%"
        out.append({"topic": topic, "t": LABELS[topic][0], "item": LABELS[topic][1], "q": n, "c": change, "ratio": ratio})
    return sorted(out, key=lambda x: -x["ratio"])[:top]
