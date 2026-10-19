/* Pathora — ikon dan ilustrasi.
   Foto asli bisa dipasang tanpa mengubah kode: taruh file di assets/img/photos/<id-kegiatan>.jpg
   (contoh: tukik.jpg). Kalau file ada, foto menimpa ilustrasi otomatis. */
(function (g) {
  'use strict';
  const P = { jungle: '#2E1B13', canopy: '#353D13', olive: '#626B2D', bamboo: '#A87B36', sand: '#BFAB72', rust: '#A3431D', cream: '#F4F1E2', blue: '#7C9CAC', blue2: '#5F8798', sky: '#B7C6BC' };

  /* ---------- ikon ---------- */
  const IC = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9.5 4.5 4.5 0 0 1 17.5 18H7z"/>',
    cloudsun: '<circle cx="8" cy="8" r="2.6"/><path d="M8 2v1.2M2 8h1.2M3.8 3.8l.9.9M12.2 3.8l-.9.9"/><path d="M9 20a3.5 3.5 0 0 1-.4-7A5.2 5.2 0 0 1 18.6 14a3.5 3.5 0 0 1-.4 6z"/>',
    rain: '<path d="M7 15a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 6.5 4.5 4.5 0 0 1 17.5 15H7z"/><path d="M8 18l-1 2.4M12.5 18l-1 2.4M17 18l-1 2.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    users: '<path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M21 20v-1a4 4 0 0 0-3-3.9M15.5 4.2a3.5 3.5 0 0 1 0 6.6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><path d="M16 14h2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
    ticket: '<path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3z"/><path d="M14 6v12"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18h2"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    drag: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    heart: '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'
  };
  function ic(n, s, extra) {
    return '<svg class="ic" width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' + (extra || '') + '>' + (IC[n] || '') + '</svg>';
  }

  /* ---------- ilustrasi kegiatan ---------- */
  const sun = (x, y, r, c) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 2.2) + '" fill="' + (c || '#E3B866') + '" opacity=".18"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (c || '#E3B866') + '" opacity=".85"/>';
  const palm = (x, y, s, c) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="' + (c || P.jungle) + '"><path d="M0 0C4-40 2-80-6-110" stroke="' + (c || P.jungle) + '" stroke-width="6" fill="none"/><g transform="translate(-6 -110)"><path d="M0 0C-30-20-70-18-95 6 -60-6-30-8 0 0z"/><path d="M0 0C30-25 70-22 98 4 62-8 30-10 0 0z"/><path d="M0 0C-10-35-40-55-70-55 -40-42-18-26 0 0z"/><path d="M0 0C14-36 44-52 74-48 44-38 20-24 0 0z"/><path d="M0 0C-20 10-50 30-62 56 -38 34-18 18 0 0z"/><path d="M0 0C20 12 50 28 66 52 40 32 18 16 0 0z"/></g></g>';
  const SC = {
    turtle: () => '<rect width="400" height="260" fill="#C9D3C2"/>' + sun(310, 70, 30) + '<rect y="110" width="400" height="60" fill="' + P.blue + '"/><path d="M0 128q50-8 100 0t100 0 100 0 100 0" stroke="#fff" stroke-opacity=".35" fill="none"/><path d="M0 160q80-14 160 0t160 0 80 0V260H0z" fill="#CDB57C"/><path d="M0 200q100-16 200 0t200 0V260H0z" fill="#B99B5F"/>' + palm(360, 215, .7) +
      '<g transform="translate(150 195)"><ellipse cx="0" cy="0" rx="62" ry="38" fill="#7A4B1F"/><ellipse cx="0" cy="-2" rx="52" ry="30" fill="#8C5A26"/><path d="M-30-2L-12-18H12L30-2 12 14H-12z" fill="none" stroke="#5A3414" stroke-width="3"/><path d="M-12-18L-30-2M12-18L30-2M-12 14L-30-2M12 14L30-2" stroke="#5A3414" stroke-width="2"/><circle cx="68" cy="2" r="14" fill="#6E5A2B"/><circle cx="73" cy="-2" r="2.4" fill="#fff"/><ellipse cx="-30" cy="30" rx="22" ry="9" fill="#6E5A2B" transform="rotate(-24 -30 30)"/><ellipse cx="34" cy="32" rx="22" ry="9" fill="#6E5A2B" transform="rotate(24 34 32)"/></g><g transform="translate(250 232)"><ellipse rx="14" ry="9" fill="#5A3A18"/><circle cx="14" cy="0" r="5" fill="#5A3A18"/></g>',
    mangrove: () => '<rect width="400" height="260" fill="#C9D3C2"/>' + sun(70, 60, 24) + '<rect y="150" width="400" height="110" fill="' + P.blue + '"/><path d="M0 170q50-8 100 0t100 0 100 0 100 0M0 200q50-8 100 0t100 0 100 0 100 0" stroke="#fff" stroke-opacity=".28" fill="none"/>' +
      [[90, 150, 1], [200, 140, 1.25], [310, 152, .95]].map((t) => '<g transform="translate(' + t[0] + ' ' + t[1] + ') scale(' + t[2] + ')"><path d="M-30 20C-24-4-14-10 0-14M30 20C24-4 14-10 0-14M0 22V-10M-14 22C-12 4-6-6 0-14M14 22C12 4 6-6 0-14" stroke="#4A3920" stroke-width="3" fill="none"/><ellipse cx="0" cy="-34" rx="50" ry="34" fill="' + P.olive + '"/><ellipse cx="-22" cy="-24" rx="30" ry="22" fill="' + P.canopy + '"/><ellipse cx="24" cy="-28" rx="28" ry="20" fill="#7A8438"/></g>').join('') +
      '<path d="M0 232h400v28H0z" fill="#8A6A3C"/><path d="M0 232h400" stroke="#6C5030" stroke-width="3"/>' + [30, 90, 150, 210, 270, 330].map((x) => '<rect x="' + x + '" y="232" width="4" height="28" fill="#6C5030"/>').join(''),
    terrace: () => '<rect width="400" height="260" fill="#C9D3C2"/>' + sun(320, 56, 22) + '<path d="M0 120L70 70l60 44 70-56 80 62 60-36 60 28V260H0z" fill="#8E9A74"/><path d="M0 150Q100 98 200 130T400 118V260H0z" fill="' + P.olive + '"/>' +
      [150, 168, 188, 210, 234].map((y, i) => '<path d="M0 ' + (y + 6) + 'Q100 ' + (y - 24 + i * 3) + ' 200 ' + (y - 6) + 'T400 ' + (y - 4) + 'V260H0z" fill="' + [P.olive, '#56601F', P.canopy, '#2A310F', P.jungle][i] + '"/><path d="M0 ' + (y + 6) + 'Q100 ' + (y - 24 + i * 3) + ' 200 ' + (y - 6) + 'T400 ' + (y - 4) + '" stroke="#E3B866" stroke-opacity=".5" fill="none"/>').join('') + palm(60, 250, .85),
    bird: () => '<rect width="400" height="260" fill="#DCCDA5"/>' + sun(300, 80, 34, '#E8B865') + '<path d="M0 170Q80 120 160 150T320 140 400 150V260H0z" fill="#8E9A74"/><path d="M0 210Q100 170 200 200T400 190V260H0z" fill="' + P.canopy + '"/><path d="M-10 128C80 120 170 140 270 124S380 128 420 116" stroke="#3A2A14" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M290 126l30 18" stroke="#3A2A14" stroke-width="5"/><g transform="translate(160 112)"><ellipse cx="0" cy="0" rx="36" ry="24" fill="' + P.jungle + '"/><circle cx="32" cy="-14" r="15" fill="' + P.jungle + '"/><path d="M44-16l22 6-22 6z" fill="#E3B866"/><circle cx="36" cy="-17" r="2.6" fill="#fff"/><path d="M-30 6L-70 26-34-6z" fill="' + P.canopy + '"/><path d="M-6 22v10M8 22v10" stroke="#3A2A14" stroke-width="3"/></g>',
    waterfall: () => '<rect width="400" height="260" fill="' + P.canopy + '"/><rect x="120" width="160" height="260" fill="#5E6B3E"/><path d="M120 0h160v70H120z" fill="#B7C6BC"/><rect x="176" y="40" width="48" height="170" rx="22" fill="#F4F1E2" opacity=".92"/><path d="M186 60v140M200 50v150M214 66v140" stroke="#B7C6BC" stroke-width="2.4"/><ellipse cx="200" cy="214" rx="76" ry="22" fill="#B7C6BC"/><ellipse cx="200" cy="214" rx="54" ry="14" fill="#F4F1E2" opacity=".7"/><path d="M0 0h130c-20 60-40 120-130 190zM400 0H270c20 60 40 120 130 190z" fill="' + P.jungle + '" opacity=".8"/><path d="M0 260V160q60 20 90 100zM400 260V160q-60 20-90 100z" fill="' + P.olive + '"/>',
    canang: () => '<rect width="400" height="260" fill="#6B4A2A"/><g opacity=".12" fill="#F4F1E2">' + [0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5].map((c) => '<rect x="' + (c * 70 + (r % 2) * 35) + '" y="' + (r * 70) + '" width="34" height="34" transform="rotate(45 ' + (c * 70 + 17 + (r % 2) * 35) + ' ' + (r * 70 + 17) + ')"/>').join('')).join('') + '</g><g transform="translate(200 132) rotate(-8)"><rect x="-84" y="-84" width="168" height="168" rx="14" fill="' + P.olive + '"/><rect x="-70" y="-70" width="140" height="140" rx="8" fill="#8E9A58"/><path d="M-70 0H70M0 -70V70" stroke="#626B2D" stroke-width="3" opacity=".6"/><circle cx="-34" cy="-34" r="22" fill="#F4F1E2"/><circle cx="34" cy="-34" r="22" fill="#E3B866"/><circle cx="-34" cy="34" r="22" fill="' + P.rust + '"/><circle cx="34" cy="34" r="22" fill="#B9CBD3"/><circle cx="0" cy="0" r="15" fill="#F4F1E2"/><circle cx="0" cy="0" r="6" fill="#E3B866"/></g>',
    weave: () => '<rect width="400" height="260" fill="#6E2F18"/>' + [0, 1, 2, 3, 4, 5].map((r) => '<path d="M0 ' + (r * 46 + 20) + ' l25 -18 25 18 25 -18 25 18 25 -18 25 18 25 -18 25 18 25 -18 25 18 25 -18 25 18 25 -18 25 18 25 -18 25 18 25 -18 25 18" stroke="' + ['#E3B866', '#F4F1E2', '#BFAB72', '#E3B866', '#9DB4B8', '#F4F1E2'][r] + '" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>').join('') + [[60, 40], [180, 86], [320, 132], [100, 178], [260, 224], [350, 40]].map((p) => '<path d="M' + p[0] + ' ' + (p[1] - 7) + 'l7 7-7 7-7-7z" fill="#2E1B13"/>').join(''),
    cooking: () => '<rect width="400" height="260" fill="#A87B36"/><rect y="170" width="400" height="90" fill="#7A5522"/><path d="M0 170h400" stroke="#5E4118" stroke-width="3"/><g transform="translate(200 160)"><path d="M-84 0C-84 62-48 86 0 86S84 62 84 0z" fill="#3A3A32"/><ellipse cx="0" cy="0" rx="84" ry="20" fill="#2A2A24"/><ellipse cx="0" cy="-2" rx="72" ry="14" fill="#A3431D"/><ellipse cx="0" cy="-4" rx="58" ry="10" fill="#C0562A"/><path d="M40-12l86-80" stroke="#E3C9A0" stroke-width="12" stroke-linecap="round"/></g>' + [[70, 200, -20], [96, 224, 14], [330, 212, 30], [300, 232, -10]].map((c) => '<path d="M' + c[0] + ' ' + c[1] + 'q18-6 34 6-14 8-34-6z" fill="' + P.rust + '" transform="rotate(' + c[2] + ' ' + c[0] + ' ' + c[1] + ')"/>').join('') + '<g fill="' + P.olive + '"><path d="M60 80q20-40 52-30-16 30-52 30z"/><path d="M320 70q-14-40-48-34 12 30 48 34z"/><path d="M290 110q30-8 44 18-28 6-44-18z"/></g>',
    duck: () => '<rect width="400" height="260" fill="#C9D3C2"/>' + sun(70, 60, 22) + '<path d="M0 100q90-30 180-6t220-8V260H0z" fill="#8E9A74"/>' + [130, 160, 192, 226].map((y, i) => '<path d="M0 ' + y + 'Q100 ' + (y - 18) + ' 200 ' + (y - 4) + 'T400 ' + (y - 8) + 'V260H0z" fill="' + [P.olive, '#56601F', P.canopy, '#2A310F'][i] + '"/><path d="M0 ' + (y + 4) + 'Q100 ' + (y - 14) + ' 200 ' + y + 'T400 ' + (y - 4) + '" stroke="#B7C6BC" stroke-opacity=".5" stroke-width="2" fill="none"/>').join('') +
      [[110, 168, 1], [150, 184, .85], [250, 176, 1.05], [300, 196, .9], [200, 206, 1]].map((d) => '<g transform="translate(' + d[0] + ' ' + d[1] + ') scale(' + d[2] + ')"><ellipse rx="17" ry="11" fill="#F4F1E2"/><circle cx="14" cy="-9" r="8" fill="#F4F1E2"/><path d="M21-9l10 3-10 3z" fill="#E3B866"/><circle cx="17" cy="-11" r="1.6" fill="#2E1B13"/><path d="M-14 0q-10-4-12-10 12 0 18 6z" fill="#D9D1B4"/></g>').join(''),
    coffee: () => '<rect width="400" height="260" fill="#DCCDA5"/>' + sun(70, 60, 24, '#E8B865') + '<path d="M0 130q100-50 200-14t200-16V260H0z" fill="#8E9A74"/>' + [150, 184, 218].map((y, i) => '<path d="M0 ' + y + 'q100-24 200-6t200-10V260H0z" fill="' + [P.olive, P.canopy, '#232A0C'][i] + '"/>' + [30, 80, 130, 190, 250, 300, 360].map((x, j) => '<circle cx="' + (x + (i % 2) * 20) + '" cy="' + (y + 8 + (j % 2) * 6) + '" r="5" fill="' + (j % 3 === 0 ? P.rust : '#8E9A58') + '"/>').join('')).join('') + '<g transform="translate(320 70)"><path d="M-26 0h46v26a22 22 0 0 1-22 22h-2a22 22 0 0 1-22-22z" fill="#F4F1E2"/><path d="M20 8h8a8 8 0 0 1 0 16h-8" stroke="#F4F1E2" stroke-width="5" fill="none"/><path d="M-12-8q6-10 0-18M2-8q6-10 0-18M16-8q6-10 0-18" stroke="#F4F1E2" stroke-opacity=".7" stroke-width="3" fill="none" stroke-linecap="round"/></g>',
    pottery: () => '<rect width="400" height="260" fill="#B8855A"/><rect y="188" width="400" height="72" fill="#8A5A34"/><path d="M0 188h400" stroke="#6B4524" stroke-width="3"/><ellipse cx="200" cy="200" rx="104" ry="26" fill="#6B4524"/><ellipse cx="200" cy="194" rx="104" ry="26" fill="#9A6A40"/><path d="M148 190C128 140 150 112 168 100c-8-14-4-26 6-30h52c10 4 14 16 6 30 18 12 40 40 20 90z" fill="#C06A3E"/><ellipse cx="200" cy="70" rx="26" ry="8" fill="#9C4F2A"/><path d="M158 140h84M152 164h96" stroke="#E3B866" stroke-width="4" opacity=".8"/><path d="M142 150c-30 6-44 18-48 36M258 150c30 6 44 18 48 36" stroke="#E3C9A0" stroke-width="14" stroke-linecap="round" fill="none" opacity=".85"/>',
    coral: () => '<rect width="400" height="260" fill="' + P.blue2 + '"/><rect width="400" height="90" fill="#7FA6B8"/><path d="M0 60q50-10 100 0t100 0 100 0 100 0" stroke="#fff" stroke-opacity=".3" fill="none"/>' + [...Array(7)].map((_, i) => '<path d="M' + (i * 70 + 10) + ' 0l20 90" stroke="#fff" stroke-opacity=".08" stroke-width="14"/>').join('') + '<path d="M0 230q100-24 200-4t200-14V260H0z" fill="#CDB57C"/>' +
      [[60, 232, P.rust], [130, 236, '#E3B866'], [240, 234, '#D7826A'], [320, 232, P.sand]].map((c) => '<g transform="translate(' + c[0] + ' ' + c[1] + ')" stroke="' + c[2] + '" stroke-width="9" stroke-linecap="round" fill="none"><path d="M0 0V-60M0-24L-22-52M0-38L22-70M-22-52L-30-72M22-70L34-92M0-60L-8-86"/></g>').join('') + [[120, 130, 1], [250, 160, .8], [310, 110, 1.1]].map((f) => '<g transform="translate(' + f[0] + ' ' + f[1] + ') scale(' + f[2] + ')"><ellipse rx="18" ry="9" fill="#E3B866"/><path d="M16 0l14-10v20z" fill="#E3B866"/><circle cx="-9" cy="-2" r="2" fill="#2E1B13"/><path d="M-4-9L2-16 8-9" fill="#A87B36"/></g>').join('')
  };
  function scene(kind) {
    const f = SC[kind] || SC.terrace;
    return '<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustrasi kegiatan">' + f() + '</svg>';
  }
  /* nama berkas foto yang dicoba, berurutan; airterjun juga boleh dinamai waterfall */
  const ALIAS = { airterjun: ['waterfall'] };
  const EXT = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'PNG'];
  function cands(id) { const out = []; (ALIAS[id] || []).concat([id]).forEach(function (n) { EXT.forEach(function (e) { out.push('assets/img/photos/' + n + '.' + e); }); }); return out; }
  function photo(a, cls) {
    const c = cands(a.id);
    return '<div class="art ' + (cls || '') + '">' + scene(a.art) + '<img src="' + c[0] + '" data-id="' + a.id + '" data-e="0" alt="" loading="lazy" onerror="PA.nx(this)"></div>';
  }

  /* ---------- hero landing ---------- */
  function hero() {
    const frond = '<path id="fr" d="M0 0C46-34 120-40 186-6 124-24 56-14 0 0z"/>';
    const palmG = (x, y, s, flip) => '<g class="sway" style="transform-box:fill-box" transform="translate(' + x + ' ' + y + ') scale(' + (flip ? -s : s) + ' ' + s + ')"><path d="M0 0C8-90 4-190-12-290" stroke="#10130A" stroke-width="13" fill="none" stroke-linecap="round"/><g transform="translate(-12 -290)" fill="#10130A">' + [-168, -138, -108, -76, -42, -8, 24, 54, 84, 112].map((r) => '<use href="#fr" transform="rotate(' + r + ') scale(' + (1.05 + (Math.abs(r) % 40) / 160) + ')"/>').join('') + '</g></g>';
    return '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>' + frond +
      '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A6270"/><stop offset=".45" stop-color="#8FA8A6"/><stop offset=".75" stop-color="#D9C990"/><stop offset="1" stop-color="#E7CF91"/></linearGradient>' +
      '<radialGradient id="glow"><stop offset="0" stop-color="#F6DE9B" stop-opacity=".95"/><stop offset=".35" stop-color="#E7C27A" stop-opacity=".45"/><stop offset="1" stop-color="#E7C27A" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DDB0" stop-opacity="0"/><stop offset="1" stop-color="#E9DDB0" stop-opacity=".5"/></linearGradient>' +
      '<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E1B13" stop-opacity="0"/><stop offset="1" stop-color="#2E1B13" stop-opacity=".85"/></linearGradient></defs>' +
      '<rect width="1600" height="900" fill="url(#sky)"/>' +
      '<g data-p=".04"><circle cx="1010" cy="430" r="380" fill="url(#glow)"/><circle cx="1010" cy="430" r="62" fill="#F7E3A8"/></g>' +
      '<g data-p=".08"><path d="M0 560L180 450l150 90 200-130 230 150 170-110 230 120 190-80 250 120V900H0z" fill="#8E9A74" opacity=".75"/></g>' +
      '<g data-p=".14"><path d="M0 620Q260 520 520 590T1060 570 1600 600V900H0z" fill="#6F7B3A"/><path d="M0 620Q260 520 520 590T1060 570 1600 600" stroke="#E3B866" stroke-opacity=".35" fill="none"/></g>' +
      '<rect y="560" width="1600" height="200" fill="url(#mist)"/>' +
      '<g data-p=".2">' + [650, 690, 735, 785].map((y, i) => '<path d="M0 ' + y + 'Q400 ' + (y - 60 + i * 8) + ' 800 ' + (y - 14) + 'T1600 ' + (y - 24) + 'V900H0z" fill="' + ['#56601F', '#44501A', '#353D13', '#262D0E'][i] + '"/><path d="M0 ' + y + 'Q400 ' + (y - 60 + i * 8) + ' 800 ' + (y - 14) + 'T1600 ' + (y - 24) + '" stroke="#E3B866" stroke-opacity=".28" fill="none"/>').join('') + '</g>' +
      '<g data-p=".3">' + palmG(130, 900, 1.15, false) + palmG(1480, 900, 1.3, true) + palmG(300, 900, .7, false) + '</g>' +
      '<rect y="620" width="1600" height="280" fill="url(#fade)"/></svg>';
  }

  function nx(im) { const c = cands(im.dataset.id), i = +im.dataset.e + 1; if (i >= c.length) { im.remove(); return; } im.dataset.e = i; im.src = c[i]; }
  g.PA = { P, IC, ic, scene, photo, hero, nx };
})(window);
