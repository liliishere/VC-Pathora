import datetime as dt, secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..db import get_db, row, rows
from ..security import current_user
from ..services import recommend, budget as budget_svc
from ..services.geo import travel_min, travel_label
from .. import config

router = APIRouter(prefix="/api", tags=["trips"])
DAYNAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

def member_trip(con, trip_id: int, user) -> dict:
    t = row(con.execute("SELECT t.* FROM trips t JOIN trip_members m ON m.trip_id=t.id WHERE t.id=? AND m.user_id=?", (trip_id, user["id"])))
    if not t: raise HTTPException(404, "Trip not found")
    return t

def log(con, trip_id, text): con.execute("INSERT INTO activity(trip_id,text) VALUES(?,?)", (trip_id, text))

def stop_out(con, s: dict, prev: dict | None, day: dt.date) -> dict:
    """Frontend shape for one stop, with live crowd estimate and travel time from the previous stop."""
    crowd, why, better = "local", "", None
    if s["place_id"]:
        p = row(con.execute("SELECT * FROM places WHERE id=?", (s["place_id"],)))
        level = recommend.crowd_at(p, day, int(s["time"][:2]))
        crowd = recommend.crowd_label(level, bool(p["is_local"]))
        why = recommend.reasons({"place": p, "hour": recommend.best_hour(p, day)[0], "crowd": level, "verified": bool(p["verified_at"])}, day)
        if crowd == "busy":
            h, lvl = recommend.best_hour(p, day)
            if lvl < level - 15: better = f"{h:02d}:00"
    travel = travel_label(travel_min(prev["area"], s["area"])) if prev else ""
    return {"id": s["id"], "time": s["time"], "name": s["name"], "area": s["area"], "crowd": crowd, "cost": s["cost"],
            "travel": travel, "why": why or "Added by you.", **({"better": better} if better else {})}

def full_trip(con, t: dict) -> dict:
    start, end = dt.date.fromisoformat(t["start_date"]), dt.date.fromisoformat(t["end_date"])
    people = rows(con.execute("SELECT u.id, u.name, m.role FROM trip_members m JOIN users u ON u.id=m.user_id WHERE m.trip_id=? ORDER BY m.role DESC, u.id", (t["id"],)))
    days, d = [], start
    while d <= end:
        st = rows(con.execute("SELECT * FROM stops WHERE trip_id=? AND date=? ORDER BY time", (t["id"], d.isoformat())))
        out, prev = [], None
        for s in st: out.append(stop_out(con, s, prev, d)); prev = s
        days.append({"id": d.isoformat(), "date": d.isoformat(), "label": DAYNAMES[d.weekday()], "num": d.day, "weather": "", "stops": out})
        d += dt.timedelta(days=1)
    return {"id": t["id"], "name": t["name"], "dates": f"{start.strftime('%a %-d')} – {end.strftime('%a %-d %b')}", "stay": t["stay_area"],
            "invite_code": t["invite_code"], "people": [{"id": p["id"], "name": p["name"], "role": p["role"]} for p in people], "days": days}

