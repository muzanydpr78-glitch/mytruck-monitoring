# Panduan Instalasi

## Prasyarat
- Akun Google dengan akses ke Google Apps Script.
- Spreadsheet uji baru dengan sheet sesuai `templates/database-schema.md`.
- Persetujuan pemilik kode/perusahaan sebelum penggunaan atau publikasi.

## Langkah
1. Buat project di Google Apps Script.
2. Tambahkan `Code.gs`, serta file HTML bernama `index`, `styles`, dan `scripts` (nama di editor tanpa ekstensi `.html`). Salin isi dari folder `apps-script/`.
3. Buka **Project Settings → Script Properties**. Tambahkan `SPREADSHEET_ID` dan isi dengan ID spreadsheet uji. Jangan commit nilai ini.
4. Pastikan header sheet sesuai template. Untuk akun uji, gunakan data dummy dan password uji yang unik.
5. Jalankan `setupProject()` dari editor Apps Script dan setujui izin yang diperlukan.
6. Jalankan tes login, logout, session expiry, remember-me, akses tanpa sesi, dan pembatasan role.
7. Review keamanan dan kode, lalu deploy sebagai Web App pada lingkungan uji. Jangan langsung menghubungkan repository publik ke spreadsheet produksi.

## Catatan password
Source mengharapkan format hash `pbkdf2_sha256$ITERATIONS$SALT_BASE64$HASH_BASE64`. Verifikasi implementasi PBKDF2 dengan test vector standar dan benchmark runtime Apps Script sebelum penggunaan produksi. Jangan menaruh password produksi di log, source code, issue, atau chat.
