# Web Monitoring Armada — GitHub Pages + Apps Script

Template publik untuk **hosting portal frontend** di GitHub Pages. Aplikasi login dan proses data tetap disajikan oleh Google Apps Script, dengan Google Sheets sebagai database.

> **Penting:** halaman GitHub Pages ini adalah portal/wrapper yang menyematkan aplikasi Apps Script melalui iframe dan menyediakan tautan “Buka aplikasi”. Ini bukan konversi frontend Apps Script menjadi aplikasi statis murni. Source UI asli masih menggunakan `google.script.run`, sehingga tidak dapat berjalan langsung dari GitHub Pages tanpa refactor API dan pengujian CORS/authentication. Jangan menganggap ini siap produksi.

## Struktur
- `index.html`, `assets/style.css`, `config.js`: portal statis GitHub Pages.
- `apps-script/`: source aplikasi Apps Script yang menggunakan `google.script.run`.
- `templates/database-schema.md`: skema sheet contoh.
- `docs/DEPLOYMENT.md`: panduan deploy.
- `SECURITY.md`: aturan keamanan repository publik.

## 1. Upload ke GitHub
1. Buat repository bernama `web-monitoring-armada` dengan visibility **Public** setelah mendapat izin pemilik kode/perusahaan.
2. Ekstrak ZIP ini dan unggah **isi folder** ke root repository (pastikan `index.html` ada di root).
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**, branch `main`, folder `/(root)`, lalu Save.
5. Tunggu workflow Pages selesai. URL umumnya `https://USERNAME.github.io/web-monitoring-armada/`.

## 2. Deploy backend Apps Script
Ikuti `docs/DEPLOYMENT.md`. Simpan Spreadsheet ID di **Apps Script → Project Settings → Script Properties** dengan key `SPREADSHEET_ID`, bukan di repository. Deploy sebagai Web App dan batasi akses sesuai kebijakan organisasi. Pengaturan akses “Anyone” membuat endpoint dapat dijangkau publik; jangan gunakan untuk data perusahaan sensitif tanpa review keamanan.

## 3. Hubungkan portal ke backend
1. Salin URL deployment Web App yang berakhir `/exec`.
2. Edit `config.js` dan isi `APP_URL` dengan URL tersebut.
3. Commit perubahan ke repository. URL deployment bukan password, tetapi tetap pertimbangkan kebijakan organisasi sebelum dipublikasikan.
4. Jika iframe ditolak atau tidak tampil, gunakan tombol **Buka aplikasi** yang membuka Apps Script di tab baru. Pastikan deployment dan aksesnya telah diuji.

## Status implementasi
- Portal GitHub Pages: siap dipublikasikan setelah konfigurasi URL.
- Backend: source Apps Script disertakan, tetapi belum diuji pada akun Anda.
- Dashboard masih prototipe; filter tanggal/bulan, AI Gemini, CRUD master data, manajemen user, dan logs belum seluruhnya selesai.
- Jangan mengunggah data asli, Password_Hash, token sesi/remember, API key, spreadsheet ID, atau informasi internal.
- Repository publik memerlukan persetujuan perusahaan dan keputusan lisensi. File `LICENSE` tidak disertakan agar tidak memberi izin penggunaan yang belum disetujui.