class NewTrip(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    start_date: dt.date
    end_date: dt.date
    stay_area: str = "Ubud"

@router.get("/trips")
def list_trips(user=Depends(current_user), con=Depends(get_db)):
    return rows(con.execute("""SELECT t.id, t.name, t.start_date, t.end_date, t.stay_area,
        (SELECT COUNT(*) FROM trip_members WHERE trip_id=t.id) AS people,
        (SELECT COUNT(DISTINCT date) FROM stops WHERE trip_id=t.id) AS days_planned
        FROM trips t JOIN trip_members m ON m.trip_id=t.id WHERE m.user_id=? ORDER BY t.start_date""", (user["id"],)))

@router.post("/trips")
def create_trip(body: NewTrip, user=Depends(current_user), con=Depends(get_db)):
    if body.end_date < body.start_date or (body.end_date - body.start_date).days > 30:
        raise HTTPException(400, "Trips can be 1 to 31 days long")
    if user["plan"] == "free" and con.execute("SELECT COUNT(*) FROM trip_members WHERE user_id=?", (user["id"],)).fetchone()[0] >= 3:
        raise HTTPException(402, "The Free plan has up to 3 trips")
    cur = con.execute("INSERT INTO trips(owner_id,name,start_date,end_date,stay_area,invite_code) VALUES(?,?,?,?,?,?)",
                      (user["id"], body.name, body.start_date.isoformat(), body.end_date.isoformat(), body.stay_area, secrets.token_urlsafe(6)))
    con.execute("INSERT INTO trip_members(trip_id,user_id,role) VALUES(?,?,'organiser')", (cur.lastrowid, user["id"]))
    con.execute("INSERT INTO budgets(trip_id) VALUES(?)", (cur.lastrowid,))
    log(con, cur.lastrowid, f"{user['name']} created the trip")
    return {"id": cur.lastrowid}

@router.get("/trips/{trip_id}")
def get_trip(trip_id: int, user=Depends(current_user), con=Depends(get_db)):
    return full_trip(con, member_trip(con, trip_id, user))

@router.get("/trips/{trip_id}/ideas")
def ideas(trip_id: int, q: str = "", user=Depends(current_user), con=Depends(get_db)):
    t = member_trip(con, trip_id, user)
    used = {r[0] for r in con.execute("SELECT place_id FROM stops WHERE trip_id=? AND place_id IS NOT NULL", (trip_id,))}
    day = dt.date.fromisoformat(t["start_date"])
    ps = rows(con.execute("SELECT * FROM places WHERE name LIKE ? OR area LIKE ? OR category LIKE ?", (f"%{q}%",)*3))
    ranked = sorted((recommend.score(p, day, t["stay_area"]) for p in ps if p["id"] not in used), key=lambda r: -r["score"])[:8]
    return [{"id": r["place"]["id"], "name": r["place"]["name"], "area": r["place"]["area"], "cost": r["place"]["cost"],
             "crowd": recommend.crowd_label(r["crowd"], bool(r["place"]["is_local"])),
             "info": f"{travel_label(r['mins'])} · {r['place']['duration_h']:g} h", "why": recommend.reasons(r, day)} for r in ranked]

def free_quiet_hour(con, trip_id: int, day: dt.date, p: dict) -> str:
    """Pick the quietest opening hour that leaves at least an hour around existing stops."""
    taken = [int(r[0][:2]) for r in con.execute("SELECT time FROM stops WHERE trip_id=? AND date=?", (trip_id, day.isoformat()))]
    last = max(p["open_h"], p["close_h"] - int(-(-p["duration_h"] // 1)))
    hours = sorted(range(p["open_h"], last + 1), key=lambda h: (recommend.crowd_at(p, day, h), h))
    for h in hours:
        if all(abs(h - t) >= max(1, round(p["duration_h"])) for t in taken):
            return f"{h:02d}:00"
    return f"{hours[0]:02d}:00"

class AddStop(BaseModel):
    date: dt.date
    place_id: int | None = None
    name: str | None = None
    time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    cost: int = 0

@router.post("/trips/{trip_id}/stops")
def add_stop(trip_id: int, body: AddStop, user=Depends(current_user), con=Depends(get_db)):
    t = member_trip(con, trip_id, user)
    if not (t["start_date"] <= body.date.isoformat() <= t["end_date"]): raise HTTPException(400, "That day isn't part of this trip")
    if body.place_id:
        p = row(con.execute("SELECT * FROM places WHERE id=?", (body.place_id,)))
        if not p: raise HTTPException(404, "Place not found")
        name, area, cost = p["name"], p["area"], p["cost"]
        time = body.time or free_quiet_hour(con, trip_id, body.date, p)   # quietest hour that doesn't clash
    else:
        if not body.name: raise HTTPException(400, "Give the stop a name")
        name, area, cost, time = body.name, t["stay_area"], body.cost, body.time or "12:00"
    cur = con.execute("INSERT INTO stops(trip_id,date,time,place_id,name,area,cost,created_by) VALUES(?,?,?,?,?,?,?,?)",
                      (trip_id, body.date.isoformat(), time, body.place_id, name, area, cost, user["id"]))
    log(con, trip_id, f"{user['name']} added {name} to {body.date.strftime('%a %-d')}")
    s = row(con.execute("SELECT * FROM stops WHERE id=?", (cur.lastrowid,)))
    return stop_out(con, s, None, body.date)

class MoveStop(BaseModel):
    time: str = Field(pattern=r"^\d{2}:\d{2}$")

@router.patch("/stops/{stop_id}")
def move_stop(stop_id: int, body: MoveStop, user=Depends(current_user), con=Depends(get_db)):
    s = row(con.execute("SELECT * FROM stops WHERE id=?", (stop_id,)))
    if not s: raise HTTPException(404, "Stop not found")
    member_trip(con, s["trip_id"], user)
    con.execute("UPDATE stops SET time=? WHERE id=?", (body.time, stop_id))
    return {"ok": True}

@router.delete("/stops/{stop_id}")
def delete_stop(stop_id: int, user=Depends(current_user), con=Depends(get_db)):
    s = row(con.execute("SELECT * FROM stops WHERE id=?", (stop_id,)))
    if not s: raise HTTPException(404, "Stop not found")
    member_trip(con, s["trip_id"], user)
    con.execute("DELETE FROM stops WHERE id=?", (stop_id,))
    return {"ok": True}

# ---------- Budget & split bill ----------
def budget_payload(con, t):
    b = row(con.execute("SELECT * FROM budgets WHERE trip_id=?", (t["id"],))) or {"stay": 0, "transport": 0, "food": 0, "people": None}
    members = rows(con.execute("SELECT u.id, u.name FROM trip_members m JOIN users u ON u.id=m.user_id WHERE m.trip_id=?", (t["id"],)))
    act = con.execute("SELECT COALESCE(SUM(cost),0) FROM stops WHERE trip_id=?", (t["id"],)).fetchone()[0]
    people = b["people"] or len(members)
    exps = rows(con.execute("SELECT e.*, u.name AS paid_by_name FROM expenses e JOIN users u ON u.id=e.paid_by WHERE trip_id=? AND settled=0 ORDER BY e.id", (t["id"],)))
    return {"estimate": budget_svc.estimate(b, act, people), "members": members, "expenses": exps,
            "paid": sum(e["amount"] for e in exps), "settle": budget_svc.settle_up(members, exps)}

@router.get("/trips/{trip_id}/budget")
def get_budget(trip_id: int, user=Depends(current_user), con=Depends(get_db)):
    return budget_payload(con, member_trip(con, trip_id, user))

class BudgetIn(BaseModel):
    stay: int = Field(ge=0); transport: int = Field(ge=0); food: int = Field(ge=0); people: int = Field(ge=1, le=20)

@router.put("/trips/{trip_id}/budget")
def put_budget(trip_id: int, body: BudgetIn, user=Depends(current_user), con=Depends(get_db)):
    t = member_trip(con, trip_id, user)
    con.execute("INSERT INTO budgets(trip_id,stay,transport,food,people) VALUES(?,?,?,?,?) ON CONFLICT(trip_id) DO UPDATE SET stay=excluded.stay, transport=excluded.transport, food=excluded.food, people=excluded.people",
                (trip_id, body.stay, body.transport, body.food, body.people))
    return budget_payload(con, t)

class ExpenseIn(BaseModel):
    what: str = Field(min_length=1, max_length=120); amount: int = Field(gt=0); paid_by: int

@router.post("/trips/{trip_id}/expenses")
def add_expense(trip_id: int, body: ExpenseIn, user=Depends(current_user), con=Depends(get_db)):
    t = member_trip(con, trip_id, user)
    if not con.execute("SELECT 1 FROM trip_members WHERE trip_id=? AND user_id=?", (trip_id, body.paid_by)).fetchone():
        raise HTTPException(400, "That person isn't on this trip")
    con.execute("INSERT INTO expenses(trip_id,what,amount,paid_by) VALUES(?,?,?,?)", (trip_id, body.what, body.amount, body.paid_by))
    log(con, trip_id, f"{user['name']} added {body.what} to the split bill")
    return budget_payload(con, t)

@router.delete("/expenses/{exp_id}")
def delete_expense(exp_id: int, user=Depends(current_user), con=Depends(get_db)):
    e = row(con.execute("SELECT * FROM expenses WHERE id=?", (exp_id,)))
    if not e: raise HTTPException(404, "Not found")
    t = member_trip(con, e["trip_id"], user)
    con.execute("DELETE FROM expenses WHERE id=?", (exp_id,))
    return budget_payload(con, t)

@router.post("/trips/{trip_id}/settle")
def settle(trip_id: int, user=Depends(current_user), con=Depends(get_db)):
    t = member_trip(con, trip_id, user)
    con.execute("UPDATE expenses SET settled=1 WHERE trip_id=?", (trip_id,))
    log(con, trip_id, f"{user['name']} marked the split bill as settled")
    return budget_payload(con, t)

# ---------- Friends ----------
@router.get("/trips/{trip_id}/members")
def members(trip_id: int, user=Depends(current_user), con=Depends(get_db)):
    t = member_trip(con, trip_id, user)
    return {"members": rows(con.execute("SELECT u.id, u.name, m.role FROM trip_members m JOIN users u ON u.id=m.user_id WHERE m.trip_id=?", (trip_id,))),
            "invited": rows(con.execute("SELECT email FROM invites WHERE trip_id=?", (trip_id,))),
            "invite_code": t["invite_code"],
            "activity": rows(con.execute("SELECT text, created_at FROM activity WHERE trip_id=? ORDER BY id DESC LIMIT 10", (trip_id,)))}

class InviteIn(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

@router.post("/trips/{trip_id}/invite")
def invite(trip_id: int, body: InviteIn, user=Depends(current_user), con=Depends(get_db)):
    member_trip(con, trip_id, user)
    con.execute("INSERT INTO invites(trip_id,email) VALUES(?,?)", (trip_id, body.email.lower()))
    log(con, trip_id, f"{user['name']} invited {body.email}")
    return {"ok": True, "note": "MVP: the invite is saved. Sending real emails is a later step."}

@router.post("/trips/join/{code}")
def join(code: str, user=Depends(current_user), con=Depends(get_db)):
    t = row(con.execute("SELECT * FROM trips WHERE invite_code=?", (code,)))
    if not t: raise HTTPException(404, "This invite link isn't valid")
    con.execute("INSERT OR IGNORE INTO trip_members(trip_id,user_id,role) VALUES(?,?,'editor')", (t["id"], user["id"]))
    log(con, t["id"], f"{user['name']} joined the trip")
    return {"trip_id": t["id"]}

@router.get("/places")
def places(q: str = "", con=Depends(get_db)):
    return rows(con.execute("SELECT id,name,area,category,cost,duration_h,is_local,local_nearby,verified_at FROM places WHERE name LIKE ? OR area LIKE ? ORDER BY name", (f"%{q}%", f"%{q}%")))
