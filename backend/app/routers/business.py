import json, datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..db import get_db, row, rows
from ..security import require
from ..services import forecast as fc, trends as tr

router = APIRouter(prefix="/api/business", tags=["business"])

def my_property(con, user):
    p = row(con.execute("SELECT * FROM properties WHERE owner_id=?", (user["id"],)))
    if not p: raise HTTPException(400, "Set up your property first")
    return p

class PropertyIn(BaseModel):
    name: str = Field(min_length=1, max_length=120); area: str; rooms: int = Field(gt=0, le=2000)
    base_rate: int = Field(gt=0); stars: int | None = Field(default=None, ge=1, le=5); ota_share: int = Field(default=50, ge=0, le=100)

@router.post("/property")
def save_property(body: PropertyIn, user=Depends(require("business")), con=Depends(get_db)):
    if row(con.execute("SELECT id FROM properties WHERE owner_id=?", (user["id"],))):
        con.execute("UPDATE properties SET name=?,area=?,rooms=?,base_rate=?,stars=?,ota_share=? WHERE owner_id=?",
                    (body.name, body.area, body.rooms, body.base_rate, body.stars, body.ota_share, user["id"]))
    else:
        con.execute("INSERT INTO properties(owner_id,name,area,rooms,base_rate,stars,ota_share) VALUES(?,?,?,?,?,?,?)",
                    (user["id"], body.name, body.area, body.rooms, body.base_rate, body.stars, body.ota_share))
    return my_property(con, user)

@router.get("/property")
def get_property(user=Depends(require("business")), con=Depends(get_db)):
    return my_property(con, user)

@router.get("/forecast")
def get_forecast(days: int = 14, user=Depends(require("business")), con=Depends(get_db)):
    return fc.forecast(con, my_property(con, user), min(max(days, 1), 28))

class RateIn(BaseModel):
    rate: int = Field(gt=0)

@router.put("/rates/{date}")
def set_rate(date: dt.date, body: RateIn, user=Depends(require("business")), con=Depends(get_db)):
    p = my_property(con, user)
    con.execute("INSERT INTO rates(property_id,date,rate) VALUES(?,?,?) ON CONFLICT(property_id,date) DO UPDATE SET rate=excluded.rate", (p["id"], date.isoformat(), body.rate))
    return fc.forecast(con, p)

@router.post("/rates/apply-all")
def apply_all(user=Depends(require("business")), con=Depends(get_db)):
    p = my_property(con, user); n = 0
    for d in fc.forecast(con, p):
        if d["sug"]:
            con.execute("INSERT INTO rates(property_id,date,rate) VALUES(?,?,?) ON CONFLICT(property_id,date) DO UPDATE SET rate=excluded.rate", (p["id"], d["date"], d["sug"])); n += 1
    return {"applied": n, "days": fc.forecast(con, p)}

@router.get("/trends")
def get_trends(user=Depends(require("business")), con=Depends(get_db)):
    return tr.trends(con, my_property(con, user)["area"])

class PackageIn(BaseModel):
    name: str = Field(min_length=1, max_length=120); nights: int = Field(ge=1, le=14); price: int = Field(gt=0)
    months: str = Field(max_length=40); items: list[str] = Field(min_length=1, max_length=12)

def pk_out(r): return {**r, "items": json.loads(r["items"]), "when": r["months"]}

@router.get("/packages")
def list_packages(user=Depends(require("business")), con=Depends(get_db)):
    p = my_property(con, user)
    return [pk_out(r) for r in rows(con.execute("SELECT * FROM packages WHERE property_id=? ORDER BY id DESC", (p["id"],)))]

@router.post("/packages")
def create_package(body: PackageIn, user=Depends(require("business")), con=Depends(get_db)):
    p = my_property(con, user)
    cur = con.execute("INSERT INTO packages(property_id,name,nights,price,months,items) VALUES(?,?,?,?,?,?)",
                      (p["id"], body.name, body.nights, body.price, body.months, json.dumps(body.items)))
    return pk_out(row(con.execute("SELECT * FROM packages WHERE id=?", (cur.lastrowid,))))

class StatusIn(BaseModel):
    status: str = Field(pattern="^(Draft|Ready)$")

@router.patch("/packages/{pk_id}")
def set_status(pk_id: int, body: StatusIn, user=Depends(require("business")), con=Depends(get_db)):
    p = my_property(con, user)
    if not con.execute("UPDATE packages SET status=? WHERE id=? AND property_id=?", (body.status, pk_id, p["id"])).rowcount:
        raise HTTPException(404, "Package not found")
    return pk_out(row(con.execute("SELECT * FROM packages WHERE id=?", (pk_id,))))
