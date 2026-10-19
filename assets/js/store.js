/* Pathora — penyimpanan lokal (localStorage) dan akun simulasi.
   Semua halaman berbagi state yang sama, sehingga permintaan dari traveler
   langsung tampil di Studio Host, dan sebaliknya. Tanpa server. */
(function (g) {
  'use strict';
  const { D, A, byId, DEMO_MEMBERS, COLORS, uid } = g.PD;
  const KEY = 'pathora.v3', KEYA = 'pathora.accounts', KEYS = 'pathora.session';
  let mem = null; const subs = [];

  const ini = (n) => (n || 'Anda').trim().split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'AN';
  const meMember = (name) => ({ id: 'me', name: name || 'Anda', ini: ini(name), color: COLORS[0], busy: [] });

  function fresh() {
    return {
      v: 3,
      trip: { name: 'Trip Bali', start: '2026-11-12', end: '2026-11-14', treasurer: 'me', code: 'bali-7xk2' },
      me: 'me',
      members: [meMember(null)],
      items: [],      /* {uid, actId, date, time, people, status, by} */
      events: [],     /* {uid, date, time, title, by} */
      expenses: [],   /* {uid, title, amount, paidBy, split:[ids], cat} */
      settled: {},    /* "from>to": true */
      chat: [],       /* {uid, role, text, blocks, chips, ts} */
      hostClosed: {}, /* actId: [iso] */
      reqs: [
        { uid: 'r1', name: 'Rina A.', actId: 'tukik', date: '2026-11-12', people: 2, status: 'baru' },
        { uid: 'r2', name: 'Bayu S.', actId: 'tukik', date: '2026-11-13', people: 4, status: 'baru' },
        { uid: 'r3', name: 'Mei Lin', actId: 'tukik', date: '2026-11-14', people: 6, status: 'baru' }
      ],
      payouts: [],
      passport: {},   /* actId: {date, code} */
      seen: {}
    };
  }
  function load() {
    if (mem) return mem;
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 3) { mem = s; return mem; } } } catch (e) { /* abaikan */ }
    mem = fresh(); syncName(); return mem;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* abaikan */ }
    subs.forEach((f) => { try { f(mem); } catch (e) { console.error(e); } });
  }
  function syncName() {
    const a = PAUTH.current(); if (!a || a.role !== 'traveler') return;
    const m = mem.members.find((x) => x.id === 'me'); if (m) { m.name = a.name; m.ini = ini(a.name); }
  }

  /* ---------- akun (simulasi, tersimpan di browser) ---------- */
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } };
  const PAUTH = {
    current() { const em = rd(KEYS, null); if (!em) return null; const a = rd(KEYA, {})[em]; return a || null; },
    signup(o) {
      const email = (o.email || '').trim().toLowerCase(), name = (o.name || '').trim();
      if (!name) return { error: 'Nama wajib diisi.' };
      if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Format email belum sesuai.' };
      if ((o.password || '').length < 6) return { error: 'Kata sandi minimal 6 karakter.' };
      if (o.role === 'host' && !(o.community || '').trim()) return { error: 'Nama komunitas atau usaha wajib diisi.' };
      const all = rd(KEYA, {});
      if (all[email]) return { error: 'Email ini sudah terdaftar. Silakan masuk.' };
      all[email] = { email, name, role: o.role === 'host' ? 'host' : 'traveler', community: (o.community || '').trim(), place: (o.place || '').trim(), phone: (o.phone || '').trim(), plan: 'gratis', since: D.today() };
      wr(KEYA, all); wr(KEYS, email); mem = null; load(); syncName(); save();
      return { ok: all[email] };
    },
    login(email, password) {
      email = (email || '').trim().toLowerCase();
      const a = rd(KEYA, {})[email];
      if (!a) return { error: 'Akun dengan email ini belum terdaftar.' };
      if ((password || '').length < 6) return { error: 'Kata sandi minimal 6 karakter.' };
      wr(KEYS, email); mem = null; load(); syncName(); save(); return { ok: a };
    },
    demo(role) {
      const email = role === 'host' ? 'host@demo.pathora' : 'traveler@demo.pathora';
      const all = rd(KEYA, {});
      if (!all[email]) all[email] = role === 'host' ? { email, name: 'Wayan Sudarta', role: 'host', community: 'Komunitas Pesisir Serangan', place: 'Serangan, Denpasar', phone: '', plan: 'gratis', since: D.today() } : { email, name: 'Maya Putri', role: 'traveler', community: '', place: '', phone: '', plan: 'gratis', since: D.today() };
      wr(KEYA, all); wr(KEYS, email); mem = null; load(); syncName(); save(); return { ok: all[email] };
    },
    logout() { try { localStorage.removeItem(KEYS); } catch (e) { /* abaikan */ } mem = null; },
    update(patch) { const a = PAUTH.current(); if (!a) return; const all = rd(KEYA, {}); Object.assign(all[a.email], patch); wr(KEYA, all); syncName(); save(); },
    isPlus() { const a = PAUTH.current(); return !!(a && a.plan === 'plus'); }
  };

  /* ---------- store ---------- */
  const S = {
    get: load,
    save,
    update(fn) { fn(load()); save(); },
    on(f) { subs.push(f); },
    reset() { mem = fresh(); syncName(); save(); },
    me() { const s = load(); return s.members.find((m) => m.id === s.me) || s.members[0]; },
    member(id) { return load().members.find((m) => m.id === id); },
    days() { const t = load().trip; return D.range(t.start, t.end); },
    isGroup() { return load().members.length > 1; },

    addItem(o) {
      const s = load();
      const dupe = s.items.find((i) => i.actId === o.actId && i.date === o.date && i.status !== 'ditolak');
      if (dupe) return dupe;
      const a = byId[o.actId];
      const it = Object.assign({ uid: uid(), time: a.times[0], people: s.members.length, status: 'draft', by: s.me }, o);
      s.items.push(it);
      if (it.date < s.trip.start) s.trip.start = it.date;
      if (it.date > s.trip.end) s.trip.end = it.date;
      save(); return it;
    },
    removeItem(id) { const s = load(); s.items = s.items.filter((i) => i.uid !== id); save(); },
    setStatus(id, st) { const s = load(); const it = s.items.find((i) => i.uid === id); if (it) { it.status = st; save(); } return it; },
    itemCost(it) { return byId[it.actId].price * it.people; },
    sortedItems() { return load().items.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); },

    /* Paspor Alam: stempel diberikan setelah kegiatan lunas dan host memberi kode */
    stamp(actId, date) { const s = load(); s.passport[actId] = { date, code: ('PA-' + actId.slice(0, 3) + '-' + Math.abs(date.replace(/\D/g, '') % 9000 + 1000)).toUpperCase() }; save(); },

    allExpenses() {
      const s = load(); const out = [];
      s.items.filter((i) => i.status !== 'ditolak').forEach((i) => {
        const a = byId[i.actId];
        out.push({ uid: 'act-' + i.uid, title: a.short, sub: D.med(i.date) + ' · ' + i.people + ' orang', amount: S.itemCost(i), paidBy: s.trip.treasurer, split: s.members.slice(0, i.people).map((m) => m.id), auto: true, status: i.status });
      });
      s.expenses.forEach((e) => out.push(Object.assign({ sub: e.cat || 'Pengeluaran' }, e)));
      return out;
    },
    settle() {
      const s = load(); const ex = S.allExpenses();
      const bal = {}; s.members.forEach((m) => { bal[m.id] = { paid: 0, share: 0 }; });
      ex.forEach((e) => {
        const sp = e.split.filter((id) => bal[id]); if (!sp.length) return;
        if (bal[e.paidBy]) bal[e.paidBy].paid += e.amount;
        sp.forEach((id) => { bal[id].share += e.amount / sp.length; });
      });
      const net = s.members.map((m) => ({ id: m.id, v: Math.round(bal[m.id].paid - bal[m.id].share) }));
      const debt = net.filter((n) => n.v < 0).map((n) => ({ id: n.id, v: -n.v })).sort((a, b) => b.v - a.v);
      const cred = net.filter((n) => n.v > 0).map((n) => ({ id: n.id, v: n.v })).sort((a, b) => b.v - a.v);
      const tx = []; let i = 0, j = 0;
      while (i < debt.length && j < cred.length) {
        const x = Math.min(debt[i].v, cred[j].v);
        if (x > 0) tx.push({ from: debt[i].id, to: cred[j].id, amount: x, key: debt[i].id + '>' + cred[j].id });
        debt[i].v -= x; cred[j].v -= x;
        if (debt[i].v <= 0) i++; if (cred[j].v <= 0) j++;
      }
      const total = ex.reduce((t, e) => t + e.amount, 0);
      return { bal, net, tx, total, ex };
    },

    pushChat(m) { const s = load(); const msg = Object.assign({ uid: uid(), ts: Date.now() }, m); s.chat.push(msg); save(); return msg; },

    /* contoh trip kelompok: menambah tiga teman demo dan beberapa kegiatan */
    seedDemo() {
      const s = load();
      if (s.items.length) return;
      s.members = [s.members[0]].concat(JSON.parse(JSON.stringify(DEMO_MEMBERS.filter((m) => m.id !== 'maya'))));
      s.trip.name = 'Trip Bali bersama';
      const a = (id, date, time, status) => ({ uid: uid(), actId: id, date, time, people: 4, status, by: 'me' });
      s.items = [a('tukik', '2026-11-12', '15:30', 'disetujui'), a('subak', '2026-11-13', '07:00', 'diajukan'), a('tenun', '2026-11-14', '09:00', 'draft')];
      s.items[1].by = 'sari';
      s.events = [
        { uid: uid(), date: '2026-11-11', time: '19:00', title: 'Persiapan keberangkatan', by: 'me' },
        { uid: uid(), date: '2026-11-15', time: '10:00', title: 'Check-out dan pulang', by: 'me' }
      ];
      s.expenses = [
        { uid: uid(), title: 'Sewa mobil 3 hari', amount: 1200000, paidBy: 'daniel', split: s.members.map((m) => m.id), cat: 'Transport' },
        { uid: uid(), title: 'Makan malam di Ubud', amount: 340000, paidBy: 'kevin', split: ['me', 'kevin', 'sari'], cat: 'Makan' }
      ];
      save();
    }
  };
  g.PS = S; g.PAUTH = PAUTH;
})(window);
