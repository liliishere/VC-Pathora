from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from ..db import get_db, row
from ..security import optional_user, require
from ..ai.provider import get_provider
from ..services.recommend import detect_topic, detect_date
from .. import config

router = APIRouter(prefix="/api", tags=["ai"])

def quota_left(con, who: str, plan: str):
    total = config.QUOTA.get(plan)
    if total is None: return None, None
    used = con.execute("SELECT count FROM usage WHERE who=? AND day=?", (who, config.today().isoformat())).fetchone()
    return total - (used[0] if used else 0), total

def use_one(con, who: str):
    con.execute("INSERT INTO usage(who,day,count) VALUES(?,?,1) ON CONFLICT(who,day) DO UPDATE SET count=count+1", (who, config.today().isoformat()))

def log_question(con, role: str, area: str, question: str):
    """Anonymous: no user id is stored, only area / topic / date."""
    con.execute("INSERT INTO question_log(role,area,topic,for_date,asked_on) VALUES(?,?,?,?,?)",
                (role, area, detect_topic(question), detect_date(question, config.today()).isoformat(), config.today().isoformat()))

class Ask(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    trip_id: int | None = None

@router.post("/chat")
def chat(body: Ask, user=Depends(optional_user), x_guest_id: str | None = Header(default=None), con=Depends(get_db)):
    if user:
        who, plan = f"u{user['id']}", user["plan"]
    else:
        if not x_guest_id: raise HTTPException(400, "Missing guest id")
        who, plan = f"g{x_guest_id[:64]}", "guest"
    left, total = quota_left(con, who, plan)
    if left is not None and left <= 0:
        raise HTTPException(429, "No questions left today")
    stay = "Ubud"
    if user and body.trip_id:
        t = row(con.execute("SELECT t.stay_area FROM trips t JOIN trip_members m ON m.trip_id=t.id WHERE t.id=? AND m.user_id=?", (body.trip_id, user["id"])))
        if t: stay = t["stay_area"]
    answer = get_provider().answer_traveler(con, body.message, stay)
    use_one(con, who)
    if not user or user["share_data"]:
        log_question(con, "traveler", stay, body.message)
    return {"answer": answer, "quota_left": None if left is None else left - 1, "quota_total": total}

@router.post("/business/chat")
def business_chat(body: Ask, user=Depends(require("business")), con=Depends(get_db)):
    prop = row(con.execute("SELECT * FROM properties WHERE owner_id=?", (user["id"],)))
    if not prop: raise HTTPException(400, "Set up your property first")
    who = f"u{user['id']}"
    left, total = quota_left(con, who, user["plan"])
    if left is not None and left <= 0: raise HTTPException(429, "No questions left today")
    answer = get_provider().answer_business(con, body.message, prop)
    use_one(con, who)
    return {"answer": answer, "quota_left": None if left is None else left - 1, "quota_total": total}

class Feedback(BaseModel):
    kind: str = Field(pattern="^(useful|wrong)$")
    place: str | None = None
    note: str | None = Field(default=None, max_length=500)

@router.post("/feedback")
def feedback(body: Feedback, con=Depends(get_db)):
    con.execute("INSERT INTO feedback(kind,place,note) VALUES(?,?,?)", (body.kind, body.place, body.note))
    return {"ok": True}
