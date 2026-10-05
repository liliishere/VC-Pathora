"""Trip cost estimate and 'who owes whom' (works for any number of people)."""

def settle_up(members: list[dict], expenses: list[dict]) -> list[dict]:
    """Greedy settlement: fewest transfers so everyone has paid an equal share."""
    if not members: return []
    paid = {m["id"]: 0 for m in members}
    for e in expenses:
        if not e.get("settled"): paid[e["paid_by"]] = paid.get(e["paid_by"], 0) + e["amount"]
    share = sum(paid.values()) / len(members)
    bal = {k: v - share for k, v in paid.items()}
    debt = sorted([[k, -v] for k, v in bal.items() if v < -0.5], key=lambda x: -x[1])
    cred = sorted([[k, v] for k, v in bal.items() if v > 0.5], key=lambda x: -x[1])
    names = {m["id"]: m["name"] for m in members}
    out, i, j = [], 0, 0
    while i < len(debt) and j < len(cred):
        amt = min(debt[i][1], cred[j][1])
        out.append({"from": names[debt[i][0]], "to": names[cred[j][0]], "amount": round(amt)})
        debt[i][1] -= amt; cred[j][1] -= amt
        if debt[i][1] < 0.5: i += 1
        if cred[j][1] < 0.5: j += 1
    return out

def estimate(budget: dict, activities_per_person: int, people: int) -> dict:
    act = activities_per_person * people
    total = budget["stay"] + budget["transport"] + budget["food"] + act
    return {"stay": budget["stay"], "transport": budget["transport"], "food": budget["food"], "activities": act,
            "total": total, "people": people, "per_person": round(total / max(1, people))}
