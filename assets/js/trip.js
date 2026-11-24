/* Pathora — ruang kerja trip: Obrolan AI (layar penuh), Kalender, Pembayaran */
(function () {
  'use strict';
  const { A, byId, D, rp, weatherFor, moonFor, festivalFor, isClosed, COLORS, uid } = PD;
  const { ic } = PA;
  const esc = UI.esc;
  const view = document.getElementById('view');
  const FREE_Q = 5;
  const TABS = [['chat', 'Asisten AI', 'sparkles'], ['kalender', 'Kalender', 'calendar'], ['bayar', 'Pembayaran', 'wallet']];
  const q = new URLSearchParams(location.search);
  const legacy = { patungan: ['bayar', 'patungan'], pesanan: ['bayar', 'pesanan'] };
  let tab = 'chat', sub = 'pesanan';
  const qt = q.get('tab');
  if (legacy[qt]) { tab = legacy[qt][0]; sub = legacy[qt][1]; } else if (TABS.some((t) => t[0] === qt)) tab = qt;
  const cal = { month: null, sel: null, mode: 'act' };
  let busyAI = false;
  const isTraveler = () => { const a = PAUTH.current(); return !!(a && a.role === 'traveler'); };
  const group = () => PS.get().members.length > 1;

  UI.mountNav(tab === 'chat' ? 'ai' : 'trip', 'dark');

  /* ---------- kepala trip ---------- */
  function head() {
    const s = PS.get();
    const tn = document.getElementById('tName'); if (document.activeElement !== tn) tn.value = s.trip.name;
    const d1 = document.getElementById('d1'), d2 = document.getElementById('d2');
    if (document.activeElement !== d1) d1.value = s.trip.start; if (document.activeElement !== d2) d2.value = s.trip.end;
    d2.min = s.trip.start;
    document.getElementById('tDays').textContent = (D.diff(s.trip.start, s.trip.end) + 1) + ' hari';
    document.getElementById('tMembers').innerHTML = group() ? UI.avatars(s.members.map((m) => m.id), 'av-sm') + '<span>' + s.members.length + ' orang</span>' : '<span class="badge">Perjalanan pribadi</span>';
    document.getElementById('invite').innerHTML = ic('users', 15) + '<span class="inv-t">' + (group() ? ' Undang' : ' Ajak teman') + '</span>';
    document.getElementById('invite').setAttribute('aria-label', group() ? 'Undang anggota' : 'Ajak teman');
    const pend = s.items.filter((i) => i.status === 'disetujui').length;
    if (document.getElementById('rail')) renderRail();
    document.getElementById('tabs').innerHTML = TABS.map((t) => '<button role="tab" class="' + (t[0] === tab ? 'on' : '') + '" data-t="' + t[0] + '">' + ic(t[2], 16) + t[1] + (t[0] === 'bayar' && pend ? ' <span class="badge b-ok" style="padding:0 7px">' + pend + '</span>' : '') + '</button>').join('');
  }
  document.getElementById('tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); });
  function go(t, s2) {
    tab = t; if (s2) sub = s2;
    const u = new URL(location.href); u.searchParams.set('tab', t); u.searchParams.delete('prompt'); history.replaceState(null, '', u);
    head(); build();
  }

  /* ---------- kuota pertanyaan ---------- */
  function quota() { const s = PS.get(); const t = D.today(); if (!s.seen.q || s.seen.q.d !== t) s.seen.q = { d: t, n: 0 }; return s.seen.q; }
  const left = () => (PAUTH.isPlus() ? Infinity : Math.max(0, FREE_Q - quota().n));

  /* =====================================================================
     ASISTEN AI — layar penuh
     ===================================================================== */
  const SUGGEST = [
    ['Susun 3 hari alam dan budaya, hindari tempat ramai', 'Rencana lengkap berdasarkan cuaca dan keramaian'],
    ['Akhir pekan berdua, ingin belajar memasak dan melihat sawah', 'Perjalanan singkat untuk dua orang'],
    ['Liburan keluarga dengan anak usia 6 tahun, anggaran Rp1,5 juta per orang', 'Hanya kegiatan yang aman untuk anak'],
    ['Cari tanggal terbaik untuk 4 hari di bulan November', 'Mempertimbangkan cuaca dan hari raya']
  ];
  function renderRail() {
    const el = document.getElementById('rail'); if (!el) return;
    const RL = { chat: 'Asisten', kalender: 'Kalender', bayar: 'Bayar' };
    const pend = PS.get().items.filter((i) => i.status === 'disetujui').length;
    el.innerHTML = TABS.map((t) => '<button type="button" data-t="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '" aria-label="' + t[1] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + ic(t[2], 22) + '<span>' + RL[t[0]] + '</span>' + (t[0] === 'bayar' && pend ? '<i class="dot">' + pend + '</i>' : '') + '</button>').join('');
  }
  function buildChat() {
    view.innerHTML = '<div class="ws2" id="ws"><nav class="rail" id="rail" aria-label="Tab trip"></nav><section class="pane chatp" aria-label="Asisten perjalanan">' +
      '<div class="pane-h"><h2>Asisten perjalanan</h2><span id="quotaPill" class="badge"></span></div>' +
      '<div class="chat-log" id="log" aria-live="polite"></div><div class="chips" id="chips"></div>' +
      '<form class="composer" id="comp"><label class="sr" for="msg">Pesan</label><textarea id="msg" rows="1" placeholder="Ceritakan rencanamu atau minta perubahan"></textarea><button class="btn btn-primary" aria-label="Kirim pesan">' + ic('send', 18) + '</button></form></section>' +
      '<aside class="pane sumpane" id="sumpane" aria-label="Rencana perjalanan"></aside></div>';
    renderRail();
    document.getElementById('rail').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); });
    renderLog(); renderChips(); renderQuota(); renderSummary();
    const ta = document.getElementById('msg');
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 130) + 'px'; };
    ta.addEventListener('input', grow);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('comp').requestSubmit(); } });
    document.getElementById('comp').addEventListener('submit', (e) => { e.preventDefault(); const v = ta.value.trim(); if (!v) return; ta.value = ''; grow(); send(v); });
    document.getElementById('log').addEventListener('click', onLogClick);
    document.getElementById('chips').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) send(b.dataset.q); });
    document.getElementById('sumpane').addEventListener('click', onPaneClick);
    ta.focus({ preventScroll: true });
  }
  function msgHTML(m) {
    if (m.role === 'me') return '<div class="msg me"><div class="stack"><div class="bubble">' + esc(m.text) + '</div></div></div>';
    return '<div class="msg ai" data-id="' + m.uid + '"><span class="who">Pathora</span><div class="stack"><div class="bubble">' + esc(m.text) + '</div>' + (m.blocks || []).map((b, i) => blockHTML(b, m, i)).join('') + '</div></div>';
  }
  function renderLog() {
    const log = document.getElementById('log'); const ch = PS.get().chat;
    if (!ch.length) {
      log.innerHTML = '<div class="welcome"><span class="mk"><img src="assets/img/mark-white.png" alt="" style="width:30px"></span><h2>Rencanakan perjalanan kamu</h2><p class="muted">Ceritakan dengan bahasa sehari-hari: berapa hari, berapa orang, dan suasana yang diinginkan. Asisten menyusun jadwal berdasarkan cuaca, keramaian, dan hari raya adat. Kegiatan yang kamu tambahkan otomatis masuk ke kalender.</p>' +
        '<div class="sugg">' + SUGGEST.map((c) => '<button class="sg" data-q="' + esc(c[0]) + '"><b>' + esc(c[0]) + '</b><small>' + esc(c[1]) + '</small></button>').join('') + '</div></div>';
      log.querySelector('.sugg').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) send(b.dataset.q); });
      return;
    }
    log.innerHTML = ch.map(msgHTML).join(''); log.scrollTop = log.scrollHeight;
  }
  function renderChips() {
    const ch = PS.get().chat; const last = ch[ch.length - 1];
    const el = document.getElementById('chips'); if (!el) return;
    const c = last && last.role === 'ai' ? (last.chips || []) : [];
    el.innerHTML = c.map((x) => '<button class="chip" data-q="' + esc(x) + '">' + esc(x) + '</button>').join('');
  }
  function renderQuota() {
    const el = document.getElementById('quotaPill'); if (!el) return;
    if (PAUTH.isPlus()) { el.className = 'badge b-ok'; el.innerHTML = '<i></i>Plus aktif'; el.onclick = null; el.style.cursor = ''; return; }
    el.className = 'badge'; el.style.cursor = 'pointer'; el.title = 'Lihat Pathora Plus';
    el.innerHTML = 'Sisa ' + left() + ' dari ' + FREE_Q + ' pertanyaan hari ini'; el.onclick = plusModal;
  }
  function scrollLog() { const l = document.getElementById('log'); if (l) l.scrollTop = l.scrollHeight; }

  async function send(text) {
    if (busyAI) return;
    if (left() <= 0) { plusModal(); return; }
    busyAI = true;
    const qq = quota(); if (!PAUTH.isPlus()) qq.n++;
    PS.pushChat({ role: 'me', text });
    const log = document.getElementById('log'); if (log.querySelector('.welcome')) log.innerHTML = '';
    log.insertAdjacentHTML('beforeend', msgHTML({ role: 'me', text }));
    log.insertAdjacentHTML('beforeend', '<div class="msg ai" id="typ"><span class="who">Pathora</span><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>');
    document.getElementById('chips').innerHTML = ''; scrollLog(); renderQuota();
    const wait = new Promise((r) => setTimeout(r, 650 + Math.min(900, text.length * 8)));
    /* Backend dulu (kalau sudah login ke server). Gagal, lambat, kuota habis, atau bentuk aneh: mesin lokal. */
    let be = null;
    if (window.PAPI && PAPI.login()) {
      const s0 = PS.get();
      be = await PAPI.rencana(text, { start: s0.trip.start, end: s0.trip.end, people: s0.members.length,
        actIds: s0.items.filter((i) => i.status !== 'ditolak').map((i) => i.actId) });
    }
    await wait;
    let res;
    try {
      if (be && be.tipe === 'tanya') res = { text: be.pesan, blocks: [], chips: [] };
      else if (be && be.tipe === 'rencana') {
        const s1 = PS.get();
        const plan = be.items.length ? AI.planFrom(be.items, be.start || s1.trip.start, be.people) : null;
        res = { text: be.pesan, blocks: plan && plan.items.length ? [{ type: 'plan', plan }] : [],
          chips: plan && plan.items.length ? ['Cari alternatif yang lebih hemat', 'Cari tanggal terbaik', 'Bagaimana jika hujan'] : ['Tampilkan semua kegiatan'] };
      } else res = AI.respond(text, null);
    } catch (err) { console.error(err); res = { text: 'Maaf, terjadi kendala saat menyusun jawaban. Silakan coba dengan kalimat lain.', blocks: [], chips: AI.chipsDefault }; }
    const msg = PS.pushChat({ role: 'ai', text: res.text, blocks: res.blocks, chips: res.chips });
    const typ = document.getElementById('typ'); if (typ) typ.remove();
    log.insertAdjacentHTML('beforeend', '<div class="msg ai" data-id="' + msg.uid + '"><span class="who">Pathora</span><div class="stack"><div class="bubble"></div></div></div>');
    const el = log.lastElementChild, bub = el.querySelector('.bubble'), stack = el.querySelector('.stack');
    await new Promise((resolve) => {
      const words = res.text.split(/(\s+)/); let i = 0;
      const t = setInterval(() => { i += 3; bub.textContent = words.slice(0, i).join(''); scrollLog(); if (i >= words.length) { clearInterval(t); resolve(); } }, 22);
    });
    bub.textContent = res.text;
    stack.insertAdjacentHTML('beforeend', (res.blocks || []).map((b, i) => blockHTML(b, msg, i)).join(''));
    renderChips(); scrollLog(); head(); busyAI = false;
    if (res.undo) { UI.toast(byId[res.undo.actId].short + ' dihapus', '<a href="#" id="undo">Batalkan</a>'); const u = document.getElementById('undo'); if (u) u.onclick = (e) => { e.preventDefault(); PS.addItem(res.undo); UI.toast('Kegiatan dikembalikan'); }; }
  }

  /* ---------- blok kartu di chat ---------- */
  const thumb = (a) => '<span class="th">' + PA.photo(a) + '</span>';
  const inTrip = (actId, date) => PS.get().items.some((i) => i.actId === actId && i.date === date && i.status !== 'ditolak');
  function blockHTML(b, m, idx) {
    const ref = 'data-m="' + m.uid + '" data-i="' + idx + '"';
    if (b.type === 'plan') {
      return '<button type="button" class="seeplan" data-seeplan="1">Lihat rencana di panel</button>';
    }
    if (b.type === 'dates') {
      return '<div>' + b.options.map((o, i) => '<div class="opt"><div><b>' + D.span(o.start, o.end) + '</b><div class="faint" style="font-size:12.5px;margin-top:2px">' + (o.rainy ? o.rainy + ' hari berpotensi hujan' : 'Cuaca relatif cerah') + (group() ? ' · ' + (o.busy.length ? 'Bentrok dengan ' + esc(o.busy.join(', ')) : 'Semua anggota tersedia') : '') + (o.moonDays ? ' · bertepatan purnama atau tilem' : '') + '</div></div>' +
        (b.chosen === i ? '<span class="badge b-ok"><i></i>Dipilih</span>' : '<button class="btn btn-line btn-sm" data-act="pickdate" data-k="' + i + '" ' + ref + '>Pilih tanggal</button>') + '</div>').join('') + '</div>';
    }
    if (b.type === 'acts') {
      return '<div>' + b.ids.map((id) => { const a = byId[id]; return '<a class="opt" href="kegiatan?id=' + id + '" style="margin-top:8px"><span style="display:flex;gap:12px;align-items:center">' + thumb(a) + '<span><b>' + esc(a.short) + '</b><small class="faint" style="display:block">' + esc(a.place) + ' · ' + a.dur.toString().replace('.', ',') + ' jam</small></span></span><span style="font-weight:700">' + rp(a.price) + '</span></a>'; }).join('') + '</div>';
    }
    if (b.type === 'go') {
      return b.href ? '<a class="btn btn-line btn-sm" style="align-self:flex-start" href="' + b.href + '">' + esc(b.label) + '</a>' : '<button class="btn btn-line btn-sm" style="align-self:flex-start" data-act="tab" data-k="' + b.tab + '">' + esc(b.label) + '</button>';
    }
    if (b.type === 'swap') {
      const a = byId[b.actId];
      return '<div class="opt"><span style="display:flex;gap:12px;align-items:center">' + thumb(a) + '<span><b>' + esc(a.short) + '</b><small class="faint" style="display:block">' + D.long(b.date) + ' · ' + b.time.replace(':', '.') + '</small></span></span>' + (b.done ? '<span class="badge b-ok"><i></i>Sudah diganti</span>' : '<button class="btn btn-primary btn-sm" data-act="swap" ' + ref + '>Ganti</button>') + '</div>';
    }
    if (b.type === 'alt') {
      const parts = [];
      if (b.actId) { const a = byId[b.actId]; parts.push('<div class="opt"><span style="display:flex;gap:12px;align-items:center">' + thumb(a) + '<span><b>' + esc(a.short) + '</b><small class="faint" style="display:block">' + D.long(b.date) + ' · ' + rp(a.price) + ' per orang</small></span></span>' + (b.done === 'act' ? '<span class="badge b-ok"><i></i>Ditambahkan</span>' : '<button class="btn btn-primary btn-sm" data-act="alt-act" ' + ref + '>Tambah</button>') + '</div>'); }
      if (b.shift) parts.push('<div class="opt"><span><b>Ubah ke tanggal lain</b><small class="faint" style="display:block">' + D.long(b.shift) + ' · ' + esc(byId[b.orig].short) + ' tetap sama</small></span>' + (b.done === 'shift' ? '<span class="badge b-ok"><i></i>Diajukan</span>' : '<button class="btn btn-line btn-sm" data-act="alt-shift" ' + ref + '>Ajukan tanggal ini</button>') + '</div>');
      return '<div>' + parts.join('') + '</div>';
    }
    if (b.type === 'rainfix') {
      return '<div class="opt"><span><b>Ganti dengan kegiatan dalam ruangan</b><small class="faint" style="display:block">Hanya untuk hari yang berpotensi hujan</small></span>' + (b.done ? '<span class="badge b-ok"><i></i>Selesai</span>' : '<button class="btn btn-primary btn-sm" data-act="rainfix" ' + ref + '>Ganti sekarang</button>') + '</div>';
    }
    return '';
  }
  function findBlock(btn) { const m = PS.get().chat.find((x) => x.uid === btn.dataset.m); return m && m.blocks[+btn.dataset.i]; }
  function addToTrip(actId, date, time, people, planRange) {
    const s = PS.get();
    if (!s.items.length && planRange) PS.update((st) => { st.trip.start = planRange.start; st.trip.end = planRange.end; });
    return PS.addItem({ actId, date, time, people: +people });
  }
  function onLogClick(e) {
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); return go(g.dataset.go); }
    if (e.target.closest('[data-seeplan]')) { const sp = document.getElementById('sumpane'); if (sp) sp.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const act = btn.dataset.act; const b = findBlock(btn) || {};
    const s = PS.get();
    if (act === 'tab') return go(btn.dataset.k);
    if (act === 'add1') {
      addToTrip(btn.dataset.a, btn.dataset.d, btn.dataset.t, btn.dataset.p, b.plan);
      renderLog(); renderChips(); UI.toast(byId[btn.dataset.a].short + ' ditambahkan ke kalender');
    } else if (act === 'addall') {
      b.plan.items.forEach((it) => addToTrip(it.actId, it.date, it.time, b.plan.people, b.plan));
      renderLog(); renderChips(); UI.toast(b.plan.items.length + ' kegiatan ditambahkan ke kalender');
    } else if (act === 'pickdate') {
      const o = b.options[+btn.dataset.k]; b.chosen = +btn.dataset.k;
      PS.update((st) => { st.trip.start = o.start; st.trip.end = o.end; });
      PS.pushChat({ role: 'ai', text: 'Tanggal trip ditetapkan pada ' + D.span(o.start, o.end) + '. Apakah kamu ingin saya menyusun kegiatannya untuk tanggal ini', blocks: [], chips: ['Susun rencana alam dan budaya, hindari tempat ramai', 'Bagaimana prakiraan cuaca trip saya'] });
      renderLog(); renderChips(); head();
    } else if (act === 'swap') {
      PS.removeItem(b.from); PS.addItem({ actId: b.actId, date: b.date, time: b.time }); b.done = true; PS.save(); renderLog(); head(); UI.toast('Kegiatan berhasil diganti');
    } else if (act === 'alt-act') {
      PS.addItem({ actId: b.actId, date: b.date, time: AI.freeTime(byId[b.actId], b.date, PS.get().items) || byId[b.actId].times[0] }); b.done = 'act'; PS.save(); renderLog(); UI.toast('Alternatif ditambahkan sebagai draf');
    } else if (act === 'alt-shift') {
      if (!isTraveler()) return UI.needLogin('Mengajukan kegiatan ke host memerlukan akun.');
      const it = PS.addItem({ actId: b.orig, date: b.shift, time: AI.freeTime(byId[b.orig], b.shift, PS.get().items) || byId[b.orig].times[0] }); PS.setStatus(it.uid, 'diajukan'); b.done = 'shift'; PS.save(); renderLog(); UI.toast('Permintaan untuk tanggal baru telah dikirim');
    } else if (act === 'rainfix') {
      let n = 0;
      b.ids.forEach((u) => {
        const it = s.items.find((i) => i.uid === u); if (!it) return;
        const alt = A.filter((a) => !a.outdoor && !s.items.some((i) => i.actId === a.id) && !isClosed(a, it.date, s.hostClosed) && AI.freeTime(a, it.date, s.items)).sort((x, y) => y.cats.filter((c) => byId[it.actId].cats.includes(c)).length - x.cats.filter((c) => byId[it.actId].cats.includes(c)).length)[0];
        if (alt) { const tm = AI.freeTime(alt, it.date, s.items); PS.removeItem(u); PS.addItem({ actId: alt.id, date: it.date, time: tm }); n++; }
      });
      b.done = true; PS.save(); renderLog(); UI.toast(n ? n + ' kegiatan diganti ke dalam ruangan' : 'Tidak ada pengganti dalam ruangan yang tersedia');
    }
  }

  /* ---------- panel kanan: usulan rencana atau ringkasan trip ---------- */
  const STAT = { draft: ['Belum diajukan', ''], diajukan: ['Menunggu host', 'wait'], disetujui: ['Disetujui', 'ok'], lunas: ['Lunas', 'ok'], ditolak: ['Ditolak', 'bad'] };
  const PROTO = '';
  let sideForce = null, sidePlanUid = null;
  function lastPlan() {
    const ch = PS.get().chat;
    for (let k = ch.length - 1; k >= 0; k--) {
      const m = ch[k]; if (m.role !== 'ai' || !m.blocks) continue;
      const i = m.blocks.findIndex((b) => b.type === 'plan');
      if (i >= 0) return { m, i, b: m.blocks[i] };
    }
    return null;
  }
  function stepsHTML(active) {
    const L = ['Susun rencana', 'Ajukan ke host', 'Host menyetujui', 'Bayar']; let out = '';
    L.forEach((lab, k) => {
      const n = k + 1, st = n < active ? 'done' : (n === active ? 'on' : '');
      out += '<li class="' + st + '"' + (n === active ? ' aria-current="step"' : '') + '><span class="n">' + (n < active ? ic('check', 14) : n) + '</span><span class="l">' + lab + '</span></li>';
      if (n < 4) out += '<li class="ln" aria-hidden="true"></li>';
    });
    return '<ol class="pstep" aria-label="Langkah">' + out + '</ol>';
  }
  const durTxt = (a) => a.dur.toString().replace('.', ',') + ' jam';
  function planPane(lp) {
    const p = lp.b.plan, ref = 'data-m="' + lp.m.uid + '" data-i="' + lp.i + '"';
    const all = p.items.every((it) => inTrip(it.actId, it.date));
    const hasItems = PS.get().items.some((i) => i.status !== 'ditolak');
    const days = p.days.map((d, n) => '<section class="dayg" aria-label="Hari ' + (n + 1) + '"><div class="dayn">' + (n + 1) + '</div><div class="dayb"><div class="dayh"><span>' + D.long(d.date) + '</span><span class="dayw">' + (d.moon ? ic('moon', 14) + d.moon : '') + UI.wx(d.wx) + '</span></div>' +
      (d.items.length ? d.items.map((it) => {
        const a = byId[it.actId], has = inTrip(it.actId, it.date);
        return '<div class="it"><div class="it-m"><h3>' + esc(a.short) + '</h3><small>' + ic('pin', 13) + esc(a.place) + '<span aria-hidden="true">·</span>' + ic('clock', 13) + it.time.replace(':', '.') + '<span aria-hidden="true">·</span>' + durTxt(a) + '</small><small class="why">' + esc(it.reason) + '</small></div>' +
          '<b class="pr">' + rp(a.price) + '<em>per orang</em></b>' +
          (has ? '<span class="added">' + ic('check', 14) + ' Ditambahkan</span>' : '<button type="button" class="addb" aria-label="Tambah ' + esc(a.short) + ' ke trip" data-act="add1" data-a="' + it.actId + '" data-d="' + it.date + '" data-t="' + it.time + '" data-p="' + p.people + '" ' + ref + '>' + ic('plus', 15) + ' Tambah</button>') + '</div>';
      }).join('') : '<p class="none">Tidak ada kegiatan pada hari ini.</p>') + '</div></section>').join('');
    return '<div class="sp">' + stepsHTML(1) +
      '<div><div class="sp-eb">Rencana usulan</div><h2 class="sp-h">' + p.days.length + ' hari di bali.</h2><div class="sp-meta">' + p.people + ' orang · ' + D.span(p.start, p.end) + '</div></div>' +
      '<div class="days">' + days + '</div>' +
      '<div class="ptot"><span class="ptl">Perkiraan total</span><span class="tv"><b>' + rp(p.total) + '</b><small>untuk ' + p.people + ' orang · ' + rp(p.perPerson) + ' per orang</small></span></div>' +
      '<div class="sp-act">' + (all ? '' : '<button type="button" class="pbtn" data-act="addall" ' + ref + '>Tambahkan semua ke trip</button>') + (hasItems ? '<button type="button" class="gbtn" data-view="sum">Lihat ringkasan trip</button>' : '') + '</div>' +
      '<p class="help">Belum diajukan ke host. Kamu masih bisa mengubah rencana dulu.</p>' + PROTO + '</div>';
  }
  function sumPane(items, hasOpen) {
    const s = PS.get();
    const dates = Array.from(new Set(items.map((i) => i.date)));
    const total = items.reduce((t, i) => t + PS.itemCost(i), 0);
    const drafts = items.filter((i) => i.status === 'draft').length;
    const sent = items.some((i) => i.status === 'diajukan'), ok = items.some((i) => i.status === 'disetujui' || i.status === 'lunas');
    const active = ok ? 4 : (sent ? 3 : 2);
    const grp = dates.map((d) => '<section class="dayg"><div class="dayb wide"><div class="dayh"><span>' + D.long(d) + '</span><span class="dayw">' + UI.wx(weatherFor(d)) + '</span></div>' +
      items.filter((i) => i.date === d).map((it) => { const a = byId[it.actId], st = STAT[it.status] || [it.status, '']; return '<div class="it"><div class="it-m"><h3>' + esc(a.short) + '</h3><small>' + it.time.replace(':', '.') + '<span aria-hidden="true">·</span>' + it.people + ' orang<span aria-hidden="true">·</span>' + rp(PS.itemCost(it)) + '</small></div><span class="st ' + st[1] + '">' + st[0] + '</span><button type="button" class="rm" data-rm="' + it.uid + '" aria-label="Hapus ' + esc(a.short) + '">' + ic('trash', 16) + '</button></div>'; }).join('') + '</div></section>').join('');
    const help = drafts ? 'Host mengonfirmasi dulu. Kamu baru membayar setelah disetujui.' : (ok ? 'Sudah disetujui host. Kamu bisa membayar sekarang.' : 'Menunggu konfirmasi host. Kamu belum perlu membayar.');
    return '<div class="sp">' + stepsHTML(active) +
      '<div><div class="sp-eb">Ringkasan trip</div><h2 class="sp-h">' + items.length + ' kegiatan di trip kamu.</h2><div class="sp-meta">' + D.span(s.trip.start, s.trip.end) + '</div></div>' +
      '<div class="days">' + grp + '</div>' +
      '<div class="ptot"><span class="ptl">Estimasi total</span><span class="tv"><b>' + rp(total) + '</b></span></div>' +
      '<div class="sp-act">' + (drafts ? '<button type="button" class="pbtn" data-sendall="1">Ajukan ' + drafts + ' kegiatan ke host</button>' : (ok ? '<button type="button" class="pbtn" data-open="bayar">Rincian pembayaran</button>' : '')) +
      '<button type="button" class="gbtn" data-open="kalender">' + ic('calendar', 16) + ' Buka kalender</button>' +
      (drafts && ok ? '<button type="button" class="gbtn" data-open="bayar">' + ic('wallet', 16) + ' Rincian pembayaran</button>' : '') +
      (hasOpen ? '<button type="button" class="gbtn" data-view="plan">Lihat usulan terbaru</button>' : '') + '</div>' +
      '<p class="help">' + help + '</p>' + PROTO + '</div>';
  }
  function emptyPane() {
    return '<div class="sp">' + stepsHTML(1) + '<div><div class="sp-eb">Rencana</div><h2 class="sp-h">mulai dari ceritamu.</h2><p class="sp-meta">Ceritakan berapa hari, berapa orang, dan suasana yang diinginkan. Rencana dari asisten akan muncul di sini.</p></div>' + PROTO + '</div>';
  }
  function renderSummary() {
    const pane = document.getElementById('sumpane'); if (!pane) return;
    const lp = lastPlan();
    if (lp && lp.m.uid !== sidePlanUid) { sidePlanUid = lp.m.uid; sideForce = null; }
    const items = PS.sortedItems().filter((i) => i.status !== 'ditolak');
    const open = !!lp && !lp.b.plan.items.every((it) => inTrip(it.actId, it.date));
    let v = sideForce || (open ? 'plan' : (items.length ? 'sum' : 'empty'));
    if (v === 'plan' && !lp) v = items.length ? 'sum' : 'empty';
    if (v === 'sum' && !items.length) v = lp ? 'plan' : 'empty';
    const old = pane.querySelector('.sp'), top = old && pane.dataset.v === v ? old.scrollTop : 0;
    pane.dataset.v = v;
    pane.innerHTML = v === 'plan' ? planPane(lp) : (v === 'sum' ? sumPane(items, open) : emptyPane());
    const nw = pane.querySelector('.sp'); if (nw && top) nw.scrollTop = top;
  }
  function onPaneClick(e) {
    const v = e.target.closest('[data-view]'); if (v) { sideForce = v.dataset.view; renderSummary(); return; }
    onLogClick(e); onSumClick(e);
  }
  function onSumClick(e) {
    const o = e.target.closest('[data-open]'); if (o) return go(o.dataset.open, o.dataset.open === 'bayar' ? 'pesanan' : undefined);
    const r = e.target.closest('[data-rm]'); if (r) { PS.removeItem(r.dataset.rm); UI.toast('Kegiatan dihapus dari trip'); return; }
    if (e.target.closest('[data-sendall]')) { sendDrafts(); }
  }
  function sendDrafts() {
    if (!isTraveler()) return UI.needLogin('Mengajukan kegiatan ke host memerlukan akun.');
    const d = PS.get().items.filter((i) => i.status === 'draft'); d.forEach((i) => PS.setStatus(i.uid, 'diajukan')); UI.toast(d.length + ' permintaan dikirim ke host');
  }

  /* ---------- aksi per item ---------- */
  function itemAction(a, u) {
    const it = PS.get().items.find((i) => i.uid === u); if (!it) return;
    const host = byId[it.actId].host.name;
    if (a === 'ajukan') { if (!isTraveler()) return UI.needLogin('Mengajukan kegiatan ke host memerlukan akun.'); PS.setStatus(u, 'diajukan'); UI.toast('Permintaan dikirim ke ' + host); }
    else if (a === 'setuju') { PS.setStatus(u, 'disetujui'); UI.toast('Disetujui host. Pembayaran sudah dapat dilakukan.'); }
    else if (a === 'tolak') {
      PS.setStatus(u, 'ditolak');
      const alt = AI.alternativeFor(it);
      PS.pushChat({ role: 'ai', text: host + ' belum dapat menerima ' + byId[it.actId].short + ' pada ' + D.long(it.date) + '. Kamu tidak dikenai biaya apa pun. Berikut dua alternatif yang paling sesuai:', blocks: [{ type: 'alt', orig: it.actId, actId: alt.act && alt.act.id, date: it.date, shift: alt.shift }], chips: [] });
      UI.toast('Permintaan tidak dapat dipenuhi. Alternatif tersedia di Asisten AI.', '<a href="#" data-go="chat">Buka</a>');
    }
    else if (a === 'bayar') { if (!isTraveler()) return UI.needLogin('Pembayaran memerlukan akun.'); payModal([it]); }
    else if (a === 'hapus') { PS.removeItem(u); UI.toast('Kegiatan dihapus dari trip'); }
    else if (a === 'alt') {
      const alt = AI.alternativeFor(it);
      PS.pushChat({ role: 'ai', text: 'Alternatif untuk ' + byId[it.actId].short + ':', blocks: [{ type: 'alt', orig: it.actId, actId: alt.act && alt.act.id, date: it.date, shift: alt.shift }], chips: [] });
      go('chat');
    }
    else if (a === 'stamp') { PS.stamp(it.actId, it.date); UI.toast('Stempel ' + byId[it.actId].short + ' masuk ke Paspor Alam', '<a href="paspor">Lihat paspor</a>'); }
  }
  document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g && !e.target.closest('#log')) { e.preventDefault(); go(g.dataset.go); } });

  /* =====================================================================
     KALENDER
     ===================================================================== */
  function buildCal() {
    const s = PS.get();
    if (!cal.month) cal.month = s.trip.start.slice(0, 7) + '-01';
    if (!cal.sel) cal.sel = s.trip.start;
    view.innerHTML = '<div class="ws2 ws3 ws-cal"><nav class="rail" id="rail" aria-label="Tab trip"></nav><section class="pane calp" aria-label="Kalender trip"><div class="cal-h"><div><div class="sp-eb">Kalender</div><h2 id="calT"></h2><p class="cal-sub">Semua kegiatan di trip tampil di sini, termasuk yang belum diajukan ke host.</p></div><span class="cal-nav"><button class="icon-btn" id="pm" aria-label="Bulan sebelumnya">' + ic('left', 18) + '</button><button class="btn btn-line btn-sm" id="tdy">Ke tanggal trip</button><button class="icon-btn" id="nm" aria-label="Bulan berikutnya">' + ic('right', 18) + '</button></span></div><div class="cal-g" id="calG"></div>' +
      '<div class="legend"><span><i class="lg-act"></i>Kegiatan trip</span><span><i class="lg-me"></i>Acara pribadi</span><button type="button" class="lg-help" data-moon="1">' + ic('moon', 13) + ' Purnama atau tilem <svg class="lg-i" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><path d="M12 17.5h.01"/></svg></button></div></section>' +
      '<aside class="pane dayp" aria-label="Rincian hari"><div class="pane-h"><h2 id="dayT"></h2></div><div class="pane-b" id="dayB"></div></aside></div>';
    document.getElementById('rail').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); });
    renderRail();
    view.onclick = (e) => { if (e.target.closest('[data-moon]')) moonModal(); };
    document.getElementById('pm').onclick = () => { cal.month = shiftMonth(cal.month, -1); renderCal(); };
    document.getElementById('nm').onclick = () => { cal.month = shiftMonth(cal.month, 1); renderCal(); };
    document.getElementById('tdy').onclick = () => { cal.month = PS.get().trip.start.slice(0, 7) + '-01'; cal.sel = PS.get().trip.start; renderCal(); };
    document.getElementById('calG').addEventListener('click', (e) => { const c = e.target.closest('[data-d]'); if (c) { cal.sel = c.dataset.d; renderCal(); } });
    document.getElementById('dayB').addEventListener('click', onDayClick);
    document.getElementById('dayB').addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target;
      if (f.id === 'actF') { PS.addItem({ actId: f.act.value, date: cal.sel, time: f.time.value || '09:00', people: Math.max(1, +f.people.value || 1) }); UI.toast('Kegiatan ditambahkan ke ' + D.long(cal.sel), '<a href="#" data-go="chat">Ajukan di Asisten</a>'); return; }
      const t = f.title.value.trim(); if (!t) return;
      PS.update((st) => st.events.push({ uid: uid(), date: cal.sel, time: f.time.value || '09:00', title: t, by: st.me })); UI.toast('Acara ditambahkan');
    });
    renderCal();
  }
  const TIMES = Array.from({ length: 48 }, (_, i) => { const v = String(Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 ? '30' : '00'); return '<option' + (v === '09:00' ? ' selected' : '') + '>' + v + '</option>'; }).join('');
  function moonModal() {
    UI.modal('<div class="modal-h"><h3>Purnama dan Tilem</h3><button class="icon-btn" data-close aria-label="Tutup">' + ic('x', 18) + '</button></div><div class="modal-b mo">' +
      '<p class="muted">Dua hari suci yang datang sekitar setiap 15 hari dalam kalender umat Hindu Bali. Di Bali, ini hari yang ramai dengan persembahyangan, bukan hari yang berbahaya.</p>' +
      '<div class="mo-g"><div><b>Purnama</b><span>Bulan purnama. Hari bersyukur dan memohon berkat. Pura biasanya ramai oleh persembahyangan dan persembahan.</span></div><div><b>Tilem</b><span>Bulan mati (gelap). Suasana lebih tenang, untuk perenungan dan penyucian diri.</span></div></div>' +
      '<h4>Pengaruhnya untuk trip kamu</h4><ul><li>Beberapa host menutup kegiatan di hari ini. Asisten sudah menghindari menjadwalkannya, dan tanggalnya ditandai ikon bulan di kalender.</li><li>Jalan menuju pura bisa lebih ramai. Beri waktu perjalanan lebih longgar.</li></ul>' +
      '<h4>Sopan santun untuk pengunjung</h4><ul><li>Tidak ada larangan bepergian. Kamu tetap boleh berwisata.</li><li>Berpakaian sopan di pura: bahu dan lutut tertutup, pakai sarung dan selendang (sering disediakan di pura).</li><li>Jangan masuk area dalam pura kecuali untuk bersembahyang, dan jangan memanjat atau menyentuh benda suci.</li><li>Jangan menginjak persembahan (canang) di jalan atau di depan pura.</li><li>Perempuan yang sedang haid diminta tidak memasuki area pura.</li><li>Jangan mengganggu upacara. Tanyakan dulu sebelum memotret orang yang sedang bersembahyang.</li><li>Aturan tiap desa dan pura bisa berbeda. Ikuti arahan host atau pemangku setempat.</li></ul>' +
      '<p class="faint" style="font-size:12.5px">Pastikan ke host sebelum berangkat.</p></div>');
  }
  function shiftMonth(m, n) { const d = D.parse(m); d.setMonth(d.getMonth() + n); return D.iso(d).slice(0, 7) + '-01'; }
  function renderCal() {
    const s = PS.get(); const first = D.parse(cal.month);
    document.getElementById('calT').textContent = D.BULAN[first.getMonth()] + ' ' + first.getFullYear();
    const startOff = (first.getDay() + 6) % 7; const gridStart = D.add(cal.month, -startOff);
    let h = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => '<div class="cal-dow">' + d + '</div>').join('');
    for (let i = 0; i < 42; i++) {
      const d = D.add(gridStart, i); const dt = D.parse(d); if (i >= 35 && dt.getMonth() !== first.getMonth()) break;
      const inT = d >= s.trip.start && d <= s.trip.end; const its = s.items.filter((x) => x.date === d).sort((a, b) => a.time.localeCompare(b.time)); const evs = s.events.filter((x) => x.date === d);
      const busy = group() ? s.members.filter((m) => m.busy.includes(d)) : []; const mn = moonFor(d), f = festivalFor(d);
      const all = its.map((it) => '<div class="ev act">' + it.time.slice(0, 5).replace(':', '.') + ' ' + esc(byId[it.actId].short) + '</div>').concat(evs.map((e) => '<div class="ev me">' + esc(e.title) + '</div>'));
      h += '<button class="cell' + (dt.getMonth() !== first.getMonth() ? ' out' : '') + (d === cal.sel ? ' sel' : '') + (inT ? ' intrip' : '') + (d === D.today() ? ' today' : '') + '" data-d="' + d + '" aria-label="' + D.long(d) + '"><span class="dn"><span>' + dt.getDate() + '</span><span style="display:flex;gap:4px;align-items:center;color:var(--ink-3)">' + (mn ? ic('moon', 12) : '') + (inT ? ic(weatherFor(d).icon, 13) : '') + '</span></span>' +
        all.slice(0, 1).join('') + (all.length > 1 ? '<div class="faint" style="font-size:10.5px">+' + (all.length - 1) + ' lagi</div>' : '') + (f ? '<div class="ev fest">Upacara</div>' : '') +
        (busy.length ? '<span class="meta"><span style="color:#86320f;font-weight:600">' + busy.length + ' berhalangan</span></span>' : '') + '</button>';
    }
    document.getElementById('calG').innerHTML = h;
    renderDay();
  }
  /* kurva peluang hujan: 7 hari di sekitar tanggal yang dipilih */
  function wxCurve(sel) {
    const days = []; for (let i = -3; i <= 3; i++) days.push(D.add(sel, i));
    const W = days.map((d) => weatherFor(d));
    const w = 300, h = 92, px = 20, top = 14, bot = 70;
    const xs = days.map((d, i) => px + i * (w - 2 * px) / 6);
    const ys = W.map((x) => bot - (x.rain / 100) * (bot - top));
    let line = 'M' + xs[0] + ' ' + ys[0];
    for (let i = 1; i < xs.length; i++) { const cx = (xs[i - 1] + xs[i]) / 2; line += ' C' + cx + ' ' + ys[i - 1] + ' ' + cx + ' ' + ys[i] + ' ' + xs[i] + ' ' + ys[i]; }
    const area = line + ' L' + xs[6] + ' ' + bot + ' L' + xs[0] + ' ' + bot + ' Z';
    const pts = xs.map((x, i) => { const on = days[i] === sel;
      return '<circle cx="' + x + '" cy="' + ys[i] + '" r="' + (on ? 5 : 3) + '" fill="' + (on ? '#FCE6B7' : 'rgba(244,241,226,.7)') + '"/>' + (on ? '<circle cx="' + x + '" cy="' + ys[i] + '" r="9" fill="none" stroke="rgba(252,230,183,.4)"/>' : '') +
        '<text x="' + x + '" y="' + (ys[i] - 11) + '" text-anchor="middle" font-size="10" fill="' + (on ? '#FCE6B7' : 'rgba(244,241,226,.72)') + '">' + W[i].rain + '%</text>' +
        '<text x="' + x + '" y="88" text-anchor="middle" font-size="10.5" fill="' + (on ? '#F4F1E2' : 'rgba(244,241,226,.6)') + '" font-weight="' + (on ? 600 : 400) + '">' + D.parse(days[i]).getDate() + '</text>'; }).join('');
    return '<div class="wxc"><div class="wxc-h"><b>Peluang hujan</b></div><svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" role="img" aria-label="Kurva peluang hujan 7 hari sekitar tanggal terpilih"><defs><linearGradient id="wxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FCE6B7" stop-opacity=".28"/><stop offset="1" stop-color="#FCE6B7" stop-opacity="0"/></linearGradient></defs><path d="' + area + '" fill="url(#wxg)"/><path d="' + line + '" fill="none" stroke="#FCE6B7" stroke-width="2" stroke-linecap="round"/>' + pts + '</svg></div>';
  }
  function renderDay() {
    const s = PS.get(); const d = cal.sel; const w = weatherFor(d); const mn = moonFor(d), f = festivalFor(d);
    document.getElementById('dayT').textContent = D.long(d);
    const its = s.items.filter((x) => x.date === d).sort((a, b) => a.time.localeCompare(b.time)); const evs = s.events.filter((x) => x.date === d).sort((a, b) => a.time.localeCompare(b.time));
    const me = PS.me(); const meBusy = me.busy.includes(d);
    document.getElementById('dayB').innerHTML = '<div class="agenda-d"><div class="ag-scroll">' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--ink-2)">' + UI.wx(w) + '<span>Peluang hujan ' + w.rain + '%</span>' + (mn ? '<button type="button" class="lg-help" data-moon="1">' + ic('moon', 14) + 'Hari ' + mn + ' <svg class="lg-i" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><path d="M12 17.5h.01"/></svg></button>' : '') + '</div>' +
      wxCurve(d) +
      (f ? '<div class="badge b-mid">' + esc(f) + '</div>' : '') +
      its.map((it) => { const a = byId[it.actId]; return '<div class="ag"><time>' + it.time.replace(':', '.') + '</time><div style="flex:1;min-width:0"><b>' + esc(a.short) + '</b><small class="faint" style="display:block">' + esc(a.place) + ' · ' + it.people + ' orang</small></div><button class="icon-btn" data-delit="' + it.uid + '" aria-label="Hapus kegiatan">' + ic('trash', 16) + '</button></div>'; }).join('') +
      evs.map((e) => '<div class="ag"><time>' + e.time.replace(':', '.') + '</time><div style="flex:1"><b>' + esc(e.title) + '</b><small class="faint" style="display:block">Acara pribadi</small></div><button class="icon-btn" data-del="' + e.uid + '" aria-label="Hapus acara">' + ic('trash', 16) + '</button></div>').join('') +
      (!its.length && !evs.length ? '<p class="faint" style="font-size:14px">Belum ada agenda pada hari ini.</p>' : '') +
      (group() ? '<div style="border-top:1px solid var(--line);padding-top:14px;display:grid;gap:10px"><b style="font-size:13px">Ketersediaan anggota</b>' + s.members.map((m) => '<div class="busy-row">' + UI.avatar(m, 'av-sm') + '<span style="flex:1">' + esc(m.name) + '</span><span class="' + (m.busy.includes(d) ? 'neg' : 'faint') + '" style="font-size:12.5px">' + (m.busy.includes(d) ? 'Berhalangan' : 'Tersedia') + '</span></div>').join('') + '<button class="btn btn-line btn-sm" data-busy="1">' + (meBusy ? 'Saya tersedia pada hari ini' : 'Tandai saya berhalangan') + '</button></div>' : '') +
      '</div><div class="ag-add"><div class="seg" role="tablist" aria-label="Jenis tambahan"><button type="button" role="tab" data-mode="act" class="' + (cal.mode === 'act' ? 'on' : '') + '">Tambah kegiatan</button><button type="button" role="tab" data-mode="ev" class="' + (cal.mode === 'ev' ? 'on' : '') + '">Acara pribadi</button></div>' +
      (cal.mode === 'ev'
        ? '<form id="evF"><input class="input" name="title" placeholder="Contoh: check-in hotel" aria-label="Nama acara" required><div class="frow"><label class="fld">Jam<select class="select" name="time" aria-label="Jam">' + TIMES + '</select></label><button class="btn btn-dark fbtn">Tambah acara</button></div></form>'
        : '<form id="actF"><select class="select" name="act" aria-label="Kegiatan">' + A.map((x) => '<option value="' + x.id + '">' + esc(x.short) + '</option>').join('') + '</select><div class="frow"><label class="fld">Jam<select class="select" name="time" aria-label="Jam">' + TIMES + '</select></label><label class="fld">Orang<input class="input" type="number" name="people" min="1" max="30" value="' + Math.max(1, s.members.length) + '"></label><button class="btn btn-primary fbtn">Tambah</button></div></form>') +
      '</div></div>';
  }
  function onDayClick(e) {
    const md = e.target.closest('[data-mode]'); if (md) { cal.mode = md.dataset.mode; renderDay(); return; }
    const di = e.target.closest('[data-delit]'); if (di) { PS.removeItem(di.dataset.delit); UI.toast('Kegiatan dihapus dari trip'); return; }
    const del = e.target.closest('[data-del]'); if (del) { PS.update((st) => { st.events = st.events.filter((x) => x.uid !== del.dataset.del); }); return; }
    if (e.target.closest('[data-busy]')) { PS.update((st) => { const m = st.members.find((x) => x.id === st.me); const i = m.busy.indexOf(cal.sel); if (i >= 0) m.busy.splice(i, 1); else m.busy.push(cal.sel); }); return; }
    if (e.target.closest('[data-ask]')) { go('chat'); setTimeout(() => send('Cari tanggal terbaik'), 200); }
  }

  /* =====================================================================
     PEMBAYARAN: Pesanan dan Patungan
     ===================================================================== */
  function buildPay() {
    const split = sub === 'patungan';
    view.innerHTML = '<div class="ws2 ws3 ws-pay' + (split ? ' ws-split' : '') + '"><nav class="rail" id="rail" aria-label="Tab trip"></nav><section class="pane payp" aria-label="Pembayaran"><div class="pay-top"><div class="subtabs" id="subtabs" role="tablist"><button role="tab" data-s="pesanan" class="' + (sub === 'pesanan' ? 'on' : '') + '">Pesanan kegiatan</button><button role="tab" data-s="patungan" class="' + (split ? 'on' : '') + '">' + (group() ? 'Patungan' : 'Rincian biaya') + '</button></div></div><div id="payBody"></div></section>' + (split ? '' : '<aside class="pane payside" id="paySide" aria-label="Ringkasan pembayaran"></aside>') + '</div>';
    document.getElementById('rail').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); });
    renderRail();
    document.getElementById('subtabs').onclick = (e) => { const b = e.target.closest('[data-s]'); if (b) { sub = b.dataset.s; buildPay(); } };
    if (split) buildSplit(document.getElementById('payBody')); else buildOrders(document.getElementById('payBody'));
  }
  const OSTAT = { draft: 'Belum diajukan', diajukan: 'Menunggu host', disetujui: 'Siap dibayar', ditolak: 'Ditolak host', lunas: 'Lunas' };
  function payMsg(items, drafts) {
    const n = (st) => items.filter((i) => i.status === st).length;
    const w = n('diajukan'), ok = n('disetujui'), no = n('ditolak');
    const parts = [];
    if (ok) parts.push(ok + ' kegiatan sudah disetujui host dan siap dibayar.');
    if (w) parts.push(w + ' kegiatan menunggu jawaban host. Kamu belum dikenai biaya.');
    if (no) parts.push(no + ' kegiatan ditolak host. Kamu tidak dikenai biaya, dan bisa mencari penggantinya.');
    if (!parts.length) parts.push('Semua pesanan sudah lunas.');
    if (drafts) parts.push(drafts + ' kegiatan lain belum diajukan ke host, jadi belum muncul di sini.');
    return parts.join(' ');
  }
  function buildOrders(box) {
    const all = PS.sortedItems();
    const drafts = all.filter((i) => i.status === 'draft').length;
    const items = all.filter((i) => i.status !== 'draft');
    const payable = items.filter((i) => i.status === 'disetujui');
    const side = document.getElementById('paySide');
    const total = payable.reduce((t, i) => t + PS.itemCost(i), 0);
    const waiting = items.some((i) => i.status === 'diajukan');
    side.innerHTML = '<div class="sp"><div class="sp-eb">Ringkasan pembayaran</div>' +
      '<div class="ps-row"><span>' + payable.length + ' kegiatan disetujui</span><span>' + rp(total) + '</span></div>' +
      '<div class="ptot"><span class="ptl">Total dibayar sekarang</span><span class="tv"><b>' + rp(total) + '</b></span></div>' +
      (payable.length ? '<button type="button" class="pbtn" id="payAll">Bayar ' + rp(total) + '</button><p class="help">Pilih cara bayar di langkah berikutnya.</p>'
        : '<p class="help">' + (waiting ? 'Menunggu persetujuan host. Tombol bayar akan aktif setelah ada kegiatan yang disetujui.' : 'Belum ada kegiatan yang perlu dibayar.') + '</p>') +
      '</div>';
    side.onclick = (e) => { if (e.target.closest('#payAll')) { if (!isTraveler()) return UI.needLogin('Pembayaran memerlukan akun.'); payModal(payable); } };
    if (!items.length) {
      box.innerHTML = '<div class="sp"><div><div class="sp-eb">Pesanan</div><h1 class="sp-h">belum ada yang perlu dibayar.</h1><p class="sp-meta">Pembayaran dibuka setelah host menyetujui kegiatanmu. Alurnya:</p></div>' +
        '<ol class="how"><li><b>Susun rencana di Asisten.</b><span>Kegiatan yang kamu tambahkan langsung masuk ke Kalender.</span></li><li><b>Ajukan ke host.</b><span>Satu tombol di Asisten. Kamu belum dikenai biaya.</span></li><li><b>Bayar di sini.</b><span>Setelah host menyetujui, pesananmu muncul di halaman ini.</span></li></ol>' +
        (drafts ? '<p class="sp-meta">Kamu punya ' + drafts + ' kegiatan yang belum diajukan.</p>' : '') +
        '<div class="sp-act"><a class="pbtn" href="trip?tab=chat" data-go="chat">' + (drafts ? 'Ajukan di Asisten' : 'Susun dengan Asisten') + '</a>' + (all.length ? '' : '<button class="gbtn" id="seed3">Muat contoh trip kelompok</button>') + '</div></div>';
      const sd = document.getElementById('seed3'); if (sd) sd.onclick = () => { PS.seedDemo(); head(); };
      return;
    }
    box.innerHTML = '<div class="sp"><div><div class="sp-eb">Pesanan</div><h1 class="sp-h">' + items.length + ' pesanan, ' + payable.length + ' siap dibayar.</h1><p class="sp-meta">' + payMsg(items, drafts) + '</p>' + (drafts ? '<div class="sp-act" style="margin-top:14px"><a class="gbtn" href="trip?tab=chat" data-go="chat">Ajukan sisanya di Asisten</a></div>' : '') + '</div><div class="ords">' +
      items.map((it) => { const a = byId[it.actId]; const stamped = PS.get().passport[it.actId];
        const act = it.status === 'diajukan' ? '<span class="ord-hint">Host sedang meninjau</span><button type="button" class="ord-lnk" data-pa="setuju" data-u="' + it.uid + '">Simulasi: host setuju</button><button type="button" class="ord-lnk bad" data-pa="tolak" data-u="' + it.uid + '">Simulasi: host tolak</button>'
          : it.status === 'disetujui' ? '<button type="button" class="addb" data-pa="bayar" data-u="' + it.uid + '">Bayar</button>'
          : it.status === 'ditolak' ? '<button type="button" class="ord-lnk" data-pa="alt" data-u="' + it.uid + '">Cari pengganti</button>'
          : '<button type="button" class="ord-lnk" data-rc="' + it.uid + '">Bukti pesanan</button>' + (stamped ? '<a class="ord-lnk" href="paspor">Stempel tersimpan</a>' : '<button type="button" class="ord-lnk" data-pa="stamp" data-u="' + it.uid + '">Kegiatan selesai</button>');
        return '<div class="ord"><div class="ord-m"><h3>' + esc(a.name) + '</h3><p>' + D.long(it.date) + ' · ' + it.time.replace(':', '.') + ' · ' + it.people + ' orang</p></div><b class="ord-p">' + rp(PS.itemCost(it)) + '</b><span class="st ' + (it.status === 'diajukan' ? 'wait' : it.status === 'disetujui' || it.status === 'lunas' ? 'ok' : 'bad') + '">' + OSTAT[it.status] + '</span><span class="ord-a">' + act + '</span></div>'; }).join('') + '</div></div>';
    box.onclick = (e) => {
      const b = e.target.closest('[data-pa]'); if (b) return itemAction(b.dataset.pa, b.dataset.u);
      const r = e.target.closest('[data-rc]'); if (r) return receipt(PS.get().items.find((i) => i.uid === r.dataset.rc));
    };
  }
  function buildSplit(box) {
    const s = PS.get(); const st = PS.settle(); const g = group(); const per = st.total / Math.max(1, s.members.length);
    const done = st.tx.filter((t) => s.settled[t.key]).reduce((a, t) => a + t.amount, 0); const all = st.tx.reduce((a, t) => a + t.amount, 0);
    const pct = all ? Math.round(done / all * 100) : (st.total ? 100 : 0);
    box.innerHTML = '<div class="split" style="padding-top:12px"><div><div class="kpis"><div class="kpi"><small>Total biaya trip</small><b>' + rp(st.total) + '</b></div>' + (g ? '<div class="kpi"><small>Rata-rata per orang</small><b>' + rp(per) + '</b></div><div class="kpi"><small>Pelunasan antar anggota</small><b>' + pct + '%</b><div class="bar" style="margin-top:10px"><i style="width:' + pct + '%"></i></div></div>' : '<div class="kpi"><small>Jumlah kegiatan</small><b>' + s.items.filter((i) => i.status !== 'ditolak').length + '</b></div><div class="kpi"><small>Sudah dibayar</small><b>' + rp(s.items.filter((i) => i.status === 'lunas').reduce((t, i) => t + PS.itemCost(i), 0)) + '</b></div>') + '</div>' +
      '<section class="pane"><div class="pane-h"><h2>Daftar biaya</h2><button class="btn btn-dark btn-sm" id="addEx">' + ic('plus', 15) + ' Tambah biaya</button></div><div class="pane-b" style="padding-block:6px">' +
      (st.ex.length ? st.ex.map((e) => { const p = PS.member(e.paidBy); return '<div class="ex"><span class="ico">' + ic(e.auto ? 'ticket' : 'receipt', 20) + '</span><div class="t"><b>' + esc(e.title) + '</b><small>' + esc(e.sub) + (g ? ' · dibayar ' + esc(p ? p.name.split(' ')[0] : '-') + ' · dibagi ' + e.split.length + ' orang' : '') + '</small></div><div style="text-align:right"><b>' + rp(e.amount) + '</b>' + (e.auto ? '<div class="faint" style="font-size:11.5px">dari kegiatan</div>' : '<button class="btn btn-ghost btn-sm" data-rm="' + e.uid + '" style="padding:2px 6px;font-size:12px">Hapus</button>') + '</div></div>'; }).join('') : '<div class="empty"><h3 style="font-size:18px">Belum ada biaya</h3><p style="margin:8px 0 16px">Kegiatan yang ditambahkan ke trip otomatis tercatat di sini. Kamu juga dapat menambahkan biaya lain seperti transportasi atau makan.</p></div>') + '</div></section></div>' +
      '<aside style="display:grid;gap:24px;align-content:start">' + (g ? '<section class="pane"><div class="pane-h"><h2>Siapa membayar siapa</h2></div><div class="pane-b">' +
      (st.tx.length ? st.tx.map((t) => { const f = PS.member(t.from), to = PS.member(t.to); return '<div class="tx' + (s.settled[t.key] ? ' done' : '') + '">' + UI.avatar(f, 'av-sm') + '<div style="flex:1;min-width:0;font-size:13.5px"><b>' + esc(f.name.split(' ')[0]) + '</b> kepada <b>' + esc(to.name.split(' ')[0]) + '</b><div class="amt" style="font-weight:800;font-size:16px">' + rp(t.amount) + '</div></div><label class="switch" title="Tandai lunas"><input type="checkbox" data-st="' + t.key + '"' + (s.settled[t.key] ? ' checked' : '') + '><span></span></label></div>'; }).join('') : '<p class="muted" style="font-size:14px">' + (st.total ? 'Seluruh anggota sudah impas.' : 'Belum ada yang perlu dibayar.') + '</p>') +
      '<p class="faint" style="font-size:12px;margin-top:12px">Jumlah transfer dihitung seminimal mungkin. Pathora hanya mencatat, tidak memindahkan uang antar anggota.</p></div></section>' +
      '<section class="pane"><div class="pane-h"><h2>Saldo anggota</h2></div><div class="pane-b">' + st.net.map((n) => { const m = PS.member(n.id); const b = st.bal[n.id]; return '<div class="bal">' + UI.avatar(m, 'av-sm') + '<div class="nm"><b style="font-size:14px">' + esc(m.name) + '</b>' + (m.id === s.trip.treasurer ? ' <span class="badge" style="padding:0 8px">Bendahara</span>' : '') + '<small class="faint" style="display:block">Membayar ' + rp(b.paid) + ' · bagian ' + rp(b.share) + '</small></div><span class="' + (n.v >= 0 ? 'pos' : 'neg') + '">' + (n.v >= 0 ? '+' : '−') + rp(Math.abs(n.v)) + '</span></div>'; }).join('') + '</div></section>' +
      '<button class="btn btn-gold btn-block" id="wa">' + ic('copy', 16) + ' Salin ringkasan untuk grup</button>' :
      '<section class="pane"><div class="pane-b" style="display:grid;gap:12px"><b>Bepergian bersama orang lain</b><p class="muted" style="font-size:14px">Undang teman ke trip ini untuk membagi biaya secara otomatis dan melihat ketersediaan jadwal mereka.</p><button class="btn btn-dark" id="inv2">Undang teman</button></div></section>') + '</aside></div>';
    const a = document.getElementById('addEx'); if (a) a.onclick = expenseModal;
    const iv = document.getElementById('inv2'); if (iv) iv.onclick = inviteModal;
    box.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => PS.update((x) => { x.expenses = x.expenses.filter((e) => e.uid !== b.dataset.rm); }));
    box.querySelectorAll('[data-st]').forEach((c) => c.onchange = () => PS.update((x) => { if (c.checked) x.settled[c.dataset.st] = true; else delete x.settled[c.dataset.st]; }));
    const wa = document.getElementById('wa'); if (wa) wa.onclick = () => {
      const lines = ['*' + s.trip.name + '* (' + D.span(s.trip.start, s.trip.end) + ')', 'Total ' + rp(st.total) + ', rata-rata ' + rp(per) + ' per orang', ''].concat(st.tx.length ? ['Pelunasan:'].concat(st.tx.map((t) => '- ' + PS.member(t.from).name.split(' ')[0] + ' kepada ' + PS.member(t.to).name.split(' ')[0] + ': ' + rp(t.amount) + (s.settled[t.key] ? ' (lunas)' : ''))) : ['Seluruh anggota sudah impas.']).concat(['', 'Dihitung dengan Pathora']);
      copy(lines.join('\n'), 'Ringkasan disalin');
    };
  }
  function copy(text, msg) {
    const done = () => UI.toast(msg || 'Disalin');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { /* abaikan */ } t.remove(); done(); }
  }
  function expenseModal() {
    const s = PS.get();
    UI.modal('<div class="modal-h"><h3>Tambah biaya</h3><button class="icon-btn" data-close aria-label="Tutup">' + ic('x', 18) + '</button></div><form class="modal-b" id="exF" style="display:grid;gap:14px">' +
      '<div class="field"><label>Keterangan</label><input class="input" name="title" required placeholder="Sewa motor, makan siang"></div>' +
      '<div class="field"><label>Jumlah (Rp)</label><input class="input" name="amount" type="number" min="1000" step="1000" required placeholder="150000"></div>' +
      (s.members.length > 1 ? '<div class="field"><label>Dibayar oleh</label><select class="select" name="paid">' + s.members.map((m) => '<option value="' + m.id + '"' + (m.id === s.me ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Dibagi untuk</label><div style="display:flex;flex-wrap:wrap;gap:8px">' + s.members.map((m) => '<label class="chip" style="display:inline-flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" name="sp" value="' + m.id + '" checked>' + esc(m.name.split(' ')[0]) + '</label>').join('') + '</div></div>' : '') +
      '<button class="btn btn-primary btn-lg btn-block">Simpan</button></form>', (ov, close) => {
      ov.querySelector('#exF').addEventListener('submit', (e) => {
        e.preventDefault(); const f = e.target; const multi = s.members.length > 1;
        const sp = multi ? Array.from(f.querySelectorAll('[name=sp]:checked')).map((x) => x.value) : [s.me];
        if (!sp.length) { UI.toast('Pilih minimal satu orang'); return; }
        PS.update((st) => st.expenses.push({ uid: uid(), title: f.title.value.trim(), amount: +f.amount.value, paidBy: multi ? f.paid.value : st.me, split: sp, cat: 'Lainnya' })); close(); UI.toast('Biaya disimpan');
      });
    });
  }
  function payModal(list) {
    const total = list.reduce((t, i) => t + PS.itemCost(i), 0);
    UI.modal('<div class="modal-h"><h3>Pembayaran</h3><button class="icon-btn" data-close aria-label="Tutup">' + ic('x', 18) + '</button></div><div class="modal-b" style="display:grid;gap:16px">' +
      '<div class="sum" style="border:0;padding:0">' + list.map((i) => '<div><span>' + esc(byId[i.actId].short) + ' · ' + D.med(i.date) + '</span><span>' + rp(PS.itemCost(i)) + '</span></div>').join('') + '<div class="tot"><span>Total</span><span>' + rp(total) + '</span></div></div>' +
      (group() ? '<p class="faint" style="font-size:12.5px">Dibayar oleh bendahara (' + esc(PS.member(PS.get().trip.treasurer).name.split(' ')[0]) + '), lalu dibagi lewat halaman Patungan.</p>' : '') +
      '<div><label class="pay-opt"><input type="radio" name="pm" checked>' + ic('qr', 20) + '<span><b>QRIS</b><small class="faint" style="display:block">Pindai dari aplikasi bank atau dompet digital</small></span></label>' +
      '<label class="pay-opt"><input type="radio" name="pm">' + ic('phone', 20) + '<span><b>Dompet digital</b><small class="faint" style="display:block">Bayar melalui aplikasi di ponsel</small></span></label>' +
      '<label class="pay-opt"><input type="radio" name="pm">' + ic('card', 20) + '<span><b>Kartu debit atau kredit</b></span></label></div>' +
      '<button class="btn btn-primary btn-lg btn-block" id="doPay">Bayar ' + rp(total) + '</button></div>', (ov, close) => {
      const btn = ov.querySelector('#doPay');
      btn.onclick = () => {
        btn.disabled = true; btn.textContent = 'Memproses…';
        setTimeout(() => {
          PS.update((st) => { list.forEach((l) => { const it = st.items.find((x) => x.uid === l.uid); if (it) { it.status = 'lunas'; st.payouts.push({ uid: uid(), actId: it.actId, amount: PS.itemCost(it), date: D.today() }); } }); });
          close(); UI.toast('Pembayaran berhasil');
        }, 1100);
      };
    });
  }
  function receipt(it) {
    const a = byId[it.actId];
    UI.modal('<div class="modal-h"><h3>Bukti pesanan</h3><button class="icon-btn" data-close aria-label="Tutup">' + ic('x', 18) + '</button></div><div class="modal-b" style="display:grid;gap:14px"><div class="sum" style="border:0;padding:0"><div><span>Kegiatan</span><b>' + esc(a.short) + '</b></div><div><span>Tanggal</span><b>' + D.long(it.date) + '</b></div><div><span>Mulai</span><b>' + it.time.replace(':', '.') + '</b></div><div><span>Peserta</span><b>' + it.people + ' orang</b></div><div><span>Titik kumpul</span><b style="text-align:right">' + esc(a.meet) + '</b></div><div class="tot"><span>Dibayar</span><span>' + rp(PS.itemCost(it)) + '</span></div></div><div class="sim-note">' + ic('info', 16) + '<span>Bukti contoh untuk prototipe, bukan bukti pembayaran yang sah.</span></div></div>');
  }

  /* ---------- dialog: langganan di dalam aplikasi ---------- */
  function plusModal() {
    UI.modal('<div class="modal-h"><h3>' + (left() <= 0 ? 'Pertanyaan gratis hari ini telah habis' : 'Pathora Plus') + '</h3><button class="icon-btn" data-close aria-label="Tutup">' + ic('x', 18) + '</button></div><div class="modal-b" style="display:grid;gap:16px">' +
      '<p class="muted">Paket gratis mencakup ' + FREE_Q + ' pertanyaan per hari. Kuota diperbarui besok, atau kamu dapat melanjutkan sekarang dengan Pathora Plus.</p>' +
      '<div class="card" style="padding:18px;display:grid;gap:10px"><b style="font-size:18px">Pathora Plus <span class="faint" style="font-weight:500;font-size:14px">Rp49.000 per bulan, gratis 7 hari pertama</span></b><ul class="checklist"><li>' + ic('check', 18) + 'Pertanyaan tanpa batas ke asisten AI</li><li>' + ic('check', 18) + 'Trip dan anggota tanpa batas</li><li>' + ic('check', 18) + 'Prakiraan keramaian untuk tanggal pilihan kamu</li></ul></div>' +
      '<button class="btn btn-primary btn-lg btn-block" id="goPlus">Mulai uji coba 7 hari</button><button class="btn btn-ghost btn-block" data-close>Nanti saja</button></div>', (ov, close) => {
      ov.querySelector('#goPlus').onclick = () => { if (!isTraveler()) { close(); return UI.needLogin('Berlangganan Pathora Plus memerlukan akun.'); } PAUTH.update({ plan: 'plus' }); if (window.PAPI && PAPI.login()) PAPI.plus(true); /* simulasi: uji coba 7 hari di server */ close(); renderQuota(); UI.toast('Pathora Plus aktif', '<a href="akun">Kelola</a>'); };
    });
  }
  function inviteModal() {
    if (!isTraveler()) return UI.needLogin('Mengundang teman memerlukan akun.');
    const s = PS.get(); const link = 'pathora.id/gabung/' + s.trip.code;
    UI.modal('<div class="modal-h"><h3>Undang teman</h3><button class="icon-btn" data-close aria-label="Tutup">' + ic('x', 18) + '</button></div><div class="modal-b" style="display:grid;gap:16px"><p class="muted">Bagikan tautan ini. Anggota yang bergabung dapat melihat kalender dan biaya trip, serta menandai hari berhalangan.</p><div style="display:flex;gap:8px"><input class="input" readonly value="' + link + '" id="lnk"><button class="btn btn-dark" id="cp">Salin</button></div><div class="sim-note">' + ic('info', 16) + '<span>Tautan contoh. Fitur tautan undangan membutuhkan server pada versi sesungguhnya.</span></div><form id="addM" style="display:flex;gap:8px"><input class="input" name="n" placeholder="Atau tambahkan nama anggota langsung" required><button class="btn btn-line">Tambah</button></form></div>', (ov, close) => {
      ov.querySelector('#cp').onclick = () => copy('https://' + link, 'Tautan disalin');
      ov.querySelector('#addM').onsubmit = (e) => { e.preventDefault(); const n = e.target.n.value.trim(); if (!n) return; PS.update((st) => { const i = st.members.length; st.members.push({ id: 'm' + uid(), name: n, ini: n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase(), color: COLORS[i % COLORS.length], busy: [] }); }); close(); UI.toast(n + ' ditambahkan ke trip'); };
    });
  }
  document.getElementById('invite').onclick = inviteModal;
  document.getElementById('tName').addEventListener('change', (e) => { const v = e.target.value.trim() || 'Trip Bali'; PS.update((st) => { st.trip.name = v; }); });
  function setDates(){
    const a = document.getElementById('d1').value, b = document.getElementById('d2').value;
    if (!a || !b) return;
    if (b < a) { UI.toast('Tanggal pulang harus sama atau setelah tanggal tiba'); head(); return; }
    PS.update((st) => { st.trip.start = a; st.trip.end = b; }); cal.month = null; cal.sel = null; UI.toast('Tanggal di Bali diperbarui');
  }
  document.querySelectorAll('.dt').forEach((l) => l.addEventListener('click', (e) => { const i = l.querySelector('input'); if (e.target !== i) { try { i.showPicker(); } catch (x) { i.focus(); } } }));
  document.getElementById('d1').addEventListener('change', () => { const a = document.getElementById('d1').value, b = document.getElementById('d2'); if (a && b.value && b.value < a) b.value = a; setDates(); });
  document.getElementById('d2').addEventListener('change', setDates);

  /* ---------- router tab ---------- */
  function build() {
    view.onclick = null;
    document.body.classList.toggle('fit', window.innerWidth > 1060);
    document.body.classList.add('chat-mode'); document.body.classList.toggle('tab-chat', tab === 'chat');
    if (tab === 'chat') buildChat(); else if (tab === 'kalender') buildCal(); else buildPay();
    window.scrollTo(0, 0);
  }
  PS.on(() => {
    head();
    if (tab === 'chat') renderSummary(); else if (tab === 'kalender') { if (document.getElementById('calG')) renderCal(); } else buildPay();
  });

  head(); build();
  const p = q.get('prompt');
  if (p && tab === 'chat') { history.replaceState(null, '', location.pathname + '?tab=chat'); setTimeout(() => send(p), 450); }
})();
