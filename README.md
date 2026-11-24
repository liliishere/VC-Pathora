# Pathora

Planner dan pemesanan kegiatan alam dan budaya Bali yang dipandu warga dan komunitas lokal. Pathora membantu wisatawan menemukan kegiatan, menyusunnya ke dalam satu rencana perjalanan dengan bantuan asisten AI, mengajukannya ke host lokal, lalu membayar setelah kegiatan dipastikan tersedia.

> **Status: prototype.** Seluruh harga, cuaca, tingkat keramaian, dan data kegiatan adalah data contoh. Pembayaran hanya simulasi. Asisten AI memakai backend Pathora (Gemini + planner berbasis data sheet) saat pengguna masuk dengan akun server; kalau backend mati, lambat, atau kuota habis, situs otomatis memakai mesin aturan lokal.

Proyek Kelompok 2: Felix, Kevin, Rebecca, dan Vania.

## Fitur

- **Jelajahi**: katalog 26 kegiatan: 12 dari sheet riset tim (Karangasem, Bali Timur) di urutan atas, 14 kegiatan contoh pengisi di bawahnya. Fokus wilayah: Bali Timur, dengan pencarian ketik beserta saran langsung, filter kategori dan wilayah, serta pengurutan.
- **Detail kegiatan**: cerita, urutan acara, etika, barang bawaan, kalender ketersediaan, label keramaian, dan perkiraan cuaca.
- **Trip saya**: kalender, asisten AI, anggota dan kode undangan, pembagian biaya, dan penyelesaian utang.
- **Paspor Alam**: stempel untuk setiap kegiatan yang selesai.
- **Studio Host**: permintaan masuk, setujui atau tolak, hari tutup, dan ringkasan pendapatan.
- **Paket**: Gratis (5 pertanyaan AI per hari) dan Plus (Rp49.000 per bulan, uji coba 7 hari).

## Teknologi

HTML, CSS, dan JavaScript murni. Tidak ada proses build dan tidak ada dependensi. Font Plus Jakarta Sans. Data tersimpan di `localStorage` browser, sehingga akun dan trip hanya tampil di browser yang sama.

## Menjalankan di komputer

Buka `index.html` langsung di browser, atau jalankan server lokal dari folder proyek:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Struktur folder

```
index.html            Landing page
jelajahi.html         Katalog dan pencarian
kegiatan.html         Detail kegiatan
trip.html             Trip, kalender, asisten AI, biaya
paspor.html           Paspor Alam
akun.html             Akun dan langganan
host.html             Studio Host
masuk.html            Masuk dan daftar
assets/
  css/                style.css, pages.css
  js/                 data.js, store.js, ai.js, art.js, ui.js, trip.js
  img/                logo, galeri, dan foto kegiatan
```

## Foto kegiatan

Foto kegiatan berada di `assets/img/photos/` dengan nama sesuai id kegiatan (misalnya `tukik.jpg`, `subak.jpg`). Untuk air terjun, berkas bernama `waterfall.jpg`. Bila suatu foto belum ada, situs menampilkan ilustrasi cadangan. Sumber dan kredit foto dicatat di `assets/img/photos/CREDITS.md`.

## Deploy

Situs ini statis dan dapat dipasang di hosting statis seperti GitHub Pages, Netlify, atau Cloudflare Pages. Untuk GitHub Pages, buka **Settings, Pages**, pilih branch `main` dengan folder root, lalu simpan.

## Backend

Backend ada di repo [vaniallic/pathora-ai-prototype](https://github.com/vaniallic/pathora-ai-prototype) dan berjalan di
`https://pathora-backend-production-96394f16.up.railway.app` (cek: `/api/health`). Kontraknya ada di `docs/BACKEND-BRIEF.md`.

Yang sudah tersambung lewat `assets/js/api.js`:

- **Masuk dan Daftar** (`masuk.html`) membuat akun di server. Profil server disalin ke akun lokal, jadi halaman lain tetap
  jalan seperti biasa. Kalau server tidak bisa dihubungi, akun dibuat di browser saja (seperti sebelumnya).
- **Asisten** di Trip saya memanggil `POST /api/rencana`, menunggu maksimal 8 detik. Kegiatan dari server (K01 sampai K12)
  dipetakan ke ID front-end (`arak`, `camping`, ...), lalu tampil sebagai kartu rencana yang sama. Pertanyaan balik
  (`tipe: tanya`) dilanjutkan otomatis dengan `lanjutan_dari`. Gagal, 401, 429, 5xx, atau lebih dari 8 detik: mesin lokal.
- Angka harga, durasi, dan kuota 12 kegiatan sheet sudah disamakan dengan `data/isian_demo.csv` di backend.

Belum tersambung ke server (masih `localStorage`): trip bersama, pengajuan ke host dan Studio Host, patungan, Paspor Alam.
Endpoint-nya sudah ada di backend (bagian Pemesanan di README backend).

Alamat backend bisa diganti untuk uji lokal lewat Console browser:

    localStorage.setItem('pathora_api', 'http://localhost:8000')   // backend lokal
    localStorage.setItem('pathora_api', 'off')                     // matikan backend, pakai mesin lokal saja
    localStorage.removeItem('pathora_api')                         // kembali ke backend produksi
