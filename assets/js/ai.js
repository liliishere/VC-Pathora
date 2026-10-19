/* Pathora — "otak" asisten perencana. Berjalan sepenuhnya di browser (tanpa server):
   memahami kalimat bebas, lalu menyusun rencana dari katalog + cuaca, keramaian, hari raya,
   jadwal tutup host, dan ketersediaan teman. Di versi produksi, parser ini diganti model bahasa,
   fungsi penilaian (score) dan aksinya tetap bisa dipakai. */
(function (g) {
  'use strict';
  const { A, byId, D, rp, hav, weatherFor, crowdFor, moonFor, festivalFor, isClosed, dayScore } = g.PD;
  const S = g.PS;

  const MONTHS = { jan: 0, januari: 0, feb: 1, februari: 1, mar: 2, maret: 2, apr: 3, april: 3, mei: 4, jun: 5, juni: 5, jul: 6, juli: 6, agu: 7, agt: 7, agustus: 7, sep: 8, sept: 8, september: 8, okt: 9, oktober: 9, nov: 10, november: 10, des: 11, desember: 11 };
  const MON_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
  const INTEREST = {
    laut: ['laut', 'pantai', 'snorkel', 'penyu', 'mangrove', 'karang', 'nelayan'],
    satwa: ['satwa', 'hewan', 'burung', 'penyu', 'bebek', 'binatang'],
    sawah: ['sawah', 'subak', 'padi', 'petani'],
    hutan: ['hutan', 'trekking', 'air terjun', 'jalan kaki', 'hiking', 'kebun'],
    budaya: ['budaya', 'adat', 'tradisi', 'upacara', 'canang', 'tenun', 'desa'],
    kuliner: ['kuliner', 'makan', 'masak', 'kopi', 'bumbu'],
    kerajinan: ['kerajinan', 'tenun', 'gerabah', 'kriya', 'membuat', 'keramik']
  };

  /* ---------- parser ---------- */
  function iso(y, m, d) { return D.iso(new Date(y, m, d)); }
  function parseDates(t) {
    let m = t.match(new RegExp('(\\d{1,2})\\s*(?:-|–|sampai|s\\/d|hingga|ke)\\s*(\\d{1,2})\\s*(' + MON_RE + ')', 'i'));
    const guessYear = (mo) => (mo < 9 ? 2027 : 2026);
    if (m) { const mo = MONTHS[m[3].toLowerCase()]; const y = guessYear(mo); return { start: iso(y, mo, +m[1]), end: iso(y, mo, +m[2]) }; }
    m = t.match(new RegExp('(\\d{1,2})\\s*(' + MON_RE + ')\\s*(?:-|–|sampai|s\\/d|hingga)\\s*(\\d{1,2})\\s*(' + MON_RE + ')', 'i'));
    if (m) { const m1 = MONTHS[m[2].toLowerCase()], m2 = MONTHS[m[4].toLowerCase()]; return { start: iso(guessYear(m1), m1, +m[1]), end: iso(guessYear(m2), m2, +m[3]) }; }
    m = t.match(new RegExp('(\\d{1,2})\\s*(' + MON_RE + ')', 'i'));
    if (m) { const mo = MONTHS[m[2].toLowerCase()]; const d = iso(guessYear(mo), mo, +m[1]); return { start: d, end: d, single: true }; }
    return null;
  }
  function parseMoney(t) {
    const m = t.match(/(\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu|k)\b/i); if (!m) return null;
    let v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
    v *= (u === 'jt' || u === 'juta') ? 1e6 : 1e3; return { v, perPerson: /per\s*orang|\/orang|masing/i.test(t) };
  }
  function parse(raw) {
    const t = raw.toLowerCase();
    const o = { raw, t };
    o.dates = parseDates(t);
    let n = (t.match(/(\d+)\s*hari/) || [])[1]; o.days = n ? Math.min(+n, 5) : null;
    if (/seminggu|sepekan/.test(t)) { o.days = 5; o.cap = true; }
    if (/akhir pekan|weekend/.test(t)) o.days = 2;
    let p = (t.match(/(\d+)\s*(?:orang|teman|kawan)/) || []);
    if (p[1]) o.people = /teman|kawan/.test(p[0]) ? +p[1] + 1 : +p[1];
    if (/berdua|pasangan|honeymoon/.test(t)) o.people = 2;
    if (/sendiri|solo/.test(t)) o.people = 1;
    o.kids = /anak|balita|keluarga/.test(t);
    o.cheap = /murah|hemat|irit|pelajar|mahasiswa|backpack/.test(t);
    o.money = parseMoney(t);
    o.calm = /sepi|tenang|jangan.*ramai|hindari.*ramai|tidak ramai|nggak ramai|gak ramai|jauh dari keramaian|santai|pelan|relaks/.test(t);
    o.slow = /santai|pelan|relaks|tidak buru|gak buru/.test(t);
    o.cats = new Set(); o.kwActs = [];
    Object.keys(INTEREST).forEach((c) => { if (INTEREST[c].some((k) => t.includes(k))) o.cats.add(c); });
    if (/\balam\b|nature/.test(t)) ['laut', 'hutan', 'sawah', 'satwa'].forEach((c) => o.cats.add(c));
    A.forEach((a) => { if (a.kw.some((k) => t.includes(k))) o.kwActs.push(a.id); });
    const r = t.match(/bali (barat|timur|utara|selatan)|ubud|tabanan|karangasem|buleleng|gianyar|kintamani/);
    if (r) o.region = r[0];
    return o;
  }
  function findAct(t) {
    t = t.toLowerCase(); let best = null, bs = 0;
    A.forEach((a) => {
      let s = 0;
      if (t.includes(a.short.toLowerCase())) s += 5;
      a.kw.forEach((k) => { if (t.includes(k)) s += 2; });
      a.cats.forEach((c) => { if (INTEREST[c] && INTEREST[c].some((k) => t.includes(k))) s += .5; });
      if (a.place && t.includes(a.place.split(',')[0].toLowerCase())) s += 3;
      if (s > bs) { bs = s; best = a; }
    });
    return bs >= 2 ? best : null;
  }

  /* ---------- penjadwalan ---------- */
  const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const hhmm = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  function freeTime(act, date, busyItems) {
    const day = busyItems.filter((i) => i.date === date);
    for (const tm of act.times) {
      const s = mins(tm), e = s + act.dur * 60;
      const clash = day.some((i) => { const b = byId[i.actId]; const bs = mins(i.time), be = bs + b.dur * 60; return s < be + 60 && bs < e + 60; });
      if (!clash) return tm;
    }
    return null;
  }
  function memberBusy(date) { return S.get().members.filter((m) => m.busy.includes(date)); }

  function scoreFor(a, date, ctx, picked, existing) {
    const s0 = S.get();
    let base = dayScore(a, date, s0.hostClosed); if (base < 0) return -99;
    let s = base * 2;
    const hit = a.cats.filter((c) => ctx.cats.has(c)).length; s += hit * 1.2;
    if (ctx.kwActs.includes(a.id)) s += 2.5;
    if (ctx.kids && !a.kid) s -= 4;
    if (ctx.cheap) s += (1 - a.price / 350000) * 1.2;
    if (ctx.budgetPP && a.price > ctx.budgetPP * 0.5) s -= 2;
    if (ctx.region && (a.region + ' ' + a.place).toLowerCase().includes(ctx.region.replace('bali ', ''))) s += 1.6;
    s -= crowdFor(a, date) * (ctx.calm ? .8 : .45);
    s -= memberBusy(date).length * 1.1;
    const sameDay = picked.concat(existing).filter((i) => i.date === date);
    sameDay.forEach((i) => { const d = hav(a, byId[i.actId]); s -= d > 45 ? 3 : d / 40; });
    const prev = picked.concat(existing).filter((i) => Math.abs(D.diff(i.date, date)) === 1);
    prev.forEach((i) => { s -= hav(a, byId[i.actId]) / 220; });
    return s;
  }
  function reasonFor(a, date, ctx) {
    const w = weatherFor(date), c = crowdFor(a, date), r = [];
    if (!a.outdoor && w.rain > 45) r.push('di dalam ruangan, aman saat hujan');
    else if (a.outdoor && w.rain < 25) r.push('cuaca ' + w.cond.toLowerCase() + ', sesuai untuk luar ruangan');
    if (c === 0) r.push('cenderung lengang');
    if (ctx.kids && a.kid) r.push('aman untuk anak');
    const hit = a.cats.find((x) => ctx.cats.has(x)); if (hit) r.push('sesuai minat ' + hit);
    if (ctx.cheap && a.price <= 160000) r.push('harga terjangkau');
    return r.slice(0, 2).join(', ') || 'paling seimbang untuk hari tersebut';
  }

  function buildPlan(ctx, o) {
    o = o || {};
    const s = S.get();
    const start = ctx.start || s.trip.start, end = ctx.end || s.trip.end;
    const days = D.range(start, end);
    const perDay = ctx.slow ? 1 : (days.length <= 3 ? 2 : 1);
    const keep = (o.keepItems || []).slice();
    const picked = [];
    const used = new Set(keep.map((i) => i.actId));
    days.forEach((date) => {
      for (let k = 0; k < perDay; k++) {
        const exist = keep.filter((i) => i.date === date);
        if (exist.length + picked.filter((p) => p.date === date).length >= perDay) break;
        const cands = A.filter((a) => !used.has(a.id)).map((a) => ({ a, sc: scoreFor(a, date, ctx, picked, keep) })).filter((x) => x.sc > -50).sort((x, y) => y.sc - x.sc);
        let done = false;
        for (const c of cands) {
          if (k > 0 && c.sc < 0.2) continue;
          const tm = freeTime(c.a, date, keep.concat(picked));
          if (!tm) continue;
          picked.push({ actId: c.a.id, date, time: tm, reason: reasonFor(c.a, date, ctx), sc: c.sc }); used.add(c.a.id); done = true; break;
        }
        if (!done) break;
      }
    });
    const people = ctx.people || s.members.length;
    const total = picked.reduce((t, i) => t + byId[i.actId].price * people, 0);
    return { start, end, days: days.map((d) => ({ date: d, wx: weatherFor(d), moon: moonFor(d), fest: festivalFor(d), items: picked.filter((p) => p.date === d).sort((a, b) => a.time.localeCompare(b.time)) })), people, total, perPerson: Math.round(total / Math.max(1, people)), items: picked };
  }

  /* ---------- cari tanggal terbaik ---------- */
  function bestWindows(len, ctx) {
    const s = S.get(); const from = D.add(D.today(), 4); const out = [];
    for (let i = 0; i < 52; i++) {
      const st = D.add(from, i); const en = D.add(st, len - 1); const days = D.range(st, en);
      let sc = 0, rainy = 0, busy = new Set(), moonDays = 0, weekendHits = 0;
      days.forEach((d) => {
        const w = weatherFor(d); sc += 1 - w.rain / 100 * 0.9; if (w.rain >= 60) rainy++;
        memberBusy(d).forEach((m) => busy.add(m.name)); if (moonFor(d)) moonDays++;
        const dw = D.dow(d); if (dw === 6 || dw === 0) weekendHits++;
      });
      sc = sc / days.length - busy.size * .35 - moonDays * .05 - (ctx && ctx.calm ? weekendHits * .04 : 0);
      out.push({ start: st, end: en, sc, rainy, busy: [...busy], moonDays });
    }
    out.sort((a, b) => b.sc - a.sc);
    const pick = [];
    out.forEach((c) => { if (pick.length < 3 && pick.every((p) => Math.abs(D.diff(p.start, c.start)) >= len + 2)) pick.push(c); });
    return pick;
  }

  /* ---------- alternatif saat ditolak ---------- */
  function alternativeFor(item) {
    const a0 = byId[item.actId]; const s = S.get();
    const cands = A.filter((a) => a.id !== a0.id && !s.items.some((i) => i.actId === a.id && i.status !== 'ditolak'));
    let best = null, bs = -99;
    cands.forEach((a) => {
      let sc = scoreFor(a, item.date, { cats: new Set(a0.cats), kwActs: [], kids: false, calm: true }, [], s.items.filter((i) => i.uid !== item.uid));
      sc += a.cats.filter((c) => a0.cats.includes(c)).length * 1.5;
      if (sc > bs && freeTime(a, item.date, s.items.filter((i) => i.uid !== item.uid))) { bs = sc; best = a; }
    });
    let shift = null, ss = -99;
    [1, 2, -1, 3].forEach((n) => {
      const d = D.add(item.date, n); if (isClosed(a0, d, s.hostClosed)) return;
      const sc = dayScore(a0, d, s.hostClosed) - Math.abs(n) * .05; if (sc > ss) { ss = sc; shift = d; }
    });
    return { act: best, date: item.date, shift };
  }

  /* ---------- tanggapan ---------- */
  const fmtList = (arr) => arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' dan ' + arr[arr.length - 1];
  const chipsDefault = ['Susun 3 hari alam dan budaya, hindari tempat ramai', 'Cari tanggal terbaik', 'Bagaimana prakiraan cuaca trip saya', 'Rincian biaya'];
  const first = (m) => m.name.split(' ')[0];

  function respondPlan(ctx) {
    const s = S.get();
    const notes0 = [];
    if (ctx.dates && ctx.dates.single) { ctx.start = ctx.dates.start; ctx.end = D.add(ctx.dates.start, (ctx.days || D.diff(s.trip.start, s.trip.end) + 1) - 1); }
    else if (ctx.dates) { ctx.start = ctx.dates.start; ctx.end = ctx.dates.end; }
    else if (ctx.days) { ctx.start = s.trip.start; ctx.end = D.add(s.trip.start, ctx.days - 1); }
    const people = ctx.people || s.members.length;
    if (ctx.money) ctx.budgetPP = ctx.money.perPerson ? ctx.money.v : ctx.money.v / people;
    const plan = buildPlan(ctx, {});
    const pp = plan.people, nd = plan.days.length;
    const parts = [];
    parts.push('Berikut rancangan perjalanan ' + nd + ' hari pada ' + D.span(plan.start, plan.end) + ' untuk ' + pp + ' orang.');
    const rainy = plan.days.filter((d) => d.wx.rain >= 55);
    const notes = [];
    if (ctx.calm) notes.push('Kegiatan dipilih dari yang biasanya paling lengang, dan tempat populer dihindari pada akhir pekan');
    if (ctx.cats.size) notes.push('minat ' + fmtList([...ctx.cats]) + ' menjadi prioritas utama');
    if (ctx.kids) notes.push('hanya kegiatan yang aman untuk anak yang disertakan');
    if (rainy.length) notes.push(fmtList(rainy.map((d) => D.long(d.date))) + ' diperkirakan hujan, sehingga hari tersebut diisi kegiatan dalam ruangan bila tersedia');
    const moonDay = plan.days.filter((d) => d.moon);
    if (moonDay.length) notes.push(fmtList(moonDay.map((d) => D.long(d.date))) + ' bertepatan dengan hari ' + moonDay[0].moon + ', sebagian host dapat tutup');
    if (notes.length) parts.push(notes.join('. ').replace(/^./, (c) => c.toUpperCase()) + '.');
    if (ctx.cap) parts.push('Untuk perjalanan seminggu, rancangan dibatasi lima hari agar tidak terlalu padat. Hari lainnya dapat ditambahkan kemudian.');
    if (!plan.items.length) parts.push('Seluruh kegiatan tidak tersedia pada tanggal tersebut karena jadwal tutup host. Silakan ubah tanggal, atau minta saya mencari tanggal terbaik.');
    else if (ctx.budgetPP && plan.perPerson > ctx.budgetPP) parts.push('Estimasi biaya Rp' + plan.perPerson.toLocaleString('id-ID') + ' per orang, sedikit di atas anggaran Anda. Saya dapat mencarikan alternatif yang lebih hemat.');
    else parts.push('Estimasi total ' + rp(plan.total) + ', atau ' + rp(plan.perPerson) + ' per orang. Anda belum dikenai biaya sampai host mengonfirmasi.');
    if (ctx.people && ctx.people > s.members.length && s.members.length > 1) parts.push('Catatan: trip ini baru memiliki ' + s.members.length + ' anggota. Anggota lain dapat diundang dari tombol Undang.');
    return { text: parts.join('\n\n'), blocks: plan.items.length ? [{ type: 'plan', plan }] : [], chips: plan.items.length ? ['Cari alternatif yang lebih hemat', 'Tambahkan kuliner lokal', 'Cari tanggal terbaik', 'Bagaimana jika hujan'] : ['Cari tanggal terbaik', 'Tampilkan semua kegiatan'] };
  }

  function respond(raw) {
    const s = S.get(); const ctx = parse(raw); const t = ctx.t.trim();
    const group = s.members.length > 1;

    if (/^(mulai ulang|reset|hapus semua|bersihkan)/.test(t)) return { text: 'Untuk mengosongkan trip dan riwayat obrolan, gunakan menu opsi trip, lalu pilih Mulai ulang. Saya tidak menghapus data tanpa konfirmasi dari Anda.', blocks: [], chips: chipsDefault };
    if (/bisa apa|fitur|cara pakai|bantuan|help/.test(t)) return { text: 'Saya dapat menyusun jadwal dari kalimat bebas, misalnya "3 hari di Bali, suka alam, hindari tempat ramai". Saya juga dapat menambah atau mengganti kegiatan, memeriksa cuaca dan hari raya adat, mencari tanggal yang paling sesuai' + (group ? ' untuk seluruh anggota' : '') + ', serta merinci biaya. Setiap kegiatan yang Anda tambahkan otomatis masuk ke kalender.', blocks: [], chips: chipsDefault };
    if (/^(halo|hai|hi|hello|hey|selamat (pagi|siang|sore|malam))\b/.test(t) && t.length < 30) return { text: 'Halo, ' + first(S.me()) + '. Ceritakan rencana perjalanan Anda: berapa hari, berapa orang, dan suasana yang diinginkan. Saya akan menyusun jadwalnya.', blocks: [], chips: chipsDefault };

    if (/tanggal (terbaik|yang cocok|bagus)|kapan (waktu|sebaiknya|enaknya|bagusnya|paling)|semua (bisa|kosong)|cari tanggal|waktu terbaik/.test(t)) {
      const len = ctx.days || (D.diff(s.trip.start, s.trip.end) + 1);
      const opts = bestWindows(len, ctx);
      const busyN = s.members.reduce((n, m) => n + m.busy.length, 0);
      return { text: 'Saya memeriksa prakiraan cuaca, hari tutup host' + (group ? ', dan hari sibuk setiap anggota' + (busyN ? '' : ' (belum ada yang ditandai, sehingga hanya cuaca yang dipertimbangkan)') : '') + '. Berikut tiga pilihan tanggal untuk ' + len + ' hari:', blocks: [{ type: 'dates', options: opts, len }], chips: ['Susun rencana untuk tanggal ini', 'Bagaimana prakiraan cuaca trip saya'] };
    }

    if (/(biaya|total|patungan|bagi (rata|biaya)|split|berapa|bayar|rincian)/.test(t) && !/(tambah|hapus)/.test(t)) {
      const st = S.settle();
      if (!st.ex.length) return { text: 'Belum ada biaya yang tercatat. Setelah kegiatan ditambahkan ke trip, rincian biayanya otomatis muncul di halaman Pembayaran. Ingin saya susunkan rencana terlebih dahulu', blocks: [], chips: chipsDefault };
      const per = Math.round(st.total / Math.max(1, s.members.length));
      const lines = !group ? '' : (st.tx.length ? ' Untuk pelunasan: ' + fmtList(st.tx.slice(0, 3).map((x) => first(S.member(x.from)) + ' membayar ' + rp(x.amount) + ' kepada ' + first(S.member(x.to)))) + '.' : ' Seluruh anggota sudah impas.');
      return { text: 'Total biaya trip saat ini ' + rp(st.total) + (group ? ', rata-rata ' + rp(per) + ' per orang.' : '.') + lines, blocks: [{ type: 'go', tab: 'bayar', label: 'Buka rincian pembayaran' }], chips: ['Cari alternatif yang lebih hemat', 'Tambahkan kuliner lokal'] };
    }

    let m = t.match(/^(?:tolong\s+)?(?:hapus|batalkan|buang|cancel|keluarkan)\s+(.+)/);
    if (m) {
      const a = findAct(m[1]); const it = a && s.items.find((i) => i.actId === a.id);
      if (!it) return { text: 'Kegiatan tersebut tidak ditemukan di trip Anda. Saat ini ada: ' + (s.items.length ? fmtList(s.items.map((i) => byId[i.actId].short)) : 'belum ada kegiatan') + '.', blocks: [], chips: [] };
      S.removeItem(it.uid);
      return { text: byId[it.actId].short + ' sudah dihapus dari ' + D.long(it.date) + '. Ingin saya isi dengan kegiatan lain', blocks: [], chips: ['Tambahkan kuliner lokal', 'Susun ulang hari itu'], undo: it };
    }

    if (/lebih murah|hemat|irit|ganti|tukar|alternatif/.test(t) && s.items.length) {
      const fa = findAct(t); const target = (fa && s.items.find((i) => i.actId === fa.id && i.status !== 'ditolak')) || s.items.filter((i) => i.status !== 'ditolak').sort((a, b) => byId[b.actId].price * b.people - byId[a.actId].price * a.people)[0];
      if (target) {
        const a0 = byId[target.actId];
        const cands = A.filter((a) => a.id !== a0.id && !s.items.some((i) => i.actId === a.id) && !isClosed(a, target.date, s.hostClosed) && freeTime(a, target.date, s.items.filter((i) => i.uid !== target.uid)));
        const wantCheaper = /murah|hemat|irit/.test(t);
        cands.forEach((a) => { a._s = (a.cats.filter((c) => a0.cats.includes(c)).length) * 1.3 + dayScore(a, target.date, s.hostClosed) - (wantCheaper ? a.price / 200000 : 0); });
        const pool = (wantCheaper ? cands.filter((a) => a.price < a0.price) : cands).sort((a, b) => b._s - a._s);
        if (!pool.length) return { text: byId[target.actId].short + ' sudah menjadi pilihan paling hemat untuk hari tersebut.', blocks: [], chips: [] };
        const alt = pool[0]; const tm = freeTime(alt, target.date, s.items.filter((i) => i.uid !== target.uid));
        const save = (a0.price - alt.price) * target.people;
        return { text: 'Untuk ' + D.long(target.date) + ', saya menyarankan mengganti ' + a0.short + ' dengan ' + alt.short + ' (' + rp(alt.price) + ' per orang, ' + alt.place.split(',')[0] + ').' + (save > 0 ? ' Penghematan ' + rp(save) + ' untuk ' + target.people + ' orang.' : '') + ' Apakah Anda ingin menggantinya', blocks: [{ type: 'swap', from: target.uid, actId: alt.id, date: target.date, time: tm }], chips: [] };
      }
    }

    m = t.match(/^(?:tolong\s+)?(?:tambah(?:kan|in)?|masukkan|masukin|ikutkan|sertakan)\s+(.+)/);
    if (m || /tambah.*(kuliner|kopi|masak)/.test(t)) {
      const q = (m ? m[1] : t);
      const pool = A.filter((a) => !s.items.some((i) => i.actId === a.id)).map((a) => { let sc = 0; const c = parse(q); a.kw.forEach((k) => { if (q.includes(k)) sc += 2; }); a.cats.forEach((cc) => { if (c.cats.has(cc)) sc += 1.5; }); return { a, sc }; }).filter((x) => x.sc > 0).sort((x, y) => y.sc - x.sc);
      if (!pool.length) return { text: 'Belum ada kegiatan yang sesuai dengan "' + q + '". Coba sebutkan jenisnya, misalnya kuliner, burung, air terjun, atau tenun.', blocks: [], chips: ['Tampilkan semua kegiatan'] };
      const days = S.days();
      for (const { a } of pool) {
        let best = null, bs = -99;
        days.forEach((d) => { const tm = freeTime(a, d, s.items); if (!tm) return; const sc = scoreFor(a, d, { cats: new Set(a.cats), kwActs: [], kids: false, calm: true }, [], s.items); if (sc > bs) { bs = sc; best = { d, tm }; } });
        if (best && bs > -50) {
          S.addItem({ actId: a.id, date: best.d, time: best.tm });
          return { text: a.short + ' ditambahkan pada ' + D.long(best.d) + ' pukul ' + best.tm.replace(':', '.') + '. ' + reasonFor(a, best.d, { cats: new Set(a.cats), kids: false }).replace(/^./, (c) => c.toUpperCase()) + '. Statusnya masih draf dan belum diajukan ke host.', blocks: [{ type: 'acts', ids: [a.id] }], chips: ['Rincian biaya', 'Bagaimana jika hujan'] };
        }
      }
      return { text: 'Seluruh hari dalam trip sudah terisi, atau host tutup pada tanggal tersebut. Perpanjang durasi trip atau minta saya mencari tanggal lain.', blocks: [], chips: ['Cari tanggal terbaik'] };
    }

    if (/(cuaca|hujan|panas|payung|mendung|rencana b)/.test(t)) {
      const days = S.days().map((d) => ({ d, w: weatherFor(d) }));
      const lines = days.map((x) => D.long(x.d) + ': ' + x.w.cond + ', ' + x.w.temp + '°C, peluang hujan ' + x.w.rain + '%').join('\n');
      const wet = days.filter((x) => x.w.rain >= 55);
      const outd = s.items.filter((i) => byId[i.actId].outdoor && wet.some((x) => x.d === i.date));
      const tail = wet.length ? (outd.length ? 'Pada hari yang berpotensi hujan terdapat kegiatan luar ruangan (' + fmtList(outd.map((i) => byId[i.actId].short)) + '). Saya dapat menggantinya dengan kegiatan dalam ruangan.' : 'Hari yang berpotensi hujan aman karena kegiatannya di dalam ruangan atau belum terisi.') : 'Tidak ada hari dengan risiko hujan tinggi.';
      return { text: 'Prakiraan cuaca (data contoh) untuk trip Anda:\n' + lines + '\n\n' + tail, blocks: outd.length ? [{ type: 'rainfix', ids: outd.map((i) => i.uid) }] : [], chips: ['Cari tanggal terbaik', 'Cari alternatif yang lebih hemat'] };
    }

    if (/(upacara|purnama|tilem|hari raya|nyepi|galungan|adat|libur)/.test(t)) {
      const days = S.days(); const near = []; for (let i = -3; i <= days.length + 3; i++) { const d = D.add(s.trip.start, i); const mn = moonFor(d), f = festivalFor(d); if (mn || f) near.push({ d, label: f || ('hari ' + mn) }); }
      const nyepi = /nyepi/.test(t) ? ' Nyepi adalah hari raya hening: seluruh aktivitas di pulau berhenti, termasuk operasional bandara. Hindari menjadwalkan perjalanan pada hari tersebut.' : '';
      const txt = near.length ? 'Di sekitar tanggal trip terdapat: ' + fmtList(near.map((x) => D.long(x.d) + ' (' + x.label + ')')) + '. Sebagian host menutup kegiatan pada hari seperti ini, dan hal itu sudah saya pertimbangkan dalam penyusunan jadwal. Bagi tamu yang ingin menyaksikan upacara, kenakan pakaian adat dan mintalah izin kepada pemandu terlebih dahulu.' : 'Tidak ada upacara besar yang tercatat di sekitar tanggal trip (data contoh).';
      return { text: txt + nyepi, blocks: [{ type: 'go', tab: 'kalender', label: 'Lihat di kalender' }], chips: [] };
    }

    m = t.match(/(?:ceritakan|apa itu|soal|tentang|detail|jelaskan|info)\s+(.+)/);
    if (m && findAct(m[1])) { const a = findAct(m[1]); return { text: a.story + ' Host: ' + a.host.name + '.', blocks: [{ type: 'acts', ids: [a.id], detail: true }], chips: ['Tambahkan ' + a.short.toLowerCase()] }; }

    if (/kalender|agenda|jadwal saya/.test(t)) return { text: 'Seluruh kegiatan, acara pribadi, hari raya' + (group ? ', dan hari sibuk anggota' : '') + ' tersedia di halaman Kalender.', blocks: [{ type: 'go', tab: 'kalender', label: 'Buka kalender' }], chips: [] };
    if (/tampilkan semua|lihat semua|daftar kegiatan|semua kegiatan/.test(t)) return { text: 'Berikut kegiatan di katalog, diurutkan dari yang paling lengang pada tanggal trip Anda.', blocks: [{ type: 'acts', ids: A.slice().sort((a, b) => crowdFor(a, s.trip.start) - crowdFor(b, s.trip.start) || a.price - b.price).slice(0, 6).map((a) => a.id) }, { type: 'go', href: 'jelajahi.html', label: 'Buka halaman Jelajahi' }], chips: [] };

    const signal = ctx.days || ctx.dates || ctx.cats.size || ctx.people || /trip|rencana|liburan|susun|atur|bikin|plan|jalan|itinerary|bali/.test(t) || t.length > 24;
    if (signal) return respondPlan(ctx);
    return { text: 'Saya belum menangkap maksud pesan tersebut. Silakan ceritakan rencana Anda: berapa hari, berapa orang, dan suasana yang diinginkan. Atau pilih salah satu contoh di bawah.', blocks: [], chips: chipsDefault };
  }

  function applyPlan(plan) {
    S.update((s) => {
      s.items = s.items.filter((i) => i.status !== 'draft');
      s.trip.start = plan.start; s.trip.end = plan.end;
    });
    plan.items.forEach((p) => S.addItem({ actId: p.actId, date: p.date, time: p.time, people: plan.people }));
  }

  g.AI = { respond, parse, findAct, buildPlan, applyPlan, bestWindows, alternativeFor, freeTime, chipsDefault, memberBusy };
})(window);
