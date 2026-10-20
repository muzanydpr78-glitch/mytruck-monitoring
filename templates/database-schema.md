# Template skema database (header saja)

Buat sheet kosong dengan header berikut. Jangan gunakan data nyata saat uji coba. Sesuaikan kolom operasional dengan implementasi backend dan PRD sebelum dipakai.

## `DB_Users`
`User_ID`, `Username`, `Email`, `Password_Hash`, `Role`, `Status_Aktif`, `Remember_Token`, `Token_Expiry`, `Last_Login`

## `DB_Armada`
Gunakan kolom sesuai kebutuhan organisasi dan implementasi `getDashboardData`; schema operasional lengkap belum dibakukan dalam paket ini.

## `DB_Standby`
Gunakan kolom sesuai kebutuhan organisasi dan implementasi `getDashboardData`; schema operasional lengkap belum dibakukan dalam paket ini.

## `DB_Muatan`
Gunakan kolom sesuai kebutuhan organisasi dan implementasi `getDashboardData`; schema operasional lengkap belum dibakukan dalam paket ini.

## `DB_Logs`
`Timestamp`, `User_ID`, `Username`, `Event`, `Detail`
