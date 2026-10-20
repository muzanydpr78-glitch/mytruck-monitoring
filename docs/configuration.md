# Konfigurasi

Konfigurasi sensitif harus disimpan di **Apps Script Project Settings → Script Properties**, bukan di file yang dipush ke GitHub.

| Property | Kegunaan |
|---|---|
| `SPREADSHEET_ID` | ID spreadsheet untuk lingkungan uji/deployment |

Jangan menambahkan nilai rahasia ke file contoh. Jika nanti menambahkan layanan AI, simpan API key sebagai Script Property terpisah dan batasi akses project. Jangan pernah mengirimkan key ke frontend.
