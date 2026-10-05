"""SQLite storage. One connection per request; schema created on startup."""
import sqlite3, os, json
from contextlib import contextmanager
from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('traveler','business','admin')),
  plan TEXT NOT NULL DEFAULT 'free', trial_ends TEXT, share_data INTEGER NOT NULL DEFAULT 1,
  interests TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS places(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL, category TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '',
  cost INTEGER NOT NULL DEFAULT 0, duration_h REAL NOT NULL DEFAULT 1, open_h INTEGER NOT NULL DEFAULT 8, close_h INTEGER NOT NULL DEFAULT 17,
  peak_h INTEGER NOT NULL DEFAULT 12, peak_level INTEGER NOT NULL DEFAULT 70, base_level INTEGER NOT NULL DEFAULT 20,
  indoor INTEGER NOT NULL DEFAULT 0, is_local INTEGER NOT NULL DEFAULT 0, local_nearby TEXT NOT NULL DEFAULT '',
  team_rating REAL NOT NULL DEFAULT 4.0, verified_at TEXT, note TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS trips(
  id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL,
  start_date TEXT NOT NULL, end_date TEXT NOT NULL, stay_area TEXT NOT NULL DEFAULT 'Ubud',
  invite_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS trip_members(trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'editor', PRIMARY KEY(trip_id, user_id));
CREATE TABLE IF NOT EXISTS invites(id INTEGER PRIMARY KEY, trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE, email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS stops(
  id INTEGER PRIMARY KEY, trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE, date TEXT NOT NULL, time TEXT NOT NULL,
  place_id INTEGER REFERENCES places(id), name TEXT NOT NULL, area TEXT NOT NULL DEFAULT '', cost INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id));
CREATE TABLE IF NOT EXISTS budgets(trip_id INTEGER PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
  stay INTEGER NOT NULL DEFAULT 0, transport INTEGER NOT NULL DEFAULT 0, food INTEGER NOT NULL DEFAULT 0, people INTEGER);
CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY, trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  what TEXT NOT NULL, amount INTEGER NOT NULL, paid_by INTEGER NOT NULL REFERENCES users(id), settled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY, trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
-- Anonymous: no user id, only what businesses may see as combined trends
CREATE TABLE IF NOT EXISTS question_log(id INTEGER PRIMARY KEY, role TEXT NOT NULL, area TEXT NOT NULL, topic TEXT NOT NULL,
  for_date TEXT, asked_on TEXT NOT NULL, synthetic INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS usage(who TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(who, day));
CREATE TABLE IF NOT EXISTS properties(id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL,
  area TEXT NOT NULL, rooms INTEGER NOT NULL, base_rate INTEGER NOT NULL, stars INTEGER, ota_share INTEGER NOT NULL DEFAULT 50);
CREATE TABLE IF NOT EXISTS rates(property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE, date TEXT NOT NULL, rate INTEGER NOT NULL,
  PRIMARY KEY(property_id, date));
CREATE TABLE IF NOT EXISTS packages(id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL, nights INTEGER NOT NULL, price INTEGER NOT NULL, months TEXT NOT NULL, items TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Draft');
CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('useful','wrong')), place TEXT,
  note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
"""

def connect():
    os.makedirs(os.path.dirname(os.path.abspath(config.DB_PATH)), exist_ok=True)
    con = sqlite3.connect(config.DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con

def init():
    with connect() as con:
        con.executescript(SCHEMA)

def get_db():
    """FastAPI dependency: one connection per request, committed at the end."""
    con = connect()
    try:
        yield con
        con.commit()
    finally:
        con.close()

def rows(cur):  return [dict(r) for r in cur.fetchall()]
def row(cur):
    r = cur.fetchone()
    return dict(r) if r else None
