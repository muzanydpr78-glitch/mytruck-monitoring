# Panduan deployment

## A. Siapkan Google Sheets uji
Buat spreadsheet **uji** terpisah dari data operasional. Siapkan tab dan header sesuai `../templates/database-schema.md`. Jangan memakai data asli saat menguji repository publik.

## B. Pasang Apps Script
1. Buka `https://script.google.com/` dan buat project baru.
2. Salin `apps-script/Code.gs` ke file script `Code.gs`.
3. Buat file HTML bernama `index`, `styles`, dan `scripts` (tanpa ekstensi di editor) lalu salin isi file dengan nama yang sama dari folder `apps-script/`.
4. Buka **Project Settings → Script Properties** dan tambahkan `SPREADSHEET_ID` dengan ID spreadsheet uji.
5. Jalankan `setupProject()` dan tinjau izin yang diminta.
6. Pastikan sheet `DB_Users` memiliki header: `User_ID`, `Username`, `Email`, `Password_Hash`, `Role`, `Status_Aktif`, `Remember_Token`, `Token_Expiry`, `Last_Login`. Lihat README paket login untuk catatan format hash; jangan reset hash admin produksi tanpa prosedur migrasi yang diuji.
7. **Deploy → New deployment → Web app**. Pilih execute as dan siapa yang dapat mengakses sesuai kebijakan organisasi. Jangan memilih akses publik secara otomatis.
8. Uji login, logout, pemulihan sesi, hak akses, dan penolakan akses setelah sesi tidak valid. Deployment belum dianggap aman hanya karena login UI berfungsi.

## C. Aktifkan GitHub Pages
1. Commit semua file ke branch `main`.
2. Repository → **Settings → Pages**.
3. Pilih **Deploy from a branch**, branch `main`, folder `/(root)`, lalu Save.
4. Tunggu URL Pages aktif.

## D. Sambungkan portal
1. Buka `config.js`.
2. Isi `APP_URL` dengan URL Web App Apps Script yang berakhir `/exec`.
3. Commit dan tunggu Pages rebuild.
4. Tes di browser biasa dan mobile. Jika iframe tidak diizinkan atau membutuhkan autentikasi yang tidak didukung dalam iframe, gunakan tautan buka aplikasi di tab baru.

## Batasan penting
Source aplikasi saat ini menggunakan `google.script.run`, yang hanya tersedia ketika halaman dijalankan dalam HTML Service Apps Script. Karena itu, UI aplikasi tetap dilayani Apps Script; GitHub Pages menjadi portal/hosting shell. Untuk memindahkan seluruh UI ke GitHub Pages, frontend dan backend harus direfaktor menjadi API terpisah, lalu CORS, autentikasi lintas-origin, token, dan CSRF harus dirancang dan diuji. Jangan menaruh token atau kredensial di `config.js`.
