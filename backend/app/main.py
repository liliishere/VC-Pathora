"""
Tourism Intelligence — MVP backend.
Run:   uvicorn app.main:app --reload        then open http://localhost:8000
API docs (try every endpoint in the browser): http://localhost:8000/docs
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from . import db, config, seed
from .routers import auth, chat, trips, business, admin

@asynccontextmanager
async def lifespan(app):
    db.init()
    with db.connect() as con:
        empty = con.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
    if empty: seed.run()
    yield

app = FastAPI(title="Tourism Intelligence API", version="0.1.0", lifespan=lifespan,
              description="MVP backend: auth, Ask AI, trips (itinerary, budget, split bill, friends), business forecast, rates, packages, admin.")

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:5500", "http://127.0.0.1:5500"],
                   allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, chat.router, trips.router, business.router, admin.router):
    app.include_router(r)

@app.get("/api/health")
def health(): return {"ok": True, "ai_provider": config.AI_PROVIDER}

@app.get("/", include_in_schema=False)
def root(): return RedirectResponse("/01-landing.html")

# Serve the HTML pages from the same server (so the browser can call /api without CORS issues)
if os.path.isdir(config.FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=config.FRONTEND_DIR, html=True), name="frontend")
