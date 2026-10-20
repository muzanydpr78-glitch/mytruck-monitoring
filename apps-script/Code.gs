/**
 * Web Monitoring Armada — Tahap 1: Login
 * Google Apps Script backend.
 *
 * IMPORTANT:
 * 1) Set SPREADSHEET_ID in Project Settings > Script Properties.
 * 2) Password_Hash format: pbkdf2_sha256$ITERATIONS$SALT_BASE64$HASH_BASE64
 * 3) PBKDF2 is implemented with Utilities.computeHmacSha256Signature.
 * 4) Run setupProject() once as the project owner, then deploy as Web App.
 */

const CONFIG = Object.freeze({
  USERS_SHEET: 'DB_Users',
  LOGS_SHEET: 'DB_Logs',
  SESSION_CACHE_PREFIX: 'WMA_SESSION_',
  SESSION_SECONDS: 21600, // 6 hours; CacheService limit is 6 hours
  REMEMBER_DAYS: 7,
  // Apps Script HMAC calls have runtime cost. Benchmark in the target script
  // before increasing this value. This is a deployment starting point, not a
  // substitute for a security review.
  PBKDF2_ITERATIONS: 12000,
  HASH_ALGORITHM: 'pbkdf2_sha256'
});

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Web Monitoring Armada | Login')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Run once as the owner. It validates the spreadsheet and creates DB_Logs if absent. */
function setupProject() {
  const ss = getSpreadsheet_();
  const users = ss.getSheetByName(CONFIG.USERS_SHEET);
  if (!users) throw new Error('Sheet DB_Users tidak ditemukan.');
  const headers = users.getRange(1, 1, 1, users.getLastColumn()).getDisplayValues()[0];
  const required = [
    'User_ID', 'Username', 'Email', 'Password_Hash', 'Role',
    'Status_Aktif', 'Remember_Token', 'Token_Expiry', 'Last_Login'
  ];
  const missing = required.filter(h => headers.indexOf(h) === -1);
  if (missing.length) throw new Error('Header DB_Users belum sesuai: ' + missing.join(', '));

  let logs = ss.getSheetByName(CONFIG.LOGS_SHEET);
  if (!logs) {
    logs = ss.insertSheet(CONFIG.LOGS_SHEET);
    logs.appendRow(['Timestamp', 'User_ID', 'Username', 'Event', 'Detail']);
  }
  return 'Setup berhasil. Header DB_Users tervalidasi; DB_Logs siap.';
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Script Property SPREADSHEET_ID belum diatur.');
  return SpreadsheetApp.openById(id);
}

function getUsersSheet_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.USERS_SHEET);
  if (!sheet) throw new Error('Sheet DB_Users tidak ditemukan.');
  return sheet;
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const map = {};
  headers.forEach((h, i) => { map[String(h).trim()] = i; });
  return map;
}

function findUserByLogin_(login) {
  const sheet = getUsersSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return null;
  const headers = values[0].map(v => String(v).trim());
  const ix = {};
  headers.forEach((h, i) => ix[h] = i);
  const needle = String(login || '').trim().toLowerCase();
  if (!needle) return null;
  for (let r = 1; r < values.length; r++) {
    const username = String(values[r][ix.Username] || '').trim().toLowerCase();
    const email = String(values[r][ix.Email] || '').trim().toLowerCase();
    if (needle === username || needle === email) {
      const user = {};
      headers.forEach((h, i) => user[h] = values[r][i]);
      user.__row = r + 1;
      return user;
    }
  }
  return null;
}

