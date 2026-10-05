"""
Tourism Intelligence — Streamlit version (for demos and presentations).
Uses the SAME backend logic and database as the FastAPI app (backend/app).

Run locally:   streamlit run streamlit_app.py
"""
import sys, os, json, datetime as dt
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

import streamlit as st
import pandas as pd
import altair as alt
from fastapi import HTTPException
from app import db, seed, config
from app.security import hash_password, verify_password
from app.services import recommend, forecast as fc, trends as tr, budget as bsvc
from app.services.geo import AREAS
from app.ai.provider import get_provider
from app.routers import trips as T, chat as C

st.set_page_config(page_title="Tourism Intelligence", page_icon="🌿", layout="wide", initial_sidebar_state="expanded")

# ---------------------------------------------------------------- setup
@st.cache_resource
def boot():
    db.init()
    with db.connect() as con:
        if con.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
            seed.run()
    return True
boot()

class Conn:
    """with Conn() as con: ...  — commits and closes."""
    def __enter__(self): self.con = db.connect(); return self.con
    def __exit__(self, exc, *a):
        if not exc: self.con.commit()
        self.con.close()

def run(fn, *a, **k):
    """Call a backend function and show its error nicely instead of crashing."""
    try:
        with Conn() as con: return fn(*a, con=con, **k)
    except HTTPException as e:
        st.toast(f"⚠️ {e.detail}"); return None

def rp(n): return "Rp" + f"{int(round(n)):,}".replace(",", ".")
def jt(n): return f"Rp{n/1e6:.2f}".rstrip("0").rstrip(".").replace(".", ",") + " jt"

