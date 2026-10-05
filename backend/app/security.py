"""Password hashing (PBKDF2, standard library) and bearer-token sessions."""
import hashlib, hmac, os, secrets
from fastapi import Depends, Header, HTTPException
from .db import get_db, row

ITER = 200_000

def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, ITER)
    return f"pbkdf2${ITER}${salt.hex()}${dk.hex()}"

def verify_password(pw: str, stored: str) -> bool:
    try:
        _, it, salt, dk = stored.split("$")
        test = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), int(it))
        return hmac.compare_digest(test.hex(), dk)
    except Exception:
        return False

def new_session(con, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    con.execute("INSERT INTO sessions(token,user_id) VALUES(?,?)", (token, user_id))
    return token

def _token(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None

def optional_user(authorization: str | None = Header(default=None), con=Depends(get_db)):
    t = _token(authorization)
    if not t: return None
    return row(con.execute("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?", (t,)))

def current_user(user=Depends(optional_user)):
    if not user: raise HTTPException(401, "Please log in")
    return user

def require(role: str):
    def dep(user=Depends(current_user)):
        if user["role"] != role and user["role"] != "admin":
            raise HTTPException(403, f"This needs a {role} account")
        return user
    return dep

def public_user(u: dict) -> dict:
    return {k: u[k] for k in ("id", "email", "name", "role", "plan", "trial_ends", "share_data")}