function login(payload) {
  try {
    payload = payload || {};
    const loginId = String(payload.login || '').trim();
    const password = String(payload.password || '');
    const remember = payload.remember === true;

    if (!loginId || !password) {
      return { ok: false, message: 'Masukkan username/email dan password.' };
    }
    if (loginId.length > 254 || password.length > 1024) {
      return { ok: false, message: 'Input tidak valid.' };
    }

    const user = findUserByLogin_(loginId);
    // Use a generic error to avoid revealing whether an account exists.
    if (!user || !verifyPassword_(password, String(user.Password_Hash || ''))) {
      logEvent_(user ? user.User_ID : '', loginId, 'LOGIN_FAILED', 'Kredensial tidak valid');
      return { ok: false, message: 'Username/email atau password salah.' };
    }
    if (String(user.Status_Aktif || '').trim().toLowerCase() !== 'aktif') {
      logEvent_(user.User_ID, user.Username, 'LOGIN_BLOCKED', 'Akun tidak aktif');
      return { ok: false, message: 'Akun tidak aktif. Hubungi administrator.' };
    }

    const token = createOpaqueToken_();
    const sessionId = createOpaqueToken_();
    const session = {
      userId: String(user.User_ID || ''),
      username: String(user.Username || ''),
      email: String(user.Email || ''),
      role: String(user.Role || ''),
      issuedAt: Date.now(),
      remember: remember
    };

    // Store session server-side. The browser only receives a random opaque ID.
    CacheService.getScriptCache().put(
      CONFIG.SESSION_CACHE_PREFIX + sessionId,
      JSON.stringify(session),
      CONFIG.SESSION_SECONDS
    );

    const sheet = getUsersSheet_();
    const map = getHeaderMap_(sheet);
    const row = user.__row;
    const now = new Date();
    if (map.Last_Login !== undefined) sheet.getRange(row, map.Last_Login + 1).setValue(now);

    if (remember) {
      const expiry = new Date(now.getTime() + CONFIG.REMEMBER_DAYS * 24 * 60 * 60 * 1000);
      // Store only a hash of the remember token, never the raw token.
      if (map.Remember_Token !== undefined) {
        sheet.getRange(row, map.Remember_Token + 1).setValue(sha256Base64_(token));
      }
      if (map.Token_Expiry !== undefined) sheet.getRange(row, map.Token_Expiry + 1).setValue(expiry);
    } else {
      // A new non-remember login revokes any previous remembered login for this account.
      if (map.Remember_Token !== undefined) sheet.getRange(row, map.Remember_Token + 1).clearContent();
      if (map.Token_Expiry !== undefined) sheet.getRange(row, map.Token_Expiry + 1).clearContent();
    }

    logEvent_(user.User_ID, user.Username, 'LOGIN_SUCCESS', remember ? 'Remember me 7 hari' : 'Sesi 6 jam');
    return {
      ok: true,
      sessionId: sessionId,
      rememberToken: remember ? token : '',
      rememberExpiry: remember ? new Date(now.getTime() + CONFIG.REMEMBER_DAYS * 86400000).toISOString() : '',
      user: publicUser_(session)
    };
  } catch (err) {
    console.error(err);
    return { ok: false, message: 'Terjadi kendala saat login. Coba lagi atau hubungi administrator.' };
  }
}

function restoreSession(sessionId, rememberToken) {
  try {
    if (sessionId) {
      const raw = CacheService.getScriptCache().get(CONFIG.SESSION_CACHE_PREFIX + String(sessionId));
      if (raw) {
        const session = JSON.parse(raw);
        if (isAccountActive_(session.userId)) {
          return { ok: true, user: publicUser_(session), sessionId: String(sessionId), remember: !!session.remember };
        }
      }
    }
    if (rememberToken) {
      const tokenHash = sha256Base64_(String(rememberToken));
      const user = findUserByRememberHash_(tokenHash);
      if (user && String(user.Status_Aktif || '').trim().toLowerCase() === 'aktif') {
        // Read the actual Date cell value, not locale-formatted display text.
        const expiryValue = getUsersSheet_().getRange(user.__row, getHeaderMap_(getUsersSheet_()).Token_Expiry + 1).getValue();
        const expiry = expiryValue instanceof Date ? expiryValue : new Date(expiryValue);
        if (!isNaN(expiry.getTime()) && expiry.getTime() > Date.now()) {
          const session = {
            userId: String(user.User_ID || ''),
            username: String(user.Username || ''),
            email: String(user.Email || ''),
            role: String(user.Role || ''),
            issuedAt: Date.now(),
            remember: true
          };
          const newSessionId = createOpaqueToken_();
          CacheService.getScriptCache().put(CONFIG.SESSION_CACHE_PREFIX + newSessionId, JSON.stringify(session), CONFIG.SESSION_SECONDS);
          return { ok: true, user: publicUser_(session), sessionId: newSessionId, remember: true };
        }
      }
    }
    return { ok: false };
  } catch (err) {
    console.error(err);
    return { ok: false };
  }
}