# ---------------------------------------------------------------- style (same palette as the designs)
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Instrument+Sans:wght@400;500;600&display=swap');
html, body, [class*="css"], .stMarkdown, .stButton button, input, textarea, select { font-family: 'Instrument Sans', 'Helvetica Neue', Arial, sans-serif; }
h1, h2, h3, h4, .serif { font-family: 'Fraunces', Georgia, serif !important; font-weight: 500 !important; letter-spacing: -.01em; color:#513229; }
.block-container { padding-top: 2.2rem; padding-bottom: 4rem; max-width: 1180px; }
[data-testid="stSidebar"] { border-right: 1px solid rgba(81,50,41,.12); }
.stButton button, .stFormSubmitButton button, .stLinkButton a { border-radius: 999px !important; font-weight: 600 !important; padding: .45rem 1.1rem !important; }
.stButton button[kind="primary"], .stFormSubmitButton button[kind="primary"] { background:#513229 !important; color:#F4F1E2 !important; border-color:#513229 !important; }
div[data-testid="stVerticalBlockBorderWrapper"] { border-radius: 22px !important; border-color: rgba(81,50,41,.14) !important; background:#FBF9F0; }
.pill{display:inline-block;padding:3px 12px;border-radius:999px;font-size:.82rem;font-weight:600;margin:2px 6px 2px 0;white-space:nowrap}
.p-quiet{background:#D8EBF9} .p-mid{background:#FCE6B7} .p-busy{background:#513229;color:#F4F1E2} .p-local{background:#D7D4B1} .p-line{border:1px solid rgba(81,50,41,.25);background:#FFFDF6}
.hero{border-radius:28px;padding:30px 34px;margin-bottom:8px}
.hero small{font-weight:600} .hero h2{font-size:2.3rem;margin:.2rem 0 .3rem 0} .hero p{margin:0;opacity:.85}
.big{font-family:'Fraunces',Georgia,serif;font-size:2.4rem;line-height:1}
.muted{color:#7A5E55;font-size:.95rem}
.stop-time{font-weight:700;font-size:1.05rem;padding-top:.35rem}
.travel{color:#7A5E55;font-size:.88rem;margin:-6px 0 6px 70px;border-left:2px dashed rgba(81,50,41,.25);padding-left:12px}
.fix{background:#FCE6B7;border-radius:12px;padding:8px 12px;font-size:.9rem;margin-top:6px}
[data-testid="stMetricValue"]{font-family:'Fraunces',Georgia,serif;}
[data-testid="stChatMessage"]{background:transparent}
</style>
""", unsafe_allow_html=True)

CROWD = {"quiet": ("p-quiet", "Quiet at this time"), "mid": ("p-mid", "Moderate"), "busy": ("p-busy", "Usually busy now"), "local": ("p-local", "Local business")}
def pill(kind, text=None):
    c, t = CROWD.get(kind, ("p-line", kind)); return f'<span class="pill {c}">{text or t}</span>'

# ---------------------------------------------------------------- auth
ss = st.session_state
ss.setdefault("user", None); ss.setdefault("chat", []); ss.setdefault("bchat", []); ss.setdefault("guest_chat", [])
ss.setdefault("trip_id", None); ss.setdefault("day", None); ss.setdefault("sel_rate", None); ss.setdefault("page", None)

def load_user(uid):
    with Conn() as con: return dict(con.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())

def login(email, pw):
    with Conn() as con:
        u = con.execute("SELECT * FROM users WHERE email=?", (email.strip().lower(),)).fetchone()
    if u and verify_password(pw, u["password_hash"]):
        ss.user = dict(u); ss.page = None; ss.chat = []; ss.bchat = []; ss.trip_id = None; ss.day = None; return True
    return False

def logout():
    for k in ("user", "trip_id", "day", "sel_rate", "page"): ss[k] = None
    ss.chat = []; ss.bchat = []

# ================================================================= PUBLIC: landing / login / sign up / guest
def page_public():
    st.markdown('<div class="serif" style="font-size:1.3rem;font-weight:600">🌿 Tourism Intelligence</div>', unsafe_allow_html=True)
    left, right = st.columns([1.15, 1], gap="large")
    with left:
        st.markdown('<h1 style="font-size:3.4rem;line-height:1.02;margin-top:1.2rem">Plan a quieter, better trip to Bali.</h1>', unsafe_allow_html=True)
        st.markdown('<p class="muted" style="font-size:1.15rem">Ask our AI where to go and when. It finds places worth visiting — not just the viral ones — and tells you when they\'re quiet. Hotels see what travelers want and price each night better.</p>', unsafe_allow_html=True)
        st.write("")
        st.markdown("**Try the demo in one click**")
        c1, c2, c3 = st.columns(3)
        if c1.button("🧳 Traveler (Maya)", width="stretch", type="primary"): login("maya@demo.id", "demo1234"); st.rerun()
        if c2.button("🏨 Hotel (Ratna)", width="stretch"): login("ratna@demo.id", "demo1234"); st.rerun()
        if c3.button("🛠 Admin", width="stretch"): login("admin@demo.id", "demo1234"); st.rerun()
        st.write("")
        with st.container(border=True):
            st.markdown("#### How we choose places")
            a, b = st.columns(2); c, d = st.columns(2)
            a.markdown(f'{pill("quiet","Quiet at your time")}<br><span class="muted">Crowd patterns by hour</span>', unsafe_allow_html=True)
            b.markdown(f'{pill("mid","Worth the trip")}<br><span class="muted">Checked by our team</span>', unsafe_allow_html=True)
            c.markdown(f'{pill("line","Easy to reach")}<br><span class="muted">Real travel time</span>', unsafe_allow_html=True)
            d.markdown(f'{pill("local","Good for locals")}<br><span class="muted">Local businesses nearby</span>', unsafe_allow_html=True)
            st.caption("We never rank by how viral a place is, and businesses can't pay to appear.")
    with right:
        tab1, tab2, tab3 = st.tabs(["Log in", "Sign up", "Try without an account"])
        with tab1:
            with st.form("login"):
                e = st.text_input("Email", placeholder="maya@demo.id"); p = st.text_input("Password", type="password", placeholder="demo1234")
                if st.form_submit_button("Log in", type="primary", width="stretch"):
                    if login(e, p): st.rerun()
                    else: st.error("Email or password is wrong.")
            st.caption("Demo password for every account: **demo1234**")
        with tab2:
            with st.form("signup"):
                role = st.radio("I am a…", ["Traveler", "Business"], horizontal=True)
                n = st.text_input("Name"); e = st.text_input("Email"); p = st.text_input("Password (8+ characters)", type="password")
                share = st.checkbox("Help improve forecasts with my questions (anonymous)", value=True)
                if st.form_submit_button("Create account", type="primary", width="stretch"):
                    if not n or "@" not in e or len(p) < 8: st.error("Please add a name, a valid email and a password of 8+ characters.")
                    else:
                        with Conn() as con:
                            if con.execute("SELECT 1 FROM users WHERE email=?", (e.lower(),)).fetchone(): st.error("That email already has an account.")
                            else:
                                r = "traveler" if role == "Traveler" else "business"
                                uid = con.execute("INSERT INTO users(email,name,password_hash,role,plan,trial_ends,share_data) VALUES(?,?,?,?,?,?,?)",
                                    (e.lower(), n, hash_password(p), r, "free" if r == "traveler" else "starter",
                                     None if r == "traveler" else (config.today() + dt.timedelta(days=14)).isoformat(), int(share))).lastrowid
                        if login(e, p): st.rerun()
        with tab3:
            guest_chat()

def guest_chat():
    st.caption("5 free questions. Sign up to save places to a trip.")
    left = 5 - sum(1 for m in ss.guest_chat if m["role"] == "user")
    for m in ss.guest_chat:
        with st.chat_message(m["role"], avatar="🧳" if m["role"] == "user" else "🌿"):
            st.markdown(m["content"]) if m["role"] == "user" else render_answer(m["content"], key=f"g{id(m)}", can_add=False)
    q = st.chat_input("Ask about places, times or food…", disabled=left <= 0, key="guest_in")
    if q:
        with Conn() as con:
            ans = get_provider().answer_traveler(con, q, "Ubud"); C.log_question(con, "traveler", "Ubud", q)
        ss.guest_chat += [{"role": "user", "content": q}, {"role": "assistant", "content": ans}]; st.rerun()
    st.caption(f"{left} of 5 questions left" if left > 0 else "That was your last guest question — sign up free to keep going.")

# ================================================================= shared: AI answer card
def render_answer(a, key, can_add=True, trip=None):
    st.markdown(f"### {a['title']}")
    st.markdown(f'<p class="muted">{a["text"]}</p>', unsafe_allow_html=True)
    for i, p in enumerate(a.get("places", [])):
        with st.container(border=True):
            c1, c2 = st.columns([4, 1])
            c1.markdown(f"**{p['name']}**  \n<span class='muted'>{p['info']}</span>", unsafe_allow_html=True)
            c1.markdown(pill(p["crowd"]) + pill("local", p["local"]), unsafe_allow_html=True)
            if can_add and trip and c2.button("Add to trip", key=f"add{key}{i}", type="primary"):
                day = sorted(trip["days"], key=lambda d: len(d["stops"]))[0]
                with Conn() as con:
                    r = T.add_stop(trip["id"], T.AddStop(date=dt.date.fromisoformat(day["date"]), place_id=p["id"]), user=ss.user, con=con)
                st.toast(f"✅ {p['name']} added to {day['label']} {day['num']} at {r['time']}")
            with c1.expander("Why this place?"):
                st.write(p["why"] + (f" Best time: {p['best_time']}." if p.get("best_time") else ""))
    if a.get("places"): st.caption("Chosen by crowd patterns, travel time and places our team has checked — not by how viral they are.")

# ================================================================= TRAVELER
def my_trips():
    with Conn() as con: return T.list_trips(user=ss.user, con=con)

def current_trip():
    trips = my_trips()
    if not trips: return None
    if ss.trip_id not in [t["id"] for t in trips]: ss.trip_id = trips[0]["id"]
    with Conn() as con: return T.get_trip(ss.trip_id, user=ss.user, con=con)

def new_trip_form(key):
    with st.form(key, border=True):
        st.markdown("#### New trip")
        n = st.text_input("Trip name", placeholder="Bali with friends")
        c1, c2 = st.columns(2)
        s = c1.date_input("First day", dt.date(2026, 11, 2)); e = c2.date_input("Last day", dt.date(2026, 11, 6))
        stay = st.selectbox("Where are you staying?", AREAS)
        if st.form_submit_button("Create trip", type="primary"):
            if not n: st.error("Give your trip a name.")
            else:
                r = run(T.create_trip, T.NewTrip(name=n, start_date=s, end_date=e, stay_area=stay), user=ss.user)
                if r: ss.trip_id = r["id"]; ss.day = None; ss.page = "My trip"; st.rerun()

def t_home():
    u = ss.user; trips = my_trips()
    if not trips:
        st.title(f"Welcome, {u['name']}")
        st.markdown('<p class="muted">Plan your first trip in three steps. It takes about two minutes.</p>', unsafe_allow_html=True)
        a, b, c = st.columns(3)
        for col, n, t, d in ((a, 1, "Create a trip", "Name and dates."), (b, 2, "Ask AI for ideas", "Where to go and when it's quiet."), (c, 3, "Invite friends", "Plan together and split costs.")):
            with col.container(border=True): st.markdown(f"<div class='big'>{n}</div>", unsafe_allow_html=True); st.markdown(f"**{t}**  \n<span class='muted'>{d}</span>", unsafe_allow_html=True)
        new_trip_form("ft"); return
    st.title(f"Hi {u['name']}")
    st.markdown('<p class="muted">Your next trip, and what\'s left to plan.</p>', unsafe_allow_html=True)
    t = next((x for x in trips if x["end_date"] >= config.today().isoformat()), trips[0])
    length = (dt.date.fromisoformat(t["end_date"]) - dt.date.fromisoformat(t["start_date"])).days + 1
    days_to = (dt.date.fromisoformat(t["start_date"]) - config.today()).days
    c1, c2 = st.columns([3, 1])
    with c1:
        st.markdown(f"""<div class="hero" style="background:#D8EBF9"><small>Your next trip</small><h2>{t['name']}</h2>
        <p>{dt.date.fromisoformat(t['start_date']):%a %-d %b} – {dt.date.fromisoformat(t['end_date']):%a %-d %b} · {t['people']} people · staying in {t['stay_area']}</p></div>""", unsafe_allow_html=True)
        st.progress(t["days_planned"] / length, text=f"{t['days_planned']} of {length} days planned")
        if st.button("Open trip →", type="primary"): ss.trip_id = t["id"]; ss.page = "My trip"; st.rerun()
    with c2:
        st.markdown(f'<div class="hero" style="background:#513229;color:#F4F1E2;text-align:center"><div class="big" style="font-size:4rem">{max(0,days_to)}</div><p>days to go</p></div>', unsafe_allow_html=True)
    trip = current_trip() if ss.trip_id == t["id"] else None
    with st.container(border=True):
        st.markdown("#### Still to do")
        todo = 0
        if trip:
            for d in trip["days"]:
                for s in d["stops"]:
                    if s.get("better"):
                        todo += 1; st.markdown(f"• **{s['name']}** is usually busy at {s['time']} on {d['label']} {d['num']} — calmer at {s['better']}.")
            empty = [f"{d['label']} {d['num']}" for d in trip["days"] if not d["stops"]]
            if empty: todo += 1; st.markdown(f"• Nothing planned yet on **{', '.join(empty)}** — ask AI for ideas.")
        if not todo: st.markdown("Everything looks good. 🎉")
    st.markdown("#### My trips")
    cols = st.columns(3)
    for i, x in enumerate(trips[:2]):
        with cols[i].container(border=True):
            st.markdown(f"**{x['name']}**  \n<span class='muted'>{x['start_date']} · {x['people']} people</span>", unsafe_allow_html=True)
            if st.button("Open", key=f"open{x['id']}"): ss.trip_id = x["id"]; ss.day = None; ss.page = "My trip"; st.rerun()
    with cols[2]:
        with st.popover("+ New trip", width="stretch"): new_trip_form("nt")

def t_trip():
    trip = current_trip()
    if not trip: st.info("You don't have a trip yet."); new_trip_form("nt2"); return
    trips = my_trips()
    if len(trips) > 1:
        names = {x["id"]: x["name"] for x in trips}
        pick = st.selectbox("Trip", list(names), format_func=names.get, index=list(names).index(trip["id"]), label_visibility="collapsed")
        if pick != trip["id"]: ss.trip_id = pick; ss.day = None; st.rerun()
    st.title(trip["name"])
    st.markdown(f'<p class="muted">{trip["dates"]} · {len(trip["days"])} days · staying in {trip["stay"]} · with {", ".join(p["name"] for p in trip["people"])}</p>', unsafe_allow_html=True)
    tab1, tab2, tab3 = st.tabs(["🗓 Itinerary", "💰 Budget & split bill", "👥 Friends"])
    with tab1: itinerary(trip)
    with tab2: budget(trip)
    with tab3: friends(trip)

def itinerary(trip):
    days = trip["days"]; ids = [d["date"] for d in days]
    if ss.day not in ids: ss.day = next((d["date"] for d in days if d["date"] == "2026-10-10"), ids[0])
    labels = {d["date"]: f"{d['label']} {d['num']}{' •' if d['stops'] else ''}" for d in days}
    pick = st.segmented_control("Day", ids, format_func=labels.get, default=ss.day, key=f"daysel{trip['id']}", label_visibility="collapsed")
    if pick and pick != ss.day: ss.day = pick; st.rerun()
    day = next(d for d in days if d["date"] == ss.day)
    left, right = st.columns([1.7, 1], gap="large")
    with left:
        cost = sum(s["cost"] for s in day["stops"])
        st.markdown(f"### {dt.date.fromisoformat(day['date']):%A %-d %B}")
        st.markdown(f'<p class="muted">{len(day["stops"])} stops · about {rp(cost)} per person</p>', unsafe_allow_html=True)
        if not day["stops"]:
            with st.container(border=True):
                st.markdown("**Nothing planned yet.** Add a place from the list, or ask AI for ideas for this day.")
        for i, s in enumerate(day["stops"]):
            if i and s["travel"]: st.markdown(f'<div class="travel">{s["travel"]}</div>', unsafe_allow_html=True)
            with st.container(border=True):
                a, b, c = st.columns([0.7, 4, 1.2])
                a.markdown(f'<div class="stop-time">{s["time"]}</div>', unsafe_allow_html=True)
                b.markdown(f"**{s['name']}**  \n<span class='muted'>{s['area']}</span><br>{pill(s['crowd'])}", unsafe_allow_html=True)
                if s.get("better"):
                    b.markdown(f'<div class="fix">Calmer at {s["better"]}.</div>', unsafe_allow_html=True)
                    if b.button(f"Move to {s['better']}", key=f"mv{s['id']}", type="primary"):
                        run(T.move_stop, s["id"], T.MoveStop(time=s["better"]), user=ss.user); st.rerun()
                with b.expander("Why this place?"): st.write(s["why"])
                c.markdown(f"**{'Free' if not s['cost'] else rp(s['cost'])}**")
                if c.button("Remove", key=f"rm{s['id']}"): run(T.delete_stop, s["id"], user=ss.user); st.rerun()
    with right:
        with st.container(border=True):
            st.markdown("#### Add places")
            st.markdown('<p class="muted">Picked for this trip. Added at the quietest free time.</p>', unsafe_allow_html=True)
            q = st.text_input("Search places", label_visibility="collapsed", placeholder="Search places", key="ideaq")
            with Conn() as con: ideas = T.ideas(trip["id"], q=q, user=ss.user, con=con)
            for p in ideas[:6]:
                x, y = st.columns([3, 1])
                x.markdown(f"**{p['name']}**  \n<span class='muted'>{p['info']} · {'Free' if not p['cost'] else rp(p['cost'])}</span><br>{pill(p['crowd'])}", unsafe_allow_html=True)
                if y.button("Add", key=f"idea{p['id']}", type="primary"):
                    r = run(T.add_stop, trip["id"], T.AddStop(date=dt.date.fromisoformat(ss.day), place_id=p["id"]), user=ss.user)
                    if r: st.toast(f"✅ Added at {r['time']}"); st.rerun()
            if not ideas: st.caption("No matches. Try Ask AI.")

def budget(trip):
    with Conn() as con: b = T.get_budget(trip["id"], user=ss.user, con=con)
    est = b["estimate"]
    m1, m2, m3 = st.columns(3)
    m1.metric("Estimated total", rp(est["total"])); m2.metric("Per person", rp(est["per_person"]), help=f"Split between {est['people']}"); m3.metric("Paid so far", rp(b["paid"]))
    left, right = st.columns(2, gap="large")
    with left.container(border=True):
        st.markdown("#### Estimated costs")
        st.markdown('<p class="muted">Activities come from your itinerary. Change the others to match your plans.</p>', unsafe_allow_html=True)
        with st.form("budget"):
            stay = st.number_input("Stay (Rp)", 0, step=100000, value=est["stay"], help="Book on the hotel's own site.")
            trans = st.number_input("Transport (Rp)", 0, step=100000, value=est["transport"])
            food = st.number_input("Food (Rp)", 0, step=100000, value=est["food"])
            st.markdown(f"**Activities:** {rp(est['activities'])} *(from your itinerary)*")
            ppl = st.number_input("Split between (people)", 1, 20, value=est["people"])
            if st.form_submit_button("Save", type="primary"):
                run(T.put_budget, trip["id"], T.BudgetIn(stay=stay, transport=trans, food=food, people=ppl), user=ss.user); st.rerun()
        st.caption("Estimates to help you plan. Prices may change.")
    with right.container(border=True):
        st.markdown("#### Split bill")
        st.markdown('<p class="muted">Add what someone paid for the group. We work out who owes whom.</p>', unsafe_allow_html=True)
        for e in b["expenses"]:
            x, y, z = st.columns([3, 1.4, 0.8])
            x.markdown(f"**{e['what']}**  \n<span class='muted'>Paid by {e['paid_by_name']}</span>", unsafe_allow_html=True)
            y.markdown(f"**{rp(e['amount'])}**")
            if z.button("✕", key=f"ex{e['id']}", help="Remove"): run(T.delete_expense, e["id"], user=ss.user); st.rerun()
        with st.form("exp", clear_on_submit=True):
            c1, c2, c3 = st.columns([2, 1.3, 1.2])
            what = c1.text_input("What was it?"); amt = c2.number_input("Amount (Rp)", 0, step=50000)
            names = {m["id"]: m["name"] for m in b["members"]}
            who = c3.selectbox("Paid by", list(names), format_func=names.get)
            if st.form_submit_button("Add expense"):
                if what and amt: run(T.add_expense, trip["id"], T.ExpenseIn(what=what, amount=int(amt), paid_by=who), user=ss.user); st.rerun()
        if b["settle"]:
            st.markdown('<div class="hero" style="background:#FCE6B7;padding:18px 22px"><b>To settle up</b>' + "".join(
                f'<div style="display:flex;justify-content:space-between;font-size:1.1rem;margin-top:6px"><span>{s["from"]} pays {s["to"]}</span><span class="serif">{rp(s["amount"])}</span></div>' for s in b["settle"]) + "</div>", unsafe_allow_html=True)
            if st.button("Mark as settled", type="primary"): run(T.settle, trip["id"], user=ss.user); st.rerun()
        else: st.success("All settled — nobody owes anything.")

def friends(trip):
    with Conn() as con: m = T.members(trip["id"], user=ss.user, con=con)
    left, right = st.columns(2, gap="large")
    with left.container(border=True):
        st.markdown("#### People on this trip")
        for p in m["members"]: st.markdown(f"**{p['name']}** <span class='muted'>· {'Organiser' if p['role']=='organiser' else 'Can edit'}</span>", unsafe_allow_html=True)
        for p in m["invited"]: st.markdown(f"{p['email']} <span class='muted'>· invited, waiting</span>", unsafe_allow_html=True)
        st.markdown("**Invite with a code**"); st.code(m["invite_code"], language=None)
        st.caption("Friends join from their Home: “Join a trip” → enter this code.")
        with st.form("inv", clear_on_submit=True):
            em = st.text_input("Or invite by email", placeholder="friend@email.com")
            if st.form_submit_button("Send invite") and em:
                run(T.invite, trip["id"], T.InviteIn(email=em), user=ss.user); st.toast("Invite saved"); st.rerun()
    with right.container(border=True):
        st.markdown("#### Recent changes")
        for a in m["activity"]: st.markdown(f"• {a['text']}  \n<span class='muted' style='font-size:.85rem'>{a['created_at'][:16]}</span>", unsafe_allow_html=True)

def t_ask():
    st.title("Ask AI")
    with Conn() as con: left, total = C.quota_left(con, f"u{ss.user['id']}", ss.user["plan"])
    st.markdown(f'<p class="muted">Ask anything about Bali. Add good answers straight to your trip. · {"Unlimited" if left is None else f"{left} of {total}"} questions left today</p>', unsafe_allow_html=True)
    trip = current_trip()
    if not ss.chat:
        st.markdown("**Try one of these:**")
        cols = st.columns(3)
        for i, s in enumerate(["A quiet waterfall near Ubud on Saturday?", "Rice terraces without the crowds?", "Ideas for a rainy afternoon"]):
            if cols[i].button(s, key=f"sg{i}", width="stretch"): ask_traveler(s, trip); st.rerun()
    for i, m in enumerate(ss.chat):
        with st.chat_message(m["role"], avatar="🧳" if m["role"] == "user" else "🌿"):
            st.markdown(m["content"]) if m["role"] == "user" else render_answer(m["content"], key=str(i), trip=trip)
    q = st.chat_input("Ask about places, times or food…", disabled=(left is not None and left <= 0))
    if q: ask_traveler(q, trip); st.rerun()

def ask_traveler(q, trip):
    with Conn() as con:
        left, _ = C.quota_left(con, f"u{ss.user['id']}", ss.user["plan"])
        if left is not None and left <= 0: st.toast("No questions left today."); return
        stay = trip["stay"] if trip else "Ubud"
        ans = get_provider().answer_traveler(con, q, stay); C.use_one(con, f"u{ss.user['id']}")
        if ss.user["share_data"]: C.log_question(con, "traveler", stay, q)
    ss.chat += [{"role": "user", "content": q}, {"role": "assistant", "content": ans}]

# ================================================================= BUSINESS
def prop():
    with Conn() as con:
        r = con.execute("SELECT * FROM properties WHERE owner_id=?", (ss.user["id"],)).fetchone()
    return dict(r) if r else None

def setup_property():
    st.title("Tell us about your property")
    st.markdown('<p class="muted">Your forecast is built on this. You can change it later.</p>', unsafe_allow_html=True)
    with st.form("prop", border=True):
        n = st.text_input("Property name", placeholder="Hotel Taman Sari")
        c1, c2 = st.columns(2); area = c1.selectbox("Area", AREAS); stars = c2.selectbox("Stars", [None, 2, 3, 4, 5], index=3)
        c3, c4 = st.columns(2); rooms = c3.number_input("Rooms", 1, 2000, 74); rate = c4.number_input("Average rate per night (Rp)", 100000, step=50000, value=1800000)
        ota = st.slider("Bookings from booking sites (%)", 0, 100, 60, 5)
        if st.form_submit_button("Save and see my forecast", type="primary") and n:
            with Conn() as con:
                con.execute("INSERT INTO properties(owner_id,name,area,rooms,base_rate,stars,ota_share) VALUES(?,?,?,?,?,?,?)", (ss.user["id"], n, area, rooms, rate, stars, ota))
            st.rerun()

def demand_chart(days):
    df = pd.DataFrame([{"day": f"{d['d']} {d['n']}", "order": i, "Demand": d["idx"],
                        "level": "Very high" if d["idx"] >= 110 else ("High" if d["idx"] >= 103 else ("Normal" if d["idx"] >= 97 else "Low"))} for i, d in enumerate(days)])
    color = alt.Color("level:N", scale=alt.Scale(domain=["Low", "Normal", "High", "Very high"], range=["#D8EBF9", "#D7D4B1", "#FCE6B7", "#513229"]), legend=alt.Legend(title=None, orient="top"))
    bars = alt.Chart(df).mark_bar(cornerRadiusTopLeft=6, cornerRadiusTopRight=6, stroke="#51322933").encode(
        x=alt.X("day:N", sort=alt.SortField("order"), title=None, axis=alt.Axis(labelAngle=0, labelFontSize=12)),
        y=alt.Y("Demand:Q", scale=alt.Scale(domain=[70, 125], clamp=True), title="Demand (100 = normal)"), y2=alt.datum(70),
        color=color, tooltip=["day", "Demand", "level"])
    rule = alt.Chart(pd.DataFrame({"y": [100]})).mark_rule(strokeDash=[5, 4], color="#7A5E55").encode(y="y:Q")
    st.altair_chart((bars + rule).properties(height=280), width="stretch")

def b_home():
    p = prop()
    st.title(f"Good morning, {ss.user['name'].split()[0]}")
    st.markdown(f'<p class="muted">{p["name"]} · {p["area"]} · {p["rooms"]} rooms. One decision for this week, and what\'s coming.</p>', unsafe_allow_html=True)
    with Conn() as con: days = fc.forecast(con, p); trends = tr.trends(con, p["area"])
    top = max(days, key=lambda d: d["idx"])
    full = dt.date.fromisoformat(top["date"]).strftime("%A %-d %b")
    if top["sug"]:
        pct = round((top["sug"] - top["rate"]) / top["rate"] * 100)
        st.markdown(f"""<div class="hero" style="background:#FCE6B7"><small>This week's suggestion</small><h2>Raise {full} by {pct}%</h2>
        <p>Demand near you is {top['idx']-100}% above a normal day{(' · ' + top['event']) if top['event'] else ''}. {top['booked']}% of rooms are already booked. Suggested price: <b>{jt(top['sug'])}</b> (now {jt(top['rate'])}).</p></div>""", unsafe_allow_html=True)
        if st.button("Review in Rates →", type="primary"): ss.page = "Rates"; ss.sel_rate = top["date"]; st.rerun()
    else:
        st.markdown('<div class="hero" style="background:#D7D4B1"><small>This week</small><h2>Your prices look right</h2><p>No changes needed. We\'ll tell you when demand moves.</p></div>', unsafe_allow_html=True)
    with st.container(border=True):
        st.markdown("#### Demand near you, next 14 days"); st.caption("Estimate. Dashed line = a normal day.")
        demand_chart(days)
    with st.container(border=True):
        st.markdown("#### Travelers near you are asking about"); st.caption("From anonymous traveler questions, this week vs last week.")
        cols = st.columns(max(1, min(3, len(trends))))
        for c, t in zip(cols, trends[:3]): c.metric(t["t"], t["c"], f"{t['q']} questions", delta_color="off")

def b_rates():
    p = prop()
    st.title("Rates")
    st.markdown('<p class="muted">The next 14 days. Pick a day to see our suggestion and set your price.</p>', unsafe_allow_html=True)
    with Conn() as con: days = fc.forecast(con, p)
    n_sug = sum(1 for d in days if d["sug"])
    if st.button(f"Apply all suggestions ({n_sug})", type="primary", disabled=not n_sug):
        with Conn() as con:
            for d in days:
                if d["sug"]: con.execute("INSERT INTO rates(property_id,date,rate) VALUES(?,?,?) ON CONFLICT(property_id,date) DO UPDATE SET rate=excluded.rate", (p["id"], d["date"], d["sug"]))
        st.toast(f"✅ {n_sug} suggestions applied"); st.rerun()
    if ss.sel_rate not in [d["date"] for d in days]: ss.sel_rate = max(days, key=lambda d: d["idx"])["date"]
    lvl = lambda i: ("p-busy", "Very high") if i >= 110 else (("p-mid", "High") if i >= 103 else (("p-line", "Normal") if i >= 97 else ("p-quiet", "Low")))
    for wk, label in ((days[:7], "This week"), (days[7:], "Next week")):
        st.markdown(f"**{label}**")
        cols = st.columns(7)
        for c, d in zip(cols, wk):
            with c.container(border=True):
                k, t = lvl(d["idx"])
                st.markdown(f"<div class='serif' style='font-size:1.5rem'>{d['d']} {d['n']}</div><span class='pill {k}'>{t}</span><div style='font-weight:700;margin-top:6px'>{jt(d['rate'])}</div>"
                            + (f"<div style='color:#8A5A0E;font-size:.85rem;font-weight:600'>→ {jt(d['sug'])}</div>" if d["sug"] else ("<div style='color:#3F5A33;font-size:.85rem;font-weight:600'>✓ Updated</div>" if d["applied"] else "<div style='font-size:.85rem'>&nbsp;</div>")), unsafe_allow_html=True)
                if st.button("Select" if d["date"] != ss.sel_rate else "Selected", key=f"sel{d['date']}", type="primary" if d["date"] == ss.sel_rate else "secondary", width="stretch"):
                    ss.sel_rate = d["date"]; st.rerun()
    d = next(x for x in days if x["date"] == ss.sel_rate)
    with st.container(border=True):
        a, b, c = st.columns([1, 1.2, 1.2], gap="large")
        with a:
            st.markdown(f"### {dt.date.fromisoformat(d['date']):%A %-d %b}")
            k, t = lvl(d["idx"]); st.markdown(f"<span class='pill {k}'>{t} demand · {d['idx']}</span>", unsafe_allow_html=True)
            st.progress(d["booked"] / 100, text=f"{d['booked']}% booked · {round(p['rooms']*(100-d['booked'])/100)} rooms left")
        with b:
            st.markdown("**Your price for this night**")
            new = st.number_input("Price (Rp)", 100000, step=50000, value=int(d["sug"] or d["rate"]), key=f"rate{d['date']}", label_visibility="collapsed")
            st.caption(f"Now {jt(d['rate'])}." + (f" We suggest **{jt(d['sug'])}**." if d["sug"] else " No change needed."))
            if st.button("Save price", type="primary"):
                with Conn() as con: con.execute("INSERT INTO rates(property_id,date,rate) VALUES(?,?,?) ON CONFLICT(property_id,date) DO UPDATE SET rate=excluded.rate", (p["id"], d["date"], int(new)))
                st.toast("✅ Price saved"); st.rerun()
        with c:
            st.markdown("**Why**")
            if d["sug"]:
                st.markdown(f"- Demand index **{d['idx']}** (100 = normal)\n- **{d['booked']}%** already booked\n" + (f"- {d['event']}\n" if d["event"] else "") + "- More traveler questions about this date than usual")
            else: st.markdown(f"Demand looks {lvl(d['idx'])[1].lower()} and your price fits.")

def b_packages():
    p = prop()
    st.title("Packages")
    st.markdown('<p class="muted">Turn what travelers are asking for into offers for your quiet weeks.</p>', unsafe_allow_html=True)
    with Conn() as con: trends = tr.trends(con, p["area"]); pk = [dict(r) for r in con.execute("SELECT * FROM packages WHERE property_id=? ORDER BY id DESC", (p["id"],))]
    st.markdown("#### Rising near you")
    cols = st.columns(max(1, len(trends)))
    for c, t in zip(cols, trends):
        with c.container(border=True):
            st.markdown(f"<div class='big'>{t['c']}</div>**{t['t']}**  \n<span class='muted'>{t['q']} questions</span>", unsafe_allow_html=True)
    left, right = st.columns([1.4, 1], gap="large")
    with left:
        st.markdown("#### Your packages")
        for r in pk:
            with st.container(border=True):
                a, b = st.columns([3, 1])
                a.markdown(f"**{r['name']}**  \n<span class='muted'>{r['nights']} nights · {r['months']}</span>", unsafe_allow_html=True)
                a.markdown("".join(pill("quiet", i) for i in json.loads(r["items"])), unsafe_allow_html=True)
                b.markdown(f"<span class='pill {'p-local' if r['status']=='Ready' else 'p-line'}'>{r['status']}</span><div class='serif' style='font-size:1.3rem'>{rp(r['price'])}</div>", unsafe_allow_html=True)
                new = "Ready" if r["status"] == "Draft" else "Draft"
                if b.button("Mark as ready" if new == "Ready" else "Back to draft", key=f"pk{r['id']}"):
                    with Conn() as con: con.execute("UPDATE packages SET status=? WHERE id=?", (new, r["id"]))
                    st.rerun()
    with right:
        with st.form("newpk", border=True, clear_on_submit=True):
            st.markdown("#### New package")
            n = st.text_input("Name", placeholder="Quiet Ubud mornings")
            c1, c2 = st.columns(2); nights = c1.number_input("Nights", 1, 14, 2); price = c2.number_input("Price (Rp)", 0, step=100000, value=4200000)
            when = st.selectbox("For which months", ["Feb – Mar", "Nov – Dec", "Any quiet week"])
            opts = list(dict.fromkeys([t["item"] for t in trends] + ["Breakfast at a local warung", "Family cooking class", "Balinese massage"]))
            items = st.multiselect("What's included", opts, default=opts[:1])
            if st.form_submit_button("Save as draft", type="primary"):
                if n and items:
                    with Conn() as con: con.execute("INSERT INTO packages(property_id,name,nights,price,months,items) VALUES(?,?,?,?,?,?)", (p["id"], n, nights, price, when, json.dumps(items)))
                    st.toast("✅ Saved as draft"); st.rerun()
                else: st.error("Add a name and at least one item.")

def b_ask():
    p = prop()
    st.title("Ask AI"); st.markdown('<p class="muted">Ask about demand, prices or what travelers near you want.</p>', unsafe_allow_html=True)
    if not ss.bchat:
        cols = st.columns(3)
        for i, s in enumerate(["Should I raise my rate for Saturday?", "What are travelers near me asking about?", "How do the next two weeks look?"]):
            if cols[i].button(s, key=f"bs{i}", width="stretch"): ask_business(s, p); st.rerun()
    for m in ss.bchat:
        with st.chat_message(m["role"], avatar="🏨" if m["role"] == "user" else "🌿"):
            if m["role"] == "user": st.markdown(m["content"])
            else:
                a = m["content"]; st.markdown(f"### {a['title']}"); st.markdown(f'<p class="muted">{a["text"]}</p>', unsafe_allow_html=True)
                if a["facts"]:
                    cols = st.columns(len(a["facts"]))
                    for c, f in zip(cols, a["facts"]): c.metric(f[1], f[0])
                st.caption("Based on weather, events, your bookings and anonymous traveler questions near you. Estimates.")
    q = st.chat_input("Ask about demand, rates or packages…")
    if q: ask_business(q, p); st.rerun()

def ask_business(q, p):
    with Conn() as con: ans = get_provider().answer_business(con, q, p)
    ss.bchat += [{"role": "user", "content": q}, {"role": "assistant", "content": ans}]

# ================================================================= ADMIN
def a_overview():
    st.title("How the product is doing")
    st.caption("Admin · internal only")
    with Conn() as con:
        one = lambda q, *a: con.execute(q, a).fetchone()[0]
        c = st.columns(4)
        c[0].metric("Travelers", one("SELECT COUNT(*) FROM users WHERE role='traveler'"), f"{one('SELECT COUNT(*) FROM users WHERE plan=?', 'plus')} on Plus", delta_color="off")
        c[1].metric("Businesses", one("SELECT COUNT(*) FROM users WHERE role='business'"))
        c[2].metric("Questions today", one("SELECT COALESCE(SUM(count),0) FROM usage WHERE day=?", config.today().isoformat()))
        c[3].metric("Curated places", one("SELECT COUNT(*) FROM places"))
        st.markdown("#### MVP go / no-go targets (slide 21)")
        st.dataframe(pd.DataFrame([
            ["Pilot hotels that finished the trial", "7 of 10", "track in pilot"],
            ["Travelers rating answers useful", "70%", f"{round(100*(one('SELECT AVG(kind=?) FROM feedback','useful') or 0))}% so far"],
            ["Recommendations outside the 5 busiest spots", "40%", "measured from answer logs"],
            ["Destination data accuracy", "90%", f"{one('SELECT COUNT(*) FROM places WHERE verified_at >= date(?, ?)', config.today().isoformat(), '-90 day')} of {one('SELECT COUNT(*) FROM places')} verified in 90 days"],
        ], columns=["Metric", "Target", "Now"]), hide_index=True, width="stretch")
        st.markdown("#### Traveler questions by topic (anonymous)")
        df = pd.DataFrame(con.execute("SELECT topic, COUNT(*) n FROM question_log GROUP BY topic ORDER BY n DESC").fetchall(), columns=["topic", "questions"])
        st.bar_chart(df, x="topic", y="questions", color="#513229")

# ================================================================= ROUTER
def main():
    if not ss.user: page_public(); return
    u = ss.user = load_user(ss.user["id"])
    pages = {"traveler": {"Home": t_home, "My trip": t_trip, "Ask AI": t_ask},
             "business": {"Home": b_home, "Rates": b_rates, "Packages": b_packages, "Ask AI": b_ask},
             "admin": {"Overview": a_overview}}[u["role"]]
    with st.sidebar:
        st.markdown('<div class="serif" style="font-size:1.35rem;font-weight:600;margin-bottom:.6rem">🌿 Tourism Intelligence</div>', unsafe_allow_html=True)
        if ss.page not in pages: ss.page = list(pages)[0]
        for name in pages:
            if st.button(name, key=f"nav{name}", width="stretch", type="primary" if ss.page == name else "secondary"):
                ss.page = name; st.rerun()
        st.divider()
        if u["role"] == "traveler":
            with Conn() as con: left, total = C.quota_left(con, f"u{u['id']}", u["plan"])
            st.caption(f"**{u['plan'].title()} plan** · {'Unlimited' if left is None else f'{left} of {total}'} AI questions left today")
            with st.expander("Join a friend's trip"):
                code = st.text_input("Invite code", key="joincode")
                if st.button("Join") and code:
                    r = run(T.join, code.strip(), user=u)
                    if r: ss.trip_id = r["trip_id"]; ss.page = "My trip"; st.rerun()
        elif u["role"] == "business":
            st.caption(f"**Free trial** · until {u['trial_ends']} · then {u['plan'].title()}")
        st.markdown(f"**{u['name']}**  \n<span class='muted'>{u['role'].title()}</span>", unsafe_allow_html=True)
        if st.button("Log out", width="stretch"): logout(); st.rerun()
    if u["role"] == "business" and not prop(): setup_property(); return
    pages[ss.page]()

main()
