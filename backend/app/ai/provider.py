"""
AI adapter. The rest of the app only calls `get_provider().answer_traveler(...)` / `.answer_business(...)`.

  RulesProvider        built-in, works offline, explainable. Used for the MVP.
  CustomModelProvider  calls YOUR model over HTTP. Our engine still picks the candidate places
                       (retrieval), your model only writes the answer (generation). If your model
                       is down or returns bad JSON, we fall back to RulesProvider automatically.

Switch with an environment variable:   TI_AI_PROVIDER=custom   TI_MODEL_URL=http://your-model:9000/generate
"""
import logging, httpx
from .. import config
from ..services import recommend, forecast, trends

log = logging.getLogger("ti.ai")

class RulesProvider:
    name = "rules"

    def answer_traveler(self, con, question: str, stay_area: str) -> dict:
        rec = recommend.recommend(con, question, stay_area)
        return recommend.as_answer(rec, stay_area)

    def answer_business(self, con, question: str, prop: dict) -> dict:
        q = question.lower()
        days = forecast.forecast(con, prop)
        if any(w in q for w in ("rate", "price", "harga", "saturday", "weekend", "sabtu")):
            top = max(days, key=lambda d: d["idx"])
            sug = top["sug"] or forecast.suggested_rate(prop["base_rate"], top["idx"]) or top["rate"]
            pct = round((sug - top["rate"]) / top["rate"] * 100)
            return {"title": f"{'Raise' if pct > 0 else 'Keep'} {top['d']} {top['n']} {'by about ' + str(pct) + '%' if pct > 0 else 'as it is'}",
                    "text": f"Demand near you is {top['idx'] - 100:+d}% vs a normal day. This is your busiest day in the next two weeks.",
                    "facts": [[str(top["idx"]), "Demand index (100 = normal)"], [f"{top['booked']}%", "Of rooms already booked"],
                              [f"Rp{sug/1e6:.2f} jt".replace(".", ","), "Suggested price"]],
                    "action": ["Open in Rates", "07b-business-rates.html"]}
        if any(w in q for w in ("package", "paket", "interest", "trend", "asking")):
            t = trends.trends(con, prop["area"], 3)
            if not t:
                return {"title": "Not enough traveler questions yet", "text": "Trends appear once travelers near you start asking.", "facts": [], "action": ["Open Packages", "07d-business-packages.html"]}
            return {"title": f"{t[0]['t']} {'is' if len(t)==1 else 'are'} rising near you", "text": "From anonymous traveler questions in your area this week, compared with last week.",
                    "facts": [[x["c"], f"{x['t']} · {x['q']} questions"] for x in t], "action": ["Build a package", "07d-business-packages.html"]}
        hi = [d for d in days if d["idx"] >= 105]
        return {"title": "Your next two weeks at a glance",
                "text": f"{len(hi)} high-demand day(s) ahead." + (f" The busiest is {hi[0]['d']} {hi[0]['n']}." if hi else " Demand looks normal."),
                "facts": [[str(max(d['idx'] for d in days)), "Highest demand index"], [str(sum(1 for d in days if d['sug'])), "Price suggestions waiting"]],
                "action": ["Open Rates", "07b-business-rates.html"]}


class CustomModelProvider(RulesProvider):
    """
    Contract for YOUR model's endpoint (POST TI_MODEL_URL):

      request  {"task": "traveler_answer", "question": str, "stay_area": str,
                "candidates": [{"id","name","info","crowd","best_time","local","why"}, ...]}
      response {"title": str, "text": str,
                "places": [{"id": int, "why": str}, ...]}     # pick/reorder candidates, rewrite the "why"

    The model may only choose from the candidates we send, so it can't invent places.
    """
    name = "custom"

    def answer_traveler(self, con, question: str, stay_area: str) -> dict:
        base = super().answer_traveler(con, question, stay_area)
        try:
            r = httpx.post(config.MODEL_URL, timeout=config.MODEL_TIMEOUT, json={
                "task": "traveler_answer", "question": question, "stay_area": stay_area, "candidates": base["places"]})
            r.raise_for_status(); out = r.json()
            by_id = {p["id"]: p for p in base["places"]}
            places = [{**by_id[p["id"]], "why": p.get("why") or by_id[p["id"]]["why"]} for p in out.get("places", []) if p.get("id") in by_id]
            if not places: raise ValueError("model returned no valid places")
            return {**base, "title": out.get("title") or base["title"], "text": out.get("text") or base["text"], "places": places}
        except Exception as e:
            log.warning("custom model failed, using rules: %s", e)
            return base


def get_provider():
    return CustomModelProvider() if config.AI_PROVIDER == "custom" else RulesProvider()