function logout(sessionId, rememberToken) {
  try {
    if (sessionId) CacheService.getScriptCache().remove(CONFIG.SESSION_CACHE_PREFIX + String(sessionId));

    if (rememberToken) {
      const tokenHash = sha256Base64_(String(rememberToken));
      const user = findUserByRememberHash_(tokenHash);
      if (user) {
        const sheet = getUsersSheet_();
        const map = getHeaderMap_(sheet);
        if (map.Remember_Token !== undefined) sheet.getRange(user.__row, map.Remember_Token + 1).clearContent();
        if (map.Token_Expiry !== undefined) sheet.getRange(user.__row, map.Token_Expiry + 1).clearContent();
        logEvent_(user.User_ID, user.Username, 'LOGOUT', 'Remember token dicabut');
      }
    }
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: true };
  }
}

function getCurrentUser(sessionId) {
  if (!sessionId) return { ok: false };
  const raw = CacheService.getScriptCache().get(CONFIG.SESSION_CACHE_PREFIX + String(sessionId));
  if (!raw) return { ok: false };
  try {
    const session = JSON.parse(raw);
    if (!isAccountActive_(session.userId)) return { ok: false };
    return { ok: true, user: publicUser_(session) };
  } catch (err) {
    return { ok: false };
  }
}

function isAccountActive_(userId) {
  const sheet = getUsersSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return false;
  const headers = values[0].map(v => String(v).trim());
  const idCol = headers.indexOf('User_ID');
  const statusCol = headers.indexOf('Status_Aktif');
  if (idCol < 0 || statusCol < 0) return false;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(userId)) {
      return String(values[i][statusCol]).trim().toLowerCase() === 'aktif';
    }
  }
  return false;
}

function findUserByRememberHash_(tokenHash) {
  const sheet = getUsersSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return null;
  const headers = values[0].map(v => String(v).trim());
  const tokenCol = headers.indexOf('Remember_Token');
  if (tokenCol < 0) return null;
  for (let r = 1; r < values.length; r++) {
    if (constantTimeEquals_(String(values[r][tokenCol] || ''), tokenHash)) {
      const user = {};
      headers.forEach((h, i) => user[h] = values[r][i]);
      user.__row = r + 1;
      return user;
    }
  }
  return null;
}

function publicUser_(session) {
  return {
    userId: session.userId,
    username: session.username,
    email: session.email,
    role: session.role
  };
}

/**
 * Hash format: pbkdf2_sha256$iterations$saltBase64$derivedKeyBase64
 * PBKDF2-HMAC-SHA-256 implementation. Benchmark and review before production.
 */
function hashPasswordForSetup(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length < 12) {
    throw new Error('Gunakan password awal minimal 12 karakter.');
  }
  const salt = createRandomBytes_(16);
  const iterations = CONFIG.PBKDF2_ITERATIONS;
  const derived = pbkdf2Sha256_(plainPassword, salt, iterations, 32);
  return [
    CONFIG.HASH_ALGORITHM,
    iterations,
    Utilities.base64Encode(salt),
    Utilities.base64Encode(derived)
  ].join('$');
}

function verifyPassword_(plainPassword, storedHash) {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 4 || parts[0] !== CONFIG.HASH_ALGORITHM) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1000 || iterations > 200000) return false;
  try {
    const salt = Utilities.base64Decode(parts[2]);
    const expected = Utilities.base64Decode(parts[3]);
    const actual = pbkdf2Sha256_(plainPassword, salt, iterations, expected.length);
    return constantTimeBytesEquals_(actual, expected);
  } catch (err) {
    console.error('Password hash tidak valid: ' + err);
    return false;
  }
}

function pbkdf2Sha256_(password, saltBytes, iterations, keyLength) {
  const passwordBytes = Utilities.newBlob(String(password), 'text/plain').getBytes();
  const hLen = 32;
  const blocks = Math.ceil(keyLength / hLen);
  const out = [];
  for (let block = 1; block <= blocks; block++) {
    const saltBlock = saltBytes.concat([
      (block >>> 24) & 0xff,
      (block >>> 16) & 0xff,
      (block >>> 8) & 0xff,
      block & 0xff
    ].map(toSignedByte_));
    let u = Utilities.computeHmacSha256Signature(saltBlock, passwordBytes);
    let t = u.slice();
    for (let i = 1; i < iterations; i++) {
      u = Utilities.computeHmacSha256Signature(u, passwordBytes);
      for (let j = 0; j < hLen; j++) t[j] = toSignedByte_((toUnsignedByte_(t[j]) ^ toUnsignedByte_(u[j])));
    }
    out.push.apply(out, t);
  }
  return out.slice(0, keyLength).map(toSignedByte_);
}

