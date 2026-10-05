#    Pathora — MVP

Travelers ask where to go in Bali and plan quieter trips. Their questions (anonymous, combined)
become demand forecasts that hotels use to set prices and build packages.

```
tourism-intelligence/
├── streamlit_app.py    Streamlit version (presentations / quick demo)
├── requirements.txt    for Streamlit
├── backend/            Python + FastAPI + SQLite
│   ├── app/
│   │   ├── main.py             app entry, serves the frontend too
│   │   ├── config.py           all settings (env variables)
│   │   ├── db.py               database schema
│   │   ├── security.py         passwords + login tokens
│   │   ├── seed.py             demo data
│   │   ├── routers/            API endpoints (auth, chat, trips, business, admin)
│   │   ├── services/           recommendation engine, forecast, trends, budget/split bill
│   │   └── ai/provider.py      AI adapter: built-in rules now, YOUR model later
│   └── tests/test_api.py
├── frontend/           the HTML pages + assets/ti.js (API client)
└── figma-static/       rendered copies of every page for html.to.design
```

## 0. Quickest: the Streamlit version (for presenting)

Same logic and database as the full app, in one Python file: `streamlit_app.py`.

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Opens at http://localhost:8501. Use the one-click demo buttons (Traveler / Hotel / Admin).

**Put it online for free (Streamlit Community Cloud, ~5 minutes):**
1. Push this whole folder to a GitHub repository (public or private).
2. Go to https://share.streamlit.io → **Create app** → pick your repo.
3. Main file: `streamlit_app.py` → **Deploy**. You get a link like `https://your-app.streamlit.app`.

Note: on the free cloud the database resets when the app restarts — fine for demos (demo data is re-created automatically).

## 1. Run the full web app (HTML pages + API)

You need Python 3.10 or newer.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate      Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open **http://localhost:8000**. Demo data is created automatically on the first run.

| Account | Email | Password |
|---|---|---|
| Traveler | maya@demo.id | demo1234 |
| Traveler (Maya's friend) | jess@demo.id | demo1234 |
| Hotel | ratna@demo.id | demo1234 |
| Admin | admin@demo.id | demo1234 |

**API docs:** http://localhost:8000/docs — try every endpoint from the browser.
**Tests:** `pytest -q`
**Start over with fresh demo data:** `python -m app.seed --reset`

> Opening the HTML files directly (double-click) still works: pages switch to built-in demo data.
> Served from http://localhost:8000 they use the real API.

## 2. What works in the MVP

| Feature | Page | API |
|---|---|---|
| Sign up (traveler / business), log in, log out | 02b, 02c, 02d | `POST /api/auth/register`, `/login`, `/logout`, `GET /api/me` |
| Property setup | 03 | `POST /api/business/property` |
| Start a free trial (no real payment yet) | 05a, 05b | `POST /api/subscriptions/start` |
| Ask AI with daily limits (guest 5, free 15) | 06c, 09 | `POST /api/chat` |
| Trips: create, itinerary, add/move/remove places | 06a, 06b | `/api/trips`, `/api/trips/{id}`, `/stops`, `/ideas` |
| Budget + split bill (any number of people) | 06b budget | `/api/trips/{id}/budget`, `/expenses`, `/settle` |
| Friends: invite link + join | 06b friends | `/api/trips/{id}/members`, `/invite`, `POST /api/trips/join/{code}` |
| 14-day demand forecast + rate suggestions | 07a, 07b | `GET /api/business/forecast`, `PUT /rates/{date}`, `POST /rates/apply-all` |
| Rising traveler interests + packages | 07d | `GET /api/business/trends`, `/api/business/packages` |
| Business Ask AI | 07c | `POST /api/business/chat` |
| Admin numbers | — | `GET /api/admin/metrics` |

**Not in the MVP yet (on purpose):** real payments (Midtrans/Xendit plug into `/api/subscriptions/start`),
sending invite emails, live maps/weather APIs (travel times and weather are estimates in `services/geo.py`
and `services/forecast.py`), booking.

## 3. How recommendations are chosen

`services/recommend.py` scores each curated place on four things — the same four the landing page promises:

1. **Quiet at your time** — crowd estimate for that day and hour (busier on weekends)
2. **Worth the trip** — team rating, and whether our team verified it in the last 90 days
3. **Easy to reach** — travel time from where you're staying
4. **Good for locals** — local business, or one nearby

**Popularity / virality is not an input**, and businesses can't pay to appear. Every answer includes its reasons.

## 4. Privacy

- Questions are logged **without any user id** (`question_log` has only area, topic and date).
- Travelers who switch off data sharing are not logged at all.
- Businesses only ever see combined counts (`/api/business/trends`).

## 5. Plugging in YOUR model later

The app never talks to an AI directly; it calls `ai/provider.py`. Today it uses `RulesProvider`.
When your model is ready:

1. Serve it behind an HTTP endpoint that follows this contract:

```
POST /generate
request  {"task": "traveler_answer", "question": "...", "stay_area": "Ubud",
          "candidates": [{"id": 1, "name": "...", "info": "...", "crowd": "quiet",
                          "best_time": "08:00", "local": "...", "why": "..."}]}
response {"title": "...", "text": "...", "places": [{"id": 1, "why": "..."}]}
```

   Our engine picks the candidate places (retrieval); your model writes the answer (generation)
   and may only choose from the candidates, so it can't invent places.

2. Start the backend with:

```bash
TI_AI_PROVIDER=custom TI_MODEL_URL=http://localhost:9000/generate uvicorn app.main:app
```

If your model is down or returns bad data, the app automatically falls back to the built-in engine.
Want to try the path today? Run the stand-in model: `python -m app.ai.mock_model_server`.

## 6. Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `TI_AI_PROVIDER` | `rules` | `rules` or `custom` |
| `TI_MODEL_URL` | `http://localhost:9000/generate` | your model endpoint |
| `TI_DB_PATH` | `backend/data/tourism.db` | SQLite file |
| `TI_TODAY` | `2026-09-28` | fixed "today" so the demo lines up; set to empty to use the real date |

## 7. Moving beyond the MVP

- **Database:** SQLite → PostgreSQL (the SQL is standard; swap the connection in `db.py`).
- **Forecast:** replace `index_for()` in `services/forecast.py` with a trained model; keep the output shape.
- **Maps and weather:** replace `travel_min()` in `services/geo.py` with a maps API and add a weather API.
- **Sign-in:** add email verification and password reset before going public.
