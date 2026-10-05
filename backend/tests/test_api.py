"""Run: pytest -q   (uses a fresh temporary database)"""
import os, tempfile, importlib
os.environ["TI_DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["TI_FRONTEND_DIR"] = "/nonexistent"
from fastapi.testclient import TestClient
from app import main, seed
seed.run(reset=True)
client = TestClient(main.app)

def login(email):
    r = client.post("/api/auth/login", json={"email": email, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}

def test_register_login_me():
    r = client.post("/api/auth/register", json={"name": "Budi", "email": "budi@x.id", "password": "longenough", "role": "traveler"})
    assert r.status_code == 200 and r.json()["user"]["plan"] == "free"
    assert client.post("/api/auth/register", json={"name": "B", "email": "budi@x.id", "password": "longenough", "role": "traveler"}).status_code == 409
    h = {"Authorization": "Bearer " + r.json()["token"]}
    me = client.get("/api/me", headers=h).json()
    assert me["quota_left"] == 15 and me["has_trip"] is False
    assert client.post("/api/auth/login", json={"email": "budi@x.id", "password": "wrongpass"}).status_code == 401

def test_guest_chat_quota_and_answer_shape():
    g = {"X-Guest-Id": "guest-abc"}
    r = client.post("/api/chat", json={"message": "quiet waterfall near Ubud on Saturday?"}, headers=g).json()
    a = r["answer"]
    assert a["places"] and {"name", "crowd", "why", "info"} <= set(a["places"][0]) and r["quota_left"] == 4
    for _ in range(4): client.post("/api/chat", json={"message": "food"}, headers=g)
    assert client.post("/api/chat", json={"message": "food"}, headers=g).status_code == 429

def test_recommendations_ignore_popularity_and_prefer_quiet():
    a = client.post("/api/chat", json={"message": "rice terraces without crowds"}, headers={"X-Guest-Id": "g2"}).json()["answer"]
    names = [p["name"] for p in a["places"]]
    assert "Tegallalang rice terraces" not in names     # busiest one should not win

def test_trip_itinerary_budget_split():
    h = login("maya@demo.id")
    trips = client.get("/api/trips", headers=h).json(); tid = trips[0]["id"]
    t = client.get(f"/api/trips/{tid}", headers=h).json()
    assert len(t["days"]) == 7 and len(t["people"]) == 2
    sat = next(d for d in t["days"] if d["date"] == "2026-10-10")
    assert any(s.get("better") for s in sat["stops"])        # busy Art Market gets a "move" suggestion
    idea = client.get(f"/api/trips/{tid}/ideas", headers=h).json()[0]
    stop = client.post(f"/api/trips/{tid}/stops", json={"date": "2026-10-13", "place_id": idea["id"]}, headers=h).json()
    assert stop["name"] == idea["name"]
    assert client.delete(f"/api/stops/{stop['id']}", headers=h).status_code == 200
    b = client.get(f"/api/trips/{tid}/budget", headers=h).json()
    assert b["settle"] == [{"from": "Jess", "to": "Maya", "amount": 700000}]
    b = client.post(f"/api/trips/{tid}/settle", headers=h).json()
    assert b["settle"] == [] and b["paid"] == 0

def test_trip_privacy():
    h = login("ratna@demo.id")
    assert client.get("/api/trips/1", headers=h).status_code == 404

def test_business_forecast_rates_packages_chat():
    h = login("ratna@demo.id")
    days = client.get("/api/business/forecast", headers=h).json()
    assert len(days) == 14
    top = max(days, key=lambda d: d["idx"]); assert top["date"] == "2026-10-10" and top["sug"]
    days = client.put(f"/api/business/rates/{top['date']}", json={"rate": top["sug"]}, headers=h).json()
    assert next(d for d in days if d["date"] == top["date"])["applied"]
    tr = client.get("/api/business/trends", headers=h).json(); assert tr[0]["t"] == "Quiet waterfalls"
    pk = client.post("/api/business/packages", json={"name": "Test", "nights": 2, "price": 1000000, "months": "Feb", "items": ["Rice terrace walk"]}, headers=h).json()
    assert client.patch(f"/api/business/packages/{pk['id']}", json={"status": "Ready"}, headers=h).json()["status"] == "Ready"
    a = client.post("/api/business/chat", json={"message": "should I raise my rate?"}, headers=h).json()["answer"]
    assert a["facts"]

def test_roles_are_enforced():
    h = login("maya@demo.id")
    assert client.get("/api/business/forecast", headers=h).status_code == 403
    assert client.get("/api/admin/metrics", headers=h).status_code == 403
    assert client.get("/api/admin/metrics", headers=login("admin@demo.id")).status_code == 200

def test_anonymous_logging_respects_consent():
    h = login("jess@demo.id")
    client.patch("/api/me/privacy", json={"share_data": False}, headers=h)
    import sqlite3; con = sqlite3.connect(os.environ["TI_DB_PATH"])
    before = con.execute("SELECT COUNT(*) FROM question_log").fetchone()[0]
    client.post("/api/chat", json={"message": "temple"}, headers=h)
    assert con.execute("SELECT COUNT(*) FROM question_log").fetchone()[0] == before
    cols = [r[1] for r in con.execute("PRAGMA table_info(question_log)")]
    assert "user_id" not in cols    # the log can never identify a person

def test_custom_model_falls_back_when_down(monkeypatch):
    from app import config
    monkeypatch.setattr(config, "AI_PROVIDER", "custom"); monkeypatch.setattr(config, "MODEL_URL", "http://127.0.0.1:1/none"); monkeypatch.setattr(config, "MODEL_TIMEOUT", 0.5)
    r = client.post("/api/chat", json={"message": "waterfall"}, headers={"X-Guest-Id": "g3"})
    assert r.status_code == 200 and r.json()["answer"]["places"]