function createRandomBytes_(length) {
  // UUIDs provide random material; use only for salt/token generation, not as password hashes.
  let bytes = [];
  while (bytes.length < length) {
    const chunk = Utilities.newBlob(Utilities.getUuid()).getBytes();
    bytes = bytes.concat(chunk);
  }
  return bytes.slice(0, length).map(toSignedByte_);
}

function createOpaqueToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function sha256Base64_(value) {
  return Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  ));
}

function constantTimeEquals_(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return diff === 0;
}

function constantTimeBytesEquals_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= toUnsignedByte_(a[i]) ^ toUnsignedByte_(b[i]);
  return diff === 0;
}

function toUnsignedByte_(b) {
  return b < 0 ? b + 256 : b;
}

function toSignedByte_(b) {
  b = Number(b) & 255;
  return b > 127 ? b - 256 : b;
}

function logEvent_(userId, username, event, detail) {
  try {
    const ss = getSpreadsheet_();
    let sheet = ss.getSheetByName(CONFIG.LOGS_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.LOGS_SHEET);
      sheet.appendRow(['Timestamp', 'User_ID', 'Username', 'Event', 'Detail']);
    }
    sheet.appendRow([new Date(), userId || '', username || '', event, detail || '']);
  } catch (err) {
    console.error('Gagal menulis log: ' + err);
  }
}


/**
 * SEED ADMIN WEB MONITORING ARMADA
 * Jalankan fungsi seedAdmin() satu kali.
 *
 * Prasyarat:
 * - Sheet DB_Users memiliki header A:I.
 * - Fungsi hashPasswordForSetup() sudah tersedia.
 * - Password dan email disimpan sementara di Script Properties.
 */
function seedAdmin() {
  const SHEET_NAME = 'DB_Users';
  const HEADERS = [
    'User_ID',
    'Username',
    'Email',
    'Password_Hash',
    'Role',
    'Status_Aktif',
    'Remember_Token',
    'Token_Expiry',
    'Last_Login'
  ];

  const props = PropertiesService.getScriptProperties();
  const password = props.getProperty('ADMIN_SEED_PASSWORD');
  const email = props.getProperty('ADMIN_SEED_EMAIL');

  if (!password || password.length < 12) {
    throw new Error(
      'Isi Script Property ADMIN_SEED_PASSWORD dengan password minimal 12 karakter.'
    );
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      'Isi Script Property ADMIN_SEED_EMAIL dengan email admin yang valid.'
    );
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Spreadsheet aktif tidak ditemukan.');
  }

  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet DB_Users tidak ditemukan.');
  }

  // Pastikan header cocok sebelum mengubah data.
  const actualHeaders = sheet.getRange(1, 1, 1, 9)
    .getDisplayValues()[0]
    .map(value => String(value).trim());

  if (actualHeaders.some((value, i) => value !== HEADERS[i])) {
    throw new Error(
      'Header DB_Users tidak sesuai. Data tidak dihapus.'
    );
  }

  if (typeof hashPasswordForSetup !== 'function') {
    throw new Error(
      'Fungsi hashPasswordForSetup() tidak ditemukan.'
    );
  }

  // Buat hash sebelum menghapus data lama.
  const passwordHash = hashPasswordForSetup(password);

  if (
    typeof passwordHash !== 'string' ||
    !passwordHash.startsWith('pbkdf2_sha256$')
  ) {
    throw new Error(
      'Format hash tidak sesuai. Data lama tidak dihapus.'
    );
  }

  // Hapus data pengguna lama, pertahankan header.
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
  }

  // Buat satu akun admin baru.
  sheet.getRange(2, 1, 1, 9).setValues([[
    'USR-001',
    'admin',
    email,
    passwordHash,
    'Admin',
    'Aktif',
    '',
    '',
    ''
  ]]);

  SpreadsheetApp.flush();

  // Hapus password sementara setelah seed berhasil.
  props.deleteProperty('ADMIN_SEED_PASSWORD');

  console.log('Seed admin berhasil. Username: admin');
}


