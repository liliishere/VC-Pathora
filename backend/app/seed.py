"""Demo data so the MVP works out of the box. Run: python -m app.seed  (use --reset to wipe first)."""
import sys, os, json, random, datetime as dt
from . import config, db
from .security import hash_password

PLACES = [
 # name, area, category, cost, dur, open, close, peak_h, peak, base, indoor, is_local, local_nearby, rating, verified, note
 ("Tibumana Waterfall","Bangli","waterfall",20000,2,8,17,13,75,15,0,0,"Family warung at the entrance",4.7,"2026-09-10",""),
 ("Tegenungan Waterfall","Gianyar","waterfall",20000,2,7,18,12,92,25,0,0,"Coffee stall run by the village",4.2,"2026-08-20","Gets busy after 09:00"),
 ("Kanto Lampo Waterfall","Gianyar","waterfall",15000,1.5,8,17,11,85,20,0,0,"Village snack stalls",4.3,"2026-07-15",""),
 ("Jatiluwih rice terraces","Tabanan","rice",50000,3,7,18,12,70,15,0,0,"Red-rice warung at the trail start",4.8,"2026-09-05","A huge area, so visitors spread out"),
 ("Tegallalang rice terraces","Ubud","rice",15000,1.5,7,18,11,95,35,0,0,"Swing cafes",3.9,"2026-08-01","Closest to Ubud but very busy late morning"),
 ("Sidemen valley walk","Karangasem","rice",150000,4,7,17,11,40,10,0,0,"Songket weaving workshop",4.7,"2026-09-12","Few tour groups. Views of Mount Agung on clear days"),
 ("Warung Pak Nyoman","Bangli","food",50000,1,8,20,12,60,20,0,1,"",4.6,"2026-09-10","Simple Balinese food, next to the waterfall path"),
 ("Breakfast at Warung Sari","Ubud","food",60000,1,7,21,19,70,20,0,1,"",4.4,"2026-09-01","Family-run, good coffee"),
 ("Penestanan vegetarian warung","Penestanan","food",90000,1.5,11,22,19,65,15,0,1,"",4.5,"2026-08-25","Many vegetarian dishes, garden seating"),
 ("Red-rice warung","Tabanan","food",70000,1,10,17,12,55,10,0,1,"",4.5,"2026-09-05","Cooks the local red rice"),
 ("Bamboo craft workshop","Ubud","indoor",150000,2,9,17,11,45,10,1,1,"",4.6,"2026-09-15","Hands-on, you take your piece home"),
 ("Family cooking class","Penestanan","indoor",350000,3,8,18,9,50,10,1,1,"",4.8,"2026-09-15","Includes a morning market visit"),
 ("Balinese massage","Ubud","indoor",150000,1,10,21,17,50,15,1,1,"",4.4,"2026-08-30","Good for a rainy afternoon"),
 ("Songket weaving, Sidemen","Karangasem","indoor",200000,1.5,9,16,11,30,5,1,1,"",4.6,"2026-09-12","Run by village weavers"),
 ("Tirta Empul","Tampaksiring","temple",50000,1.5,8,18,11,95,30,0,0,"Offerings sold by village families",4.5,"2026-08-28","Calm right at opening"),
 ("Goa Gajah","Bedulu","temple",50000,1,8,17,11,80,25,0,0,"Village coffee stall",4.1,"2026-06-20",""),
 ("Ubud Palace","Ubud","temple",0,1,8,19,12,75,25,0,0,"Saraswati Temple next door",4.0,"2026-09-01",""),
 ("Campuhan Ridge Walk","Ubud","walk",0,1,6,18,9,70,15,0,0,"Warung at the end of the path",4.4,"2026-09-02","Calm at sunrise"),
 ("Ubud Art Market","Ubud","shopping",0,1.5,8,18,13,90,35,0,0,"Local craft sellers",4.0,"2026-08-15","Great for crafts"),
]

