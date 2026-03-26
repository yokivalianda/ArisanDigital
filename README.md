# 🪙 ArisanKu – Panduan Instalasi Lengkap

Aplikasi PWA Arisan Digital dengan sistem kocok 1 pemenang per bulan,
terintegrasi dengan Supabase sebagai database.

---

## 📋 Yang Anda Butuhkan

- Akun Supabase (gratis): https://supabase.com
- Web server lokal (pilih salah satu):
  - VS Code + ekstensi Live Server
  - Node.js (npx serve)
  - Python 3 (python -m http.server)
- Browser modern (Chrome, Edge, Safari, Firefox)

---

## 🗄️ LANGKAH 1 — Setup Supabase

### 1.1 Buat Akun & Project
1. Buka https://supabase.com dan klik **Start your project**
2. Daftar / login dengan GitHub atau email
3. Klik **New Project**
4. Isi:
   - **Name**: ArisanKu (atau nama lain)
   - **Database Password**: buat password kuat (simpan!)
   - **Region**: pilih yang terdekat (Singapore untuk Indonesia)
5. Klik **Create new project** — tunggu ~2 menit

### 1.2 Jalankan SQL Schema
1. Di dashboard Supabase, buka menu **SQL Editor** (ikon database di sidebar kiri)
2. Klik **New query**
3. Buka file `supabase_schema.sql` dari folder ini
4. Copy semua isi file tersebut
5. Paste ke SQL Editor
6. Klik tombol **Run** (atau tekan Ctrl+Enter)
7. Pastikan muncul pesan: *Success. No rows returned*

### 1.3 Ambil Kredensial API
1. Di sidebar kiri, klik ikon ⚙️ **Project Settings**
2. Pilih **API** dari menu
3. Catat dua nilai berikut:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** key: string panjang yang dimulai `eyJhbGci...`

---

## 📁 LANGKAH 2 — Persiapkan File Aplikasi

Pastikan struktur folder Anda seperti ini:

```
arisan-pwa/
├── index.html
├── style.css
├── app.js
├── sw.js
├── manifest.json
├── supabase_schema.sql  (hanya untuk referensi)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 🚀 LANGKAH 3 — Jalankan Aplikasi

Pilih salah satu cara berikut:

### Cara A: VS Code Live Server (Paling Mudah)
1. Install VS Code: https://code.visualstudio.com
2. Install ekstensi **Live Server** (oleh Ritwick Dey)
3. Buka folder `arisan-pwa` di VS Code
4. Klik kanan file `index.html` → **Open with Live Server**
5. Browser akan terbuka otomatis di `http://127.0.0.1:5500`

### Cara B: Node.js
```bash
# Install Node.js dari https://nodejs.org jika belum ada
npx serve arisan-pwa
# Buka http://localhost:3000
```

### Cara C: Python 3
```bash
cd arisan-pwa
python -m http.server 8080
# Buka http://localhost:8080
```

---

## 🔗 LANGKAH 4 — Konfigurasi Aplikasi

1. Buka aplikasi di browser
2. Halaman konfigurasi akan muncul
3. Masukkan:
   - **Supabase URL**: URL yang dicatat di Langkah 1.3
   - **Anon Key**: Key yang dicatat di Langkah 1.3
4. Klik **Hubungkan Database**
5. Jika berhasil, aplikasi akan terbuka otomatis

> 💡 Kredensial disimpan di localStorage browser — tidak perlu input ulang

---

## 📱 LANGKAH 5 — Install sebagai PWA (Opsional)

### Di Android (Chrome):
1. Buka aplikasi di Chrome
2. Tap menu ⋮ (tiga titik) di pojok kanan atas
3. Pilih **Tambahkan ke layar utama** / **Install App**
4. Konfirmasi → Aplikasi muncul di home screen

### Di iPhone (Safari):
1. Buka aplikasi di Safari
2. Tap ikon Share (kotak dengan panah ke atas)
3. Pilih **Add to Home Screen**
4. Ketik nama → tap **Add**

### Di Desktop (Chrome/Edge):
1. Buka aplikasi
2. Klik ikon install (⊕) di address bar
3. Atau Menu → **Install ArisanKu**

---

## 🎯 CARA PENGGUNAAN APLIKASI

### Membuat Grup Arisan
1. Tap tombol **+** di header kanan atas
2. Isi nama grup, jumlah iuran, tanggal kocok, bulan mulai
3. Tap **Simpan Grup**

### Menambah Anggota
1. Pilih tab **Anggota**
2. Tap **+ Tambah**
3. Isi nama dan nomor WhatsApp
4. Tap **Tambah Anggota**

### Mencatat Pembayaran
1. Pilih tab **Pembayaran**
2. Navigasi ke bulan yang sesuai dengan tombol ‹ ›
3. Tap tombol **Belum** untuk menandai lunas
4. Tap tombol **Lunas** untuk membatalkan pembayaran

### Kocok Arisan
1. Pastikan berada di tab **Dashboard**
2. Pilih grup yang aktif
3. Tap tombol **Kocok Sekarang**
4. Animasi berjalan → pemenang dipilih secara acak
5. Hanya anggota yang BELUM pernah menang yang bisa terpilih
6. Hasil tersimpan otomatis ke database

### Melihat Riwayat
1. Pilih tab **Riwayat**
2. Semua hasil kocok tampil berurutan

---

## 🔧 TROUBLESHOOTING

| Masalah | Solusi |
|---------|--------|
| Koneksi gagal | Periksa URL dan Anon Key, pastikan tidak ada spasi |
| Data tidak muncul | Pastikan SQL schema sudah dijalankan di Supabase |
| Error RLS | Pastikan policy "Allow all for anon" sudah dibuat |
| PWA tidak install | Harus diakses via HTTPS atau localhost |
| Kocok tidak bisa | Tambahkan anggota dulu |

---

## 🛡️ KEAMANAN (Untuk Produksi)

Untuk penggunaan nyata dengan data sensitif:
1. Aktifkan **Supabase Auth** untuk login pengguna
2. Ubah RLS policy agar hanya user terautentikasi yang bisa akses
3. Deploy ke hosting HTTPS (Vercel, Netlify, dsb.)

---

## 📞 Struktur Database

| Tabel | Fungsi |
|-------|--------|
| `groups` | Menyimpan grup arisan |
| `members` | Anggota tiap grup |
| `payments` | Rekap pembayaran iuran per bulan |
| `draw_results` | Hasil kocok bulanan |

---

Selamat menggunakan ArisanKu! 🎉
