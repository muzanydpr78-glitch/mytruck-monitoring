# Arsitektur

- **Frontend**: HTML/CSS/JavaScript yang dirender oleh Google Apps Script.
- **Backend**: `Code.gs`, memproses login, sesi, dan pembacaan data.
- **Database**: Google Sheets yang dipilih melalui Script Property `SPREADSHEET_ID`.
- **Repository publik**: kode generik dan dokumentasi saja. Data perusahaan dan deployment tetap terpisah/private.

Ini merupakan gambaran desain paket awal, bukan hasil audit keamanan atau jaminan kesiapan produksi.