/** Dashboard read API. All data is returned only for a valid active session. */
function getDashboardData(sessionId, filters) {
  const auth = getCurrentUser(sessionId);
  if (!auth || !auth.ok) return { ok: false, message: 'Sesi tidak valid. Silakan login kembali.' };
  filters = filters || {};
  const ss = getSpreadsheet_();
  function readSheet(name) {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 1) return [];
    const vals = sh.getDataRange().getDisplayValues();
    const headers = vals.shift().map(h => String(h).trim());
    return vals.filter(row => row.some(v => String(v).trim() !== '')).map(row => {
      const obj = {}; headers.forEach((h, i) => obj[h] = row[i]); return obj;
    });
  }
  const fleetAll = readSheet('DB_Armada');
  const standbyAll = readSheet('DB_Standby');
  const cargoAll = readSheet('DB_Muatan');
  const ptFilter = String(filters.pt || '').trim().toLowerCase();
  const depoFilter = String(filters.depo || '').trim().toLowerCase();
  function filtered(rows) {
    return rows.filter(r => (!ptFilter || String(r.PT || '').trim().toLowerCase() === ptFilter) &&
      (!depoFilter || String(r.Depo || r.Nama_Depo || '').trim().toLowerCase() === depoFilter));
  }
  const fleet = filtered(fleetAll);
  const standby = filtered(standbyAll);
  const cargo = filtered(cargoAll);
  const norm = v => String(v || '').trim().toLowerCase();
  const countType = (rows, col, val) => rows.filter(r => norm(r[col]) === norm(val)).length;
  const statusCount = status => standby.filter(r => norm(r.Status) === norm(status)).length;
  const groupCount = (rows, col) => {
    const result = {};
    rows.forEach(r => { const key = String(r[col] || 'Tidak ditentukan').trim(); result[key] = (result[key] || 0) + 1; });
    return Object.keys(result).map(name => ({ name, count: result[name] })).sort((a,b) => b.count-a.count);
  };
  const sumQty = (rows, type, unit) => rows.filter(r => norm(r.Jenis_Muatan) === norm(type) && norm(r.Satuan) === norm(unit)).reduce((s,r) => s + (Number(String(r.QTY || '0').replace(',','.')) || 0), 0);
  const byStatusDepo = {};
  standby.forEach(r => { const d = String(r.Nama_Depo || r.Depo || 'Tidak ditentukan'); if (!byStatusDepo[d]) byStatusDepo[d] = { depo:d, standby:0, kir:0, perbaikan:0, total:0 }; const s=norm(r.Status); if (s==='standby') byStatusDepo[d].standby++; else if (s==='kir') byStatusDepo[d].kir++; else if (s==='perbaikan') byStatusDepo[d].perbaikan++; byStatusDepo[d].total++; });
  const driverRows = standby.map(r => ({ driver:r.Nama_Driver || '-', depo:r.Nama_Depo || r.Depo || '-', status:r.Status || '-', nopol:r.Nopol || '-' }));
  const cargoGroups = {};
  cargo.forEach(r => { const key=(r.Nama_Driver || 'Tidak ditentukan')+'|'+(r.Jenis_Muatan || '-'); if(!cargoGroups[key]) cargoGroups[key]={driver:r.Nama_Driver || 'Tidak ditentukan',type:r.Jenis_Muatan || '-',box:0,jugs:0}; const q=Number(String(r.QTY || '0').replace(',','.'))||0; if(norm(r.Satuan)==='box') cargoGroups[key].box+=q; if(norm(r.Satuan)==='jugs') cargoGroups[key].jugs+=q; });
  return { ok:true, user:auth.user, filters:{pt:filters.pt||'',depo:filters.depo||''}, options:{pts:[...new Set(fleetAll.map(r=>r.PT).filter(Boolean))].sort(),depos:[...new Set(fleetAll.map(r=>r.Depo || r.Nama_Depo).filter(Boolean))].sort()},
    fleet:{total:fleet.length,retail:countType(fleet,'Tipe_Pengiriman','Retail'),dropping:countType(fleet,'Tipe_Pengiriman','Dropping'),standby:standby.length,vehicles:groupCount(fleet,'Jenis_Armada'),depots:groupCount(fleet,'Depo'),cargoTypes:groupCount(fleet,'UOM')},
    standby:{total:fleet.length,standby:statusCount('Standby'),kir:statusCount('KIR'),repair:statusCount('Perbaikan'),byDepo:Object.keys(byStatusDepo).map(k=>byStatusDepo[k]),drivers:driverRows},
    cargo:{bkbBox:sumQty(cargo,'BKB','Box'),bkbJugs:sumQty(cargo,'BKB','Jugs'),btbBox:sumQty(cargo,'BTB','Box'),btbJugs:sumQty(cargo,'BTB','Jugs'),rows:Object.keys(cargoGroups).map(k=>cargoGroups[k])}
  };
}
