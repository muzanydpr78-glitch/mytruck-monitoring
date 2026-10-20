# Skema database contoh (header saja)

Buat sheet terpisah dan gunakan data dummy. Sesuaikan kolom operasional dengan kebutuhan internal sebelum digunakan.

## DB_Users
`User_ID`, `Username`, `Email`, `Password_Hash`, `Role`, `Status_Aktif`, `Remember_Token`, `Token_Expiry`, `Last_Login`

## DB_Logs
`Timestamp`, `User_ID`, `Username`, `Event`, `Detail`

## DB_Armada / DB_Standby / DB_Muatan
Header bisnis belum dapat dianggap final dari template ini. Sesuaikan dengan struktur data yang disetujui, dan jangan memasukkan contoh data produksi ke repository publik.
