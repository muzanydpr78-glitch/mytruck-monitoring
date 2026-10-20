# Web Monitoring Armada

Aplikasi web berbasis Google Apps Script dan Google Sheets untuk prototipe pemantauan armada. Repository ini adalah template awal untuk pembelajaran dan pengembangan internal; belum merupakan rilis produksi.

## Fitur pada paket ini
- Login dan pengelolaan sesi dasar melalui Google Apps Script.
- Dashboard ringkasan armada, standby, dan muatan dengan UI awal.
- Pembacaan data melalui Google Sheets menggunakan Script Properties.
- Struktur untuk pengembangan modul master data dan insight.

## Status implementasi
Paket ini **belum production-ready**. Filter tanggal/bulan belum sepenuhnya diterapkan pada agregasi backend, integrasi Gemini belum tersedia, dan menu Master Data, Manajemen User, serta Konfigurasi & Logs masih berupa kerangka navigasi. Autentikasi dan algoritma password wajib direview serta diuji sebelum digunakan.

## Struktur repository
- `apps-script/` — file sumber untuk Google Apps Script.
- `docs/` — panduan instalasi, konfigurasi, dan arsitektur.
- `templates/` — skema spreadsheet contoh tanpa data perusahaan.
- `screenshots/` — tempat menambahkan screenshot demo yang sudah disanitasi.

## Instalasi singkat
1. Buat salinan project Google Apps Script dan spreadsheet uji yang **tidak berisi data produksi**.
2. Salin `apps-script/Code.gs` sebagai file script `Code.gs`. Tambahkan file HTML bernama `index`, `styles`, dan `scripts`, lalu salin isi file HTML terkait.
3. Pada **Project Settings → Script Properties**, buat `SPREADSHEET_ID` dengan ID spreadsheet uji Anda. Jangan menaruh ID tersebut di source code atau repository publik.
4. Buat sheet sesuai `templates/database-schema.md`.
5. Jalankan `setupProject()` dan uji seluruh alur pada akun/spreadsheet terpisah.
6. Deploy Web App hanya setelah review keamanan dan persetujuan organisasi.

Panduan lengkap: [`docs/installation.md`](docs/installation.md).

## Keamanan & data
Jangan commit password, hash password aktif, remember token, session token, API key, spreadsheet ID internal, URL deployment privat, email pengguna, atau data operasional perusahaan. Gunakan data dummy. Jika rahasia pernah masuk ke commit, segera cabut/rotasi rahasia dan bersihkan riwayat Git bila diperlukan; menghapusnya pada commit terbaru saja tidak cukup.

Sebelum membuat repository publik, pastikan Anda mendapat persetujuan perusahaan atas publikasi kode dan lisensinya.

## Lisensi
Belum ada lisensi yang diberikan. Jangan menganggap kode ini bebas digunakan ulang sebelum pemilik hak cipta menyetujui lisensi. Lihat [`LICENSE`](LICENSE).
