/* Pathora — komponen UI bersama: navbar, footer, toast, modal, kartu kegiatan. */
(function (g) {
  'use strict';
  const { D, rp, CROWD_LABEL, crowdFor, byId } = g.PD;
  const { ic, photo } = g.PA;
  const ini2 = (n) => String(n || 'H').trim().split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const S = g.PS;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  const UI = {
    esc, $, $$,

    /* mode: 'host' memakai navigasi khusus Studio Host, tanpa tautan traveler */
    mountNav(active, over, mode) {
      const el = document.getElementById('nav'); if (!el) return;
      const acct = g.PAUTH.current();
      let html;
      if (mode === 'host') {
        const nm = acct && acct.role === 'host' ? (acct.community || acct.name) : 'Host';
        html = '<header class="nav' + (over ? ' over dk' : '') + '" id="nav"><div class="wrap">' +
          '<a class="logo" href="host.html" aria-label="Pathora Studio Host"><img class="l-c" src="assets/img/logo.png" alt="Pathora"><img class="l-w" src="assets/img/logo-white.png" alt="" aria-hidden="true"></a>' +
          '<span class="badge" style="margin-left:4px">Studio Host</span>' +
          '<div class="nav-right"><a class="btn btn-ghost btn-sm" href="index.html">Beranda Pathora</a>' +
          '<button class="av nav-av" id="avBtn" aria-haspopup="true" aria-expanded="false" style="background:var(--olive);border:0;box-shadow:0 0 0 2px rgba(81,50,41,.18)">' + esc(ini2(nm)) + '</button></div>' +
          '<div class="menu-pop" id="avMenu" hidden><div class="who"><b>' + esc(nm) + '</b><small>' + esc(acct ? acct.email : '') + '</small></div><button data-out>Keluar</button></div></div></header>';
      } else {
        const n = S.get().items.length; const me = S.me();
        const links = '<a href="jelajahi.html" class="' + (active === 'jelajahi' ? 'on' : '') + '">Jelajahi</a>' +
          '<a href="trip.html" class="' + (active === 'trip' || active === 'ai' ? 'on' : '') + '">Trip saya</a>' +
          '<a href="paspor.html" class="' + (active === 'paspor' ? 'on' : '') + '">Paspor Alam</a>';
        const right = acct && acct.role === 'traveler'
          ? '<a class="trip-pill" href="trip.html" title="Trip saya">' + ic('calendar', 16) + '<span>Trip</span><b id="navCount">' + n + '</b></a>' +
            '<button class="av nav-av" id="avBtn" aria-haspopup="true" aria-expanded="false" style="background:' + me.color + ';border:0;box-shadow:0 0 0 2px rgba(81,50,41,.18)" title="' + esc(acct.name) + '">' + esc(me.ini) + '</button>'
          : '<a class="btn btn-ghost btn-sm nav-login" href="masuk.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search) + '">Masuk</a>' +
            '<a class="btn btn-gold btn-sm" href="masuk.html?mode=daftar&next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search) + '">Daftar</a>';
        html = '<header class="nav' + (over ? ' over' + (over === 'dark' ? ' dk' : '') : '') + '" id="nav"><div class="wrap">' +
          '<a class="logo" href="index.html" aria-label="Pathora, beranda"><img class="l-c" src="assets/img/logo.png" alt="Pathora"><img class="l-w" src="assets/img/logo-white.png" alt="" aria-hidden="true"></a>' +
          '<nav class="nav-links" aria-label="Utama">' + links + '</nav>' +
          '<div class="nav-right">' + right + '<button class="icon-btn menu-btn" aria-label="Menu" id="menuBtn">' + ic('menu', 22) + '</button></div>' +
          (acct ? '<div class="menu-pop" id="avMenu" hidden><div class="who"><b>' + esc(acct.name) + '</b><small>' + esc(acct.email) + '</small><span class="badge ' + (acct.plan === 'plus' ? 'b-ok' : '') + '" style="margin-top:8px">' + (acct.plan === 'plus' ? 'Pathora Plus' : 'Paket gratis') + '</span></div>' +
            (acct.role === 'traveler' ? '<a href="akun.html">Akun dan langganan</a><a href="trip.html">Trip saya</a>' : '<a href="host.html">Studio Host</a>') + '<button data-out>Keluar</button></div>' : '') + '</div></header>';
      }
      el.outerHTML = html;
      const nav = document.getElementById('nav');
      if (over) { document.body.classList.add(over === 'dark' || mode === 'host' ? 'nav-pad' : 'nav-photo'); const sc = () => { nav.classList.toggle('solid', window.scrollY > 40); const y = nav.offsetHeight / 2; let dark = false; document.querySelectorAll('[data-tone="dark"]').forEach(function (e) { const r = e.getBoundingClientRect(); if (r.top <= y && r.bottom >= y) dark = true; }); nav.classList.toggle('ondark', dark); }; sc(); window.addEventListener('scroll', sc, { passive: true }); }
      const mb = document.getElementById('menuBtn'); if (mb) mb.addEventListener('click', () => nav.classList.toggle('open'));
      const ab = document.getElementById('avBtn'), mp = document.getElementById('avMenu');
      if (ab && mp) {
        ab.addEventListener('click', (e) => { e.stopPropagation(); mp.hidden = !mp.hidden; ab.setAttribute('aria-expanded', String(!mp.hidden)); });
        document.addEventListener('click', (e) => { if (!mp.contains(e.target)) { mp.hidden = true; ab.setAttribute('aria-expanded', 'false'); } });
        mp.querySelector('[data-out]').addEventListener('click', () => { g.PAUTH.logout(); location.href = 'index.html'; });
      }
      S.on(() => { const c = document.getElementById('navCount'); if (c) c.textContent = S.get().items.length; });
    },

    /* meminta masuk sebelum tindakan yang memerlukan akun */
    needLogin(reason) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      UI.modal('<div class="modal-h"><h3>Masuk untuk melanjutkan</h3><button class="icon-btn" data-close aria-label="Tutup">' + ic('x', 18) + '</button></div><div class="modal-b" style="display:grid;gap:16px"><p class="muted">' + esc(reason || 'Tindakan ini memerlukan akun Pathora.') + ' Trip yang sudah Anda susun akan tetap tersimpan.</p><a class="btn btn-primary btn-lg btn-block" href="masuk.html?mode=daftar&next=' + next + '">Buat akun gratis</a><a class="btn btn-line btn-block" href="masuk.html?next=' + next + '">Saya sudah punya akun</a></div>');
    },

    mountFooter() {
      const el = document.getElementById('footer'); if (!el) return;
      const ig = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>';
      const tt = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16.6 3c.3 2.4 1.7 4 4 4.2v3.1c-1.5 0-2.9-.4-4-1.2v6.1a6 6 0 1 1-6-6c.3 0 .6 0 .9.1v3.2a2.9 2.9 0 1 0 2 2.7V3z"/></svg>';
      el.outerHTML = '<footer class="footer" data-tone="dark"><div class="wrap"><div class="cols">' +
        '<div><img src="assets/img/logo-white.png" alt="Pathora"><p style="max-width:300px">Perencana perjalanan alam dan budaya Bali dengan bantuan AI, bersama pemandu dan komunitas lokal.</p>' +
        '<div class="social"><a href="https://www.instagram.com/pathora_id" target="_blank" rel="noopener" aria-label="Instagram Pathora, pathora_id">' + ig + '<span>@pathora_id</span></a><a href="https://www.tiktok.com/@pathora_id" target="_blank" rel="noopener" aria-label="TikTok Pathora, pathora_id">' + tt + '<span>@pathora_id</span></a></div></div>' +
        '<div><h4>Traveler</h4><a href="jelajahi.html">Jelajahi kegiatan</a><a href="trip.html">Asisten perjalanan</a><a href="paspor.html">Paspor Alam</a><a href="masuk.html?mode=daftar">Buat akun</a></div>' +
        '<div><h4>Host lokal</h4><a href="masuk.html?role=host&mode=daftar">Daftar sebagai host</a></div>' +
        '<div><h4>Pathora</h4><a href="index.html#cara">Cara kerja</a><a href="index.html#prinsip">Prinsip kami</a><a href="index.html#faq">Pertanyaan umum</a></div></div>' +
        '<p class="fine">Prototipe Kelompok 2. Nama host, harga, cuaca, dan angka lainnya adalah data contoh. Pembayaran hanya simulasi.</p></div></footer>';
    },

    toast(msg, linkHtml) {
      let box = document.querySelector('.toasts');
      if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
      const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = '<span>' + esc(msg) + '</span>' + (linkHtml || '');
      box.appendChild(t); setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, 3400);
    },

    modal(html, onMount) {
      const ov = document.createElement('div'); ov.className = 'overlay open';
      ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
      document.body.appendChild(ov);
      const close = () => { ov.remove(); document.removeEventListener('keydown', key); };
      const key = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', key);
      ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
      $$('[data-close]', ov).forEach((b) => b.addEventListener('click', close));
      if (onMount) onMount(ov, close);
      return { el: ov, close };
    },

    avatar(m, cls) { return '<span class="av ' + (cls || '') + '" style="background:' + m.color + '" title="' + esc(m.name) + '">' + m.ini + '</span>'; },
    avatars(ids, cls) { return '<span class="av-stack">' + ids.map((id) => { const m = S.member(id); return m ? UI.avatar(m, cls) : ''; }).join('') + '</span>'; },

    crowd(level) { return '<span class="crowd c' + level + '" title="Perkiraan keramaian: ' + CROWD_LABEL[level] + '"><span class="d"><i></i><i></i><i></i></span>' + CROWD_LABEL[level] + '</span>'; },

    wx(w) { return '<span title="' + w.cond + ', peluang hujan ' + w.rain + '%" style="display:inline-flex;align-items:center;gap:5px">' + ic(w.icon, 16) + w.temp + '°</span>'; },

    statusBadge(st) {
      const m = { draft: ['Draf', ''], diajukan: ['Menunggu konfirmasi host', 'b-mid'], disetujui: ['Disetujui, menunggu pembayaran', 'b-ok'], ditolak: ['Tidak dapat dipenuhi host', 'b-bad'], lunas: ['Lunas', 'b-ok'] }[st] || [st, ''];
      return '<span class="badge ' + m[1] + '"><i></i>' + m[0] + '</span>';
    },

    /* kartu kegiatan untuk grid */
    actCard(a, o) {
      o = o || {};
      const date = o.date || S.get().trip.start;
      const lvl = crowdFor(a, date);
      const inTrip = S.get().items.some((i) => i.actId === a.id && i.status !== 'ditolak');
      return '<article class="act-card" data-id="' + a.id + '">' +
        '<a class="act-img" href="kegiatan.html?id=' + a.id + '" aria-label="' + esc(a.name) + '">' + photo(a) +
        '<span class="act-cat">' + esc(a.cats[0]) + '</span></a>' +
        '<button class="act-add' + (inTrip ? ' on' : '') + '" data-add="' + a.id + '" aria-label="' + (inTrip ? 'Sudah ada di trip' : 'Tambah ke trip') + '" title="' + (inTrip ? 'Sudah ada di trip' : 'Tambah ke trip') + '">' + ic(inTrip ? 'check' : 'plus', 18) + '</button>' +
        '<div class="act-body"><h3><a href="kegiatan.html?id=' + a.id + '">' + esc(a.name) + '</a></h3>' +
        '<p class="act-meta">' + ic('pin', 14) + esc(a.place) + '<span>·</span>' + ic('clock', 14) + a.dur.toString().replace('.', ',') + ' jam</p>' +
        '<div class="act-foot">' + UI.crowd(lvl) + '<span class="act-price">' + rp(a.price) + '<small> /orang</small></span></div></div></article>';
    },

    /* tambah kegiatan ke trip dengan tanggal terbaik */
    quickAdd(actId, btn) {
      const a = byId[actId]; const s = S.get();
      const days = S.days();
      let best = null, bs = -9;
      days.forEach((d) => { const sc = g.PD.dayScore(a, d, s.hostClosed); if (sc > bs) { bs = sc; best = d; } });
      if (!best || bs < 0) { UI.toast('Tanggal trip bertepatan dengan jadwal tutup host. Silakan ubah tanggal di Trip saya.'); return; }
      const used = s.items.filter((i) => i.date === best).length;
      if (used >= 2) { const free = days.filter((d) => s.items.filter((i) => i.date === d).length < 2 && g.PD.dayScore(a, d, s.hostClosed) >= 0); if (free.length) best = free[0]; }
      const it = S.addItem({ actId, date: best });
      UI.toast(a.short + ' ditambahkan pada ' + D.long(it.date), '<a href="trip.html">Buka trip</a>');
      if (btn) { btn.classList.add('on'); btn.innerHTML = ic('check', 18); }
    },

    bindAdd(root) {
      (root || document).addEventListener('click', (e) => {
        const b = e.target.closest('[data-add]'); if (!b) return;
        e.preventDefault(); UI.quickAdd(b.getAttribute('data-add'), b);
      });
    }
  };

  /* css kartu kegiatan dipasang sekali di sini supaya semua halaman konsisten */
  const css = document.createElement('style');
  css.textContent = '.act-card{position:relative;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s;display:flex;flex-direction:column}' +
    '.act-card:hover,.act-card:focus-within{transform:scale(1.035);box-shadow:var(--shadow-lg);z-index:3}' +
    '.act-img{display:block;aspect-ratio:4/3;position:relative;overflow:hidden}.act-img .art{position:absolute;inset:0}' +
    '' +
    '.act-cat{position:absolute;left:12px;top:12px;z-index:2;background:rgba(46,27,19,.62);color:var(--cream);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:99px;backdrop-filter:blur(6px)}' +
    '.act-add{position:absolute;right:12px;top:12px;z-index:3;width:38px;height:38px;border-radius:50%;border:0;background:var(--cream);color:var(--jungle);display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:.2s}' +
    '.act-add:hover{background:var(--gold);transform:scale(1.08)}.act-add.on{background:var(--olive);color:#fff}' +
    '.act-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:8px;flex:1}.act-body h3{font-size:18px;line-height:1.2;letter-spacing:-.01em}' +
    '.act-body h3 a:hover{color:var(--olive)}' +
    '.act-meta{display:flex;align-items:center;gap:6px;color:var(--ink-2);font-size:13px;flex-wrap:wrap}.act-meta span{color:var(--ink-3)}' +
    '.act-foot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:12px;border-top:1px solid var(--line)}' +
    '.act-price{font-weight:700}.act-price small{font-weight:500;color:var(--ink-3);font-size:12px}' +
    '.ic{flex:none}' +
    '.menu-pop{position:absolute;right:max(24px,calc((100vw - 1180px)/2));top:calc(var(--nav-h) - 6px);min-width:230px;background:var(--paper);color:var(--ink);border-radius:14px;box-shadow:var(--shadow-lg);padding:8px;z-index:60;border:1px solid var(--line)}' +
    '.menu-pop[hidden]{display:none}.menu-pop .who{padding:10px 12px 12px;border-bottom:1px solid var(--line);margin-bottom:6px}.menu-pop .who b{display:block}.menu-pop .who small{color:var(--ink-3)}' +
    '.menu-pop a,.menu-pop button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:10px 12px;border-radius:9px;font-weight:500;font-size:14px}' +
    '.menu-pop a:hover,.menu-pop button:hover{background:rgba(46,27,19,.06)}.nav-av{cursor:pointer}' +
    '@media(max-width:860px){.nav-login{display:none}.menu-pop{right:16px}}';
  document.head.appendChild(css);

  g.UI = UI;
})(window);