def run(reset=False):
    if reset and os.path.exists(config.DB_PATH): os.remove(config.DB_PATH)
    db.init()
    con = db.connect()
    if con.execute("SELECT COUNT(*) FROM users").fetchone()[0]:
        print("Database already has data. Use --reset to start over."); return
    con.executemany("""INSERT INTO places(name,area,category,cost,duration_h,open_h,close_h,peak_h,peak_level,base_level,indoor,is_local,local_nearby,team_rating,verified_at,note)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", PLACES)
    pw = hash_password("demo1234")
    users = [("maya@demo.id","Maya","traveler","free"),("jess@demo.id","Jess","traveler","free"),
             ("ratna@demo.id","Ratna Dewi","business","starter"),("admin@demo.id","Ari Pratama","admin","admin")]
    ids = {}
    for email, name, role, plan in users:
        trial = "2026-10-12" if role == "business" else None
        ids[email] = con.execute("INSERT INTO users(email,name,password_hash,role,plan,trial_ends) VALUES(?,?,?,?,?,?)", (email, name, pw, role, plan, trial)).lastrowid
    maya, jess, ratna = ids["maya@demo.id"], ids["jess@demo.id"], ids["ratna@demo.id"]

    # Trip
    trip = con.execute("INSERT INTO trips(owner_id,name,start_date,end_date,stay_area,invite_code) VALUES(?,?,?,?,?,?)",
                       (maya, "Bali, slow and quiet", "2026-10-08", "2026-10-14", "Ubud", "bali-oct-7Q2")).lastrowid
    con.execute("INSERT INTO trip_members VALUES(?,?, 'organiser')", (trip, maya))
    con.execute("INSERT INTO trip_members VALUES(?,?, 'editor')", (trip, jess))
    pid = {r[1]: r[0] for r in con.execute("SELECT id,name FROM places")}
    stops = [("2026-10-09","07:00","Campuhan Ridge Walk"),("2026-10-09","09:00","Breakfast at Warung Sari"),("2026-10-09","11:00","Ubud Palace"),("2026-10-09","18:30","Penestanan vegetarian warung"),
             ("2026-10-10","08:00","Tibumana Waterfall"),("2026-10-10","10:00","Warung Pak Nyoman"),("2026-10-10","13:00","Ubud Art Market"),("2026-10-10","16:00","Family cooking class"),
             ("2026-10-11","08:00","Jatiluwih rice terraces"),("2026-10-11","11:30","Red-rice warung"),("2026-10-12","08:00","Sidemen valley walk")]
    for date, time, name in stops:
        p = con.execute("SELECT area,cost FROM places WHERE id=?", (pid[name],)).fetchone()
        con.execute("INSERT INTO stops(trip_id,date,time,place_id,name,area,cost,created_by) VALUES(?,?,?,?,?,?,?,?)", (trip, date, time, pid[name], name, p[0], p[1], maya))
    con.execute("INSERT INTO budgets(trip_id,stay,transport,food,people) VALUES(?,?,?,?,?)", (trip, 5400000, 2400000, 2800000, 2))
    for what, amt, by in [("Villa deposit",2700000,maya),("Driver for Saturday",600000,jess),("Cooking class for 2",700000,jess)]:
        con.execute("INSERT INTO expenses(trip_id,what,amount,paid_by) VALUES(?,?,?,?)", (trip, what, amt, by))
    for t in ["Maya created the trip","Jess joined the trip","Maya added Tibumana Waterfall to Sat 10","Jess added Cooking class for 2 to the split bill"]:
        con.execute("INSERT INTO activity(trip_id,text) VALUES(?,?)", (trip, t))

    # Business
    prop = con.execute("INSERT INTO properties(owner_id,name,area,rooms,base_rate,stars,ota_share) VALUES(?,?,?,?,?,?,?)",
                       (ratna, "Hotel Taman Sari", "Ubud", 74, 1800000, 4, 60)).lastrowid
    con.execute("INSERT INTO rates VALUES(?,?,?)", (prop, "2026-10-02", 1850000))
    con.execute("INSERT INTO packages(property_id,name,nights,price,months,items,status) VALUES(?,?,?,?,?,?,?)",
                (prop, "Quiet Ubud mornings", 2, 4200000, "Feb – Mar", json.dumps(["Waterfall trip before 09:00","Breakfast at a local warung","Family cooking class"]), "Draft"))
    con.execute("INSERT INTO packages(property_id,name,nights,price,months,items,status) VALUES(?,?,?,?,?,?,?)",
                (prop, "Rainy season retreat", 3, 5500000, "Nov – Dec", json.dumps(["Weaving workshop","Balinese massage"]), "Ready"))

    # Synthetic anonymous question log (clearly marked synthetic=1) so trends & forecast have something to show
    random.seed(7); today = config.today()
    mix_now  = {"waterfall": 412, "food": 268, "rice": 231, "indoor": 190, "temple": 90, "general": 300}
    mix_prev = {"waterfall": 137, "food": 191, "rice": 180, "indoor": 156, "temple": 95, "general": 290}
    rowsq = []
    for mix, offset in ((mix_now, 0), (mix_prev, 7)):
        for topic, n in mix.items():
            for _ in range(n):
                asked = today - dt.timedelta(days=offset + random.randint(0, 6))
                for_date = asked + dt.timedelta(days=random.randint(0, 14))
                if topic == "waterfall" and random.random() < .3: for_date = dt.date(2026, 10, 10)
                rowsq.append(("traveler", "Ubud", topic, for_date.isoformat(), asked.isoformat(), 1))
    con.executemany("INSERT INTO question_log(role,area,topic,for_date,asked_on,synthetic) VALUES(?,?,?,?,?,?)", rowsq)
    con.commit(); con.close()
    print("Seeded. Log in with maya@demo.id / ratna@demo.id / admin@demo.id — password: demo1234")

if __name__ == "__main__":
    run(reset="--reset" in sys.argv)
