/* Pathora: jembatan ke backend (repo vaniallic/pathora-ai-prototype). Aman kalau backend mati:
   setiap fungsi di sini mengembalikan null saat backend tidak bisa dipakai (mati, lambat > 8 detik, 5xx, 401, 429,
   atau bentuk JSON yang tidak dikenal), dan halaman memakai mesin lokal (ai.js, store.js) seperti biasa.

   Alamat backend:
     - produksi: DEFAULT_BASE di bawah (atau isi window.PATHORA_API_BASE sebelum file ini dimuat)
     - uji lokal: localStorage.setItem('pathora_api', 'http://localhost:8000')
     - matikan backend: localStorage.setItem('pathora_api', 'off')   (hapus dengan localStorage.removeItem('pathora_api'))

   Privasi: ke asisten hanya dikirim teks pesan dan ringkasan trip (tanggal, jumlah orang, ID kegiatan).
   Nama dan email anggota trip tidak pernah dikirim ke asisten. */
(function (g) {
  'use strict';
  const DEFAULT_BASE = 'https://pathora-backend-production-96394f16.up.railway.app';
  const KEY_TOKEN = 'pathora.token', KEY_TANYA = 'pathora.tanya';
  const BATAS_MS = 8000;

  /* ID sheet (backend) <-> ID front-end. Kegiatan contoh (demo: true) tidak ada di backend. */
  const KE_FE = { K01: 'arak', K02: 'camping', K03: 'garam', K04: 'yehlabuh', K05: 'menenun', K06: 'cakepung',
    K07: 'lontar', K08: 'jongkok', K09: 'sangkan', K10: 'salak', K11: 'muntigunung', K12: 'saptatirtha' };
  const KE_BE = Object.keys(KE_FE).reduce((o, k) => { o[KE_FE[k]] = k; return o; }, {});
  const ISO = /^\d{4}-\d{2}-\d{2}$/;

  const rd = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const wr = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* abaikan */ } };
  function base() {
    const lokal = rd('pathora_api');
    if (lokal === 'off') return '';
    return String(lokal || g.PATHORA_API_BASE || DEFAULT_BASE).replace(/\/+$/, '');
  }
  const token = () => rd(KEY_TOKEN);

  /* fetch dengan batas waktu. Mengembalikan {status, data} atau null kalau jaringan gagal/lambat. */
  async function req(path, opt) {
    const b = base(); if (!b) return null;
    opt = opt || {};
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), opt.timeout || BATAS_MS);
    const headers = { 'Content-Type': 'application/json' };
    if (opt.auth !== false && token()) headers.Authorization = 'Bearer ' + token();
    try {
      const r = await fetch(b + path, { method: opt.method || 'GET', headers, signal: ac.signal,
        body: opt.body ? JSON.stringify(opt.body) : undefined });
      let data = null; try { data = await r.json(); } catch (e) { /* bukan JSON */ }
      if (r.status === 401 && opt.auth !== false) wr(KEY_TOKEN, null); // token habis: login ulang nanti
      return { status: r.status, data };
    } catch (e) { return null; } finally { clearTimeout(to); }
  }

  /* ---------- akun ---------- */
  const PESAN = {
    'Email sudah terdaftar. Silakan login.': 'Email ini sudah terdaftar. Silakan masuk.',
    'Email atau password salah.': 'Email atau kata sandi salah.'
  };
  function rapikanGalat(res) {
    const d = res.data && typeof res.data.detail === 'string' ? res.data.detail : '';
    if (res.status === 422 && /password/.test(d)) return 'Kata sandi minimal 8 karakter.';
    if (res.status === 422 && /email/.test(d)) return 'Format email belum sesuai.';
    if (res.status === 422 && /komunitas/.test(d)) return 'Nama komunitas atau usaha wajib diisi.';
    return PESAN[d] || d || 'Terjadi kendala. Coba lagi.';
  }
  /* mode: 'daftar' | 'masuk'. Hasil: {ok: pengguna} | {error: teks} | {offline: true} */
  async function akun(mode, o) {
    const body = mode === 'daftar'
      ? { nama: o.name, email: o.email, password: o.password, peran: o.role === 'host' ? 'host' : 'wisatawan',
          komunitas: o.community || null, tempat: o.place || null }
      : { email: o.email, password: o.password };
    const res = await req(mode === 'daftar' ? '/api/auth/signup' : '/api/auth/login', { method: 'POST', body, auth: false });
    if (!res || res.status >= 500) return { offline: true };
    if (res.status === 201 || res.status === 200) {
      if (!res.data || !res.data.token || !res.data.pengguna) return { offline: true };
      wr(KEY_TOKEN, res.data.token); wr(KEY_TANYA, null);
      return { ok: res.data.pengguna };
    }
    return { error: rapikanGalat(res) };
  }
  async function saya() {
    if (!token()) return null;
    const res = await req('/api/auth/me');
    return res && res.status === 200 ? res.data : null;
  }
  function keluar() { wr(KEY_TOKEN, null); wr(KEY_TANYA, null); }

  /* ---------- asisten ---------- */
  /* ctx: {start, end, people, actIds}. Hasil null = pakai mesin lokal.
     Hasil: {tipe: 'rencana'|'tanya', pesan, items: [{actId, day}], start, people, sisa} */
  async function rencana(teks, ctx) {
    if (!base() || !token()) return null;
    ctx = ctx || {};
    const hariIni = new Date().toISOString().slice(0, 10);
    const konteks = {
      tanggal_mulai: ISO.test(ctx.start || '') && ctx.start >= hariIni ? ctx.start : null,
      tanggal_akhir: ISO.test(ctx.end || '') && ctx.end >= hariIni ? ctx.end : null,
      jumlah_orang: ctx.people || null,
      kegiatan_dipilih: (ctx.actIds || []).map((id) => KE_BE[id]).filter(Boolean)
    };
    const lanjut = +rd(KEY_TANYA) || null;
    const res = await req('/api/rencana', { method: 'POST', body: { teks, lanjutan_dari: lanjut, konteks } });
    if (!res || res.status !== 200 || !res.data) return null;     // 401, 429, 5xx, jaringan: mesin lokal
    const j = res.data;
    if (!['rencana', 'tanya'].includes(j.tipe) || typeof j.pesan !== 'string') return null; // galat atau bentuk aneh
    wr(KEY_TANYA, j.tipe === 'tanya' && j.id ? String(j.id) : null);
    const out = { tipe: j.tipe, pesan: j.pesan, items: [], start: null, people: null };
    if (j.tipe === 'rencana') {
      if (!j.rencana || !Array.isArray(j.rencana.hari)) return null;
      j.rencana.hari.forEach((h) => (h.kegiatan || []).forEach((k) => {
        const fe = KE_FE[k.id];
        if (fe && Number.isInteger(h.hari) && h.hari >= 1 && h.hari <= 14) out.items.push({ actId: fe, day: h.hari });
      }));                                                          // ID yang tidak dikenal dilewati
      const p = j.prefs || {};
      if (ISO.test(p.tanggal_mulai || '')) out.start = p.tanggal_mulai;
      if (Number.isInteger(p.jumlah_orang) && p.jumlah_orang >= 1 && p.jumlah_orang <= 50) out.people = p.jumlah_orang;
      out.days = Math.max(1, j.rencana.hari.length);
    }
    return out;
  }

  /* ---------- paket Plus (simulasi) ---------- */
  async function plus(ujiCoba) {
    if (!token()) return null;
    const res = await req('/api/akun/plus', { method: 'POST', body: { uji_coba: !!ujiCoba } });
    return res && res.status === 200 ? res.data : null;
  }

  g.PAPI = {
    enabled: () => !!base(), login: () => !!(base() && token()), base,
    akun, saya, keluar, rencana, plus, req, KE_FE, KE_BE
  };
})(window);
