# Pathora

Planner dan pemesanan kegiatan alam dan budaya Bali yang dipandu warga dan komunitas lokal. Pathora membantu wisatawan menemukan kegiatan, menyusunnya ke dalam satu rencana perjalanan dengan bantuan asisten AI, mengajukannya ke host lokal, lalu membayar setelah kegiatan dipastikan tersedia.

> **Status: prototype.** Seluruh harga, cuaca, tingkat keramaian, dan data kegiatan adalah data contoh. Pembayaran hanya simulasi. Asisten AI berbasis aturan, belum memakai model bahasa sungguhan.

Proyek Kelompok 2: Felix, Kevin, Rebecca, dan Vania.

## Fitur

- **Jelajahi**: katalog 14 kegiatan dengan pencarian ketik beserta saran langsung, filter kategori dan wilayah, serta pengurutan.
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

## Rencana backend

Rancangan backend (arsitektur, aturan bisnis, model data, dan API) disusun terpisah sebagai brief untuk tahap berikutnya. Prototype ini tetap berjalan tanpa server.
