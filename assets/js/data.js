/* Pathora — katalog kegiatan + data demo (cuaca, keramaian, hari raya).
   Semua angka di sini CONTOH untuk prototype, bukan data sungguhan. Katalog berasal dari sheet riset Karangasem. */
(function (g) {
  'use strict';

  /* ---------- tanggal ---------- */
  const EN = !!(g.I18N && g.I18N.lang === 'en');
  const HARI = EN ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const HARI_S = EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const BULAN = EN ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BULAN_S = EN ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const TO = EN ? ' to ' : ' sampai ';
  const pad = (n) => String(n).padStart(2, '0');
  const D = {
    HARI, HARI_S, BULAN, BULAN_S,
    parse(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); },
    iso(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); },
    add(iso, n) { const d = D.parse(iso); d.setDate(d.getDate() + n); return D.iso(d); },
    diff(a, b) { return Math.round((D.parse(b) - D.parse(a)) / 864e5); },
    range(a, b) { const out = []; for (let i = 0, n = D.diff(a, b); i <= n; i++) out.push(D.add(a, i)); return out; },
    dow(iso) { return D.parse(iso).getDay(); },
    short(iso) { const d = D.parse(iso); return HARI_S[d.getDay()] + ' ' + d.getDate(); },
    med(iso) { const d = D.parse(iso); return d.getDate() + ' ' + BULAN_S[d.getMonth()]; },
    long(iso) { const d = D.parse(iso); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()]; },
    span(a, b) {
      const x = D.parse(a), y = D.parse(b);
      if (a === b) return D.med(a);
      if (x.getMonth() === y.getMonth()) return x.getDate() + TO + y.getDate() + ' ' + BULAN_S[y.getMonth()];
      return D.med(a) + TO + D.med(b);
    },
    today() { return '2026-10-20'; } /* tanggal acuan prototype */
  };

  /* ---------- util ---------- */
  const rp = (n) => 'Rp' + Math.round(n).toLocaleString(EN ? 'en-US' : 'id-ID');
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967295; };
  const hav = (a, b) => {
    const R = 6371, t = (x) => x * Math.PI / 180;
    const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng);
    const q = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(q));
  };
  const uid = () => Math.random().toString(36).slice(2, 9);

  /* ---------- katalog ---------- */
  /* Katalog contoh: 12 kegiatan dari sheet riset (Karangasem, Bali Timur). Nilai yang kosong di sheet (harga, durasi,
     kuota, jam mulai) diisi angka CONTOH. Nama pengelola mengikuti sheet dan belum dikonfirmasi. */
  const A = [
    {
      id: 'arak', name: 'Belajar proses pembuatan arak tradisional', short: 'Arak tradisional', art: 'cooking',
      cats: ['budaya', 'kuliner'], region: 'Sidemen', place: 'Tri Eka Buana, Sidemen', lat: -8.47, lng: 115.445,
      dur: 3, times: ['09:00'], price: 50000, cap: 10, kid: false, outdoor: true, indoorOk: false,
      crowd: 0.25, moon: true,
      kw: ['arak', 'tradisional', 'sidemen', 'tri eka buana', 'gembleng', 'air terjun', 'karangasem', 'budaya', 'minuman', 'kuliner'],
      host: { name: 'Kelompok usaha arak Oemah Arak', ini: 'OA', lang: 'Indonesia, Bali' },
      story: 'Di Tri Eka Buana, Sidemen, arak dibuat dengan cara yang diwariskan dari keluarga ke keluarga. Pembuatnya menunjukkan bahan, penyulingan, dan alasan tiap tahap dikerjakan seperti itu. Setelah belajar, kamu bisa berjalan ke Air Terjun Gembleng yang jaraknya sekitar sepuluh sampai lima belas menit dari desa.',
      hl: ['Melihat proses pembuatan arak dari bahan sampai sulingan', 'Mendengar cerita dan aturan adat di balik arak', 'Berjalan ke Air Terjun Gembleng setelah belajar'],
      fit: 'Cocok untuk orang dewasa yang penasaran dengan tradisi minuman Bali. Khusus usia 21 tahun ke atas.',
      steps: [[0, 'Kumpul dan perkenalan dengan pembuat arak'], [45, 'Melihat bahan dan penyulingan'], [90, 'Mencicipi dengan takaran kecil'], [135, 'Jalan ke Air Terjun Gembleng']],
      ethics: ['Khusus usia 21 tahun ke atas', 'Jangan menyetir setelah mencicipi arak', 'Ada pura dan sesajen di area air terjun, jaga sikap'],
      bring: ['Alas kaki anti-selip', 'Baju ganti atau baju renang', 'Uang tunai pecahan kecil untuk donasi'],
      meet: 'Air Terjun Gembleng, Desa Tri Eka Buana', contrib: 'Sebagian hasil masuk ke kas kelompok. Informasi dari host.'
    },
    {
      id: 'camping', name: 'Camping semalam di Bukit Asah', short: 'Camping Bukit Asah', art: 'terrace',
      cats: ['hutan', 'laut'], region: 'Karangasem', place: 'Bukit Asah, Bugbug', lat: -8.496, lng: 115.575,
      dur: 12, times: ['15:00'], price: 37500, cap: 20, kid: true, outdoor: true, indoorOk: false,
      crowd: 0.5, moon: false,
      kw: ['camping', 'berkemah', 'tenda', 'bukit asah', 'bugbug', 'karangasem', 'alam', 'menginap', 'pantai', 'virgin beach'],
      host: { name: 'BP2DAB / Taman Harmoni Bali', ini: 'TH', lang: 'Indonesia, Bali' },
      story: 'Bukit Asah di Bugbug dikelola anak muda desa lewat Taman Harmoni Bali. Tenda, matras, dan dapur umum sudah disiapkan, jadi kamu tinggal datang, menikmati sore di bukit, lalu tidur dengan suara laut. Pantai Virgin Beach hanya sekitar lima menit dari lokasi.',
      hl: ['Menginap di tenda yang sudah disiapkan pengelola', 'Melihat matahari terbenam dan terbit dari bukit', 'Mampir ke Virgin Beach yang dekat dari lokasi'],
      fit: 'Cocok untuk keluarga, rombongan teman, pasangan, dan pemula camping.',
      steps: [[0, 'Tiba dan memilih tenda'], [90, 'Sore di bukit'], [240, 'Makan malam dan ngobrol di api unggun'], [720, 'Pagi di bukit dan sarapan']],
      ethics: ['Jaga kebersihan dan bawa pulang sampah', 'Hormati desa adat', 'Jangan dekat bibir tebing saat gelap'],
      bring: ['Jaket atau baju hangat', 'Power bank', 'Senter kepala', 'Alas kaki nyaman'],
      meet: 'Bukit Asah, Desa Bugbug', contrib: 'Sebagian hasil masuk ke pengelolaan desa wisata. Informasi dari host.'
    },
    {
      id: 'garam', name: 'Wisata edukasi garam tradisional Amed', short: 'Garam tradisional Amed', art: 'coral',
      cats: ['laut', 'kuliner'], region: 'Amed', place: 'Purwakerthi, Amed', lat: -8.345, lng: 115.655,
      dur: 2, times: ['08:00', '15:00'], price: 75000, cap: 10, kid: true, outdoor: true, indoorOk: false,
      crowd: 0.3, moon: false,
      kw: ['garam', 'amed', 'petani', 'pantai', 'edukasi', 'karangasem', 'kuliner', 'laut', 'purwakerthi'],
      host: { name: 'Kelompok petani garam Amed', ini: 'KG', lang: 'Indonesia, Bali' },
      story: 'Di pantai Amed, garam masih dibuat petani dengan menjemur air laut di ladang kecil. Kamu belajar dari mereka mengapa garam Amed punya sertifikat indikasi geografis, lalu ikut membuat garam di sebelah Amed Salt Center. Garam hanya diproduksi saat musim kemarau.',
      hl: ['Melihat petani menjemur air laut jadi garam', 'Ikut membuat garam bersama petani', 'Belajar tentang garam Amed di Amed Salt Center'],
      fit: 'Cocok untuk keluarga, pelajar, dan pencinta kuliner yang suka wisata edukasi.',
      steps: [[0, 'Sambutan di Amed Salt Center'], [30, 'Berjalan ke ladang garam'], [60, 'Ikut membuat garam'], [90, 'Melihat produk dan mencicipi']],
      ethics: ['Minta izin sebelum memotret petani', 'Jangan menginjak petak garam yang sedang dikeringkan'],
      bring: ['Topi dan tabir surya', 'Air minum', 'Alas kaki yang boleh basah'],
      meet: 'Amed Salt Center, Desa Purwakerthi', contrib: 'Sebagian hasil masuk ke kas petani garam. Informasi dari host.'
    },
    {
      id: 'yehlabuh', name: 'Trekking ke Air Terjun Yeh Labuh', short: 'Air terjun Yeh Labuh', art: 'waterfall',
      cats: ['hutan'], region: 'Manggis', place: 'Selumbung, Manggis', lat: -8.497, lng: 115.525,
      dur: 3, times: ['07:30'], price: 0, cap: 10, kid: false, outdoor: true, indoorOk: false,
      crowd: 0.2, moon: false,
      kw: ['air terjun', 'yeh labuh', 'trekking', 'selumbung', 'manggis', 'karangasem', 'hutan', 'sungai', 'alam', 'jalan kaki'],
      host: { name: 'Pokdarwis Desa Selumbung', ini: 'PS', lang: 'Indonesia, Bali' },
      story: 'Pokdarwis Selumbung membuat jalur trekking dan jembatan baru menuju Air Terjun Yeh Labuh. Jalurnya curam dan berbatu, kamu menyeberangi sungai, dan di ujungnya ada air terjun yang jarang didatangi. Pulanglah sebelum gelap karena jalur tidak berlampu.',
      hl: ['Menyusuri jalur baru yang dibuat warga', 'Menyeberangi sungai dan berjalan di antara pepohonan', 'Sampai di air terjun yang tenang'],
      fit: 'Cocok untuk remaja dan dewasa yang cukup bugar. Kurang cocok untuk lansia dan anak kecil.',
      steps: [[0, 'Kumpul dan pengantar jalur'], [40, 'Berjalan menuju sungai'], [75, 'Menyeberang dan naik ke air terjun'], [110, 'Istirahat dan turun bersama']],
      ethics: ['Berjalan berkelompok dan ikuti pemandu', 'Bawa pulang sampahmu', 'Pulang sebelum gelap'],
      bring: ['Sepatu trekking anti-selip', 'Bekal makan dan minum', 'Baju ganti'],
      meet: 'Air Terjun Yeh Labuh, Desa Selumbung', contrib: 'Sebagian hasil dipakai untuk merawat jalur dan jembatan. Informasi dari host.'
    },
    {
      id: 'menenun', name: 'Belajar menenun dan memanen madu bersama warga', short: 'Menenun dan madu', art: 'weave',
      cats: ['budaya', 'kerajinan'], region: 'Manggis', place: 'Selumbung, Manggis', lat: -8.49, lng: 115.532,
      dur: 3, times: ['09:00'], price: 100000, cap: 6, kid: true, outdoor: false, indoorOk: true,
      crowd: 0.2, moon: true,
      kw: ['tenun', 'menenun', 'madu', 'selumbung', 'manggis', 'karangasem', 'kerajinan', 'desa', 'budaya', 'lebah'],
      host: { name: 'Pokdarwis Desa Selumbung', ini: 'PS', lang: 'Indonesia, Bali' },
      story: 'Di Selumbung, tenun dan madu sama-sama dikerjakan warga di rumah mereka. Kamu belajar menenun beberapa baris di alat tenun, lalu ikut memanen madu bersama warga dengan perlengkapan pelindung. Tanyakan dulu soal sengatan lebah sebelum ikut.',
      hl: ['Mencoba menenun beberapa baris', 'Ikut memanen madu bersama warga', 'Mengobrol di rumah perajin'],
      fit: 'Cocok untuk keluarga, pelajar, dan rombongan sekolah.',
      steps: [[0, 'Menyapa perajin'], [45, 'Belajar menenun'], [90, 'Memanen madu dengan perlengkapan pelindung'], [135, 'Mencicipi madu dan ngobrol']],
      ethics: ['Minta izin sebelum memotret orang dan karya', 'Ikuti arahan saat dekat sarang lebah'],
      bring: ['Pakaian tertutup yang nyaman', 'Uang tunai bila ingin membeli madu atau kain'],
      meet: 'Rumah warga perajin, Desa Selumbung', contrib: 'Sebagian hasil masuk ke warga perajin. Informasi dari host.'
    },
    {
      id: 'cakepung', name: 'Menonton pertunjukan Cakepung', short: 'Pertunjukan Cakepung', art: 'canang',
      cats: ['budaya'], region: 'Bebandem', place: 'Budakeling, Bebandem', lat: -8.452, lng: 115.565,
      dur: 2, times: ['19:00'], price: 150000, cap: 15, kid: true, outdoor: false, indoorOk: true,
      crowd: 0.2, moon: true, festival: true,
      kw: ['cakepung', 'pertunjukan', 'seni', 'sanggar', 'budakeling', 'bebandem', 'karangasem', 'budaya', 'gamelan', 'musik'],
      host: { name: 'Sanggar Seni Citta Wistara', ini: 'SC', lang: 'Indonesia, Bali' },
      story: 'Cakepung adalah seni vokal khas Karangasem yang diiringi rebab, suling, dan gamelan. Sanggar di Budakeling pernah mementaskannya di Pesta Kesenian Bali. Kamu menonton dari dekat, lalu mengobrol dengan para penampil tentang syair dan ceritanya.',
      hl: ['Menonton Cakepung langsung dari penampilnya', 'Mendengar rebab, suling, dan gamelan dari dekat', 'Mengobrol dengan para penampil'],
      fit: 'Cocok untuk semua umur dan penikmat seni pertunjukan.',
      steps: [[0, 'Sambutan dan pengantar singkat'], [40, 'Pertunjukan Cakepung'], [80, 'Ngobrol bersama penampil']],
      ethics: ['Berpakaian sopan', 'Pakai kain dan selendang bila pentas di area pura', 'Minta izin sebelum merekam'],
      bring: ['Pakaian sopan', 'Kain dan selendang bila punya'],
      meet: 'Desa Budakeling, Bebandem', contrib: 'Honor penampil dan perawatan alat musik sanggar. Informasi dari host.'
    },
    {
      id: 'lontar', name: 'Belajar membaca dan menulis lontar', short: 'Belajar lontar', art: 'weave',
      cats: ['budaya', 'kerajinan'], region: 'Karangasem', place: 'Dukuh Penaban, Karangasem', lat: -8.44, lng: 115.61,
      dur: 2, times: ['09:00', '13:30'], price: 50000, cap: 15, kid: true, outdoor: false, indoorOk: true,
      crowd: 0.25, moon: false,
      kw: ['lontar', 'menulis', 'membaca', 'museum', 'dukuh penaban', 'karangasem', 'budaya', 'aksara', 'kerajinan'],
      host: { name: 'Pokdarwis Desa Wisata Dukuh Penaban', ini: 'PD', lang: 'Indonesia, Bali' },
      story: 'Museum Pustaka Lontar di Dukuh Penaban adalah museum lontar pertama yang dibangun desa adat. Pemandu mengajarimu membaca aksara Bali di daun lontar, lalu kamu menulis namamu dengan pengrupak. Semua alat dan daun lontar disediakan.',
      hl: ['Belajar membaca lontar bersama pemandu', 'Menulis di daun lontar dengan pengrupak', 'Mengunjungi museum yang dibangun desa adat'],
      fit: 'Cocok untuk semua umur, pelajar, peneliti, dan rombongan.',
      steps: [[0, 'Sambutan dan keliling museum'], [45, 'Belajar membaca lontar'], [90, 'Menulis di daun lontar'], [135, 'Membawa pulang hasil tulisanmu']],
      ethics: ['Ikuti arahan pemandu saat memegang lontar', 'Hati-hati memakai pisau pengrupak'],
      bring: ['Tidak perlu alat khusus', 'Uang tunai untuk donasi museum'],
      meet: 'Museum Pustaka Lontar, Dukuh Penaban', contrib: 'Donasi dan hasil kegiatan dipakai merawat koleksi lontar. Informasi dari host.'
    },
    {
      id: 'jongkok', name: 'Trekking sawah ke puncak Bukit Jongkok', short: 'Bukit Jongkok', art: 'terrace',
      cats: ['sawah', 'hutan'], region: 'Karangasem', place: 'Dukuh Penaban, Karangasem', lat: -8.436, lng: 115.604,
      dur: 3, times: ['06:30'], price: 150000, cap: 8, kid: false, outdoor: true, indoorOk: false,
      crowd: 0.2, moon: false,
      kw: ['trekking', 'sawah', 'bukit jongkok', 'dukuh penaban', 'karangasem', 'jalan kaki', 'gunung agung', 'pemandangan', 'alam'],
      host: { name: 'Pokdarwis Desa Wisata Dukuh Penaban', ini: 'PD', lang: 'Indonesia, Bali' },
      story: 'Jalurnya melewati sawah menuju puncak Bukit Jongkok, dengan pemandangan pesisir dan Gunung Agung. Ada pilihan jarak dekat dan jarak panjang. Kamu bisa menutup hari dengan makan lawar don jepun di desa.',
      hl: ['Berjalan melewati sawah menuju puncak bukit', 'Pemandangan pesisir dan Gunung Agung', 'Pilihan jarak dekat atau panjang'],
      fit: 'Cocok untuk remaja dan dewasa yang suka berjalan kaki.',
      steps: [[0, 'Kumpul dan pengantar jalur'], [50, 'Berjalan melewati sawah'], [105, 'Sampai di puncak dan istirahat'], [160, 'Turun dan makan bersama']],
      ethics: ['Hormati sawah dan pura yang dilewati', 'Bawa pulang sampahmu'],
      bring: ['Sepatu jalan', 'Topi', 'Air minum'],
      meet: 'Area Museum Pustaka Lontar, Dukuh Penaban', contrib: 'Sebagian hasil masuk ke kas desa wisata. Informasi dari host.'
    },
    {
      id: 'sangkan', name: 'Trekking dan swing di Sangkan Gunung', short: 'Trekking Sangkan Gunung', art: 'mangrove',
      cats: ['hutan'], region: 'Sidemen', place: 'Sangkan Gunung, Sidemen', lat: -8.458, lng: 115.475,
      dur: 1.5, times: ['08:00', '15:30'], price: 50000, cap: 15, kid: true, outdoor: true, indoorOk: false,
      crowd: 0.35, moon: false,
      kw: ['trekking', 'swing', 'sangkan gunung', 'sidemen', 'karangasem', 'hutan', 'keluarga', 'spot foto', 'alam'],
      host: { name: 'Pengelola Desa Wisata Sangkan Gunung', ini: 'SG', lang: 'Indonesia, Bali' },
      story: 'Desa Wisata Sangkan Gunung punya tiga jalur trekking: pendek sekitar 30 menit, menengah 40 menit, dan panjang sekitar satu jam. Cocok untuk pemula. Ada juga ayunan dan spot foto, jadi tanyakan standar pengamannya sebelum mencoba.',
      hl: ['Tiga jalur trekking untuk semua tingkat', 'Ayunan dan spot foto di tengah alam', 'Kuliner dan fasilitas desa wisata'],
      fit: 'Cocok untuk keluarga dan pemula.',
      steps: [[0, 'Kumpul di Br. Dinas Luah'], [30, 'Pilih jalur dan mulai trekking'], [60, 'Mencoba ayunan dan foto'], [90, 'Makan atau minum di warung desa']],
      ethics: ['Tanyakan standar pengaman sebelum memakai ayunan', 'Bawa pulang sampahmu'],
      bring: ['Sepatu nyaman', 'Air minum', 'Topi'],
      meet: 'Br. Dinas Luah, Desa Sangkan Gunung', contrib: 'Sebagian hasil masuk ke pengelola desa wisata. Informasi dari host.'
    },
    {
      id: 'salak', name: 'Belajar olahan salak bersama Kelompok Wanita Tani', short: 'Olahan salak', art: 'coffee',
      cats: ['kuliner'], region: 'Selat', place: 'Duda Timur, Selat', lat: -8.435, lng: 115.465,
      dur: 2, times: ['09:00'], price: 75000, cap: 10, kid: true, outdoor: false, indoorOk: true,
      crowd: 0.2, moon: false,
      kw: ['salak', 'olahan', 'dodol', 'manisan', 'kuliner', 'duda timur', 'selat', 'karangasem', 'wanita tani', 'pasar'],
      host: { name: 'Pokdarwis Desa Duda Timur', ini: 'PT', lang: 'Indonesia, Bali' },
      story: 'Salak adalah buah khas Karangasem. Di Duda Timur, Kelompok Wanita Tani mengolahnya jadi dodol, manisan, pia, dan nastar di rumah produksi mereka. Kamu ikut mencoba mengolah, lalu bisa mampir ke Pasar Tradisional Pesangkan.',
      hl: ['Melihat salak diolah jadi dodol dan manisan', 'Ikut mencoba membuat olahan salak', 'Mampir ke pasar tradisional terdekat'],
      fit: 'Cocok untuk keluarga, pelajar, dan pecinta kuliner.',
      steps: [[0, 'Sambutan di rumah produksi'], [40, 'Melihat dan mencoba mengolah salak'], [75, 'Mencicipi hasilnya'], [110, 'Mampir ke Pasar Pesangkan']],
      ethics: ['Cuci tangan sebelum ikut mengolah', 'Minta izin sebelum memotret anggota kelompok'],
      bring: ['Celemek bila punya', 'Uang tunai untuk membeli oleh-oleh'],
      meet: 'Desa Duda Timur, Kecamatan Selat', contrib: 'Sebagian hasil masuk ke kas Kelompok Wanita Tani. Informasi dari host.'
    },
    {
      id: 'muntigunung', name: 'Trekking Muntigunung dipandu warga dan kunjungan workshop', short: 'Trekking Muntigunung', art: 'bird',
      cats: ['hutan'], region: 'Kubu', place: 'Muntigunung, Kubu', lat: -8.285, lng: 115.575,
      dur: 10.5, times: ['06:00'], price: 1500000, cap: 4, kid: false, outdoor: true, indoorOk: false,
      crowd: 0.15, moon: false,
      kw: ['trekking', 'muntigunung', 'kubu', 'karangasem', 'dipandu warga', 'workshop', 'hutan', 'sehari', 'alam'],
      host: { name: 'Muntigunung Community Development Program', ini: 'MC', lang: 'Indonesia, Bali, English' },
      story: 'Trekking sekitar tiga jam dipandu warga Muntigunung, kebanyakan menurun, lalu kunjungan ke workshop komunitas. Paket sehari penuh sudah termasuk sarapan, makan siang, minuman, camilan, dan transport. Jalurnya curam dan licin, jadi butuh fisik cukup bugar.',
      hl: ['Trekking sekitar tiga jam bersama pemandu warga', 'Kunjungan ke workshop komunitas', 'Sarapan, makan siang, dan transport sudah termasuk'],
      fit: 'Untuk peserta yang cukup bugar. Minimal usia 8 sampai 10 tahun menurut operator.',
      steps: [[0, 'Dijemput di hotel atau villa'], [40, 'Sarapan dan pengantar jalur'], [90, 'Trekking bersama pemandu warga'], [360, 'Makan siang dan kunjungan workshop']],
      ethics: ['Ikuti pemandu di jalur curam', 'Bawa pulang sampahmu'],
      bring: ['Sepatu olahraga atau hiking', 'Sweater tipis', 'Topi dan tabir surya', 'Baju renang dan handuk'],
      meet: 'Dijemput di hotel atau villa', contrib: 'Sebagian hasil masuk ke program pengembangan komunitas. Informasi dari host.'
    },
    {
      id: 'saptatirtha', name: 'Wisata spiritual ke Pura Bukit dan mata air Sapta Tirtha', short: 'Pura Bukit dan Sapta Tirtha', art: 'waterfall',
      cats: ['budaya'], region: 'Karangasem', place: 'Desa Bukit, Karangasem', lat: -8.42, lng: 115.6,
      dur: 2, times: ['07:00'], price: 50000, cap: 10, kid: true, outdoor: true, indoorOk: false,
      crowd: 0.15, moon: true, festival: true,
      kw: ['spiritual', 'pura bukit', 'sapta tirtha', 'mata air', 'desa bukit', 'karangasem', 'pura', 'budaya', 'suci', 'melukat'],
      host: { name: 'Pokdarwis Desa Bukit', ini: 'PB', lang: 'Indonesia, Bali' },
      story: 'Desa Bukit mengembangkan wisata spiritual dengan Pura Bukit, beberapa pura lain, dan mata air Sapta Tirtha. Karena ini tempat suci, kamu berpakaian adat dan mengikuti arahan pemandu serta Bendesa Adat soal aturan masuk.',
      hl: ['Mengunjungi Pura Bukit bersama pemandu desa', 'Melihat mata air Sapta Tirtha', 'Belajar aturan adat saat memasuki pura'],
      fit: 'Cocok untuk wisatawan yang berminat pada budaya dan spiritualitas.',
      steps: [[0, 'Kumpul dan penjelasan aturan adat'], [45, 'Berjalan ke Pura Bukit'], [90, 'Ke mata air Sapta Tirtha'], [135, 'Ngobrol dan minum teh bersama']],
      ethics: ['Pakai kain dan selendang', 'Perempuan yang sedang haid tidak masuk pura', 'Ikuti arahan pemandu, jangan masuk area yang tertutup'],
      bring: ['Kain dan selendang bila punya', 'Pakaian sopan'],
      meet: 'Pura Bukit, Desa Bukit', contrib: 'Sebagian hasil masuk ke kas desa adat. Informasi dari host.'
    },
    /* ---- Kegiatan contoh karangan tim (demo: true), hanya pengisi katalog. Bukan data riset. ---- */
    {
      id: 'tukik', demo: true, name: 'Kelas tukik: pembibitan penyu', short: 'Kelas tukik', art: 'turtle',
      cats: ['laut', 'satwa'], region: 'Selatan', place: 'Serangan, Denpasar', lat: -8.7295, lng: 115.225,
      dur: 2.5, times: ['08:30', '15:30'], price: 175000, cap: 12, kid: true, outdoor: true, indoorOk: false,
      crowd: 0.15, moon: false,
      kw: ['penyu', 'tukik', 'laut', 'pantai', 'satwa', 'hewan', 'konservasi'],
      host: { name: 'Komunitas Pesisir Serangan', ini: 'KP', lang: 'Indonesia, Bali, English' },
      story: 'Pagi atau sore hari di pantai Serangan, kamu berdiri di samping bak pembibitan tempat telur penyu dijaga warga sampai menetas. Petugas mengajari cara membaca tanda sarang dan mencatat data tukik. Saat matahari mulai condong, tukik yang sudah siap dilepas ke laut, dan kamu ikut mengantar mereka ke ombak pertamanya.',
      hl: ['Melihat telur dan tukik dari dekat bersama petugas konservasi', 'Ikut mencatat data tukik yang dipakai untuk pemantauan', 'Melepas tukik ke laut pada kesempatan yang tepat'],
      fit: 'Cocok untuk keluarga dengan anak, pencinta satwa, dan siapa pun yang penasaran cara pantai Bali dijaga.',
      steps: [[0, 'Kumpul dan kenalan dengan pengelola'], [30, 'Mengenal jenis penyu dan siklus hidupnya'], [75, 'Melihat bak pembibitan dan telur'], [120, 'Melepas tukik ke laut, jika ada yang menetas'], [150, 'Ngobrol dan minum teh bersama']],
      ethics: ['Jangan memegang telur atau tukik tanpa arahan pemandu', 'Tanpa lampu kilat dan tanpa plastik sekali pakai', 'Berpakaian sopan jika melewati area pura'],
      bring: ['Topi dan tabir surya', 'Sandal yang mudah dilepas', 'Botol minum isi ulang', 'Pakaian yang boleh basah'],
      meet: 'Pusat pembibitan penyu, Serangan', contrib: 'Sebagian hasil kegiatan dipakai untuk pakan dan perawatan tukik. Informasi dari host.'
    },
    {
      id: 'mangrove', demo: true, name: 'Menanam mangrove dan susur hutan bakau', short: 'Menanam mangrove', art: 'mangrove',
      cats: ['laut', 'hutan'], region: 'Selatan', place: 'Tahura Ngurah Rai, Denpasar', lat: -8.7747, lng: 115.2036,
      dur: 3, times: ['07:30'], price: 150000, cap: 14, kid: true, outdoor: true, indoorOk: false,
      crowd: 0.4, moon: false,
      kw: ['mangrove', 'bakau', 'hutan', 'tanam', 'pohon', 'burung', 'kayak'],
      host: { name: 'Kelompok Tani Bakau Pesanggaran', ini: 'KB', lang: 'Indonesia, English' },
      story: 'Jalur kayu membawa kamu masuk ke tengah hutan bakau yang rapat, tempat kepiting, burung, dan ikan kecil berlindung. Pemandu menjelaskan mengapa akar mangrove menahan abrasi, lalu kamu menanam satu bibit yang kabarnya bisa dipantau lewat Paspor Alam.',
      hl: ['Berjalan di jalur kayu di antara akar bakau', 'Menanam bibit mangrove dengan tangan sendiri', 'Mengamati burung dan biota rawa saat air surut'],
      fit: 'Cocok untuk pencinta alam yang suka suasana tenang dan ingin meninggalkan sesuatu yang tumbuh.',
      steps: [[0, 'Kumpul dan pengantar singkat'], [30, 'Susur jalur kayu hutan bakau'], [90, 'Menanam bibit mangrove'], [150, 'Minum kelapa muda bersama kelompok tani']],
      ethics: ['Tetap di jalur kayu', 'Bawa pulang sampahmu', 'Jangan memetik propagul yang belum ditanam'],
      bring: ['Sepatu tertutup yang boleh kotor', 'Obat anti nyamuk', 'Topi'],
      meet: 'Gerbang Tahura Ngurah Rai, jalur timur', contrib: 'Biaya bibit dan perawatan ditanggung dari tiket. Informasi dari host.'
    },
    {
      id: 'subak', demo: true, name: 'Jalan pagi di sawah bertingkat dan belajar subak', short: 'Jalan pagi di subak', art: 'terrace',
      cats: ['sawah', 'budaya'], region: 'Tengah', place: 'Jatiluwih, Tabanan', lat: -8.3688, lng: 115.1294,
      dur: 3, times: ['07:00'], price: 220000, cap: 12, kid: true, outdoor: true, indoorOk: false,
      crowd: 0.45, moon: true,
      kw: ['subak', 'sawah', 'padi', 'jatiluwih', 'tabanan', 'jalan', 'trekking', 'pagi', 'air', 'irigasi'],
      host: { name: 'Pekaseh Subak Jatiluwih', ini: 'PS', lang: 'Indonesia, Bali, English' },
      story: 'Kamu berjalan pelan di antara petak sawah bertingkat saat kabut pagi masih menggantung. Pemandu desa menunjukkan bagaimana subak membagi air secara adil dari hulu ke hilir, sampai ke pura kecil tempat petani berterima kasih kepada air. Perjalanan ditutup dengan kopi dan jajanan pasar di rumah petani.',
      hl: ['Menyusuri pematang sawah saat udara masih sejuk', 'Memahami sistem subak, warisan dunia yang masih hidup', 'Sarapan atau ngopi di rumah petani'],
      fit: 'Cocok untuk pejalan yang suka suasana pagi, fotografer, dan orang tua yang ingin mengenalkan sawah kepada anak.',
      steps: [[0, 'Kumpul, minum teh jahe'], [20, 'Jalan menyusuri pematang'], [90, 'Belajar pembagian air dan pura subak'], [150, 'Sarapan nasi jinggo di warung desa']],
      ethics: ['Jalan di pematang yang ditunjuk pemandu', 'Jangan memetik padi', 'Berpakaian sopan saat melewati pura subak'],
      bring: ['Sepatu nyaman', 'Jaket tipis', 'Topi dan tabir surya'],
      meet: 'Warung Pekaseh, Jatiluwih', contrib: 'Sebagian dipakai untuk perawatan saluran subak. Informasi dari host.'
    },
    {
      id: 'burung', demo: true, name: 'Pengamatan burung pagi di Bali Barat', short: 'Pengamat burung', art: 'bird',
      cats: ['satwa', 'hutan'], region: 'Barat', place: 'Sumberklampok, Buleleng', lat: -8.17, lng: 114.53,
      dur: 4, times: ['05:30'], price: 350000, cap: 8, kid: false, outdoor: true, indoorOk: false,
      crowd: 0.05, moon: false,
      kw: ['burung', 'birdwatching', 'bird', 'hutan', 'barat', 'jalak', 'satwa', 'ebird'],
      host: { name: 'Pemandu Burung Sumberklampok', ini: 'PB', lang: 'Indonesia, English' },
      story: 'Sebelum matahari tinggi, kamu masuk ke tepi hutan Bali Barat bersama pemandu yang hafal suara tiap burung. Teropong dipinjamkan, langkah dibuat pelan, dan setiap temuan dicatat. Dengan sedikit keberuntungan, kamu melihat jalak bali di habitat aslinya.',
      hl: ['Mengenali burung dari suaranya bersama pemandu lokal', 'Meminjam teropong dan buku panduan lapangan', 'Mengirim catatan temuan ke eBird atas namamu'],
      fit: 'Cocok untuk pengamat burung, pemula maupun berpengalaman, dan siapa pun yang mencari ketenangan serta tidak keberatan bangun pagi.',
      steps: [[0, 'Kumpul sebelum matahari terbit'], [20, 'Jalan senyap menyusuri tepi hutan'], [120, 'Mencatat temuan bersama pemandu'], [200, 'Sarapan dan kopi lokal']],
      ethics: ['Bicara pelan dan jangan memanggil burung dengan rekaman', 'Pakai pakaian warna netral', 'Jangan memberi makan satwa'],
      bring: ['Teropong bila punya', 'Sepatu tertutup', 'Obat anti nyamuk'],
      meet: 'Pos jaga Sumberklampok', contrib: 'Honor pemandu dan patroli hutan desa. Informasi dari host.'
    },
    {
      id: 'airterjun', demo: true, name: 'Trekking pagi ke air terjun tersembunyi', short: 'Air terjun tersembunyi', art: 'waterfall',
      cats: ['hutan', 'air'], region: 'Utara', place: 'Munduk, Buleleng', lat: -8.272, lng: 115.083,
      dur: 4, times: ['07:30'], price: 260000, cap: 10, kid: false, outdoor: true, indoorOk: false,
      crowd: 0.35, moon: false,
      kw: ['air terjun', 'waterfall', 'trekking', 'hutan', 'munduk', 'hiking', 'jalan kaki'],
      host: { name: 'Pemuda Desa Munduk', ini: 'PM', lang: 'Indonesia, English' },
      story: 'Jalur tanah menurun melewati kebun kopi dan cengkeh, lalu hutan lembap yang suaranya makin riuh oleh air. Di ujung jalan menunggu air terjun yang jarang masuk brosur wisata. Kamu bisa berenang sebentar, lalu naik kembali dan menutup pagi dengan kopi hangat di rumah warga.',
      hl: ['Trekking menurun melewati kebun kopi dan cengkeh', 'Berenang di kolam air terjun yang sepi', 'Kopi hangat di rumah warga sebelum pulang'],
      fit: 'Cocok untuk pejalan yang cukup bugar dan suka alam terbuka. Kurang cocok untuk anak kecil.',
      steps: [[0, 'Kumpul dan pemanasan ringan'], [20, 'Turun lewat kebun kopi dan cengkeh'], [100, 'Istirahat dan berenang di air terjun'], [180, 'Naik kembali, minum kopi di rumah warga']],
      ethics: ['Tidak memakai sabun atau sampo di air', 'Jangan meninggalkan sampah', 'Ikuti jalur dan arahan pemandu'],
      bring: ['Sepatu trekking', 'Baju ganti', 'Jas hujan tipis'],
      meet: 'Balai desa Munduk', contrib: 'Dana kas pemuda desa untuk perawatan jalur. Informasi dari host.'
    },
    {
      id: 'canang', demo: true, name: 'Membuat canang dan belajar upakara', short: 'Membuat canang', art: 'canang',
      cats: ['budaya'], region: 'Tengah', place: 'Ubud, Gianyar', lat: -8.5069, lng: 115.2625,
      dur: 2, times: ['14:00', '09:30'], price: 200000, cap: 10, kid: true, outdoor: false, indoorOk: true,
      crowd: 0.5, moon: true,
      kw: ['canang', 'sesaji', 'upakara', 'upacara', 'budaya', 'ubud', 'bunga', 'adat', 'hindu'],
      host: { name: 'Ibu Ketut Sari (Griya Bunga Ubud)', ini: 'KS', lang: 'Indonesia, Bali, English' },
      story: 'Kamu duduk bersila bersama ibu-ibu pembuat sesaji, belajar melipat janur dan menata bunga menurut warna dan arahnya. Setiap bunga punya tempat dan makna. Setelah canang buatan kamu jadi, kamu ikut menghaturkannya di pelinggih keluarga, seperti yang dilakukan warga setiap pagi.',
      hl: ['Merangkai canang dari janur dan bunga segar', 'Mengenal makna warna dan arah bunga', 'Ikut menghaturkan canang di pelinggih keluarga'],
      fit: 'Cocok untuk siapa pun yang ingin memahami keseharian orang Bali, termasuk keluarga dengan anak.',
      steps: [[0, 'Kenalan dan minum teh'], [20, 'Belajar makna bunga dan arah'], [45, 'Merangkai canang sendiri'], [100, 'Ikut menghaturkan canang di pelinggih keluarga']],
      ethics: ['Perempuan yang sedang datang bulan tidak diminta ikut menghaturkan', 'Pakai kain dan selendang', 'Jangan melangkahi canang'],
      bring: ['Pakaian sopan', 'Kain bila punya, bisa dipinjam'],
      meet: 'Griya Bunga, Jalan Hanoman, Ubud', contrib: 'Honor pembuat sesaji dan kas banjar. Informasi dari host.'
    },
    {
      id: 'tenun', demo: true, name: 'Mengenal tenun gringsing di Tenganan', short: 'Tenun gringsing', art: 'weave',
      cats: ['budaya', 'kerajinan'], region: 'Timur', place: 'Tenganan, Karangasem', lat: -8.497, lng: 115.565,
      dur: 2, times: ['09:00', '14:00'], price: 230000, cap: 8, kid: true, outdoor: false, indoorOk: true,
      crowd: 0.2, moon: true, festival: true,
      kw: ['tenun', 'gringsing', 'tenganan', 'kain', 'kerajinan', 'karangasem', 'budaya', 'timur', 'desa'],
      host: { name: 'Kelompok Penenun Tenganan Pegringsingan', ini: 'TP', lang: 'Indonesia, Bali' },
      story: 'Di Tenganan, desa Bali Aga, kain gringsing dikerjakan dengan ikat ganda, teknik yang di Indonesia hanya hidup di sini. Satu lembar bisa memakan waktu bertahun-tahun. Kamu melihat pewarnaan alami, belajar dari penenun, dan mencoba menenun beberapa baris dengan tangan sendiri.',
      hl: ['Melihat ikat ganda dikerjakan langsung oleh penenun', 'Mengenal pewarna alami dari akar dan kulit kayu', 'Mencoba menenun beberapa baris di alat tenun asli'],
      fit: 'Cocok untuk pencinta kriya, tekstil, dan sejarah. Berlangsung di dalam ruangan, jadi aman saat hujan.',
      steps: [[0, 'Menyapa penenun dan melihat pewarnaan alami'], [30, 'Belajar pola dan makna gringsing'], [60, 'Mencoba menenun'], [105, 'Jalan keliling desa bersama pemandu']],
      ethics: ['Minta izin sebelum memotret orang dan karya', 'Pakai kain dan selendang', 'Jangan memegang kain yang sedang dikerjakan'],
      bring: ['Pakaian sopan', 'Uang tunai untuk membeli kain bila mau'],
      meet: 'Gerbang desa Tenganan', contrib: 'Sebagian hasil masuk ke kas kelompok penenun. Informasi dari host.'
    },
    {
      id: 'masak', demo: true, name: 'Masak bumbu Bali bersama petani', short: 'Masak bumbu Bali', art: 'cooking',
      cats: ['kuliner', 'budaya'], region: 'Tengah', place: 'Pejeng, Gianyar', lat: -8.51, lng: 115.29,
      dur: 3, times: ['10:00'], price: 190000, cap: 10, kid: true, outdoor: false, indoorOk: true,
      crowd: 0.35, moon: false,
      kw: ['masak', 'kuliner', 'makan', 'bumbu', 'petani', 'kebun', 'lawar', 'cooking'],
      host: { name: 'Pak Made Rai (Kebun Bumbu Pejeng)', ini: 'MR', lang: 'Indonesia, English' },
      story: 'Pagi dimulai di kebun, memetik jahe, kunyit, dan serai yang akan jadi bumbu. Kamu menumbuk base genep di lesung batu, lalu memasak makan siang bersama keluarga petani. Semua bahan datang dari kebun yang sama, dan semua hidangan dimakan bersama di akhir kelas.',
      hl: ['Memetik bumbu langsung dari kebun', 'Menumbuk base genep dengan lesung batu', 'Makan siang bersama keluarga petani dari hasil masakan sendiri'],
      fit: 'Cocok untuk penyuka kuliner, pasangan, dan keluarga. Menu vegetarian bisa disiapkan, cukup beri tahu host.',
      steps: [[0, 'Keliling kebun bumbu'], [45, 'Menumbuk base genep'], [75, 'Memasak bersama'], [140, 'Makan siang di balai bambu']],
      ethics: ['Cuci tangan sebelum masuk dapur', 'Beri tahu host soal alergi', 'Habiskan makananmu'],
      bring: ['Perut lapar', 'Celemek dipinjamkan'],
      meet: 'Kebun Bumbu Pejeng', contrib: 'Bahan dibeli dari petani sekitar. Informasi dari host.'
    },
    {
      id: 'bebek', demo: true, name: 'Melepas bebek di sawah bersama petani', short: 'Bebek di sawah', art: 'duck',
      cats: ['sawah', 'satwa'], region: 'Tengah', place: 'Penebel, Tabanan', lat: -8.43, lng: 115.12,
      dur: 2, times: ['15:30'], price: 95000, cap: 14, kid: true, outdoor: true, indoorOk: false,
      crowd: 0.1, moon: false,
      kw: ['bebek', 'sawah', 'petani', 'anak', 'tabanan', 'penebel', 'sore', 'murah'],
      host: { name: 'Kelompok Tani Penebel', ini: 'KT', lang: 'Indonesia, Bali' },
      story: 'Menjelang sore, kamu ikut petani Penebel menggiring bebek ke sawah yang baru dipanen. Bebek memakan hama dan menyuburkan tanah, sehingga petani tidak memerlukan pestisida. Kamu belajar mengapa padi dan bebek saling menjaga, lalu duduk di saung menikmati teh dan langit sore.',
      hl: ['Menggiring bebek di sawah bersama petani', 'Belajar pertanian tanpa pestisida dari praktiknya', 'Duduk di saung sambil menunggu senja'],
      fit: 'Cocok untuk keluarga dengan anak dan siapa pun yang ingin sore yang santai di sawah.',
      steps: [[0, 'Kumpul di pematang'], [20, 'Menggiring bebek ke petak sawah'], [60, 'Belajar pertanian terpadu'], [100, 'Minum wedang jahe sambil lihat matahari turun']],
      ethics: ['Jangan mengejar bebek', 'Jangan masuk ke petak yang tidak dibuka petani', 'Bawa pulang sampah'],
      bring: ['Sandal atau sepatu yang boleh kotor', 'Topi'],
      meet: 'Pondok tani Penebel', contrib: 'Seluruh biaya untuk kelompok tani. Informasi dari host.'
    },
    {
      id: 'kopi', demo: true, name: 'Petik dan sangrai kopi di kebun Kintamani', short: 'Kopi Kintamani', art: 'coffee',
      cats: ['kuliner', 'hutan'], region: 'Timur', place: 'Kintamani, Bangli', lat: -8.25, lng: 115.35,
      dur: 3, times: ['08:30'], price: 160000, cap: 12, kid: true, outdoor: true, indoorOk: false,
      crowd: 0.3, moon: false,
      kw: ['kopi', 'kintamani', 'kebun', 'sangrai', 'coffee', 'kuliner', 'dingin'],
      host: { name: 'Subak Abian Kintamani', ini: 'SA', lang: 'Indonesia, English' },
      story: 'Di kebun jeruk dan kopi di lereng Kintamani, kamu memetik buah kopi yang sudah merah, menjemurnya, lalu menyangrai di tungku tanah liat. Hasilnya diseduh langsung dan dinikmati sambil memandang kaldera Batur dari kejauhan.',
      hl: ['Memetik kopi merah dari pohon', 'Menyangrai di tungku tanah liat secara tradisional', 'Menyeduh dan menikmati kopi buatan sendiri'],
      fit: 'Cocok untuk pencinta kopi dan pejalan yang mencari udara sejuk dataran tinggi.',
      steps: [[0, 'Pengantar kebun tumpang sari'], [30, 'Memetik kopi'], [90, 'Menyangrai dan menumbuk'], [140, 'Menyeduh dan mencicip']],
      ethics: ['Petik hanya buah yang merah', 'Jangan menginjak tanaman muda'],
      bring: ['Jaket (dingin di pagi hari)', 'Sepatu tertutup'],
      meet: 'Pondok Subak Abian', contrib: 'Sebagian dipakai untuk pembibitan kopi anak muda desa. Informasi dari host.'
    },
    {
      id: 'gerabah', demo: true, name: 'Membuat gerabah di desa Pejaten', short: 'Membuat gerabah', art: 'pottery',
      cats: ['kerajinan', 'budaya'], region: 'Tengah', place: 'Pejaten, Tabanan', lat: -8.595, lng: 115.125,
      dur: 2.5, times: ['10:00', '14:00'], price: 210000, cap: 8, kid: true, outdoor: false, indoorOk: true,
      crowd: 0.15, moon: false,
      kw: ['gerabah', 'keramik', 'tanah liat', 'pejaten', 'kerajinan', 'tabanan', 'membuat'],
      host: { name: 'Pengrajin Gerabah Pejaten', ini: 'PG', lang: 'Indonesia, English' },
      story: 'Di bengkel keluarga pengrajin yang sudah turun-temurun, kamu mengolah tanah liat, memusingnya di meja putar, dan membentuk mangkuk pertamamu. Pengrajin membimbing dengan sabar. Karya kamu dibakar lalu dapat diambil atau dikirim setelah matang.',
      hl: ['Membentuk mangkuk di meja putar bersama pengrajin', 'Mengenal tanah liat dan tungku pembakaran tradisional', 'Membawa pulang karya sendiri'],
      fit: 'Cocok untuk pencinta kerajinan tangan, pasangan, dan keluarga dengan anak yang sudah cukup besar.',
      steps: [[0, 'Mengenal tanah liat dan alat'], [30, 'Membentuk di meja putar'], [90, 'Menghias dan menandai karya'], [135, 'Teh dan kue lokal']],
      ethics: ['Minta izin sebelum memotret bengkel', 'Pakai pakaian yang boleh kotor'],
      bring: ['Pakaian yang boleh kotor'],
      meet: 'Bengkel gerabah Pejaten', contrib: 'Honor pengrajin dan bahan tanah liat. Informasi dari host.'
    },
    {
      id: 'karang', demo: true, name: 'Menanam karang bersama nelayan Pemuteran', short: 'Menanam karang', art: 'coral',
      cats: ['laut'], region: 'Barat', place: 'Pemuteran, Buleleng', lat: -8.15, lng: 114.66,
      dur: 3.5, times: ['08:00'], price: 285000, cap: 8, kid: false, outdoor: true, indoorOk: false,
      crowd: 0.25, moon: false,
      kw: ['karang', 'snorkel', 'laut', 'terumbu', 'pemuteran', 'nelayan', 'selam', 'coral'],
      host: { name: 'Kelompok Nelayan Pelindung Karang', ini: 'NK', lang: 'Indonesia, English' },
      story: 'Dengan perahu kecil nelayan Pemuteran, kamu menuju lokasi pembibitan karang. Di darat, kamu merangkai fragmen karang pada rangka. Lalu kamu snorkeling untuk menanamnya di dasar laut. Hari ditutup dengan ikan bakar bersama para nelayan.',
      hl: ['Merangkai fragmen karang di rangka bibit', 'Snorkeling dan menanam karang di dasar laut', 'Makan ikan bakar bersama nelayan'],
      fit: 'Cocok untuk pencinta laut yang nyaman berenang. Alat snorkel dipinjamkan.',
      steps: [[0, 'Briefing dan pinjam alat snorkel'], [40, 'Merangkai fragmen karang'], [90, 'Snorkeling dan menanam karang'], [180, 'Makan ikan bakar bersama nelayan']],
      ethics: ['Jangan menyentuh karang hidup', 'Pakai tabir surya ramah karang', 'Ikuti arahan pemandu'],
      bring: ['Baju renang', 'Tabir surya ramah karang', 'Handuk'],
      meet: 'Pantai Pemuteran, pos nelayan', contrib: 'Biaya bibit dan perawatan rangka karang. Informasi dari host.'
    },
    {
      id: 'melukat', demo: true, name: 'Melukat di pura air suci Tampaksiring', short: 'Melukat di pura air', art: 'waterfall',
      cats: ['budaya', 'air'], region: 'Tengah', place: 'Tampaksiring, Gianyar', lat: -8.4153, lng: 115.3153,
      dur: 2.5, times: ['07:00'], price: 190000, cap: 8, kid: false, outdoor: true, indoorOk: false,
      crowd: 0.4, moon: true,
      kw: ['melukat', 'tirta', 'pura', 'air suci', 'pembersihan', 'budaya', 'tampaksiring', 'spiritual', 'hindu'],
      host: { name: 'Pemangku dan Pemuda Desa Manukaya', ini: 'PM', lang: 'Indonesia, Bali, English' },
      story: 'Melukat adalah pembersihan diri dengan air suci, dan di Tampaksiring prosesi ini sudah berlangsung berabad-abad. Sebelum pura ramai, pemandu desa mengantar kamu berpakaian adat, menyiapkan canang, dan menjelaskan urutan pancuran sebelum kamu mengikutinya dengan tenang. Kelompok sengaja dibatasi agar suasananya tetap khidmat.',
      hl: ['Mengenakan kain adat dan mengikuti urutan pancuran dengan panduan', 'Mengenal makna melukat langsung dari warga setempat', 'Kelompok kecil di pagi hari, sebelum pura ramai'],
      fit: 'Cocok untuk pengunjung yang ingin mengikuti tradisi dengan hormat. Ini bukan atraksi foto, jadi ponsel disimpan.',
      steps: [[0, 'Kumpul, berganti kain adat, dan menyiapkan canang'], [25, 'Penjelasan makna dan urutan pancuran'], [45, 'Melukat dengan arahan pemandu'], [120, 'Duduk tenang dan minum teh jahe di balai desa']],
      ethics: ['Pakai kain dan selendang yang dipinjamkan', 'Tidak memotret saat prosesi', 'Perempuan yang sedang datang bulan tidak ikut melukat', 'Ikuti arahan pemangku dan pemandu'],
      bring: ['Pakaian dalam renang atau baju ganti', 'Handuk kecil', 'Kantong kedap air untuk barang berharga'],
      meet: 'Parkiran desa, Manukaya, Tampaksiring', contrib: 'Dana kebersihan pura dan kas banjar. Informasi dari host.'
    },
    {
      id: 'topeng', demo: true, name: 'Belajar tari topeng bersama sanggar desa', short: 'Tari topeng', art: 'weave',
      cats: ['budaya', 'kerajinan'], region: 'Tengah', place: 'Mas, Gianyar', lat: -8.5736, lng: 115.2494,
      dur: 2.5, times: ['16:00'], price: 230000, cap: 10, kid: true, outdoor: false, indoorOk: true,
      crowd: 0.2, moon: true,
      kw: ['topeng', 'tari', 'menari', 'sanggar', 'budaya', 'mas', 'gianyar', 'seni', 'pertunjukan'],
      host: { name: 'Sanggar Tari Taman Mas', ini: 'ST', lang: 'Indonesia, Bali, English' },
      story: 'Di Mas, desa pengukir topeng, topeng bukan suvenir tetapi tokoh yang menari. Penari sanggar memperkenalkan karakter topeng, memperlihatkan cara memahat dan mengecatnya, lalu mengajari gerak dasar yang dipakai di pertunjukan. Sore ditutup dengan pementasan singkat oleh anak-anak sanggar.',
      hl: ['Memegang dan mencoba topeng pahatan lokal', 'Belajar gerak dasar tari topeng dari penari sanggar', 'Menonton pementasan singkat anak-anak desa'],
      fit: 'Cocok untuk pencinta seni pertunjukan, keluarga dengan anak, dan siapa pun yang ingin melihat budaya Bali yang masih hidup di desa.',
      steps: [[0, 'Sambutan dan pengenalan karakter topeng'], [30, 'Melihat pemahatan dan pengecatan topeng'], [75, 'Belajar gerak dasar bersama penari'], [130, 'Pementasan singkat dan foto bersama']],
      ethics: ['Jangan menaruh topeng di lantai', 'Minta izin sebelum memotret penari', 'Pakai pakaian sopan'],
      bring: ['Pakaian yang nyaman untuk bergerak', 'Kain bila punya, bisa dipinjam'],
      meet: 'Balai banjar, Mas, Ubud', contrib: 'Honor penari dan perawatan perlengkapan sanggar. Informasi dari host.'
    }
  ];
  const byId = Object.fromEntries(A.map((a) => [a.id, a]));

  /* ---------- kondisi tanggal (demo, deterministik) ---------- */
  const PURNAMA = ['2026-10-26', '2026-11-24', '2026-12-24', '2027-01-22'];
  const TILEM = ['2026-11-09', '2026-12-09', '2027-01-08'];
  const FESTIVAL = { '2026-11-21': 'Upacara desa' };

  function moonFor(iso) { return PURNAMA.includes(iso) ? 'purnama' : TILEM.includes(iso) ? 'tilem' : null; }
  function festivalFor(iso) { return FESTIVAL[iso] || null; }
  function weatherFor(iso) {
    const m = D.parse(iso).getMonth();
    const wet = (m >= 10 || m <= 2) ? 0.34 : 0.12;
    const r = hash('wx' + iso);
    let cond, rain, icon;
    if (r < wet) { cond = 'Hujan'; rain = 60 + Math.round(hash('r' + iso) * 30); icon = 'rain'; }
    else if (r < wet + 0.14) { cond = 'Mendung'; rain = 30 + Math.round(hash('r' + iso) * 20); icon = 'cloud'; }
    else if (r < wet + 0.38) { cond = 'Berawan'; rain = 10 + Math.round(hash('r' + iso) * 20); icon = 'cloudsun'; }
    else { cond = 'Cerah'; rain = Math.round(hash('r' + iso) * 14); icon = 'sun'; }
    return { cond, rain, icon, temp: 27 + Math.round(hash('t' + iso) * 4) };
  }
  function crowdFor(act, iso) {
    const dw = D.dow(iso);
    const bump = dw === 6 || dw === 0 ? 0.2 : dw === 5 ? 0.09 : 0;
    const v = act.crowd + bump + (hash(act.id + iso) - 0.5) * 0.24;
    return v < 0.34 ? 0 : v < 0.62 ? 1 : 2;
  }
  const CROWD_LABEL = ['Sepi', 'Sedang', 'Ramai'];
  function isClosed(act, iso, hostClosed) {
    const closed = hostClosed && hostClosed[act.id] && hostClosed[act.id].includes(iso);
    if (closed) return 'Ditutup host';
    const mn = moonFor(iso);
    if (mn && act.moon) return mn === 'purnama' ? 'Purnama, host tutup' : 'Tilem, host tutup';
    if (act.festival && festivalFor(iso)) return festivalFor(iso);
    return null;
  }
  function seatsLeft(act, iso, items) {
    const base = act.cap - Math.floor(hash('s' + act.id + iso) * (act.cap - 2));
    const mine = (items || []).filter((i) => i.actId === act.id && i.date === iso && i.status !== 'ditolak').reduce((s, i) => s + (i.people || 0), 0);
    return Math.max(0, base - mine);
  }
  /* skor kecocokan 0..1 antara kegiatan dan tanggal (cuaca + keramaian + tutup) */
  function dayScore(act, iso, hostClosed) {
    if (isClosed(act, iso, hostClosed)) return -1;
    const w = weatherFor(iso), c = crowdFor(act, iso);
    let s = 1 - c * 0.28;
    if (act.outdoor) s -= w.rain / 100 * 0.9; else s += w.rain > 55 ? 0.12 : 0;
    return s;
  }

  /* ---------- anggota demo ---------- */
  const COLORS = ['#626B2D', '#A3431D', '#A87B36', '#353D13', '#7B6A3A', '#4F6A5A'];
  const DEMO_MEMBERS = [
    { id: 'maya', name: 'Maya Putri', ini: 'MP', color: COLORS[0], busy: [] },
    { id: 'daniel', name: 'Daniel K.', ini: 'DK', color: COLORS[1], busy: ['2026-11-17', '2026-11-18', '2026-11-19'] },
    { id: 'sari', name: 'Sari W.', ini: 'SW', color: COLORS[2], busy: ['2026-11-13'] },
    { id: 'kevin', name: 'Kevin D.', ini: 'KD', color: COLORS[3], busy: ['2026-11-21', '2026-11-22'] }
  ];

  g.PD = { A, byId, D, rp, hash, hav, uid, moonFor, festivalFor, weatherFor, crowdFor, CROWD_LABEL, isClosed, seatsLeft, dayScore, DEMO_MEMBERS, COLORS, PURNAMA, TILEM };
})(window);
