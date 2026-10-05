import json, datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr, Field
from ..db import get_db, row
from ..security import hash_password, verify_password, new_session, current_user, public_user
from .. import config

router = APIRouter(prefix="/api", tags=["auth"])

class Register(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=200)
    role: str = Field(pattern="^(traveler|business)$")
    share_data: bool = True
    interests: list[str] = []

class Login(BaseModel):
    email: str
    password: str

@router.post("/auth/register")
def register(body: Register, con=Depends(get_db)):
    email = body.email.strip().lower()
    if row(con.execute("SELECT id FROM users WHERE email=?", (email,))):
        raise HTTPException(409, "An account with this email already exists")
    plan = "free" if body.role == "traveler" else "starter"
    trial = (config.today() + dt.timedelta(days=14)).isoformat() if body.role == "business" else None
    cur = con.execute("INSERT INTO users(email,name,password_hash,role,plan,trial_ends,share_data,interests) VALUES(?,?,?,?,?,?,?,?)",
                      (email, body.name.strip(), hash_password(body.password), body.role, plan, trial, int(body.share_data), json.dumps(body.interests)))
    user = row(con.execute("SELECT * FROM users WHERE id=?", (cur.lastrowid,)))
    return {"token": new_session(con, user["id"]), "user": public_user(user), "first_time": True}

@router.post("/auth/login")
def login(body: Login, con=Depends(get_db)):
    user = row(con.execute("SELECT * FROM users WHERE email=?", (body.email.strip().lower(),)))
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email or password is wrong")
    return {"token": new_session(con, user["id"]), "user": public_user(user)}

@router.post("/auth/logout")
def logout(authorization: str | None = Header(default=None), con=Depends(get_db)):
    if authorization: con.execute("DELETE FROM sessions WHERE token=?", (authorization[7:].strip(),))
    return {"ok": True}

@router.get("/me")
def me(user=Depends(current_user), con=Depends(get_db)):
    from .chat import quota_left
    out = public_user(user)
    out["quota_left"], out["quota_total"] = quota_left(con, f"u{user['id']}", user["plan"])
    out["today"] = config.today().isoformat()
    out["has_trip"] = bool(con.execute("SELECT 1 FROM trip_members WHERE user_id=?", (user["id"],)).fetchone())
    return out

class Prefs(BaseModel):
    share_data: bool

@router.patch("/me/privacy")
def privacy(body: Prefs, user=Depends(current_user), con=Depends(get_db)):
    con.execute("UPDATE users SET share_data=? WHERE id=?", (int(body.share_data), user["id"]))
    return {"share_data": body.share_data}

class StartPlan(BaseModel):
    plan: str = Field(pattern="^(plus|starter|growth)$")

@router.post("/subscriptions/start")
def start_plan(body: StartPlan, user=Depends(current_user), con=Depends(get_db)):
    """MVP: records the plan and trial end. Real payments (e.g. Midtrans or Xendit) plug in here later."""
    if (body.plan == "plus") != (user["role"] == "traveler"):
        raise HTTPException(400, "This plan isn't available for your account type")
    ends = (config.today() + dt.timedelta(days=config.TRIAL_DAYS[body.plan])).isoformat()
    con.execute("UPDATE users SET plan=?, trial_ends=? WHERE id=?", (body.plan, ends, user["id"]))
    return {"plan": body.plan, "trial_ends": ends, "charged_today": 0}
