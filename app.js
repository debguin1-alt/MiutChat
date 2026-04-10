// ── Wire all static HTML event handlers (CSP-safe: no inline onclick/oninput) ─
// Called from DOMContentLoaded. All functions are already on window via Object.assign.
function _wireAllHandlers() {
  // ── Helper: safe getElementById ──────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }
  function on(id, evt, fn, opts) {
    const e = el(id); if (e) e.addEventListener(evt, fn, opts);
  }
  function onQ(sel, evt, fn) {
    document.querySelectorAll(sel).forEach(e => e.addEventListener(evt, fn));
  }

  // ── Join screen tabs ──────────────────────────────────────────────────────────
  onQ('[data-tab="create"]', 'click', () => switchJoinTab('create'));
  onQ('[data-tab="enter"]',  'click', () => switchJoinTab('enter'));

  // ── Create room ───────────────────────────────────────────────────────────────
  on('input-create-code', 'input',  e => updateEntropyMeter(e.target.value));
  on('input-create-code', 'keyup',  e => updateEntropyMeter(e.target.value));
  on('input-create-code', 'change', e => updateEntropyMeter(e.target.value));
  on('input-create-code', 'compositionend', e => updateEntropyMeter(e.target.value));
  on('create-eye-btn', 'click', () => toggleVis('input-create-code', 'create-eye-btn'));
  on('btn-create',     'click', () => handleCreate());

  // ── Enter room ────────────────────────────────────────────────────────────────
  on('enter-eye-btn', 'click', () => toggleVis('input-room-code', 'enter-eye-btn'));
  on('btn-enter',     'click', () => handleEnter());

  // ── Enter room: Enter key ─────────────────────────────────────────────────────
  on('input-room-code', 'keydown', e => { if (e.key === 'Enter') handleEnter(); });

  // ── Waiting screen ────────────────────────────────────────────────────────────
  on('btn-waiting-cancel', 'click', () => cancelJoinRequest());

  // ── Invite screen ─────────────────────────────────────────────────────────────
  on('invite-code-input', 'input',   e => checkInviteCode(e.target));
  on('invite-code-input', 'keydown', e => { if (e.key === 'Enter') joinFromInvite(); });
  on('invite-vis-btn',    'click',   () => toggleVis('invite-code-input', 'invite-vis-btn'));
  on('invite-join-btn',   'click',   () => joinFromInvite());

  // ── Invite back / cancel ──────────────────────────────────────────────────────
  const backBtns = document.querySelectorAll('.btn-invite-back');
  backBtns.forEach(b => b.addEventListener('click', () => cancelInvite()));

  // ── Sidebar ───────────────────────────────────────────────────────────────────
  on('room-code-pill',   'click', () => copyRoomCode());
  // Use data-wired to prevent duplicate listeners from multiple _wireAllHandlers calls
  const wireOnce = (id, evt, fn) => {
    const e = el(id);
    if (!e || e.dataset.wired) return;
    e.dataset.wired = '1';
    e.addEventListener(evt, fn);
  };
  wireOnce('share-room-btn', 'click', () => shareRoomLink());
  wireOnce('settings-btn',   'click', () => openSettings());
  wireOnce('btn-logout',     'click', () => handleLogout());
  // room-code-pill may already be wired above — guard it
  const pillEl = el('room-code-pill');
  if (pillEl && !pillEl.dataset.wired) {
    pillEl.dataset.wired = '1';
    pillEl.addEventListener('click', () => copyRoomCode());
  }
  // sidebar-overlay click is wired in setupSidebar() — not here

  // ── Chat header ───────────────────────────────────────────────────────────────
  on('search-btn', 'click', () => toggleSearch());
  // Copy room code button in header (second copy button, no id)
  document.querySelectorAll('.chat-header .icon-btn').forEach(btn => {
    if (btn.id === 'search-btn' || btn.id === 'hamburger-btn') return;
    btn.addEventListener('click', () => copyRoomCode());
  });

  // ── Search bar ────────────────────────────────────────────────────────────────
  const searchInput = document.querySelector('#search-bar input');
  if (searchInput) {
    searchInput.addEventListener('input',   e => doSearch(e.target.value));
    searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') toggleSearch(); });
  }
  const searchClose = document.querySelector('#search-bar .icon-btn');
  if (searchClose) searchClose.addEventListener('click', () => toggleSearch());

  // ── Reply bar ─────────────────────────────────────────────────────────────────
  on('reply-bar-close', 'click', () => clearReply());
  // reply-bar-close is a button inside reply-bar — also wire by class
  document.querySelectorAll('.reply-bar-close').forEach(b => {
    b.addEventListener('click', () => clearReply());
  });

  // ── Message input ─────────────────────────────────────────────────────────────
  on('msg-input', 'keydown', e => handleKey(e));
  on('msg-input', 'input',   e => handleTyping(e.target));

  // ── Attach button ─────────────────────────────────────────────────────────────
  document.querySelectorAll('.attach-btn').forEach(b => {
    b.addEventListener('click', () => triggerAttach());
  });

  // ── File input ────────────────────────────────────────────────────────────────
  on('file-input', 'change', e => handleFileAttach(e));

  // ── Settings modal ────────────────────────────────────────────────────────────
  on('settings-modal', 'click', e => closeModal(e));
  const settingsCloseBtn = document.querySelector('#settings-modal .modal-header .icon-btn');
  if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', () => closeSettings());

  on('sound-toggle',    'change', () => toggleSoundAlerts());
  on('anim-toggle',     'change', () => toggleAnimations());
  on('approval-toggle', 'change', () => toggleApprovalGate());
  on('ttl-select',      'change', e => setRoomTtl(+e.target.value));

  const rotateBtn = document.querySelector('#rotate-key-row .btn-rotate-key');
  if (rotateBtn) rotateBtn.addEventListener('click', () => { rotateKey(); closeSettings(); });

  const saveBtn = document.querySelector('#settings-modal .btn-join');
  if (saveBtn) saveBtn.addEventListener('click', () => saveSettings());

  const installBtn = document.querySelector('#install-app-row .btn-rotate-key');
  if (installBtn) installBtn.addEventListener('click', () => triggerPWAInstall());

  // ── Media viewer ──────────────────────────────────────────────────────────────
  on('media-viewer', 'click', () => closeMediaViewer());
  on('mv-close',     'click', e => { e.stopPropagation(); closeMediaViewer(); });
}

'use strict';
// @ts-check
(function (_W) {
// script internals are now encapsulated — only window.X exports below are public.

/* ── Global error telemetry ─────────────────────────────────────────────────
 * Catches all uncaught JS errors and unhandled promise rejections.
 * Reports to /api/csp-report (reuses the existing CF Function endpoint)
 * with a distinct type so server logs can split CSP vs JS errors.
 * Rate-limited to 5 reports per session to avoid flooding on bad states.
 * ───────────────────────────────────────────────────────────────────────── */
(function _installGlobalErrorHandlers() {
  let _errReportCount = 0;
  const _ERR_REPORT_LIMIT = 5;

  function _reportError(detail) {
    if (_errReportCount >= _ERR_REPORT_LIMIT) return;
    _errReportCount++;
    try {
      navigator.sendBeacon('/api/csp-report', JSON.stringify({
        type:      'js-error',
        message:   String(detail.message  || '').slice(0, 300),
        source:    String(detail.source   || '').slice(0, 200),
        lineno:    detail.lineno   || 0,
        colno:     detail.colno    || 0,
        stack:     String(detail.stack    || '').slice(0, 500),
        userAgent: navigator.userAgent.slice(0, 200),
        href:      location.pathname,
        ts:        Date.now(),
      }));
    } catch { /* sendBeacon may fail in some environments — never throw from error handler */ }
  }

  window.onerror = function (message, source, lineno, colno, error) {
    console.error('[MIUT] Uncaught error:', message, { source, lineno, colno, error });
    _reportError({ message, source, lineno, colno, stack: error?.stack });
    return false; // let browser default handling proceed
  };

  window.addEventListener('unhandledrejection', function (ev) {
    const reason = ev.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error('[MIUT] Unhandled rejection:', message, reason);
    _reportError({
      message: 'UnhandledRejection: ' + message,
      stack:   reason instanceof Error ? reason.stack : '',
    });
  });
})();

// DevTools. Full mitigation requires ES module migration (type="module") which
// is a larger refactor outside this patch pass. The Firestore Security Rules
// (firestore.rules) provide the authoritative server-side enforcement regardless.

// Firebase configuration lives entirely in db-manager.js → _DB_CONFIGS[0].
// db-manager.js initialises all Firebase apps before app.js runs.
// app.js references apps by name ('miut-db0') — never calls initializeApp itself.
//
// NOTE on Anonymous Auth: the compat SDK is loaded via <script> tags, so use:
//   firebase.auth(app).signInAnonymously()   ← correct for this project
// NOT the ES module import style:
//   import { getAuth, signInAnonymously } from "firebase/auth"  ← wrong (needs bundler)

// Room codes are used as Firestore document IDs. Without an allowlist, special
// characters like / cause path-traversal, and . / .. cause SDK errors.
// Applied at every entry point (handleCreate, handleEnter, joinFromInvite).
const _ROOM_CODE_RE = /^[a-zA-Z0-9 _\-@#!?+*=.]{6,64}$/;
const APP_VERSION = '1.0.0';

function validateRoomCode(code) {
  if (!code || typeof code !== 'string') {
    showError('Please enter a room code'); return false;
  }
  // Reject codes with zero-width or homoglyph-prone chars
  const cleaned = code.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
  if (cleaned !== code) { showError('Room code contains invalid characters'); return false; }
  if (!_ROOM_CODE_RE.test(code)) {
    showError('Room code contains invalid characters. Use letters, numbers, spaces, or _ - @ # ! ? + * = .'); return false;
  }
  if (code === '.' || code === '..') {
    showError('Invalid room code'); return false;
  }
  return true;
}

const CONFIG = {
  SESSION_KEY:        'miut_session_v2',
  ROOM_KEY:           'miut_room_v1',
  PREFS_KEY:          'miut_prefs_v1',
  TYPING_WRITE_MS:    2000,
  TYPING_EXPIRE_MS:   5000,
  TYPING_IDLE_MS:     3000,
  HEARTBEAT_MS:       20000,
  MAX_FILE_BYTES:     25 * 1024 * 1024,


  CHUNK_BYTES:        700 * 1024,  // 700KB raw → ~933KB base64 → safely under Firestore 1MB doc limit
  IDB_NAME:           'miut-v1',
  IDB_VER:            2,
  EDIT_WINDOW_MS:     2 * 60 * 1000,
};
let _authReady = null;

// Anonymous Auth uses the Firebase compat SDK (script-tag loaded).
// Compat syntax: firebase.auth(app).signInAnonymously()
// NOT the ES module syntax (import { getAuth } from "firebase/auth") — that needs a bundler.
async function ensureAuth() {
  if (_authReady) return _authReady;
  _authReady = (async () => {
    if (window._dbFirebaseReady) {
      try { await window._dbFirebaseReady; }
      catch (e) { _authReady = null; throw e; }
    } else {
      await Promise.resolve();
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK unavailable — check your connection or ad blocker.');
      }
    }
    // Retry up to 3 times with exponential backoff for network failures
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 900 * Math.pow(2, attempt - 1)));
      try {
        const uid = await new Promise((resolve, reject) => {
          try {
            const authApp  = firebase.app('miut-db0');
            const authInst = firebase.auth(authApp);
            const unsub = authInst.onAuthStateChanged(user => {
              unsub();
              if (user) { resolve(user.uid); return; }
              authInst.signInAnonymously()
                .then(cred => resolve(cred.user.uid))
                .catch(reject);
            }, reject);
          } catch (err) { reject(err); }
        });
        return uid;
      } catch (err) {
        lastErr = err;
        const code = err?.code || '';
        // Only retry transient network errors, not config errors
        if (code.startsWith('auth/') && !code.includes('network') && !code.includes('too-many-requests')) break;
      }
    }
    _authReady = null;
    throw lastErr;
  })().catch(err => { _authReady = null; throw err; });
  return _authReady;
}

let state = {
  me:         null,
  roomCode:   null,
  prefs: {
    sound:            true,
    animations:       true,
    approvalRequired: false,
  },
};

let db             = null;
let _unsubMsgs     = null;
let _unsubMembers  = null;
let _unsubTyping   = null;
let _heartbeat     = null;
let _typingTimer   = null;
let _lastTypeWrite = 0;
let _isTyping      = false;
let _sidebarOpen   = false;
let _renderedIds   = new Set();
let _lastCachedTs  = 0;
let _idb           = null;
let _onlineCount   = 0;
let _sigPrivKey    = null;
let _pubKeyB64     = null;

// ─── Advanced security & feature state ───────────────────────────────────────
let _seenDocIds        = new Set();   // canary: detect Firestore injection replay
let _integrityViolations = 0;         // count of failed signature verifications
let _sessionHmacKey    = null;        // per-session HMAC key for local integrity
let _lastEpochRotate   = 0;           // timestamp of last epoch rotation
let _readReceiptTimer  = null;        // debounce handle for bulk read-receipt writes
let _pendingReadAcks   = new Set();   // docIds queued to be marked as read
let _expiryTimer       = null;        // setInterval handle for message expiry sweep
// ─────────────────────────────────────────────────────────────────────────────

function _lruMap(maxSize) {
  const m = new Map();
  return {
    has: k => m.has(k),
    get(k) {
      if (!m.has(k)) return undefined;
      const v = m.get(k); m.delete(k); m.set(k, v); return v;
    },
    set(k, v) {
      if (m.has(k)) m.delete(k);
      else if (m.size >= maxSize) m.delete(m.keys().next().value);
      m.set(k, v);
    },
  };
}

const _pubKeyCache = _lruMap(200); // LRU-capped; was unbounded Map
let _unsubApproval   = null;
let _isAdmin         = false;
let _presenceSettled = false;


let _unreadCount     = 0;

function openIDB() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((res, rej) => {
    const req = indexedDB.open(CONFIG.IDB_NAME, CONFIG.IDB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('msgs')) {
        const s = d.createObjectStore('msgs', { keyPath: 'id' });
        s.createIndex('room_ts', ['room', 'ts']);
      }
      if (!d.objectStoreNames.contains('meta'))
        d.createObjectStore('meta', { keyPath: 'k' });
      if (!d.objectStoreNames.contains('blobs'))
        d.createObjectStore('blobs', { keyPath: 'id' });

      if (!d.objectStoreNames.contains('sigkey'))
        d.createObjectStore('sigkey', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('pubkeys'))
        d.createObjectStore('pubkeys', { keyPath: 'uid' });
    };
    req.onsuccess = e => { _idb = e.target.result; res(_idb); };
    req.onerror   = e => rej(e.target.error);
  });
}
async function idbTx(stores, mode, fn) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(stores, mode);
    let _result;
    tx.oncomplete = () => res(_result);
    tx.onerror    = e => rej(e.target.error);
    tx.onabort    = e => rej(e.target.error || new Error('IDB transaction aborted'));
    fn(tx, v => { _result = v; }, rej);
  });
}

async function idbPut(store, val) {
  return idbTx(store, 'readwrite', (tx, res) => {
    const req = tx.objectStore(store).put(val);
    req.onsuccess = () => res(req.result);
  });
}

async function idbGetAll(store) {
  return idbTx(store, 'readonly', (tx, res) => {
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
  });
}

async function idbGetMeta(k) {
  return idbTx('meta', 'readonly', (tx, res) => {
    const req = tx.objectStore('meta').get(k);
    req.onsuccess = () => res(req.result?.v ?? null);
  });
}
async function idbSetMeta(k, v) { return idbPut('meta', { k, v }); }
async function idbGetBlob(id) {
  return idbTx('blobs', 'readonly', (tx, res) => {
    const req = tx.objectStore('blobs').get(id);
    req.onsuccess = () => res(req.result?.bytes ?? null);
  });
}
async function idbSetBlob(id, bytes) { return idbPut('blobs', { id, bytes }); }
async function cacheMsg(docId, room, data) {
  try {
    const ts = data.createdAt?.toMillis?.() ?? data.ts ?? 0;
    await idbPut('msgs', { id: docId, room, data, ts });
    // Only update high-water mark if ts is meaningful (non-zero)
    if (ts > 0) {
      const prev = (await idbGetMeta(`ts:${room}`)) || 0;
      if (ts > prev) await idbSetMeta(`ts:${room}`, ts);
    }
  } catch {}
}
async function loadCached(room) {
  try {
    const idb = await openIDB();
    return await new Promise((res, rej) => {
      const tx    = idb.transaction('msgs', 'readonly');
      const idx   = tx.objectStore('msgs').index('room_ts');
      const range = IDBKeyRange.bound([room, 0], [room, Infinity]);
      const req   = idx.getAll(range);
      req.onsuccess = () => res(req.result || []);
      req.onerror   = () => rej(req.error);
    });
  } catch { return []; }
}
async function clearCacheForRoom(room) {
  try {
    const idb     = await openIDB();
    const records = await loadCached(room);
    await new Promise((res, rej) => {
      const tx  = idb.transaction(['msgs', 'meta'], 'readwrite');
      tx.oncomplete = res;
      tx.onerror    = e => rej(e.target.error);
      tx.onabort    = e => rej(e.target.error);
      records.forEach(r => tx.objectStore('msgs').delete(r.id));
      tx.objectStore('meta').delete(`ts:${room}`);
    });
  } catch {}
}

let _roomEpoch   = 0;
let _roomSalt    = /** @type {string|null} */ (null); // null = legacy deterministic salt
let _unsubRoom   = null;

const _epochKeys       = _lruMap(50);   // (code:epoch) → CryptoKey
const _importedPubKeys = _lruMap(200);  // b64 → CryptoKey
const _substCache      = _lruMap(20);   // code → { fwd, rev } substitution tables

// ─── Room-code-derived substitution cipher ───────────────────────────────────
// Applied BEFORE compression and AES-GCM encryption.
// Each room code produces a unique, deterministic byte-shuffling table via
// SHA-256. Even if AES were somehow compromised, an attacker would only see
// shuffled bytes — not recognisable text patterns.
// Pipeline: text → substituteBytes → compress → AES-256-GCM → base64
async function _getSubstTable(code) {
  if (_substCache.has(code)) return _substCache.get(code);
  const seed  = new TextEncoder().encode('MIUT_SUBST_V1|' + code);
  const hash  = new Uint8Array(await crypto.subtle.digest('SHA-256', seed));
  // Fisher-Yates shuffle seeded deterministically from hash
  const fwd = new Uint8Array(256);
  for (let i = 0; i < 256; i++) fwd[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (hash[i & 31] ^ hash[(i * 7) & 31] ^ (i * 13)) & 0xff;
    const t = fwd[i]; fwd[i] = fwd[j % (i + 1)]; fwd[j % (i + 1)] = t;
  }
  const rev = new Uint8Array(256);
  for (let i = 0; i < 256; i++) rev[fwd[i]] = i;
  const tbl = { fwd, rev };
  _substCache.set(code, tbl);
  return tbl;
}
function _applySubst(bytes, table) {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = table[bytes[i]];
  return out;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Auto epoch rotation counters ────────────────────────────────────────────
const _AUTO_EPOCH_MSG_COUNT = 200; // rotate key every N messages (admin only)
let   _msgsSinceEpoch       = 0;
// ─────────────────────────────────────────────────────────────────────────────

async function _getEpochKey(code, epoch) {
  // v2 rooms: random salt stored in Firestore (more secure)
  // v1 rooms: deterministic salt (backward-compatible with existing rooms)
  const saltTag  = _roomSalt || 'v1';
  const cacheKey = `${code}:${epoch}:${saltTag}`;
  if (_epochKeys.has(cacheKey)) return _epochKeys.get(cacheKey);

  let salt;
  if (_roomSalt) {
    salt = _b64uDec(_roomSalt);                          // random 16 bytes from room doc
  } else {
    const saltInput = new TextEncoder().encode(`NEXUS_EPOCH|${code}|${epoch}`);
    const saltHash  = await crypto.subtle.digest('SHA-256', saltInput);
    salt = new Uint8Array(saltHash).slice(0, 16);         // legacy deterministic
  }

  const raw  = new TextEncoder().encode(code);
  const base = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveKey']);
  const key  = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  _epochKeys.set(cacheKey, key);
  return key;
}
function _b64uEnc(buf) {
  let s = ''; const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
  return btoa(s).replace(/\+/g,'-').split('/').join('_').replace(/=/g,'');
}
function _b64uDec(s) {
  return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
}
const _COMPRESS_MARKER   = 0x43;
const _NOCOMPRESS_MARKER = 0x4e;

let _compressionSupported = null;
async function _testCompression() {
  if (_compressionSupported !== null) return _compressionSupported;
  try {
    if (typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined') {
      _compressionSupported = false; return false;
    }
    const cs = new CompressionStream('deflate-raw');
    const w  = cs.writable.getWriter();
    w.write(new TextEncoder().encode('test'));
    w.close();
    const reader = cs.readable.getReader();
    const { value } = await reader.read();
    _compressionSupported = value instanceof Uint8Array && value.length > 0;
  } catch {
    _compressionSupported = false;
  }
  return _compressionSupported;
}

async function _collectStream(readable) {
  const chunks = [], reader = readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function _compress(str) {
  const raw = new TextEncoder().encode(str);
  if (!(await _testCompression())) {
    const out = new Uint8Array(1 + raw.length);
    out[0] = _NOCOMPRESS_MARKER;
    out.set(raw, 1);
    return out;
  }
  try {
    const cs = new CompressionStream('deflate-raw');
    const w  = cs.writable.getWriter();
    w.write(raw); w.close();
    const compressed = await _collectStream(cs.readable);
    const out = new Uint8Array(1 + compressed.length);
    out[0] = _COMPRESS_MARKER;
    out.set(compressed, 1);
    return out;
  } catch {
    const out = new Uint8Array(1 + raw.length);
    out[0] = _NOCOMPRESS_MARKER;
    out.set(raw, 1);
    return out;
  }
}

async function _decompress(buf) {
  if (!(buf instanceof Uint8Array) || buf.length < 2) {
    return new TextDecoder().decode(buf);
  }
  const marker  = buf[0];
  const payload = buf.slice(1);
  if (marker === _NOCOMPRESS_MARKER) {
    return new TextDecoder().decode(payload);
  }
  if (marker === _COMPRESS_MARKER) {
    if (typeof DecompressionStream === 'undefined') {
      return '[message requires update to read]';
    }
    try {
      const ds = new DecompressionStream('deflate-raw');
      const w  = ds.writable.getWriter();
      w.write(payload); w.close();
      const decompressed = await _collectStream(ds.readable);
      return new TextDecoder().decode(decompressed);
    } catch {
      return '[decryption error]';
    }
  }
  return new TextDecoder().decode(buf);
}
async function enc(text, code) {
  try {
    // PART 5: beforeEncrypt hook
    const _hookPayload = (typeof runHooks === 'function')
      ? await runHooks('beforeEncrypt', { text, code })
      : { text, code };
    const _text = (_hookPayload && _hookPayload.text !== undefined) ? _hookPayload.text : text;

    const compressed = await _compress(_text);
    const tbl        = await _getSubstTable(code);
    const substituted = _applySubst(compressed, tbl.fwd);
    const epoch      = _roomEpoch;
    const key        = await _getEpochKey(code, epoch);

    // PART 8: guaranteed unique IV via security.js (falls back to native)
    const iv = (typeof generateIV === 'function') ? generateIV() : crypto.getRandomValues(new Uint8Array(12));

    const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, substituted);
    const out = new Uint8Array(12 + ct.byteLength);
    out.set(iv, 0);
    out.set(new Uint8Array(ct), 12);
    const result = `e${epoch}:${_b64uEnc(out)}`;

    // PART 5: afterEncrypt hook
    if (typeof runHooks === 'function') await runHooks('afterEncrypt', { result, epoch });

    return result;
  } catch { return ''; }
}
async function dec(payload, code) {
  if (!payload) return '';
  try {
    if (payload.startsWith('e') && /^e\d+:/.test(payload)) {
      const colon = payload.indexOf(':');
      const epoch = parseInt(payload.slice(1, colon), 10);
      const raw   = _b64uDec(payload.slice(colon + 1));
      const key   = await _getEpochKey(code, epoch);
      const pt    = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
      // Reverse substitution cipher, then decompress
      const tbl   = await _getSubstTable(code);
      const unsubstituted = _applySubst(new Uint8Array(pt), tbl.rev);
      return await _decompress(unsubstituted);
    }
    return '[legacy encrypted — rejoin room to continue]';
  } catch { return '[encrypted]'; }
}

async function encBytes(file, code) {
  try {
    const epoch = _roomEpoch;
    const key   = await _getEpochKey(code, epoch);
    const iv    = crypto.getRandomValues(new Uint8Array(12));
    const ct    = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      await file.arrayBuffer()
    );
    const epochBuf = new Uint8Array(4);
    new DataView(epochBuf.buffer).setUint32(0, epoch, false);
    const out = new Uint8Array(4 + 12 + ct.byteLength);
    out.set(epochBuf, 0);
    out.set(iv, 4);
    out.set(new Uint8Array(ct), 16);
    // Build base64 in 16KB chunks to avoid stack overflow on large arrays.
    let s = '';
    for (let i = 0; i < out.length; i += 16384) {
      s += String.fromCharCode(...out.subarray(i, i + 16384));
    }
    return 'b:' + btoa(s);
  } catch(e) { throw e; }
}
async function decBytes(b64full, mime, code) {
  if (b64full.startsWith('b:')) {
    const raw   = Uint8Array.from(atob(b64full.slice(2)), c => c.charCodeAt(0));
    const epoch = new DataView(raw.buffer, 0, 4).getUint32(0, false);
    const iv    = raw.slice(4, 16);
    const ct    = raw.slice(16);
    const key   = await _getEpochKey(code, epoch);
    const pt    = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new Blob([pt], { type: mime });
  }
  throw new Error('Unsupported legacy media format');
}

const _EC_ALGO = { name: 'ECDSA', namedCurve: 'P-256' };
const _EC_SIGN = { name: 'ECDSA', hash: 'SHA-256' };

async function initSigningKey() {
  try {
    const idb = await openIDB();
    const row = await new Promise((res, rej) => {
      const tx = idb.transaction('sigkey', 'readonly');
      const req = tx.objectStore('sigkey').get('my');
      req.onsuccess = () => res(req.result ?? null);
      req.onerror   = () => rej(req.error);
    });
    if (row?.priv && row?.pubB64) {
      _sigPrivKey = await crypto.subtle.importKey('pkcs8', _b64uDec(row.priv), _EC_ALGO, false, ['sign']);
      _pubKeyB64  = row.pubB64;
      return;
    }
    const kp      = await crypto.subtle.generateKey(_EC_ALGO, true, ['sign', 'verify']);
    const privRaw = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
    const pubRaw  = await crypto.subtle.exportKey('spki',  kp.publicKey);
    const privB64 = _b64uEnc(privRaw);
    const pubB64  = _b64uEnc(pubRaw);
    _sigPrivKey   = await crypto.subtle.importKey('pkcs8', privRaw, _EC_ALGO, false, ['sign']);
    _pubKeyB64    = pubB64;
    await new Promise((res, rej) => {
      const tx  = idb.transaction('sigkey', 'readwrite');
      const req = tx.objectStore('sigkey').put({ id: 'my', priv: privB64, pubB64 });
      req.onsuccess = res; req.onerror = rej;
    });
  } catch (e) {

    _sigPrivKey = null; _pubKeyB64 = null;
  }
}

async function signMsg(senderId, ts, encText) {
  if (!_sigPrivKey) return null;
  try {
    const buf = new TextEncoder().encode(`${senderId}|${ts}|${encText}`);
    const sig = await crypto.subtle.sign(_EC_SIGN, _sigPrivKey, buf);
    return _b64uEnc(sig);
  } catch (e) {  return null; }
}

async function verifyMsg(sig, senderId, ts, encText, pubKeyB64) {
  if (!sig || !pubKeyB64) return 'unsigned';
  try {
    const key = await _importPubKey(pubKeyB64);
    const buf = new TextEncoder().encode(`${senderId}|${ts}|${encText}`);
    const ok  = await crypto.subtle.verify(_EC_SIGN, key, _b64uDec(sig), buf);
    return ok ? 'verified' : 'failed';
  } catch { return 'failed'; }
}
async function _importPubKey(b64) {
  if (_importedPubKeys.has(b64)) return _importedPubKeys.get(b64);
  const key = await crypto.subtle.importKey('spki', _b64uDec(b64), _EC_ALGO, false, ['verify']);
  _importedPubKeys.set(b64, key);
  return key;
}

async function getPubKey(uid) {
  if (uid === state.me?.id) return _pubKeyB64;
  if (_pubKeyCache.has(uid)) return _pubKeyCache.get(uid);
  try {
    const idb = await openIDB();
    const row = await new Promise((res) => {
      const tx  = idb.transaction('pubkeys', 'readonly');
      const req = tx.objectStore('pubkeys').get(uid);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror   = () => res(null);
    });
    if (row?.pubB64) { _pubKeyCache.set(uid, row.pubB64); return row.pubB64; }
  } catch {}
  if (!state.roomCode) return null;
  try {
    const snap   = await db.collection('rooms').doc(state.roomCode).collection('members').doc(uid).get();
    const pubB64 = snap.data()?.pubKey ?? null;
    if (pubB64) { _pubKeyCache.set(uid, pubB64); _cachePubKeyIDB(uid, pubB64); }
    return pubB64;
  } catch { return null; }
}

async function _cachePubKeyIDB(uid, pubB64) {
  try {
    const idb = await openIDB();
    await new Promise((res, rej) => {
      const tx  = idb.transaction('pubkeys', 'readwrite');
      const req = tx.objectStore('pubkeys').put({ uid, pubB64 });
      req.onsuccess = res; req.onerror = rej;
    });
  } catch {}
}

async function verifyAndBadge(data, docId) {
  if (!data.sig) return;
  const wrap = document.querySelector(`.msg-wrapper[data-doc-id="${CSS.escape(docId)}"]`);
  if (!wrap) return;
  const pubB64 = await getPubKey(data.senderId);
  const result = await verifyMsg(data.sig, data.senderId, data.ts, data.enc, pubB64);
  if (result === 'failed') {
    wrap.style.display = 'none';
    wrap.setAttribute('data-sig-blocked', '1');
  }
}

const $  = id  => document.getElementById(id);
const qs = sel => document.querySelector(sel);

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function calcEntropy(code) {
  if (!code) return 0;
  let pool = 0;
  if (/[a-z]/.test(code)) pool += 26;
  if (/[A-Z]/.test(code)) pool += 26;
  if (/[0-9]/.test(code)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(code)) pool += 32;

  // Penalise repeated characters e.g. "aaaaaaaaaa"
  const unique = new Set(code).size;
  const diversity = unique / code.length;  // 1 = all unique, 0.1 = very repetitive

  // Bits of entropy approximation
  const bits = code.length * Math.log2(pool || 1) * diversity;

  // Score 0–4
  if (bits < 28) return 0;   // Very Weak  — most PINs, short words
  if (bits < 40) return 1;   // Weak       — phone numbers, "password1"
  if (bits < 55) return 2;   // Fair       — "MySecret99"
  if (bits < 70) return 3;   // Strong     — "Horse#Correct7"
  return 4;                   // Very Strong
}

const _ENTROPY_META = [
  { label: 'VERY WEAK',   color: '#ff4444', width: '15%'  },
  { label: 'WEAK',        color: '#ff8800', width: '30%'  },
  { label: 'FAIR',        color: '#fcc419', width: '55%'  },
  { label: 'STRONG',      color: '#51cf66', width: '78%'  },
  { label: 'VERY STRONG', color: '#2dd4bf', width: '100%' },
];

function updateEntropyMeter(code) {
  const wrap  = $('entropy-wrap');
  const fill  = $('entropy-fill');
  const label = $('entropy-label');
  if (!wrap || !fill || !label) return;

  if (!code) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';

  const score = calcEntropy(code);
  const meta  = _ENTROPY_META[score];
  fill.style.width      = meta.width;
  fill.style.background = meta.color;
  label.textContent     = meta.label;
  label.style.color     = meta.color;
}

// Belt-and-suspenders: also wire a native DOM listener so Android virtual
// keyboards that swallow oninput HTML attributes still trigger the meter.
// Called once after DOM is ready (DOMContentLoaded fires before this via defer).
function _wireEntropyListeners() {
  const el = $('input-create-code');
  if (!el) return;
  ['input', 'keyup', 'compositionend'].forEach(ev => {
    el.addEventListener(ev, function () { updateEntropyMeter(el.value); });
  });
}

// Map Firebase error codes → { title, detail, icon, type }
// type: 'network' | 'auth' | 'quota' | 'permission' | 'notfound' | 'unknown'
const _ERROR_MAP = {
  // ── Firestore errors ──────────────────────────────────────────────────────
  'unavailable':              { title: 'Server unreachable',     detail: 'Check your connection and try again.',           icon: '📡', type: 'network'     },
  'network-request-failed':   { title: 'No internet connection', detail: 'You appear to be offline.',                     icon: '📶', type: 'network'     },
  'deadline-exceeded':        { title: 'Request timed out',      detail: 'Server took too long — try again.',             icon: '⏱',  type: 'network'     },
  'resource-exhausted':       { title: 'Server busy',            detail: 'Quota exceeded. Try again in a few minutes.',   icon: '⚠',  type: 'quota'       },
  'permission-denied':        { title: 'Access denied',          detail: "You don't have permission for this action.",   icon: '🔒', type: 'permission'  },
  'unauthenticated':          { title: 'Not signed in',          detail: 'Reload the page and try again.',                icon: '🔑', type: 'auth'        },
  'not-found':                { title: 'Room not found',         detail: 'The room may have been closed.',                icon: '🔍', type: 'notfound'    },
  'already-exists':           { title: 'Already exists',         detail: 'A room with this code already exists.',         icon: '♻',  type: 'notfound'    },
  'cancelled':                { title: 'Operation cancelled',    detail: 'The request was cancelled — try again.',        icon: '✗',  type: 'unknown'     },
  'internal':                 { title: 'Server error',           detail: 'An internal error occurred. Try again.',        icon: '⚡', type: 'unknown'     },
  'DB probe timeout':         { title: 'Connection timeout',     detail: 'Database took too long to respond.',            icon: '⏱',  type: 'network'     },
  // ── Firebase Auth errors ──────────────────────────────────────────────────
  'auth/operation-not-allowed':    { title: 'Anonymous auth disabled',  detail: 'Enable Anonymous Auth in Firebase Console → Authentication → Sign-in method.', icon: '🔧', type: 'auth' },
  'auth/network-request-failed':   { title: 'No internet',              detail: 'Cannot reach authentication servers.',          icon: '📶', type: 'network' },
  'auth/too-many-requests':        { title: 'Too many attempts',        detail: 'Wait a moment before trying again.',            icon: '⛔', type: 'quota'   },
  'auth/invalid-api-key':          { title: 'Firebase config error',    detail: 'Firebase API key is missing or invalid. Check db-manager.js config.', icon: '🔑', type: 'auth' },
  'auth/app-not-authorized':       { title: 'Domain not authorized',    detail: 'Add this domain to Firebase Console → Authentication → Settings → Authorized domains.', icon: '🌐', type: 'auth' },
  'auth/unauthorized-domain':      { title: 'Domain not authorized',    detail: 'Add this domain to Firebase Console → Authentication → Settings → Authorized domains.', icon: '🌐', type: 'auth' },
  'auth/invalid-app-id':           { title: 'Firebase config error',    detail: 'Invalid Firebase App ID in db-manager.js.',     icon: '🔑', type: 'auth' },
  'auth/app-deleted':              { title: 'Firebase project deleted',  detail: 'The Firebase project no longer exists.',        icon: '🗑', type: 'auth' },
  'auth/cors-unsupported':         { title: 'Browser not supported',    detail: 'Try a different browser.',                      icon: '🌐', type: 'auth' },
  'auth/web-storage-unsupported':  { title: 'Storage disabled',         detail: 'Enable cookies and local storage in your browser settings.', icon: '🍪', type: 'auth' },
  'auth/auth-domain-config-required': { title: 'Firebase config error', detail: 'authDomain is missing from Firebase config.',   icon: '🔑', type: 'auth' },
  'appCheck/token-error':             { title: 'App Check not configured', detail: 'Add your reCAPTCHA v3 site key to db-manager.js and register it in Firebase Console → App Check.', icon: '🛡', type: 'auth' },
  'app-check/token-error':            { title: 'App Check not configured', detail: 'Add your reCAPTCHA v3 site key to db-manager.js and register it in Firebase Console → App Check.', icon: '🛡', type: 'auth' },
  'app check token':                  { title: 'App Check not configured', detail: 'Add your reCAPTCHA v3 site key to db-manager.js and register it in Firebase Console → App Check.', icon: '🛡', type: 'auth' },
  'no-app':                        { title: 'Firebase not initialised',  detail: 'Firebase app failed to start. Reload the page.', icon: '🔥', type: 'auth' },
  'load failed':                   { title: 'No internet connection',   detail: 'Check your connection and try again.',           icon: '📶', type: 'network' },
};

/**
 * _classifyError(e)
 * Returns { title, detail, icon, type } for any Firebase or JS error.
 * Always returns something human-readable — never exposes raw SDK messages.
 */
function _classifyError(e) {
  if (!e) return { title: 'Something went wrong', detail: 'Try again.', icon: '⚠', type: 'unknown' };

  // Firebase SDK errors have e.code like 'firestore/unavailable'
  const raw  = (e?.code || e?.message || String(e)).toLowerCase();
  const code = raw.replace(/^[a-z-]+\//, ''); // strip 'firestore/' prefix

  // Direct match
  for (const [key, val] of Object.entries(_ERROR_MAP)) {
    if (code.includes(key.toLowerCase()) || raw.includes(key.toLowerCase())) return val;
  }

  // Heuristic fallbacks
  if (raw.includes('offline') || raw.includes('network') || raw.includes('fetch'))
    return { title: 'No internet connection', detail: 'You appear to be offline.', icon: '📶', type: 'network' };
  if (raw.includes('timeout') || raw.includes('deadline'))
    return { title: 'Request timed out', detail: 'Try again.', icon: '⏱', type: 'network' };
  if (raw.includes('quota') || raw.includes('resource'))
    return { title: 'Server busy', detail: 'Try again in a few minutes.', icon: '⚠', type: 'quota' };
  if (raw.includes('permission') || raw.includes('forbidden') || raw.includes('unauthorized'))
    return { title: 'Access denied', detail: "You don't have permission.", icon: '🔒', type: 'permission' };

  // Show the raw error code so users can report exactly what went wrong
  const hint = e?.code ? ' [' + e.code + ']' : (e?.message ? ' [' + String(e.message).slice(0, 60) + ']' : '');
  return { title: 'Connection error', detail: 'Check your connection and try again.' + hint, icon: '📡', type: 'unknown' };
}

// ─── Persistent Rate Limiter ─────────────────────────────────────────────────
const WRONG_CODE_LIMIT = 3; // 3 attempts before 30-second lockout
let   _countdownTimer  = null;
// Uses localStorage so a page reload does NOT reset the counter.
// Token-bucket: refills 1 token every REFILL_MS up to MAX_TOKENS.
// Wrong-code lockout uses separate exponential backoff also persisted.
const _RL_KEY    = 'miut_rl_v1';        // localStorage key
const _RL_WRONG  = 'miut_rl_wrong_v1';  // wrong-code lockout key

function _loadRlState(key, defaults) {
  try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(key) || '{}')); }
  catch { return Object.assign({}, defaults); }
}
function _saveRlState(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
}

const _RL_CFG = {
  create: { maxTokens: 5,  refillMs: 30000  },   // 5 creates per 30 s
  enter:  { maxTokens: 10, refillMs: 60000  },   // 10 enters per 60 s
  send:   { maxTokens: 20, refillMs: 10000  },   // 20 msgs per 10 s
};

function _consumeToken(type) {
  const cfg  = _RL_CFG[type]; if (!cfg) return true;
  const key  = `${_RL_KEY}_${type}`;
  const now  = Date.now();
  const st   = _loadRlState(key, { tokens: cfg.maxTokens, lastRefill: now });

  // Refill proportionally to elapsed time
  const elapsed = now - (st.lastRefill || now);
  const refilled = Math.floor(elapsed / cfg.refillMs);
  if (refilled > 0) {
    st.tokens     = Math.min(cfg.maxTokens, (st.tokens || 0) + refilled);
    st.lastRefill = now;
  }

  if (st.tokens <= 0) { _saveRlState(key, st); return false; }
  st.tokens--;
  _saveRlState(key, st);
  return true;
}

function _getRlWaitMs(type) {
  const cfg = _RL_CFG[type]; if (!cfg) return 0;
  const key = `${_RL_KEY}_${type}`;
  const now = Date.now();
  const st  = _loadRlState(key, { tokens: cfg.maxTokens, lastRefill: now });
  if ((st.tokens || 0) > 0) return 0;
  const sinceRefill = now - (st.lastRefill || now);
  return Math.max(0, cfg.refillMs - (sinceRefill % cfg.refillMs));
}

/* ── Edge-backed rate limiter ─────────────────────────────────────────────
 * Two-layer approach:
 *  1. localStorage token bucket  — instant, local, bypassable by incognito
 *  2. Edge KV token bucket       — server-side per-IP, bypasses incognito/curl
 * The local check acts as a fast pre-check to avoid unnecessary edge calls.
 * The edge check is the authoritative limit — it runs in parallel and
 * blocks the action if the edge returns 429, even if local tokens remain.
 * ──────────────────────────────────────────────────────────────────────── */
async function checkRateLimit(type) {
  // Fast path: local token consumed — skip edge call for obvious over-use
  const localAllowed = _consumeToken(type);
  if (!localAllowed) {
    const waitMs = _getRlWaitMs(type);
    _startCountdown(waitMs, type);
    showError('');
    return false;
  }

  // Slow path: authoritative edge check (IP-based, KV-backed, incognito-proof)
  try {
    const res = await fetch('/api/rate-limit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: type }),
      // Short timeout — if edge is unavailable, fall through to local-only
      signal:  AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const retryAfterSec = parseInt(res.headers.get('Retry-After') || '30', 10);
      _startCountdown(retryAfterSec * 1000, type);
      showError('');
      return false;
    }

    if (!res.ok) {
      // Non-429 error from edge (500, etc.) — log and allow locally so a
      // temporary edge outage does not block all users
    }
  } catch (err) {
    // Network error or timeout — fall through to local-only mode
    if (err.name !== 'AbortError') {
    }
  }

  return true;
}

// Wrong-code lockout — persisted across reloads
function _loadWrongState() {
  return _loadRlState(_RL_WRONG, { wrongCount: 0, lockedUntil: 0 });
}
function _saveWrongState(obj) { _saveRlState(_RL_WRONG, obj); }

function _recordWrongCode() {
  const now  = Date.now();
  const st   = _loadWrongState();
  st.wrongCount = (st.wrongCount || 0) + 1;

  const errEl = $('join-error') || $('invite-error');

  if (st.wrongCount < WRONG_CODE_LIMIT) {
    // Show remaining attempts — no lockout yet
    const left = WRONG_CODE_LIMIT - st.wrongCount;
    _saveWrongState(st);
    if (errEl) {
      errEl.textContent = `Wrong code — ${left} attempt${left !== 1 ? 's' : ''} remaining`;
      errEl.style.color = 'var(--danger)';
    }
    return;
  }

  // Lockout: 30 seconds flat after exhausting attempts
  st.lockedUntil = now + 30000;
  st.wrongCount  = 0; // reset count so next lockout starts fresh
  _saveWrongState(st);
  if (errEl) errEl.textContent = '';
  _startCountdown(30000, 'enter');
}

function _checkEnterLock() {
  const now = Date.now();
  const st  = _loadWrongState();
  if ((st.lockedUntil || 0) > now) {
    const remaining = st.lockedUntil - now;
    if (!_countdownTimer) _startCountdown(remaining, 'enter');
    return false;
  }
  return true;
}

// Send-rate limit (in-memory only — resets on reload is acceptable for sends)
const _sendRl = { count: 0, resetAt: 0 };
function checkSendRateLimit() {
  const now = Date.now();
  if (now > _sendRl.resetAt) { _sendRl.count = 0; _sendRl.resetAt = now + 10000; }
  _sendRl.count++;
  if (_sendRl.count > 20) { toast('Slow down', 'Too many messages sent too quickly.', '⚠'); return false; }
  return true;
}
// ─────────────────────────────────────────────────────────────────────────────

function _startCountdown(ms, context) {
  if (_countdownTimer) { clearInterval(_countdownTimer); _countdownTimer = null; }
  const endTime = Date.now() + ms;

  const _getBtn = () => {
    if (context === 'create') return $('btn-create');
    return $('btn-enter') || $('invite-join-btn');
  };

  function _tick() {
    const remaining = Math.ceil((endTime - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(_countdownTimer); _countdownTimer = null;
      const errEl = $('join-error') || $('invite-error');
      const cdEl  = $('nx-countdown');
      if (errEl) { errEl.textContent = ''; errEl.className = 'error-msg'; }
      if (cdEl)  cdEl.remove();
      const btn = _getBtn();
      if (btn) {
        btn.disabled = false;
        const sp = btn.querySelector('span');
        if (sp) {
          if (context === 'create')          sp.textContent = 'Create Room';
          else if (btn.id === 'invite-join-btn') sp.textContent = 'Join Room';
          else                               sp.textContent = 'Enter Room';
        }
      }
      return;
    }
    const mins    = Math.floor(remaining / 60);
    const secs    = remaining % 60;
    const timeStr = mins > 0 ? mins + 'm ' + String(secs).padStart(2,'0') + 's' : secs + 's';
    const colour  = remaining < 10 ? '#ff4444' : remaining < 30 ? '#f97316' : 'var(--danger)';
    const pct     = ((ms - (endTime - Date.now())) / ms * 100).toFixed(1);

    let cdEl = $('nx-countdown');
    if (!cdEl) {
      cdEl = document.createElement('div');
      cdEl.id = 'nx-countdown';
      const errEl = $('join-error') || $('invite-error');
      if (errEl) errEl.insertAdjacentElement('afterend', cdEl);
    }
    cdEl.className = 'nx-countdown-bar';
    cdEl.innerHTML =
      '<svg viewBox="0 0 20 20" fill="none" width="13" height="13" style="flex-shrink:0;color:' + colour + '">' +
        '<circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.6"/>' +
        '<path d="M10 6v4l2.5 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '</svg>' +
      '<span style="color:' + colour + ';font-family:var(--fmono);font-size:.72rem;letter-spacing:.5px">' +
        'Too many attempts — wait <strong>' + timeStr + '</strong>' +
      '</span>' +
      '<div class="nx-countdown-progress" style="--p:' + pct + '%;--c:' + colour + '"></div>';

    const btn = _getBtn();
    if (btn) btn.disabled = true;
  }

  _tick();
  _countdownTimer = setInterval(_tick, 250);
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts), n = new Date();
  return d.toDateString() === n.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function fmtBytes(b) {
  return b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB';
}
function ts_now() { return firebase.firestore.FieldValue.serverTimestamp(); }

const AV_COLORS = ['#2dd4bf','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#6366f1','#a855f7'];
const REACTION_EMOJIS  = ['👍','❤️','😂','😮','😢','🔥','👀','🎉'];
const EXTENDED_EMOJIS = [
  '👍','❤️','😂','😮','😢','🔥','👀','🎉',
  '🙏','💯','✨','🤔','😍','🥰','😎','🤯',
  '😭','🫡','💀','🤣','😅','🙌','💪','🤝',
  '👏','🫶','❗','✅','🚀','💬','🎯','⚡',
];
function avatarColor(s) { let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))&0xffffffff; return AV_COLORS[Math.abs(h)%AV_COLORS.length]; }
function initials(n)     { return n.trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||'').join('').slice(0,2)||'??'; }

const _A=['DARK','FAST','COLD','BOLD','VOID','NEON','GREY','IRON','WILD','FLUX'];
const _N=['FOX','OWL','RAY','ACE','SKY','KAI','ZEN','MAX','REX','DOT'];
function genCallsign() { return `${_A[Math.random()*_A.length|0]} ${_N[Math.random()*_N.length|0]}${(Math.random()*90+10)|0}`; }
// getUID() — always returns the Firebase Anonymous Auth UID.
// If auth fails (network down, quota exceeded), throws — callers must handle.
// A localStorage fallback UID has no JWT and fails all Firestore rules.
async function getUID() {
  const uid = await ensureAuth(); // throws on auth failure — handled by callers
  return uid;
}

function saveSession() { localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(state.me)); }
function loadSession() { try { return JSON.parse(localStorage.getItem(CONFIG.SESSION_KEY)); } catch { return null; } }
function saveRoom(c)   { localStorage.setItem(CONFIG.ROOM_KEY, c); }
function loadRoom()    { return localStorage.getItem(CONFIG.ROOM_KEY); }

window.addEventListener('DOMContentLoaded', () => {
  _wireAllHandlers();
  _wireEntropyListeners();
  // ── Rotating placeholder text (CSP-safe, moved from inline HTML script) ──
  (function initRotatingPlaceholders() {
    function rotatePlaceholder(input) {
      var list;
      try { list = JSON.parse(input.dataset.placeholders || '[]'); } catch { return; }
      if (!list.length) return;
      var idx = 0;
      setInterval(function () {
        if (document.activeElement === input || input.value) return;
        input.classList.add('ph-fade');
        setTimeout(function () {
          idx = (idx + 1) % list.length;
          input.placeholder = list[idx];
          input.classList.remove('ph-fade');
        }, 400);
      }, 2200);
    }
    document.querySelectorAll('[data-placeholders]').forEach(rotatePlaceholder);
  })();


  // ── Offline / online banner ─────────────────────────────────────────────
  function _updateOnlineBanner() {
    let b = document.getElementById('offline-banner');
    if (navigator.onLine) { b?.remove(); return; }
    if (!b) {
      b = document.createElement('div');
      b.id = 'offline-banner';
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:var(--danger,#e74c3c);color:#fff;text-align:center;padding:6px 12px;font-size:.72rem;font-family:var(--fmono,monospace);letter-spacing:.5px';
      b.textContent = '⚠ No internet connection — messages will not send';
      document.body.prepend(b);
    }
  }
  window.addEventListener('online',  _updateOnlineBanner);
  window.addEventListener('offline', _updateOnlineBanner);
  _updateOnlineBanner();

  // Start anonymous auth immediately — warm up the JWT before any room action.

  // Prefs
  try {
    const p = JSON.parse(localStorage.getItem(CONFIG.PREFS_KEY) || '{}');
    Object.assign(state.prefs, p);
  } catch {}

  // Open IDB (non-blocking)
  openIDB().catch(() => {});
  // db is set to the correct shard on room join/create via getDb(roomCode).
  // We set a default here so code that accesses db before joining (rare)
  // doesn't throw — it will be overwritten by the first getDb() call.
  // Await _dbFirebaseReady to ensure the compat SDK has loaded before use.
  (window._dbFirebaseReady || Promise.resolve()).then(() => {
    try {
      db = firebase.firestore(firebase.app('miut-db0'));
    } catch (e) {
    }
  }).catch(err => {
    console.error('[App] Firebase unavailable at startup:', err.message);
  });



  // Ripple
  document.addEventListener('touchstart', handleRipple, { passive: true });
  document.addEventListener('mousedown',  handleRipple);

  document.addEventListener('copy',        e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
  document.addEventListener('cut',         e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
  document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea,.msg-bubble')) e.preventDefault(); });
  document.addEventListener('selectstart', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });

  // Sidebar setup
  setupSidebar();
  setupActionBtn();
  setupClipboardPaste();

  // Restore saved name
  const saved = localStorage.getItem('nx_name');
  if (saved) { const el = $('input-name'); if (el) el.value = saved; }

  // Splash → session restore.
  // Always fires after 1800ms regardless of Firebase state.
  setTimeout(() => {
    hideSplash();
    const inviteCode = _detectInviteParam();
    if (inviteCode) {
      showInviteScreen();
      return;
    }
    // Hash-based routing: miutchat.pages.dev/index.html#enterroom or #createroom
    const _hash = (window.location.hash || '').replace('#','').toLowerCase();
    if (_hash === 'enterroom' || _hash === 'joinroom') {
      showScreen('join-screen');
      // Pre-select the Enter tab
      const tabs = document.querySelectorAll('[data-tab]');
      tabs.forEach(t => { t.classList.toggle('active', t.dataset.tab === 'enter'); });
      const panels = document.querySelectorAll('.tab-panel');
      panels.forEach(p => { p.classList.toggle('active', p.id === 'panel-enter'); });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    if (_hash === 'createroom') {
      showScreen('join-screen');
      const tabs = document.querySelectorAll('[data-tab]');
      tabs.forEach(t => { t.classList.toggle('active', t.dataset.tab === 'create'); });
      const panels = document.querySelectorAll('.tab-panel');
      panels.forEach(p => { p.classList.toggle('active', p.id === 'panel-create'); });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    // PWA / first-visit routing
    // If launched from homescreen (standalone) or already has a session — skip landing
    const _isPWA  = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const _hasSession = !!(loadSession()?.id && loadRoom());
    const me = loadSession(), room = loadRoom();
    if (me?.id && room) { state.me = me; state.roomCode = room; checkApprovalAndBoot(); return; }
    if (_isPWA) { showScreen('join-screen'); return; }
    // First-time visitor check: if never visited, redirect to landing page
    const _hasVisited = localStorage.getItem('miut_visited');
    if (!_hasVisited) {
      localStorage.setItem('miut_visited', '1');
      // Only redirect if not already on index from landing (no referrer from same origin)
      const _fromLanding = document.referrer && document.referrer.includes(window.location.hostname);
      if (!_fromLanding && !inviteCode) {
        window.location.href = '/landing.html';
        return;
      }
    }
    showScreen('join-screen');
  }, 1800);
});

function hideSplash() { $('splash')?.classList.remove('active'); }
function showScreen(id) {
  const next = $(id);
  if (!next) return;
  // Morph-exit the currently active screen
  document.querySelectorAll('.screen.active').forEach(s => {
    if (s.id === id) return;
    s.classList.add('morph-exit');
    s.classList.remove('active');
    setTimeout(() => s.classList.remove('morph-exit'), 350);
  });
  // Small delay so exit animation registers before enter
  requestAnimationFrame(() => {
    next.classList.add('active');
    // Re-trigger nx-anim children so stagger replays each time
    next.querySelectorAll('.nx-anim').forEach(el => {
      el.style.animation = 'none';
      el.style.opacity   = '';
      requestAnimationFrame(() => { el.style.animation = ''; });
    });
  });
}

function setupSidebar() {
  // Create overlay backdrop if not already in DOM
  if (!$('sidebar-overlay')) {
    const o = document.createElement('div');
    o.id = 'sidebar-overlay';
    document.body.appendChild(o);
  }

  // OVERLAY: receives taps on the dark area to the right of sidebar.
  // sidebar is z-index:20, overlay is z-index:18 → browser hit-test
  // ensures taps on the sidebar portion never reach the overlay.
  const ov = $('sidebar-overlay');
  if (ov && !ov._miutWired) {
    ov._miutWired = true;
    // click covers mouse AND tap on most Android/iOS
    ov.addEventListener('click', () => closeSidebar());
    // touchend as belt-and-suspenders for Android Chrome
    ov.addEventListener('touchend', e => {
      e.preventDefault();
      closeSidebar();
    }, { passive: false });
  }

  // HAMBURGER
  const ham = $('hamburger-btn');
  if (ham && !ham._miutWired) {
    ham._miutWired = true;
    ham.addEventListener('click', () => _sidebarOpen ? closeSidebar() : openSidebar());
  }

  // SWIPE: right-from-left-edge opens, left-swipe closes
  if (!document._miutSwipeWired) {
    document._miutSwipeWired = true;
    let _sx = 0, _sy = 0;
    document.addEventListener('touchstart', e => {
      _sx = e.touches[0].clientX;
      _sy = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      if (e.target.closest && e.target.closest('#sidebar')) return;
      const dx = e.changedTouches[0].clientX - _sx;
      const dy = e.changedTouches[0].clientY - _sy;
      if (Math.abs(dy) > Math.abs(dx) * 1.4 || Math.abs(dx) < 50) return;
      if (dx > 0 && _sx < 36 && !_sidebarOpen) openSidebar();
      else if (dx < 0 && _sidebarOpen) closeSidebar();
    }, { passive: true });
  }
}

function toggleSidebar() { _sidebarOpen ? closeSidebar() : openSidebar(); }

function openSidebar() {
  if (window.innerWidth >= 641) return;
  _sidebarOpen = true;
  $('sidebar')?.classList.add('open');
  $('sidebar-overlay')?.classList.add('active');
  document.body.classList.add('sidebar-active');
}

function closeSidebar() {
  _sidebarOpen = false;
  $('sidebar')?.classList.remove('open');
  $('sidebar-overlay')?.classList.remove('active');
  document.body.classList.remove('sidebar-active');
}

function switchJoinTab(tab) {
  if (!['create', 'enter'].includes(tab)) return;
  document.querySelectorAll('.join-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.join-tab-panel').forEach(p => p.classList.remove('active'));
  qs(`.join-tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  $(`tab-${tab}`)?.classList.add('active');
}

function resolveName() {
  const typed = ($('input-name')?.value || '').trim();
  if (typed) { localStorage.setItem('nx_name', typed); return typed; }
  let anon = localStorage.getItem('nx_anon');
  if (!anon) { anon = genCallsign(); localStorage.setItem('nx_anon', anon); }
  return anon;
}

async function handleCreate() {
  if (!(await checkRateLimit('create'))) return;
  const code = ($('input-create-code')?.value || '').trim();
  if (!validateRoomCode(code)) return;

  const score = calcEntropy(code);
  if (score < 2) {
    showError('Code too weak — mix uppercase, numbers, and symbols (e.g. Flash#42)');
    return;
  }

  const btn = $('btn-create');
  setLoading(btn, true, 'Creating…');
  try {
    // getUID() throws if Anonymous Auth is unavailable (network down, not enabled in console)
    const uid = await getUID();
    if (typeof getDb !== 'function') throw new Error('Database module not loaded. Please refresh.');
    db = await getDb(code);
    // Generate cryptographically random 16-byte salt for this room's PBKDF2
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const roomSalt  = _b64uEnc(saltBytes.buffer);
    _roomSalt = roomSalt;
    await db.collection('rooms').doc(code).set({
      createdAt: ts_now(), creatorId: uid, epoch: 0, salt: roomSalt,
    }, { merge: true });
    _roomEpoch = 0;
    state.me = await buildMe(resolveName()); state.roomCode = code;
    saveSession(); saveRoom(code);
    await registerPresence('admin', true);
    // Approval gate is always on — no choice presented
    await db.collection('rooms').doc(code).update({ approvalRequired: true }).catch(() => {});
    await sendSys(`${state.me.name} created this room`);
    bootApp();
  } catch (e) { showSmartError(e, 'create'); }
  finally { setLoading(btn, false); }
}

async function handleEnter() {
  if (!_checkEnterLock()) return;
  if (!(await checkRateLimit('enter'))) return;
  const code = ($('input-room-code')?.value || '').trim();
  if (!validateRoomCode(code)) return;

  const btn = $('btn-enter');
  setLoading(btn, true, 'Connecting…');
  try {
    // Route to the correct database shard for this room before any query.
    // Without this, handleEnter would query whichever shard `db` defaulted to,
    // which is always db0. Rooms created on db1/db2 would never be found.
    db = await getDb(code);
    const roomSnap = await db.collection('rooms').doc(code).get();
    if (!roomSnap.exists) {
      _recordWrongCode();
      return;
    }
    _saveWrongState({ wrongCount: 0, lockedUntil: 0 });  // reset on correct code
    _roomEpoch = roomSnap.data()?.epoch || 0;
    _roomSalt  = roomSnap.data()?.salt  || null;

    const uid         = await getUID();
    const memberSnap  = await db.collection('rooms').doc(code).collection('members').doc(uid).get();
    const prevData    = memberSnap.exists ? memberSnap.data() : null;
    const wasApproved = prevData?.approved === true;

    state.me = await buildMe(resolveName()); state.roomCode = code;
    saveSession(); saveRoom(code);

    if (wasApproved) {
      // Returning approved member — skip the queue
      const role = prevData.role || 'member';
      await registerPresence(role, true);
      await sendSys(`${state.me.name} rejoined the room`);
      bootApp();
    } else if (prevData && prevData.declined) {
      // Was explicitly declined by admin
      const errEl = $('join-error');
      if (errEl) errEl.textContent = 'Your request was declined by the room admin.';
      setLoading($('btn-enter'), false);
      return;
    } else {
      // D7: check if the room has approval required (stored on room doc)
      const roomData          = roomSnap.data();
      const approvalRequired  = roomData?.approvalRequired === true;

      if (approvalRequired) {
        // Gate — register as pending and show waiting screen
        await registerPresence('member', false);
        showWaitingScreen();
      } else {
        // Open room — approve immediately and boot
        await registerPresence('member', true);
        await sendSys(`${state.me.name} joined the room`);
        bootApp();
      }
    }
  } catch (e) { showSmartError(e, 'enter'); }
  finally { setLoading(btn, false); }
}

async function buildMe(name) {
  const id = await getUID(); // async Firebase Auth UID
  return { id, name, color: avatarColor(name), joinedAt: Date.now() };
}

// registerPresence: creates or updates the caller's member document.
// Firestore rules only allow create with role='member' and approved=false.
// When the creator needs admin+approved=true, we do:
//   1. .set() with role='member', approved=false  (satisfies create rule)
//   2. .update() with role='admin', approved=true  (satisfies update rule — they are now a member)
async function registerPresence(role = 'member', approved = false) {
  await initSigningKey();
  const ref = db.collection('rooms').doc(state.roomCode)
                 .collection('members').doc(state.me.id);

  // Read existing doc — determines whether this is a create or update path.
  // This prevents overwriting an approved member's role/approved with defaults.
  let existingData = null;
  try {
    const snap = await ref.get();
    existingData = snap.exists ? snap.data() : null;
  } catch (_e) { /* ignore — will attempt create below */ }

  if (!existingData) {
    // ── First join: CREATE with role='member' / approved=false (enforced by rules) ──
    await ref.set({
      name:     state.me.name,
      color:    state.me.color,
      online:   true,
      lastSeen: ts_now(),
      joinedAt: ts_now(),
      pubKey:   _pubKeyB64 ?? null,
      role:     'member',    // create rule enforces this
      approved: false,       // create rule enforces this
    });
  } else {
    // ── Returning member: UPDATE only safe presence fields ──
    // Never overwrite role/approved — those are managed by admin or self-escalation.
    await ref.update({
      name:     state.me.name,
      color:    state.me.color,
      online:   true,
      lastSeen: ts_now(),
      pubKey:   _pubKeyB64 ?? null,
    });
  }

  // ── Escalate role / approved only when values genuinely need to change ──
  // For returning members already holding the correct values, skip to avoid
  // triggering rules that only apply to first-join escalation.
  const needsRole     = role === 'admin'  && existingData?.role !== 'admin';
  const needsApproved = approved === true && existingData?.approved !== true;

  if (needsRole || needsApproved) {
    const updates = {};
    if (needsRole)     updates.role     = 'admin';
    if (needsApproved) updates.approved = true;
    await ref.update(updates);
  }

  // Reflect actual DB state into local state
  if (existingData) {
    state.me.role     = existingData.role     ?? role;
    state.me.approved = existingData.approved ?? approved;
  } else {
    state.me.role     = role;
    state.me.approved = approved;
  }
}

function bootApp() {
  _renderedIds.clear();
  _lastCachedTs    = 0;
  _onlineCount     = 0;
  _presenceSettled = false;  // reset — first snapshot must not trigger wipe
  _isAdmin         = state.me?.role === 'admin';

  // Update UI
  ['chat-name','room-code-pill','welcome-room-name'].forEach(id => {
    const el = $(id); if (el) el.textContent = state.roomCode;
  });
  const nsb = $('my-name-sidebar');   if (nsb) nsb.textContent = state.me.name;
  const av  = $('my-avatar-sidebar');
  if (av) { av.textContent = initials(state.me.name); av.style.background = state.me.color; }

  // D7: show admin badge in sidebar profile
  updateAdminBadge();

  showScreen('app');

  // Set solo hint code
  const sc = $('solo-code'); if (sc) sc.textContent = state.roomCode;

  // Advanced security init
  _initSessionHmac().catch(() => {});
  _initAntiCapture();
  _startExpirySweep();

  // Load IDB cache instantly, then fetch history from Firestore
  loadCachedMessages();

  // Start ALL listeners immediately — no gating on user count
  startPresenceListener();
  startChatListeners();
  startRoomListener();
  startHeartbeat();
  initScrollFab();
  toast('Joined room · ' + state.roomCode, 'Share this code to invite others', '✓');
}

async function checkApprovalAndBoot() {
  try {
    // (same room code → same hash → same db index) but db may be stale.
    db = await getDb(state.roomCode);
    const roomSnap = await db.collection('rooms').doc(state.roomCode).get();
    if (roomSnap.exists) {
      _roomEpoch = roomSnap.data()?.epoch || 0;
      _roomSalt  = roomSnap.data()?.salt  || null;
    }

    const snap = await db.collection('rooms').doc(state.roomCode)
      .collection('members').doc(state.me.id).get();

    if (!snap.exists) {
      // Room wiped or member doc gone — go back to join
      showScreen('join-screen'); return;
    }
    const data = snap.data();
    state.me.role     = data.role     || 'member';
    state.me.approved = data.approved || false;

    if (data.approved) {
      // Re-mark online before starting listeners so presence listener
      // doesn't see count=0 and trigger wipeRoom on the first snapshot.
      await db.collection('rooms').doc(state.roomCode)
        .collection('members').doc(state.me.id)
        .update({ online: true }).catch(() => {});
      bootApp();
    } else if (data.declined) {
      localStorage.removeItem(CONFIG.SESSION_KEY);
      localStorage.removeItem(CONFIG.ROOM_KEY);
      state.me = null; state.roomCode = null;
      showScreen('join-screen');
      setTimeout(() => showError('Your previous join request was declined'), 400);
    } else {
      // Still pending — re-register as online and resume waiting
      await registerPresence('member', false);
      showWaitingScreen();
    }
  } catch(e) {
    console.warn('[MIUT] checkApprovalAndBoot error — falling back to boot:', e?.message || e);
    // Mark online best-effort; if offline this fails silently
    if (state.roomCode && state.me?.id) {
      db.collection('rooms').doc(state.roomCode)
        .collection('members').doc(state.me.id)
        .update({ online: true }).catch(() => {});
    }
    bootApp();
  }
}

function showWaitingScreen() {
  const wa = $('waiting-avatar'), wn = $('waiting-name'), wr = $('waiting-room-code');
  if (wa) { wa.textContent = initials(state.me.name); wa.style.background = state.me.color; }
  if (wn) wn.textContent = state.me.name;
  if (wr) wr.textContent = state.roomCode;
  showScreen('waiting-screen');
  startHeartbeat();
  startApprovalListener();
}

function startApprovalListener() {
  if (_unsubApproval) { try { _unsubApproval(); } catch {} }

  _unsubApproval = db.collection('rooms').doc(state.roomCode)
    .collection('members').doc(state.me.id)
    .onSnapshot(snap => {
      if (!snap.exists) { handleDeclined('Room closed or request removed.'); return; }
      const data = snap.data();
      if (data.declined) { handleDeclined('Your request to join was declined.'); return; }
      if (data.approved) {
        // ✓ Approved — clean up and boot into the chat
        if (_unsubApproval) { try { _unsubApproval(); } catch {} _unsubApproval = null; }
        state.me.role     = data.role     || 'member';
        state.me.approved = true;
        saveSession();
        sendSys(`${state.me.name} joined the room`).catch(() => {});
        bootApp();
      }
    }, () => {});
}

function handleDeclined(msg = 'Request declined.') {
  if (_unsubApproval) { try { _unsubApproval(); } catch {} _unsubApproval = null; }
  clearInterval(_heartbeat);
  localStorage.removeItem(CONFIG.SESSION_KEY);
  localStorage.removeItem(CONFIG.ROOM_KEY);
  state.me = null; state.roomCode = null;
  showScreen('join-screen');
  setTimeout(() => showError(msg), 300);
}

async function cancelJoinRequest() {
  if (_unsubApproval) { try { _unsubApproval(); } catch {} _unsubApproval = null; }
  clearInterval(_heartbeat);
  if (state.roomCode && state.me?.id) {
    await db.collection('rooms').doc(state.roomCode)
      .collection('members').doc(state.me.id)
      .update({ online: false }).catch(() => {});
  }
  localStorage.removeItem(CONFIG.SESSION_KEY);
  localStorage.removeItem(CONFIG.ROOM_KEY);
  state.me = null; state.roomCode = null;
  showScreen('join-screen');
}

async function approveUser(uid, name) {
  if (!_isAdmin || !state.roomCode) return;
  try {
    await db.collection('rooms').doc(state.roomCode)
      .collection('members').doc(uid)
      .update({ approved: true });
    // Don't send system message here — the newly approved user sends it on their side (bootApp)
    toast(`${name} approved ✓`, 'They can now read and send messages.', '✓');
  } catch(e) { toast('Approval failed', e.message, '✗'); }
}

async function declineUser(uid, name) {
  if (!_isAdmin || !state.roomCode) return;
  const ok = await showConfirm(`Decline ${name}?`, 'They will be removed from the room.', 'DECLINE');
  if (!ok) return;
  try {
    await db.collection('rooms').doc(state.roomCode)
      .collection('members').doc(uid)
      .update({ online: false, declined: true });
    toast(`${name} was declined`, '', '✗');
  } catch(e) { toast('Decline failed', e.message, '✗'); }
}

async function promoteToAdmin(uid, name) {
  if (!_isAdmin || !state.roomCode) return;
  const ok = await showConfirm(
    `Promote ${name} to Admin?`,
    'They will be able to approve and decline new members.',
    'PROMOTE'
  );
  if (!ok) return;
  try {
    await db.collection('rooms').doc(state.roomCode)
      .collection('members').doc(uid)
      .update({ role: 'admin' });
    await sendSys(`${name} was promoted to admin ◆`);
    toast(`${name} is now Admin`, '', '◆');
  } catch(e) { toast('Promotion failed', e.message, '✗'); }
}

function updateAdminBadge() {
  const badge = $('my-admin-badge');
  if (!badge) return;
  badge.style.display = _isAdmin ? 'flex' : 'none';
}

function startRoomListener() {
  if (_unsubRoom) { try { _unsubRoom(); } catch {} _unsubRoom = null; }
  _unsubRoom = db.collection('rooms').doc(state.roomCode)
    .onSnapshot(snap => {
      if (!snap.exists) return;
      const d = snap.data() || {};
      // Epoch rotation
      const newEpoch = d.epoch || 0;
      if (newEpoch > _roomEpoch) {
        _roomEpoch = newEpoch;
        toast('Encryption key rotated', `Epoch ${newEpoch} — new messages use a fresh key`, '🔑');
      }
      // Message TTL — 0 = off, otherwise milliseconds
      const newTtl = (d.msgTtlMs || 0);
      if (newTtl !== _roomTtlMs) {
        _roomTtlMs = newTtl;
        const ttlEl = $('ttl-display');
        if (ttlEl) ttlEl.textContent = _fmtTtl(_roomTtlMs);
      }
    }, () => {});
}

// ─── Silent auto epoch rotation (admin only) ─────────────────────────────────
// ─── Session HMAC — local integrity token ────────────────────────────────────
// Generates a per-session HMAC key used to sign state.me locally.
// Prevents a memory-patching attacker from changing their UID/role mid-session
// without being caught on the next heartbeat.
async function _initSessionHmac() {
  try {
    _sessionHmacKey = await crypto.subtle.generateKey(
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
    );
  } catch { _sessionHmacKey = null; }
}

async function _signSession(me) {
  if (!_sessionHmacKey || !me) return null;
  try {
    const buf = new TextEncoder().encode(`${me.id}|${me.role}|${me.joinedAt}`);
    const sig = await crypto.subtle.sign('HMAC', _sessionHmacKey, buf);
    return _b64uEnc(sig);
  } catch { return null; }
}

async function _verifySession(me, token) {
  if (!_sessionHmacKey || !me || !token) return true; // no key = skip check
  try {
    const buf = new TextEncoder().encode(`${me.id}|${me.role}|${me.joinedAt}`);
    return await crypto.subtle.verify('HMAC', _sessionHmacKey, _b64uDec(token), buf);
  } catch { return false; }
}

// ─── Canary injection detector ────────────────────────────────────────────────
// Every docId seen from Firestore is registered. If a message is re-delivered
// with the same docId but different content, it's a replay/injection attack.
const _canaryMap = _lruMap(500); // docId → content hash
async function _registerCanary(docId, enc) {
  if (!docId || !enc) return;
  const hash = _b64uEnc(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(docId + enc)));
  if (_canaryMap.has(docId) && _canaryMap.get(docId) !== hash) {
    _integrityViolations++;
    console.warn('[MIUT Security] Replay/injection detected on doc', docId);
    if (_integrityViolations >= 3) _triggerSecurityLockdown('replay attack detected');
    return false;
  }
  _canaryMap.set(docId, hash);
  return true;
}

// ─── Security lockdown ────────────────────────────────────────────────────────
function _triggerSecurityLockdown(reason) {
  console.error('[MIUT Security] Lockdown triggered:', reason);
  toast('Security alert', 'Suspicious activity detected — connection closed.', '🚨');
  setTimeout(() => {
    // Clear all state, stop all listeners, return to join screen
    if (typeof handleLogout === 'function') handleLogout();
    else { localStorage.clear(); location.reload(); }
  }, 2000);
}

// ─── Anti-screenshot (screen capture API detection) ───────────────────────────
function _initAntiCapture() {
  document.body.setAttribute('data-sensitive', '1');
  // Delegate to security.js screen protection — guard against double-init
  if (typeof initScreenProtection === 'function' && !document.body.dataset.spInit) {
    try {
      document.body.dataset.spInit = '1';
      initScreenProtection({ username: (state.me?.name || 'ANONYMOUS').toUpperCase() });
    } catch (_e) {}
  } else if (typeof setScreenProtectionUsername === 'function' && document.body.dataset.spInit) {
    try { setScreenProtectionUsername(state.me?.name || 'ANONYMOUS'); } catch {}
  }
}

// ─── Message expiry sweep ─────────────────────────────────────────────────────
// Removes messages from the DOM (not Firestore) after their TTL expires.
// TTL is set per-message by the sender; admin can set room-level default.
let _roomTtlMs = 0; // 0 = no expiry
function _startExpirySweep() {
  if (_expiryTimer) clearInterval(_expiryTimer);
  _expiryTimer = setInterval(() => {
    if (!_roomTtlMs) return;
    const now = Date.now();
    document.querySelectorAll('.msg-wrapper[data-ts]').forEach(w => {
      const ts = parseInt(w.dataset.ts || '0', 10);
      if (ts && now - ts > _roomTtlMs) {
        w.style.transition = 'opacity .4s';
        w.style.opacity = '0';
        setTimeout(() => w.remove(), 420);
      }
    });
  }, 15000);
}

// ─── Message TTL helpers ──────────────────────────────────────────────────────
/** Format a TTL in ms to a human label */
function _fmtTtl(ms) {
  if (!ms) return 'Off';
  if (ms < 60000)       return Math.round(ms / 1000) + 's';
  if (ms < 3600000)     return Math.round(ms / 60000) + 'm';
  if (ms < 86400000)    return Math.round(ms / 3600000) + 'h';
  return Math.round(ms / 86400000) + 'd';
}

/** Admin sets room-level message TTL and writes to Firestore */
async function setRoomTtl(ms) {
  if (!_isAdmin || !state.roomCode) return;
  try {
    await db.collection('rooms').doc(state.roomCode).update({ msgTtlMs: ms });
    _roomTtlMs = ms;
    const ttlEl = $('ttl-display');
    if (ttlEl) ttlEl.textContent = _fmtTtl(ms);
    toast(
      ms ? `Messages expire after ${_fmtTtl(ms)}` : 'Message expiry off',
      ms ? 'Old messages will fade from view automatically.' : 'Messages stay until the room closes.',
      ms ? '⏱' : '∞'
    );
  } catch (e) { toast('Failed to set expiry', e.message, '✗'); }
}
// ─────────────────────────────────────────────────────────────────────────────

async function _autoRotateEpoch(reason) {
  if (!_isAdmin || !state.roomCode || !db) return;
  try {
    const newEpoch = _roomEpoch + 1;
    await db.collection('rooms').doc(state.roomCode).update({ epoch: newEpoch });
    _roomEpoch = newEpoch;
    _msgsSinceEpoch = 0;
    await sendSys(`🔑 Key auto-rotated (${reason}) — epoch ${newEpoch} active`);
  } catch { /* silent — non-critical */ }
}
// ─────────────────────────────────────────────────────────────────────────────

async function rotateKey() {
  if (!_isAdmin || !state.roomCode) return;
  const ok = await showConfirm(
    'Rotate Encryption Key?',
    'Future messages will use a freshly derived key. Old messages remain readable with their original key. All members will be notified.',
    'ROTATE'
  );
  if (!ok) return;
  const newEpoch = _roomEpoch + 1;
  try {
    await db.collection('rooms').doc(state.roomCode).update({ epoch: newEpoch });
    _roomEpoch = newEpoch;
    await sendSys(`🔑 The encryption key was rotated — epoch ${newEpoch} is now active`);
    toast('Key rotated', `Epoch ${newEpoch} now active`, '🔑');
  } catch(e) { toast('Rotation failed', e.message, '✗'); }
}
async function loadCachedMessages() {
  const code = state.roomCode;
  _historyOldestDoc  = null;
  _historyExhausted  = false;

  // ── Phase 1: render from IDB instantly ──────────
  try {
    const cached = await loadCached(code);
    if (cached.length) {
      $('msg-skeleton')  && ($('msg-skeleton').style.display  = 'none');
      $('room-welcome')  && ($('room-welcome').style.display  = 'none');
      cached.forEach(row => {
        _renderedIds.add(row.id);
        renderMsg(row.data, row.id);
      });
      _lastCachedTs = cached.reduce((m, r) => Math.max(m, r.ts || 0), 0);
      scrollBottom();
    }
  } catch (e) {}

  // ── Phase 2: fetch only messages newer than IDB high-water mark ──
  await fetchHistoryOnce(code);

  // After fetch, skeleton always goes away; welcome shows only if truly empty
  $('msg-skeleton') && ($('msg-skeleton').style.display = 'none');
  if (!_renderedIds.size) {
    $('room-welcome') && ($('room-welcome').style.display = '');
  }
}
const _HISTORY_PAGE = 100;
let _historyOldestDoc = null;   // cursor for "load earlier" pagination
let _historyExhausted = false;  // true once we've fetched back to the beginning

async function fetchHistoryOnce(code) {
  try {
    let q = db.collection('rooms').doc(code)
              .collection('messages')
              .orderBy('createdAt', 'desc')   // newest first so limit(100) gets latest
              .limit(_HISTORY_PAGE);

    if (_lastCachedTs > 0) {
      q = db.collection('rooms').doc(code)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .where('createdAt', '>', firebase.firestore.Timestamp.fromMillis(_lastCachedTs));
    }

    const snap = await q.get();
    if (snap.empty) { _historyExhausted = true; return; }

    // Re-sort ascending for rendering (query returned desc for new users)
    const docs = _lastCachedTs > 0 ? snap.docs : [...snap.docs].reverse();

    // Track oldest doc for "load earlier" pagination cursor
    if (!_lastCachedTs && docs.length > 0) {
      _historyOldestDoc = docs[0];
      _historyExhausted = docs.length < _HISTORY_PAGE;
    }

    let hasNew = false;
    docs.forEach(doc => {
      if (_renderedIds.has(doc.id)) return;
      const data = doc.data();
      _renderedIds.add(doc.id);
      $('msg-skeleton') && ($('msg-skeleton').style.display = 'none'); $('room-welcome')?.style && ($('room-welcome').style.display = 'none');
      renderMsg(data, doc.id);
      hasNew = true;
      // Defer IDB write to idle time — doesn't block rendering
      (window.requestIdleCallback || setTimeout)(() => cacheMsg(doc.id, code, data).catch(() => {}));
      const docTs = data.createdAt?.toMillis?.() ?? data.ts ?? 0;
      if (docTs > _lastCachedTs) _lastCachedTs = docTs;
    });

    if (hasNew) scrollBottom();

    // Show "load earlier" button if there are more messages
    if (!_lastCachedTs) _updateLoadEarlierBtn();
  } catch (e) {
  }
}

// "Load earlier messages" — fetches the page before the current oldest message
async function loadEarlierMessages() {
  if (_historyExhausted || !_historyOldestDoc || !state.roomCode) return;
  const btn = $('load-earlier-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }

  try {
    const snap = await db.collection('rooms').doc(state.roomCode)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .startAfter(_historyOldestDoc)
      .limit(_HISTORY_PAGE)
      .get();

    if (snap.empty) { _historyExhausted = true; _updateLoadEarlierBtn(); return; }

    const docs = [...snap.docs].reverse(); // render in chronological order
    _historyOldestDoc = snap.docs[snap.docs.length - 1]; // new oldest cursor
    _historyExhausted = snap.docs.length < _HISTORY_PAGE;

    const area = $('messages-area');
    const prevScrollHeight = area?.scrollHeight ?? 0;

    docs.forEach(doc => {
      if (_renderedIds.has(doc.id)) return;
      const data = doc.data();
      _renderedIds.add(doc.id);
      renderMsg(data, doc.id, true); // prepend=true
      cacheMsg(doc.id, state.roomCode, data).catch(() => {});
    });

    // Preserve scroll position after prepending
    if (area) area.scrollTop += (area.scrollHeight - prevScrollHeight);
  } catch (e) {
  } finally {
    _updateLoadEarlierBtn();
  }
}

function _updateLoadEarlierBtn() {
  let btn = $('load-earlier-btn');
  if (_historyExhausted) {
    btn?.remove(); return;
  }
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'load-earlier-btn';
    btn.className = 'load-earlier-btn';
    btn.addEventListener('click', loadEarlierMessages);
    $('messages-area')?.prepend(btn);
  }
  btn.disabled = false;
  btn.textContent = '↑ Load earlier messages';
}

function startPresenceListener() {
  const code = state.roomCode;
  if (_unsubMembers) _unsubMembers();

  _unsubMembers = db.collection('rooms').doc(code)
    .collection('members').where('online', '==', true)
    .onSnapshot(async snap => {
      _onlineCount = snap.size;

      // Notify admin of new pending users
      if (_isAdmin) {
        snap.docChanges().forEach(ch => {
          if (ch.type === 'added') {
            const d = ch.doc.data();
            if (!d.approved && ch.doc.id !== state.me?.id) {
              playSound('receive');
              toast(`${d.name || 'Someone'} wants to join`, 'Open the sidebar to approve them', '👤');
            }
          }
          // Auto-rotate key when an approved member goes offline (forward secrecy)
          if (ch.type === 'removed' && _presenceSettled && _isAdmin) {
            const d = ch.doc.data();
            if (d.approved && ch.doc.id !== state.me?.id) {
              _autoRotateEpoch('member left').catch(() => {});
            }
          }
        });
      }

      updateOnlineUI();   // updateOnlineUI also called inside renderMembers with correct approved count
      renderMembers(snap);

      // Wipe empty room when last member leaves.
      // _presenceSettled guards against the very first snapshot firing before
      // the current user's online:true has propagated — without it, session
      // restore sees count=0 and wipes a perfectly healthy room.
      // Only wipe if NO approved members exist at all (not just online ones)
      // so offline-but-approved members don't lose their room.
      // Count truly-online members: online:true AND heartbeat within 90s
      const _staleMs = Date.now() - 90000;
      let _realOnlineCount = 0;
      snap.docs.forEach(d => {
        const md = d.data();
        if (!md.online) return;
        const hb = md.lastSeen?.toMillis ? md.lastSeen.toMillis() : (md.lastSeen || 0);
        if (hb > _staleMs) _realOnlineCount++;
      });

      if (_presenceSettled && _realOnlineCount === 0 && state.me) {
        try {
          const allApproved = await db.collection('rooms').doc(code)
            .collection('members').where('approved', '==', true).get();
          if (allApproved.empty) {
            // two tabs from both triggering wipeRoom simultaneously. The first tab
            // to set emptyAt wins; if it's already set by another tab, skip the wipe.
            const roomRef = db.collection('rooms').doc(code);
            let shouldWipe = false;
            await db.runTransaction(async tx => {
              const roomSnap = await tx.get(roomRef);
              if (!roomSnap.exists) { shouldWipe = false; return; }
              if (roomSnap.data()?.emptyAt) { shouldWipe = false; return; } // another tab won
              tx.update(roomRef, { emptyAt: ts_now() });
              shouldWipe = true;
            });
            if (shouldWipe) {
              toast('Room closed', 'Last member left — room data wiped.', '🗑');
              await wipeRoom(code, db); // pass current db instance explicitly
              await clearCacheForRoom(code);
            }
          }
        } catch { /* silently skip wipe on error */ }
      }
      _presenceSettled = true;
    }, () => {});
}

function updateOnlineUI() {
  const oc = $('online-count');
  const ms = $('member-status-text');
  const sh = $('solo-hint');
  if (_onlineCount <= 1) {
    if (oc) oc.textContent = '';
    if (ms) ms.textContent = 'Only you are online';
    if (sh) sh.style.display = 'flex';
  } else {
    if (oc) oc.textContent = _onlineCount;
    if (ms) ms.textContent = `${_onlineCount} members online`;
    if (sh) sh.style.display = 'none';
  }
}

function startChatListeners() {
  const code = state.roomCode;

  // Messages — only NEW since history fetch set _lastCachedTs
  if (_unsubMsgs) _unsubMsgs();
  let q = db.collection('rooms').doc(code).collection('messages').orderBy('createdAt', 'asc');
  // Always filter by _lastCachedTs — fetchHistoryOnce ensures this is accurate.
  // Fall back to "last 5 minutes" if somehow still 0 to avoid a full re-read.
  const since = _lastCachedTs > 0 ? _lastCachedTs : (Date.now() - 5 * 60 * 1000);
  q = q.where('createdAt', '>', firebase.firestore.Timestamp.fromMillis(since));

  _unsubMsgs = q.onSnapshot(snap => {
    let hasNew = false;
    snap.docChanges().forEach(async ch => {
      if (ch.type === 'modified') { patchMsg(ch.doc.id, ch.doc.data()); return; }
      if (ch.type !== 'added') return;
      const id = ch.doc.id, data = ch.doc.data();
      if (_renderedIds.has(id)) return;
      // Canary check — detect replay/injection (async, non-blocking)
      _registerCanary(id, data.enc || data.encData || '').catch(() => {});
      _renderedIds.add(id);
      // PART 8: replay protection — reject stale or duplicate messages
      const _msgTs = data.ts || 0;
      if (_msgTs && typeof validateMessageTimestamp === 'function' && !validateMessageTimestamp(_msgTs)) {
        // stale message outside replay window — skip render
      } else {
        if (typeof trackNonce === 'function' && !trackNonce(id)) {
          // exact duplicate nonce — skip render
        } else {
          $('msg-skeleton') && ($('msg-skeleton').style.display = 'none'); $('room-welcome')?.style && ($('room-welcome').style.display = 'none');
          // PART 5: afterReceive hook
          let _rcvPayload = { id, data };
          if (typeof runHooks === 'function') _rcvPayload = await runHooks('afterReceive', _rcvPayload);
          renderMsg(_rcvPayload.data || data, _rcvPayload.id || id);
        } // end trackNonce
      } // end validateMessageTimestamp
      hasNew = true;
      const docTs = data.ts || 0;
      if (docTs > _lastCachedTs) _lastCachedTs = docTs;
      cacheMsg(id, code, data).catch(() => {});
      if (data.type === 'text' && data.senderId !== state.me?.id) {
        playSound('receive');
        // Queue read receipt for incoming text messages
        if (!document.hidden) _queueReadAck(id);
        if (document.hidden) {
          _unreadCount++;
          document.title = `(${_unreadCount}) MIUT`;
        }
        showScrollFab();
      }
    });
    if (hasNew) { scrollBottom(); setTimeout(_markVisibleAsRead, 300); }
  }, () => {});
  // Typing
  if (_unsubTyping) _unsubTyping();
  _unsubTyping = db.collection('rooms').doc(code).collection('typing')
    .onSnapshot(snap => {
      const now = Date.now(), typers = [];
      snap.forEach(doc => {
        if (doc.id === state.me?.id) return;
        const d = doc.data();
        if (now - (d.ts || 0) < CONFIG.TYPING_EXPIRE_MS) typers.push(d.name || 'Someone');
      });
      showTypingUI(typers);
    }, () => {});

  updateOnlineUI();
}

function stopChatListeners() {
  if (_unsubMsgs)    { try { _unsubMsgs();    } catch {} _unsubMsgs    = null; }
  if (_unsubTyping)  { try { _unsubTyping();  } catch {} _unsubTyping  = null; }
  clearMyTyping();
  showTypingUI([]);
}

function startListeners() {
  startPresenceListener();
  startChatListeners();
}

function stopListeners() {
  stopChatListeners();
  if (_unsubMembers) { try { _unsubMembers(); } catch {} _unsubMembers = null; }
  if (_unsubRoom)    { try { _unsubRoom();    } catch {} _unsubRoom    = null; }
}

function showTypingUI(typers) {
  const el = $('typing-indicator'), txt = $('typing-text');
  if (!el) return;
  if (!typers.length) {
    el.classList.remove('visible');
    setTimeout(() => { if (!el.classList.contains('visible')) el.style.display = 'none'; }, 300);
    return;
  }
  txt && (txt.textContent =
    typers.length === 1   ? `${typers[0]} is typing…` :
    typers.length === 2   ? `${typers[0]} and ${typers[1]} are typing…` :
                            `${typers.length} people are typing…`);
  el.style.display = 'flex';
  requestAnimationFrame(() => el.classList.add('visible'));
}

function renderMembers(snap) {
  _memberNames = [];
  const list = $('members-list'); if (!list) return;
  list.innerHTML = '';

  const approved = [], pending = [];

  snap.forEach(doc => {
    const m = doc.data();
    if (m.pubKey) _pubKeyCache.set(doc.id, m.pubKey);

    // D7: Live-update own role if promoted while in the room
    if (doc.id === state.me?.id && m.role === 'admin' && !_isAdmin) {
      _isAdmin = true; state.me.role = 'admin'; saveSession();
      updateAdminBadge();
      toast('You are now an admin ◆', 'You can approve new members.', '◆');
    }

    if (m.approved) approved.push({ uid: doc.id, ...m });
    else            pending.push({ uid: doc.id, ...m });
  });

  // ── Approved members ───────────────────────────
  const approvedCount = approved.filter(m => m.uid !== state.me?.id || true).length;
  const oc = $('online-count'), ms = $('member-status-text');
  if (oc) oc.textContent = approvedCount <= 1 ? '' : approvedCount;
  if (ms) ms.textContent = approvedCount <= 1 ? 'Only you are online' : `${approvedCount} members online`;

  approved.forEach(m => {
    const isMe = m.uid === state.me?.id;
    if (!isMe) _memberNames.push(m.name);

    const div = document.createElement('div');
    div.className = 'member-item';
    div.innerHTML = `
      <div class="avatar-wrap">
        <div class="avatar" style="background:${esc(m.color||avatarColor(m.name))}">${esc(initials(m.name))}</div>
        <div class="status-dot online"></div>
      </div>
      <div class="member-info">
        <div class="member-name">
          ${m.role === 'admin' ? '<span class="admin-crown" title="Admin">◆</span> ' : ''}${esc(m.name)}${isMe ? '<span class="me-tag"> (you)</span>' : ''}
        </div>
        <div class="member-activity">● Online</div>
      </div>
      ${_isAdmin && !isMe && m.role !== 'admin' ? `
        <button class="member-promote-btn" title="Promote to Admin"
                data-uid="${esc(m.uid)}" data-name="${esc(m.name)}">
          <svg viewBox="0 0 20 20" fill="none" width="11" height="11">
            <path d="M10 3l1.8 5.5H17l-4.7 3.4 1.8 5.5L10 14l-4.1 3.4 1.8-5.5L3 8.5h5.2z"
                  stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          </svg>
        </button>` : ''}`;

    div.querySelector('.member-promote-btn')?.addEventListener('click', e => {
      const b = e.currentTarget;
      promoteToAdmin(b.dataset.uid, b.dataset.name);
    });
    list.appendChild(div);
  });

  // ── Pending section (admins only) ──────────────
  if (_isAdmin && pending.length > 0) {
    const sep = document.createElement('div');
    sep.className = 'section-label pending-section-label';
    sep.innerHTML = `PENDING <span class="count-badge pending-badge">${pending.length}</span>`;
    list.appendChild(sep);

    pending.forEach(m => {
      const div = document.createElement('div');
      div.className = 'member-item pending-item';
      div.innerHTML = `
        <div class="avatar-wrap">
          <div class="avatar" style="background:${esc(m.color||avatarColor(m.name))}">${esc(initials(m.name))}</div>
          <div class="status-dot" style="background:var(--texting);box-shadow:0 0 5px var(--texting)"></div>
        </div>
        <div class="member-info">
          <div class="member-name">${esc(m.name)}</div>
          <div class="member-activity" style="color:var(--texting)">● Waiting</div>
        </div>
        <div class="pending-actions">
          <button class="pending-approve-btn" title="Approve"
                  data-uid="${esc(m.uid)}" data-name="${esc(m.name)}">
            <svg viewBox="0 0 20 20" fill="none" width="13" height="13">
              <path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="pending-decline-btn" title="Decline"
                  data-uid="${esc(m.uid)}" data-name="${esc(m.name)}">
            <svg viewBox="0 0 20 20" fill="none" width="13" height="13">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round"/>
            </svg>
          </button>
        </div>`;

      div.querySelector('.pending-approve-btn')?.addEventListener('click', e => {
        const b = e.currentTarget;
        approveUser(b.dataset.uid, b.dataset.name).catch(()=>{});
      });
      div.querySelector('.pending-decline-btn')?.addEventListener('click', e => {
        const b = e.currentTarget;
        declineUser(b.dataset.uid, b.dataset.name).catch(()=>{});
      });
      list.appendChild(div);
    });

    // Badge on hamburger so mobile admins notice pending users
    $('hamburger-btn')?.classList.add('has-pending');
  } else {
    $('hamburger-btn')?.classList.remove('has-pending');
  }
}
// wipeRoom accepts an explicit Firestore instance to avoid using the global `db`
// which may point to a different shard if getDb() was called for another room.
async function wipeRoom(code, fsInstance) {
  const fs = fsInstance || db;
  if (!fs || !code) return;  // silent guard
  try {
    const batchDelete = async col => {
      let snap;
      do {
        snap = await fs.collection('rooms').doc(code)
                       .collection(col).limit(499).get();
        if (snap.empty) break;
        const b = fs.batch();
        snap.forEach(d => b.delete(d.ref));
        await b.commit();
      } while (!snap.empty);
    };
    await batchDelete('messages');
    await batchDelete('typing');
    await batchDelete('members');
    // Firestore rules now require isRoomAdmin() for room doc deletion.
    await fs.collection('rooms').doc(code).delete().catch(() => {});
  } catch (e) {}
}

function startHeartbeat() {
  clearInterval(_heartbeat);
  _heartbeat = setInterval(() => {
    if (!state.roomCode || !state.me) return;
    if (document.hidden) return;
    db.collection('rooms').doc(state.roomCode).collection('members').doc(state.me.id)
      .update({ online: true, lastSeen: ts_now() }).catch(() => {});
  }, CONFIG.HEARTBEAT_MS);
}

document.addEventListener('visibilitychange', () => {
  if (!state.me || !state.roomCode || !db) return;
  const online = !document.hidden;
  db.collection('rooms').doc(state.roomCode).collection('members').doc(state.me.id)
    .update({ online, lastSeen: ts_now() }).catch(() => {});
  if (online) {
    _unreadCount = 0;
    document.title = 'MIUT';
    stopChatListeners(); startChatListeners();
    setTimeout(_markVisibleAsRead, 400); // mark newly visible messages as read
  }
});

window.addEventListener('beforeunload', () => {
  if (!state.me || !state.roomCode || !db) return;
  clearMyTyping();
  // Synchronous best-effort update — beacon preferred for reliability
  const payload = JSON.stringify({ online: false, lastSeen: Date.now() });
  if (navigator.sendBeacon) {
    // sendBeacon for reliability on page close (ignored if endpoint absent)
    // Primary: direct Firestore REST update via sendBeacon is not feasible,
    // so fall back to synchronous XHR.
  }
  try {
    db.collection('rooms').doc(state.roomCode).collection('members').doc(state.me.id)
      .update({ online: false, lastSeen: ts_now() }).catch(() => {});
  } catch {}
});


async function sendMessage() {
  if (_editingDocId) { submitEdit().catch(() => {}); return; }
  if (!checkSendRateLimit()) return;

  const input = $('msg-input');
  const text  = (input?.value || '').replace(/[​-‍﻿­]/g, '').trim();
  if (!text || !state.roomCode || !db) return;
  input.value = ''; input.style.height = 'auto';
  updateActionBtn();
  clearMyTyping();

  const ts_client = Date.now();

  // PART 5: beforeSend hook — can mutate { text }
  let _sendPayload = { text };
  if (typeof runHooks === 'function') _sendPayload = await runHooks('beforeSend', _sendPayload);
  const _sendText = (_sendPayload && _sendPayload.text !== undefined) ? _sendPayload.text : text;

  // PART 8: replay protection — timestamp validation
  if (typeof validateMessageTimestamp === 'function' && !validateMessageTimestamp(ts_client)) {
    toast('Send error', 'System clock skew detected — please check your device time.', '⚠'); return;
  }

  const encText   = await enc(_sendText, state.roomCode);
  const msgSig    = await signMsg(state.me.id, ts_client, encText);

  const msgData = {
    type:        'text',
    enc:         encText,
    sig:         msgSig,             // D3: ECDSA signature
    senderId:    state.me.id,
    senderName:  state.me.name,
    senderColor: state.me.color,
    createdAt:   ts_now(),
    ts:          ts_client,
  };

  // Attach encrypted reply quote if replying
  if (_replyTo) {
    msgData.replyTo = {
      senderName: _replyTo.senderName,
      enc:        _replyTo.text ? await enc(_replyTo.text, state.roomCode) : '',
      docId:      _replyTo.docId || '',
      mediaType:  _replyTo.mediaType || null,
      fileName:   _replyTo.fileName  || null,
    };
    clearReply();
  }

  db.collection('rooms').doc(state.roomCode).collection('messages').add(msgData)
    .then(() => {
      // Auto-rotate epoch every N messages (admin only, silent)
      if (_isAdmin) {
        _msgsSinceEpoch++;
        if (_msgsSinceEpoch >= _AUTO_EPOCH_MSG_COUNT) {
          _autoRotateEpoch('message limit').catch(() => {});
        }
      }
    })
    .catch(e => { toast('Send failed', e.message, '✗'); });
  playSound('send');
}
async function sendSys(text) {
  if (!state.roomCode || !state.me?.id) return;
  const _sts  = Date.now();
  const _senc = await enc(text, state.roomCode);
  // senderId required by Firestore rules (hasAll check on messages create)
  await db.collection('rooms').doc(state.roomCode).collection('messages').add({
    type:      'system',
    enc:       _senc,
    senderId:  state.me.id,   // ← required by security rules
    createdAt: ts_now(),
    ts:        _sts,
  }).catch(() => {});
}

// ─── Read receipts ────────────────────────────────────────────────────────────
// Architecture: each message doc gets a `readBy` sub-map {uid: timestamp}.
// We batch-write receipts every 1.5s to avoid per-message Firestore writes.
// Senders watch `patchMsg` which detects readBy changes and updates the ✓✓ UI.

function _queueReadAck(docId) {
  if (!docId || !state.me?.id) return;
  _pendingReadAcks.add(docId);
  if (_readReceiptTimer) return; // already scheduled
  _readReceiptTimer = setTimeout(_flushReadAcks, 1500);
}

async function _flushReadAcks() {
  _readReceiptTimer = null;
  if (!_pendingReadAcks.size || !state.roomCode || !state.me) return;
  const ids = [..._pendingReadAcks];
  _pendingReadAcks.clear();

  // Batch write — max 499 ops per Firestore batch, but we cap at 50 receipts/flush
  const batch = db.batch();
  let count = 0;
  for (const docId of ids.slice(0, 50)) {
    const ref = db.collection('rooms').doc(state.roomCode)
                  .collection('messages').doc(docId);
    batch.update(ref, { [`readBy.${state.me.id}`]: Date.now() });
    count++;
  }
  if (count) batch.commit().catch(() => {});
}

// Mark all visible messages in the viewport as read
function _markVisibleAsRead() {
  if (!state.roomCode || !state.me || document.hidden) return;
  const area = $('messages-area');
  if (!area) return;
  const areaRect = area.getBoundingClientRect();
  document.querySelectorAll('.msg-wrapper[data-doc-id]').forEach(w => {
    if (w.dataset.senderId === state.me.id) return; // don't ack own
    const rect = w.getBoundingClientRect();
    if (rect.top < areaRect.bottom && rect.bottom > areaRect.top) {
      _queueReadAck(w.dataset.docId);
    }
  });
}

// Render read-receipt badge on a sent message
function _renderReadBadge(wrapEl, readBy) {
  if (!wrapEl || !wrapEl.classList.contains('sent')) return;
  const statusEl = wrapEl.querySelector('.msg-status');
  if (!statusEl) return;
  // Filter out own UID and message sender — count other readers
  const senderId = wrapEl.dataset.senderId || '';
  const allReaders = Object.keys(readBy || {}).filter(uid => uid !== senderId);
  if (allReaders.length === 0) {
    statusEl.textContent = '✓';
    statusEl.title = 'Sent';
    statusEl.classList.remove('msg-status-read');
  } else {
    statusEl.textContent = '✓✓';
    statusEl.title = `Read by ${allReaders.length} member${allReaders.length > 1 ? 's' : ''}`;
    statusEl.classList.add('msg-status-read');
  }
}
// ─────────────────────────────────────────────────────────────────────────────


function handleKey(e) {
  // Escape closes mention dropdown or search
  if (e.key === 'Escape') {
    if (_mentionActive) { e.preventDefault(); hideMentionDropdown(); return; }
    if (_searchActive)  { toggleSearch(); return; }
  }
  // Tab selects first mention
  if (e.key === 'Tab' && _mentionActive) {
    e.preventDefault();
    const first = $('mention-dropdown')?.querySelector('.mention-item');
    if (first) first.dispatchEvent(new Event('mousedown'));
    return;
  }
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function handleTyping(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  handleMentionInput(el);
  updateActionBtn();
  if (!state.roomCode || !state.me) return;

  const now = Date.now();
  if (!_isTyping || now - _lastTypeWrite >= CONFIG.TYPING_WRITE_MS) {
    _isTyping = true;
    _lastTypeWrite = now;
    db.collection('rooms').doc(state.roomCode).collection('typing').doc(state.me.id)
      .set({ name: state.me.name, ts: now }).catch(() => {});
  }
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(clearMyTyping, CONFIG.TYPING_IDLE_MS);
}

function clearMyTyping() {
  clearTimeout(_typingTimer);
  if (!_isTyping) return;
  _isTyping = false;
  if (state.roomCode && state.me) {
    db.collection('rooms').doc(state.roomCode).collection('typing').doc(state.me.id)
      .delete().catch(() => {});
  }
}

async function handleFileAttach(e) {
  const file = e.target.files?.[0];
  if (!file || !state.roomCode) return;
  e.target.value = '';
  updateActionBtn();

  if (file.size > CONFIG.MAX_FILE_BYTES) {
    toast('File too large', 'Max 25 MB per file', '✗'); return;
  }

  const isImg   = file.type.startsWith('image/');
  const isVid   = file.type.startsWith('video/');
  const msgType = isImg ? 'image' : isVid ? 'video' : 'file';

  toast('Encrypting…', file.name, '◈');

  try {
    const encrypted = await encBytes(file, state.roomCode);
    const totalSize = encrypted.length;

    if (totalSize <= CONFIG.CHUNK_BYTES) {
      const fts  = Date.now();
      const fsig = await signMsg(state.me.id, fts, encrypted.slice(0, 64));
      await db.collection('rooms').doc(state.roomCode).collection('messages').add({
        type: msgType, encData: encrypted, mime: file.type,
        fileName: file.name, fileSize: file.size, chunks: 1, chunkOf: 1,
        senderId: state.me.id, senderName: state.me.name, senderColor: state.me.color,
        sig: fsig, ts: fts, createdAt: ts_now(),
      });
    } else {
      const parts   = [];
      for (let i = 0; i < totalSize; i += CONFIG.CHUNK_BYTES)
        parts.push(encrypted.slice(i, i + CONFIG.CHUNK_BYTES));
      const groupId = 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const now     = Date.now();
      const BATCH   = 4;
      for (let b = 0; b < parts.length; b += BATCH) {
        await Promise.all(parts.slice(b, b + BATCH).map((part, li) => {
          const idx = b + li;
          return db.collection('rooms').doc(state.roomCode).collection('messages').add({
            type: idx === 0 ? msgType : 'chunk', encData: part,
            mime: file.type, fileName: file.name, fileSize: file.size,
            groupId, chunkIdx: idx, chunkOf: parts.length,
            senderId: state.me.id, senderName: state.me.name, senderColor: state.me.color,
            createdAt: ts_now(), ts: now + idx,
          });
        }));
      }
    }
    playSound('send');
    toast('Sent!', file.name, '✓');
  } catch (err) {
    toast('Upload failed', err.message || 'Check your connection', '✗');
  }
}

function triggerAttach() { $('file-input')?.click(); }

let _replyTo = null;  // { senderName, text, docId }

function setReply(senderName, text, docId, mediaType, fileName) {
  _replyTo = { senderName, text, docId, mediaType, fileName };
  const bar   = $('reply-bar');
  const rname = $('reply-sender');
  const rtext = $('reply-preview');
  if (!bar) return;
  rname.textContent = senderName;

  if (mediaType === 'image') {
    rtext.innerHTML = `<span class="rq-media-inline"><svg viewBox="0 0 20 20" fill="none" width="12" height="12"><path d="M2 7a2 2 0 012-2h.5l1-2h5l1 2H17a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="11" r="2.5" stroke="currentColor" stroke-width="1.4"/></svg> Photo</span>`;
  } else if (mediaType === 'video') {
    rtext.innerHTML = `<span class="rq-media-inline"><svg viewBox="0 0 20 20" fill="none" width="12" height="12"><rect x="2" y="5" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M14 9l4-2v6l-4-2V9z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg> Video</span>`;
  } else if (mediaType === 'file') {
    const isPdf = (fileName || '').toLowerCase().endsWith('.pdf');
    const label = isPdf ? 'PDF' : 'File';
    const fname = fileName ? ': ' + (fileName.length > 22 ? fileName.slice(0, 22) + '…' : fileName) : '';
    rtext.innerHTML = `<span class="rq-media-inline"><svg viewBox="0 0 20 20" fill="none" width="12" height="12"><path d="M4 4a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke="currentColor" stroke-width="1.4"/><path d="M11 2v5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> ${esc(label)}${esc(fname)}</span>`;
  } else {
    rtext.textContent = text.length > 80 ? text.slice(0, 80) + '…' : text;
  }

  bar.style.display = 'flex';
  requestAnimationFrame(() => bar.classList.add('visible'));
  $('msg-input')?.focus();
}

function clearReply() {
  // If editing, cancel the edit
  if (_editingDocId) { cancelEdit(); return; }
  _replyTo = null;
  const bar = $('reply-bar');
  if (!bar) return;
  bar.classList.remove('visible');
  setTimeout(() => { bar.style.display = 'none'; }, 250);
}

let _chunkGroups = {};
let _memberNames  = [];      // tracked for @mention autocomplete
let _editingDocId = null;    // docId of message currently being edited
let _editingWrap  = null;
let _editingTs    = 0;       // original message timestamp (for 2-min window)
let _editTimer    = null;    // setInterval for the countdown display
let _mentionActive = false;
let _mentionStart  = -1;
let _searchActive  = false;

/**
 * _readStatusBadge — builds the ✓ / ✓✓ span for sent messages.
 * Reads readBy map safely; never throws.
 */
function _readStatusBadge(data) {
  try {
    const readBy  = data.readBy || {};
    const sender  = data.senderId || '';
    const readers = Object.keys(readBy).filter(uid => uid !== sender && uid !== state.me?.id);
    // Also count if any uid other than sender has read
    const allReaders = Object.keys(readBy).filter(uid => uid !== sender);
    const hasRead = allReaders.length > 0;
    const cls   = hasRead ? ' msg-status-read' : '';
    const title = hasRead ? `Read by ${allReaders.length} member${allReaders.length !== 1 ? 's' : ''}` : 'Sent';
    const tick  = hasRead ? '✓✓' : '✓';
    return `<span class="msg-status${cls}" title="${title}">${tick}</span>`;
  } catch { return '<span class="msg-status">✓</span>'; }
}

async function renderMsg(data, docId) {
  const area = $('messages-area'); if (!area) return;

  if (data.type === 'chunk' || (data.groupId && data.chunkOf > 1)) {
    assembleChunk(data, docId); return;
  }

  const isMine = data.senderId === state.me?.id;

  if (data.type === 'system') {
    const div = document.createElement('div');
    div.className = 'msg-system';
    // Always decrypt — never render the raw enc field as plaintext.
    // This blocks injected system messages via direct Firestore REST writes
    // (Attack 4): an injected message without the room code will fail
    // AES-GCM auth tag verification and render as '[encrypted]'.
    const text = await dec(data.enc, state.roomCode);
    div.innerHTML = `<span>${esc(text)}</span>`;
    area.appendChild(div); return;
  }

  const wrap = document.createElement('div');
  wrap.className    = `msg-wrapper ${isMine ? 'sent' : 'received'}`;
  wrap.dataset.docId    = docId || '';
  wrap.dataset.senderId = data.senderId || '';
  wrap.dataset.ts       = data.ts || '';
  wrap.dataset.type     = data.type || 'text';
  wrap.dataset.fileName = data.fileName || '';

  // Decoded text (used for reply preview)
  const plainText = data.type === 'text' ? await dec(data.enc, state.roomCode) : null;

  let bubble = '';
  let replyQuote = '';

  // Render quoted reply if this message has one
  if (data.replyTo) {
    let rqContent = '';
    const mt = data.replyTo.mediaType;
    if (mt === 'image') {
      rqContent = `<div class="rq-media"><svg viewBox="0 0 20 20" fill="none" width="12" height="12"><path d="M2 7a2 2 0 012-2h.5l1-2h5l1 2H17a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="11" r="2.5" stroke="currentColor" stroke-width="1.4"/></svg> Photo</div>`;
    } else if (mt === 'video') {
      rqContent = `<div class="rq-media"><svg viewBox="0 0 20 20" fill="none" width="12" height="12"><rect x="2" y="5" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M14 9l4-2v6l-4-2V9z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg> Video</div>`;
    } else if (mt === 'file') {
      const isPdf = (data.replyTo.fileName || '').toLowerCase().endsWith('.pdf');
      const label = isPdf ? 'PDF' : 'File';
      const fname = data.replyTo.fileName ? ': ' + esc(data.replyTo.fileName.length > 20 ? data.replyTo.fileName.slice(0, 20) + '…' : data.replyTo.fileName) : '';
      rqContent = `<div class="rq-media"><svg viewBox="0 0 20 20" fill="none" width="12" height="12"><path d="M4 4a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke="currentColor" stroke-width="1.4"/><path d="M11 2v5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> ${label}${fname}</div>`;
    } else {
      const qText = data.replyTo.enc ? await dec(data.replyTo.enc, state.roomCode) : '';
      rqContent = `<div class="rq-text">${esc(qText.length > 60 ? qText.slice(0, 60) + '…' : qText)}</div>`;
    }
    replyQuote = `
      <div class="reply-quote" data-goto="${esc(data.replyTo.docId || '')}">
        <div class="rq-sender">${esc(data.replyTo.senderName || '')}</div>
        ${rqContent}
      </div>`;
  }

  if (data.type === 'text') {
    bubble = renderTextContent(plainText) + (data.edited ? '<span class="msg-edited"> ✎</span>' : '');
  } else if (data.type === 'image' || data.type === 'video' || data.type === 'file') {
    if (data.encData) {
      const uid = 'med_' + (data.ts||Date.now()) + '_' + Math.random().toString(36).slice(2,5);
      bubble = buildMediaPlaceholder(uid, data);
      setTimeout(() => decryptAndShow(data.encData, data.mime||'application/octet-stream', data.type, data.fileName, uid), 60);
    } else {
      bubble = `<div class="msg-media-err">Media unavailable</div>`;
    }
  }

  const senderLine = !isMine
    ? `<div class="msg-sender" style="color:${esc(data.senderColor||'#4ecdc4')}">${esc(data.senderName||'')}</div>`
    : '';

  // Reply icon (shows on hover/touch)
  const replyBtn = `<button class="msg-reply-btn" aria-label="Reply" tabindex="-1">
    <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
      <path d="M8 5L4 9l4 4M4 9h8a4 4 0 010 8h-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>`;

  // Emoji react button
  const reactBtn = `<button class="msg-reply-btn msg-react-btn" aria-label="React" tabindex="-1">
    <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/>
      <path d="M7 12c.5 1.5 5.5 1.5 6 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="7.8" cy="8.5" r="1" fill="currentColor"/>
      <circle cx="12.2" cy="8.5" r="1" fill="currentColor"/>
    </svg>
  </button>`;

  wrap.innerHTML = `
    <div class="msg-swipe-wrapper">
      <div class="msg-reply-indicator">
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
          <path d="M8 5L4 9l4 4M4 9h8a4 4 0 010 8h-2" stroke="var(--teal)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="msg-bubble-wrap">
        ${!isMine ? `<div class="msg-small-avatar" style="background:${esc(data.senderColor||'#4ecdc4')}">${esc(initials(data.senderName||'?'))}</div>` : ''}
        <div class="msg-inner">
          ${senderLine}
          ${replyQuote}
          <div class="msg-bubble">${bubble}</div>
          <div class="msg-meta">
            <span class="msg-time-sm">${fmtTime(data.ts)}</span>
            ${isMine ? _readStatusBadge(data) : ''}
          </div>
          <div class="msg-reactions" data-rid="${esc(docId || '')}"></div>
        </div>
        <div class="msg-actions">
          ${replyBtn}
          ${reactBtn}
        </div>
      </div>
    </div>`;

  // Wire reply button — supports text and media messages
  wrap.querySelector('.msg-reply-btn:not(.msg-react-btn)')?.addEventListener('click', e => {
    e.stopPropagation();
    if (plainText !== null) {
      setReply(data.senderName || 'Someone', plainText, wrap.dataset.docId);
    } else if (data.type === 'image' || data.type === 'video' || data.type === 'file') {
      setReply(data.senderName || 'Someone', '', wrap.dataset.docId, data.type, data.fileName);
    }
  });

  // Wire react button
  wrap.querySelector('.msg-react-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    showInlineActions(wrap, wrap.dataset.docId, plainText, data.ts, isMine);
  });

  // Wire reply-quote click → scroll to original message
  wrap.querySelector('.reply-quote[data-goto]')?.addEventListener('click', e => {
    e.stopPropagation();
    scrollToMsg(e.currentTarget.dataset.goto);
  });

  // Long-press → inline action strip (emoji bar + reply + edit + delete)
  // Works on own AND other messages. Delete only shown for own messages.
  {
    const targets = [
      wrap.querySelector('.msg-bubble'),
      wrap.querySelector('.msg-media'),
      wrap.querySelector('.msg-file'),
      wrap.querySelector('.video-thumb'),
    ].filter(Boolean);

    targets.forEach(el => {
      let pressTimer = null;
      el.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => {
          pressTimer = null;
          if (navigator.vibrate) navigator.vibrate(18);
          showInlineActions(wrap, docId, plainText, data.ts, isMine);
        }, 480);
      }, { passive: true });
      el.addEventListener('touchend',  () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, { passive: true });
      el.addEventListener('touchmove', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, { passive: true });
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        showInlineActions(wrap, docId, plainText, data.ts, isMine);
      });
    });
  }

  // Render any existing reactions (e.g. loaded from cache)
  if (data.reactions && Object.keys(data.reactions).length > 0) {
    const reactRow = wrap.querySelector('.msg-reactions');
    if (reactRow) renderReactionsInto(reactRow, data.reactions, docId);
  }

  // Swipe-left-to-reply gesture on the bubble
  addSwipeReply(wrap, data, plainText);

  area.appendChild(wrap);

  // D3: verify signature after DOM paint (async, non-blocking)
  if (data.sig && data.type === 'text') {
    requestAnimationFrame(() => verifyAndBadge(data, docId));
  }
}

function buildMediaPlaceholder(uid, data) {
  if (data.type === 'file') return `<div class="msg-media loading" id="${uid}"><div class="media-decrypt-spinner"></div><div class="media-decrypt-label">${esc(data.fileName||'File')} · Decrypting…</div></div>`;
  return `<div class="msg-media loading" id="${uid}"><div class="media-decrypt-spinner"></div><div class="media-decrypt-label">Decrypting ${data.type}…</div></div>`;
}

function assembleChunk(data, docId) {
  const gid = data.groupId; if (!gid) return;
  if (!_chunkGroups[gid]) _chunkGroups[gid] = { parts: {}, total: data.chunkOf, meta: data, docId };
  _chunkGroups[gid].parts[data.chunkIdx] = data.encData;
  if (data.chunkIdx === 0) { _chunkGroups[gid].meta = data; _chunkGroups[gid].docId = docId; }
  const g = _chunkGroups[gid];
  if (Object.keys(g.parts).length === g.total) {
    const assembled = Array.from({ length: g.total }, (_, i) => g.parts[i]).join('');
    delete _chunkGroups[gid];
    renderMsg({ ...g.meta, encData: assembled, type: g.meta.type === 'chunk' ? 'file' : g.meta.type }, g.docId);
  }
}

function addSwipeReply(wrap, data, plainText) {
  if (data.type !== 'text') return;  // only swipe-reply on text messages

  const bubbleWrap = wrap.querySelector('.msg-swipe-wrapper');
  const indicator  = wrap.querySelector('.msg-reply-indicator');
  if (!bubbleWrap) return;

  let startX = 0, startY = 0, dx = 0, triggered = false, tracking = false;
  const THRESHOLD = 60;

  bubbleWrap.addEventListener('touchstart', e => {
    if (e.target.closest('button')) return;
    startX   = e.touches[0].clientX;
    startY   = e.touches[0].clientY;
    dx       = 0;
    triggered = false;
    tracking  = true;
  }, { passive: true });

  bubbleWrap.addEventListener('touchmove', e => {
    if (!tracking) return;
    dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    // Only swipe LEFT (negative dx) and only if horizontal
    if (Math.abs(dy) > Math.abs(dx) * 0.8 || dx > 0) {
      tracking = false;
      bubbleWrap.style.transform = '';
      if (indicator) indicator.style.opacity = '0';
      return;
    }

    const pull = Math.min(Math.abs(dx), THRESHOLD + 20);
    bubbleWrap.style.transform = `translateX(${-pull}px)`;
    bubbleWrap.style.transition = 'none';
    if (indicator) indicator.style.opacity = String(Math.min(1, pull / THRESHOLD));

    if (pull >= THRESHOLD && !triggered) {
      triggered = true;
      if (navigator.vibrate) navigator.vibrate(20);
    }
  }, { passive: true });

  bubbleWrap.addEventListener('touchend', () => {
    if (!tracking) return;
    tracking = false;
    bubbleWrap.style.transition = 'transform 0.25s cubic-bezier(0.4,0,0.2,1)';
    bubbleWrap.style.transform  = '';
    if (indicator) {
      indicator.style.transition = 'opacity 0.2s';
      indicator.style.opacity    = '0';
    }
    if (triggered && plainText !== null) {
      setReply(data.senderName || 'Someone', plainText, wrap.dataset.docId);
    }
    setTimeout(() => { bubbleWrap.style.transition = ''; }, 260);
  }, { passive: true });
}

async function confirmDeleteMsg(docId, wrapEl) {
  if (!docId || !state.roomCode) return;
  const ok = await showConfirm('Delete message?', 'This removes it for everyone.', 'DELETE');
  if (!ok) return;
  try {
    await db.collection('rooms').doc(state.roomCode).collection('messages').doc(docId).delete();
    // Also remove from IDB cache
    const db2 = await openIDB();
    await new Promise(res => {
      const tx = db2.transaction('msgs', 'readwrite');
      tx.objectStore('msgs').delete(docId);
      tx.oncomplete = res;
    });
    // Animate out and remove from DOM
    wrapEl.style.transition = 'opacity 0.2s, transform 0.2s';
    wrapEl.style.opacity    = '0';
    wrapEl.style.transform  = 'scaleY(0.8)';
    setTimeout(() => wrapEl.remove(), 220);
    _renderedIds.delete(docId);
  } catch (e) {

    toast('Delete failed', e.message, '✗');
  }
}

function scrollToMsg(docId) {
  if (!docId) return;
  const el = document.querySelector(`.msg-wrapper[data-doc-id="${CSS.escape(docId)}"]`);
  if (!el) { toast('Message not in view', 'Scroll up to find it.', '↑'); return; }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('msg-highlight');
  setTimeout(() => el.classList.remove('msg-highlight'), 2000);
}

async function patchMsg(id, data) {
  const wrapEl = document.querySelector(`.msg-wrapper[data-doc-id="${CSS.escape(id)}"]`);
  if (!wrapEl) return;
  const reactRow = wrapEl.querySelector('.msg-reactions');
  if (reactRow) renderReactionsInto(reactRow, data.reactions || {}, id);
  if (data.readBy) _renderReadBadge(wrapEl, data.readBy);
  if (data.edited && data.type === 'text') {
    const bubble = wrapEl.querySelector('.msg-bubble');
    if (bubble) bubble.innerHTML = renderTextContent(await dec(data.enc, state.roomCode)) + '<span class="msg-edited"> ✎</span>';
    if (data.sig) requestAnimationFrame(() => verifyAndBadge(data, id));
  }
}
function renderTextContent(text) {
  return esc(text)
    .replace(/\n/g, '<br>')
    .replace(/@([A-Za-z][A-Za-z0-9]+(?: [A-Za-z][A-Za-z0-9]+)*)/gi, '<span class="mention">@$1</span>');
}
async function toggleReaction(docId, emoji) {
  if (!docId || !state.roomCode || !state.me) return;
  try {
    const ref = db.collection('rooms').doc(state.roomCode).collection('messages').doc(docId);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const reactions = Object.assign({}, snap.data().reactions || {});
      const users     = Object.assign({}, reactions[emoji] || {});
      if (users[state.me.id]) delete users[state.me.id];
      else users[state.me.id] = state.me.name;
      if (Object.keys(users).length === 0) delete reactions[emoji];
      else reactions[emoji] = users;
      tx.update(ref, { reactions });
    });
  } catch (e) {
  }
}

function renderReactionsInto(container, reactions, docId) {
  container.innerHTML = '';
  const entries = Object.entries(reactions || {}).filter(([, u]) => Object.keys(u).length > 0);
  if (!entries.length) return;
  entries.forEach(([emoji, users]) => {
    const count = Object.keys(users).length;
    const hasMe = !!users[state.me?.id];
    const btn = document.createElement('button');
    btn.className = 'reaction-chip' + (hasMe ? ' mine' : '');
    btn.textContent = emoji;
    const rcnt = document.createElement("span"); rcnt.className = "reaction-count"; rcnt.textContent = count; btn.appendChild(rcnt);
    btn.title = Object.values(users).join(', ');
    btn.addEventListener('click', e => { e.stopPropagation(); toggleReaction(docId, emoji); });
    container.appendChild(btn);
  });
}
function showInlineActions(wrap, docId, plainText, msgTs, isMine) {
  // Remove any existing strip
  document.querySelectorAll('.msg-action-strip').forEach(s => s.remove());
  if (navigator.vibrate) try { navigator.vibrate(18); } catch {}

  const strip = document.createElement('div');
  strip.className = 'msg-action-strip';

  // ── Emoji row — WhatsApp/Telegram style ─────────────────────────
  const emojiRow = document.createElement('div');
  emojiRow.className = 'strip-emojis';

  // Unified reaction handler — works for both click and touch
  function _reactWith(emoji) {
    toggleReaction(docId, emoji);
    strip.remove();
  }

  // Makes a quick-react OR grid emoji button
  function makeEmojiBtn(emoji, isGrid) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = isGrid ? 'strip-emoji-grid-btn' : 'strip-emoji';
    btn.textContent = emoji;
    btn.setAttribute('aria-label', 'React with ' + emoji);
    let _touched = false;
    btn.addEventListener('touchstart', () => { _touched = false; }, { passive: true });
    btn.addEventListener('touchmove',  () => { _touched = true;  }, { passive: true });
    btn.addEventListener('touchend',   e => {
      e.preventDefault(); e.stopPropagation();
      if (!_touched) _reactWith(emoji); // only fire if not a scroll
    }, { passive: false });
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _reactWith(emoji);
    });
    return btn;
  }

  // 8 quick emojis
  REACTION_EMOJIS.forEach(e2 => emojiRow.appendChild(makeEmojiBtn(e2, false)));

  // ➕ More button
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'strip-emoji-more';
  moreBtn.setAttribute('aria-label', 'More reactions');
  moreBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  let _gridOpen = false;
  let _grid = null;

  function _openGrid() {
    if (_grid && strip.contains(_grid)) return; // already open
    _grid = document.createElement('div');
    _grid.className = 'strip-emoji-grid';
    EXTENDED_EMOJIS.forEach(e2 => _grid.appendChild(makeEmojiBtn(e2, true)));
    const divider = strip.querySelector('.strip-divider');
    if (divider) strip.insertBefore(_grid, divider);
    else strip.appendChild(_grid);
    // Animate open
    const h = _grid.scrollHeight;
    _grid.style.maxHeight = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      _grid.style.maxHeight = h + 'px';
      _grid.classList.add('open');
    }));
    moreBtn.classList.add('active');
    _gridOpen = true;
  }

  function _closeGrid() {
    if (!_grid) return;
    _grid.style.maxHeight = '0';
    _grid.classList.remove('open');
    moreBtn.classList.remove('active');
    _gridOpen = false;
    setTimeout(() => { if (_grid && _grid.parentNode) _grid.remove(); _grid = null; }, 240);
  }

  function _toggleGrid() {
    _gridOpen ? _closeGrid() : _openGrid();
  }

  let _moreTouched = false;
  moreBtn.addEventListener('touchstart', () => { _moreTouched = false; }, { passive: true });
  moreBtn.addEventListener('touchmove',  () => { _moreTouched = true;  }, { passive: true });
  moreBtn.addEventListener('touchend', e => {
    e.preventDefault(); e.stopPropagation();
    if (!_moreTouched) _toggleGrid();
  }, { passive: false });
  moreBtn.addEventListener('click', e => { e.stopPropagation(); _toggleGrid(); });

  emojiRow.appendChild(moreBtn);
  strip.appendChild(emojiRow);

  // Divider
  const div = document.createElement('div');
  div.className = 'strip-divider';
  strip.appendChild(div);

  // Action buttons row
  const actRow = document.createElement('div');
  actRow.className = 'strip-actions';

  const replyBtn = document.createElement('button');
  replyBtn.className = 'strip-action';
  replyBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" width="15" height="15"><path d="M8 5L4 9l4 4M4 9h8a4 4 0 010 8h-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Reply</span>`;
  replyBtn.addEventListener('click', e => {
    e.stopPropagation();
    strip.remove();
    const senderName = wrap.querySelector('.msg-sender')?.textContent?.trim() || 'Someone';
    if (plainText !== null) setReply(senderName, plainText, docId);
    else {
      const mediaType = wrap.dataset.type || null;
      const fileName  = wrap.dataset.fileName || null;
      setReply(senderName, '', docId, mediaType, fileName);
    }
  });
  actRow.appendChild(replyBtn);

  if (isMine) {
    const canEdit = plainText !== null && (Date.now() - (msgTs || 0)) < CONFIG.EDIT_WINDOW_MS;
    if (canEdit) {
      const secsLeft = Math.floor((CONFIG.EDIT_WINDOW_MS - (Date.now() - (msgTs || 0))) / 1000);
      const editBtn = document.createElement('button');
      editBtn.className = 'strip-action';
      editBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" width="15" height="15"><path d="M13.5 3.5l3 3L7 16H4v-3L13.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span>Edit <small>${fmtEditSecs(secsLeft)}</small></span>`;
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        strip.remove();
        startEdit(docId, plainText, wrap, msgTs);
      });
      actRow.appendChild(editBtn);
    }
  }

  strip.appendChild(actRow);

  if (isMine) {
    const delRow = document.createElement('div');
    delRow.className = 'strip-delete-row';
    const delBtn = document.createElement('button');
    delBtn.className = 'strip-action danger';
    delBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M4 6h12M8 6V4h4v2M7 6v9a1 1 0 001 1h4a1 1 0 001-1V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Delete Message</span>`;
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      strip.remove();
      confirmDeleteMsg(docId, wrap);
    });
    delRow.appendChild(delBtn);
    strip.appendChild(delRow);
  }

  // Position: right side for sent, left side for received
  strip.dataset.side = isMine ? 'sent' : 'received';
  wrap.style.position = 'relative';
  wrap.appendChild(strip);
  requestAnimationFrame(() => strip.classList.add('visible'));

  const close = e => {
    if (strip.isConnected && !strip.contains(e.target)) {
      strip.remove();
      document.removeEventListener('click', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', closeKey);
    }
  };
  const closeKey = e => { if (e.key === 'Escape') { strip.remove(); document.removeEventListener('keydown', closeKey); } };
  setTimeout(() => {
    document.addEventListener('click', close);
    document.addEventListener('touchstart', close, { passive: true });
    document.addEventListener('keydown', closeKey);
  }, 60);
}

function showReactionPicker(wrap, docId) {
  const ts    = parseInt(wrap.dataset.ts || '0') || 0;
  const mine  = wrap.classList.contains('sent');
  const bubble = wrap.querySelector('.msg-bubble');
  const plain  = bubble ? (bubble.innerText || null) : null;
  showInlineActions(wrap, docId, plain, ts, mine);
}

function fmtEditSecs(s) {
  if (s <= 0) return '0s';
  return s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`;
}

function startEdit(docId, currentText, wrapEl, msgTs) {
  // Clear any existing edit first
  if (_editingDocId) cancelEdit();

  _editingDocId = docId;
  _editingWrap  = wrapEl;
  _editingTs    = msgTs || 0;

  const input = $('msg-input');
  if (input) {
    input.value = currentText;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    input.focus();
  }

  // Show the reply-bar repurposed as edit bar
  const bar = $('reply-bar'), rname = $('reply-sender'), rtext = $('reply-preview');
  if (bar) {
    rname.innerHTML = `✎ Editing message <span id="edit-countdown" class="edit-countdown" title="Edit window closes after 2 minutes"></span>`;
    rtext.textContent = currentText.length > 70 ? currentText.slice(0, 70) + '…' : currentText;
    bar.style.display = 'flex';
    requestAnimationFrame(() => bar.classList.add('visible'));
  }

  wrapEl?.querySelector('.msg-bubble')?.classList.add('editing-highlight');

  // Start the countdown ticker
  clearInterval(_editTimer);
  _editTimer = setInterval(() => {
    const remaining = CONFIG.EDIT_WINDOW_MS - (Date.now() - _editingTs);
    const el = $('edit-countdown');
    if (remaining <= 0) {
      clearInterval(_editTimer); _editTimer = null;
      if (el) el.textContent = '';
      toast('Edit window closed', 'The 2-minute edit window has passed.', '⏱');
      cancelEdit();
      return;
    }
    const secs = Math.ceil(remaining / 1000);
    if (el) {
      el.textContent = fmtEditSecs(secs);
      // Turn red below 20 seconds
      el.classList.toggle('urgent', secs <= 20);
    }
  }, 500);
}

function cancelEdit() {
  clearInterval(_editTimer); _editTimer = null;
  _editingWrap?.querySelector('.msg-bubble')?.classList.remove('editing-highlight');
  _editingDocId = null; _editingWrap = null; _editingTs = 0; _replyTo = null;
  const bar = $('reply-bar'); if (!bar) return;
  bar.classList.remove('visible'); setTimeout(() => { bar.style.display = 'none'; }, 250);
  const input = $('msg-input'); if (input) { input.value = ''; input.style.height = 'auto'; }
  updateActionBtn();
}

async function submitEdit() {
  const docId = _editingDocId, input = $('msg-input');
  const text = (input?.value || '').trim();
  if (!text || !docId || !state.roomCode) { cancelEdit(); return; }
  //   request.time < resource.data.createdAt + duration.value(120, 's')
  // The client check below is a UX guard only — it cannot be relied on for security.
  const age = Date.now() - _editingTs;
  if (_editingTs > 0 && age > CONFIG.EDIT_WINDOW_MS + 5000) {
    toast('Edit window closed', 'The 2-minute edit window has passed.', '⏱');
    cancelEdit(); return;
  }

  cancelEdit();
  if (input) { input.value = ''; input.style.height = 'auto'; }
  try {
    const _ets   = Date.now();
    const _eenc  = await enc(text, state.roomCode);
    const _esig  = await signMsg(state.me.id, _ets, _eenc);
    await db.collection('rooms').doc(state.roomCode).collection('messages').doc(docId).update({
      enc: _eenc, edited: true, editedAt: ts_now(), sig: _esig, ts: _ets,
    });
  } catch(e) { toast('Edit failed', e.message, '✗'); }
}

function handleMentionInput(input) {
  const val = input.value, pos = input.selectionStart;
  let atIdx = -1;
  for (let i = pos - 1; i >= 0; i--) {
    if (val[i] === '@') { atIdx = i; break; }
    if (val[i] === ' ' || val[i] === '\n') break;
  }
  if (atIdx === -1) { hideMentionDropdown(); return; }
  const query = val.slice(atIdx + 1, pos).toUpperCase();
  const matches = _memberNames.filter(n => n.toUpperCase().startsWith(query));
  if (!matches.length) { hideMentionDropdown(); return; }
  _mentionActive = true; _mentionStart = atIdx;
  showMentionDropdown(matches, input);
}

function showMentionDropdown(names, input) {
  let dd = $('mention-dropdown');
  if (!dd) {
    dd = document.createElement('div'); dd.id = 'mention-dropdown'; dd.className = 'mention-dropdown';
    $('input-area')?.insertAdjacentElement('beforebegin', dd);
  }
  dd.innerHTML = '';
  names.slice(0, 5).forEach(name => {
    const btn = document.createElement('button'); btn.className = 'mention-item';
    btn.innerHTML = `<div class="mention-av" style="background:${avatarColor(name)}">${esc(initials(name))}</div><span>${esc(name)}</span>`;
    btn.addEventListener('mousedown', e => { e.preventDefault(); insertMention(name, input); });
    dd.appendChild(btn);
  });
  dd.style.display = 'flex';
}

function hideMentionDropdown() {
  _mentionActive = false; _mentionStart = -1;
  const dd = $('mention-dropdown'); if (dd) dd.style.display = 'none';
}

function insertMention(name, input) {
  const val = input.value, pos = input.selectionStart;
  const before = val.slice(0, _mentionStart) + '@' + name + ' ';
  input.value = before + val.slice(pos);
  const np = before.length; input.setSelectionRange(np, np);
  hideMentionDropdown(); input.focus();
}

function toggleSearch() {
  _searchActive = !_searchActive;
  const bar = $('search-bar'); if (!bar) return;
  if (_searchActive) {
    bar.style.display = 'flex'; requestAnimationFrame(() => bar.classList.add('visible'));
    bar.querySelector('input')?.focus(); $('search-btn')?.classList.add('active');
  } else {
    bar.classList.remove('visible'); setTimeout(() => { bar.style.display = 'none'; }, 250);
    clearSearch(); $('search-btn')?.classList.remove('active');
  }
}

let _searchDebounceTimer = null;
function doSearch(query) {
  clearTimeout(_searchDebounceTimer);
  _searchDebounceTimer = setTimeout(() => {
    const q = (query || '').toLowerCase().trim();
    let matchCount = 0;
    document.querySelectorAll('.msg-wrapper').forEach(w => {
      if (!q) { w.style.display = ''; return; }
      const txt = (w.querySelector('.msg-bubble')?.textContent || '').toLowerCase();
      const match = txt.includes(q);
      w.style.display = match ? '' : 'none';
      if (match) matchCount++;
    });
    const c = $('search-count');
    if (c) c.textContent = q ? `${matchCount} result${matchCount !== 1 ? 's' : ''}` : '';
  }, 120);
}

function clearSearch() {
  document.querySelectorAll('.msg-wrapper').forEach(w => w.style.display = '');
  const inp = $('search-bar')?.querySelector('input'); if (inp) inp.value = '';
  const c = $('search-count'); if (c) c.textContent = '';
}
async function decryptAndShow(encData, mime, type, fileName, domId) {
  const cacheKey = 'blob_' + btoa(encData.slice(0, 32).replace(/[^a-zA-Z0-9]/g,'').padEnd(8,'0')).slice(0,16);

  let url = null;

  // Check IDB for cached bytes first
  const cachedBytes = await idbGetBlob(cacheKey).catch(() => null);
  if (cachedBytes) {
    try {
      const blob = new Blob([cachedBytes], { type: mime });
      url = URL.createObjectURL(blob);
    } catch { /* fall through to re-decrypt */ }
  }

  if (!url) {
    try {
      const blob  = await decBytes(encData, mime, state.roomCode);
      url = URL.createObjectURL(blob);
      // Store raw bytes (not the blob: URL) so cache survives page reloads
      const arrBuf = await blob.arrayBuffer();
      await idbSetBlob(cacheKey, new Uint8Array(arrBuf));
    } catch (e) {
      const el = $(domId);
      if (el) el.innerHTML = `<div style="padding:8px;color:var(--text2);font-size:.7rem">This message could not be decrypted</div>`;
      return;
    }
  }

  const el = $(domId);
  if (!el) return;

  if (type === 'image') {
    // esc() escapes HTML entities, not JS string chars — fragile inside onclick="...".
    const img = document.createElement('img');
    img.src = url; img.alt = 'image'; img.loading = 'lazy'; img.style.cursor = 'pointer';
    img.addEventListener('click', () => openViewer('img', url));
    const hint = document.createElement('div');
    hint.className = 'media-tap-hint'; hint.textContent = 'Tap to expand';
    el.innerHTML = ''; el.appendChild(img); el.appendChild(hint);
    el.classList.remove('loading');

  } else if (type === 'video') {
    const thumb = document.createElement('div');
    thumb.className = 'video-thumb';
    thumb.innerHTML = `<div class="video-play-btn"><svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M8 5v14l11-7z"/></svg></div><div class="video-label">${esc(fileName||'Video')}</div>`;
    thumb.addEventListener('click', () => openViewer('video', url));
    el.innerHTML = ''; el.appendChild(thumb);
    el.classList.remove('loading');

  } else {
    // File — show download link
    const size = esc(fmtBytes(el.dataset?.size || 0));
    el.outerHTML = `<a class="msg-file" href="${esc(url)}" download="${esc(fileName||'file')}" target="_blank" rel="noopener">
      <div class="file-icon"><svg viewBox="0 0 20 20" fill="none" width="22" height="22">
        <path d="M4 4a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke="currentColor" stroke-width="1.5"/>
        <path d="M11 2v5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg></div>
      <div class="file-info">
        <div class="file-name">${esc(fileName||'File')}</div>
      </div>
      <div class="file-dl"><svg viewBox="0 0 20 20" fill="none" width="16" height="16">
        <path d="M10 3v10M6 9l4 4 4-4M4 17h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg></div>
    </a>`;
  }
}

function showScrollFab() {
  const area = $('messages-area');
  const fab   = $('scroll-fab');
  if (!area || !fab) return;
  const fromBottom = area.scrollHeight - area.scrollTop - area.clientHeight;
  if (fromBottom > 120) {
    fab.style.display = 'flex';
    requestAnimationFrame(() => fab.classList.add('visible'));
    const badge = $('scroll-fab-badge');
    if (badge) {
      badge.textContent = _unreadCount > 0 ? (_unreadCount > 9 ? '9+' : _unreadCount) : '';
      badge.style.display = _unreadCount > 0 ? 'flex' : 'none';
    }
  }
}

function hideScrollFab() {
  const fab = $('scroll-fab');
  if (!fab) return;
  fab.classList.remove('visible');
  setTimeout(() => { if (!fab.classList.contains('visible')) fab.style.display = 'none'; }, 250);
}

function initScrollFab() {
  const area = $('messages-area');
  const fab  = $('scroll-fab');
  if (!area || !fab) return;
  area.addEventListener('scroll', () => {
    const fromBottom = area.scrollHeight - area.scrollTop - area.clientHeight;
    if (fromBottom < 60) { hideScrollFab(); _markVisibleAsRead(); }
  }, { passive: true });
  fab.addEventListener('click', () => { scrollBottom(); hideScrollFab(); });
}


let _scrollDebounce = null;
function scrollBottom() {
  // Debounce: during a batch of message renders only scroll once at the end
  if (_scrollDebounce) return;
  _scrollDebounce = requestAnimationFrame(() => {
    _scrollDebounce = null;
    const a = $('messages-area');
    if (!a) return;
    a.scrollTop = a.scrollHeight;
    hideScrollFab();
    _unreadCount = 0;
    document.title = 'MIUT';
  });
}

function openViewer(type, src) {
  const v = $('media-viewer'), img = $('mv-img'), vid = $('mv-video');
  if (!v) return;
  if (img) { img.src = ''; img.style.display = 'none'; }
  if (vid) { vid.src = ''; vid.style.display = 'none'; }
  if (type === 'img'   && img) { img.src = src; img.style.display = 'block'; }
  if (type === 'video' && vid) { vid.src = src; vid.style.display = 'block'; }
  v.style.display = 'flex';
}
function closeMediaViewer() {
  const v = $('media-viewer'); if (!v) return;
  v.style.display = 'none';
  const vid = $('mv-video'); if (vid) { vid.pause?.(); vid.src = ''; }
  const img = $('mv-img');   if (img) img.src = '';
}

function copyRoomCode() {
  if (!state.roomCode) return;
  const code = state.roomCode, cb = () => toast('Code copied!', code, '✓');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(cb).catch(() => fbCopy(code, cb));
  else fbCopy(code, cb);
}

function shareRoomLink() {
  if (!state.roomCode) return;
  const encoded = btoa(unescape(encodeURIComponent(state.roomCode)));
  const base    = window.location.origin + window.location.pathname;
  const url     = `${base}?r=${encoded}`;

  if (navigator.share) {
    navigator.share({
      title: 'Join my MIUT room',
      text:  'Tap to join — you\'ll need the room code to get in.',
      url,
    }).catch(() => {});
    return;
  }
  const cb = () => toast('Invite link copied!', 'Send the link + room code separately for security', '🔗');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(cb).catch(() => fbCopy(url, cb));
  else fbCopy(url, cb);
}

function _detectInviteParam() {
  try {
    const p = new URLSearchParams(window.location.search);
    const r = p.get('r');
    if (!r) return null;
    return decodeURIComponent(escape(atob(r)));
  } catch { return null; }
}

function showInviteScreen() {
  const inp = $('invite-code-input');
  if (inp) { inp.value = ''; inp.type = 'password'; }
  const err = $('invite-error'); if (err) err.textContent = '';
  const btn = $('invite-join-btn'); if (btn) btn.disabled = true;
  showScreen('invite-screen');
}

function cancelInvite() {
  window.history.replaceState({}, '', window.location.pathname);
  showScreen('join-screen');
}

function checkInviteCode(el) {
  const btn = $('invite-join-btn');
  const err = $('invite-error'); if (err) err.textContent = '';
  const code = el.value.trim();
  if (btn) btn.disabled = !_ROOM_CODE_RE.test(code) || code.length < 6;
}

async function joinFromInvite() {
  const inp  = $('invite-code-input');
  const code = (inp?.value || '').trim();
  const err  = $('invite-error');
  if (!validateRoomCode(code)) {
    if (err) err.textContent = 'Room code contains invalid characters.';
    return;
  }
  if (!(await checkRateLimit('enter'))) return;

  const btn = $('invite-join-btn');
  if (btn) { btn.disabled = true; const sp = btn.querySelector('span'); if (sp) sp.textContent = 'Joining…'; }

  try {
    db = await getDb(code);
    const roomSnap = await db.collection('rooms').doc(code).get();
    if (!roomSnap.exists) {
      _recordWrongCode();
      if (err) err.textContent = 'Room not found — check the code and try again.';
      if (btn) { btn.disabled = false; const sp = btn.querySelector('span'); if (sp) sp.textContent = 'Join Room'; }
      return;
    }
    _saveWrongState({ wrongCount: 0, lockedUntil: 0 });
    _roomEpoch = roomSnap.data()?.epoch || 0;
    _roomSalt  = roomSnap.data()?.salt  || null;
    const uid        = await getUID();
    const memberSnap = await db.collection('rooms').doc(code).collection('members').doc(uid).get();
    const prevData   = memberSnap.exists ? memberSnap.data() : null;
    const wasApproved = prevData?.approved === true;

    state.me = await buildMe(resolveName()); state.roomCode = code;
    saveSession(); saveRoom(code);

    window.history.replaceState({}, '', window.location.pathname);

    if (wasApproved) {
      await registerPresence(prevData.role || 'member', true);
      await sendSys(`${state.me.name} rejoined the room`);
      bootApp();
    } else {
      const approvalRequired = roomSnap.data()?.approvalRequired === true;
      if (approvalRequired) {
        await registerPresence('member', false);
        showWaitingScreen();
      } else {
        await registerPresence('member', true);
        await sendSys(`${state.me.name} joined the room`);
        bootApp();
      }
    }
  } catch(e) {
    const { title, detail, icon } = _classifyError(e);
    if (err) err.textContent = `${icon} ${title} — ${detail}`;
    if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'JOIN ROOM'; }
  }
}
function fbCopy(text, cb) {
  const el = Object.assign(document.createElement('textarea'), { value: text });
  el.style.cssText = 'position:fixed;left:-9999px;opacity:0';
  document.body.appendChild(el); el.focus(); el.select();
  try { document.execCommand('copy'); cb(); } catch {}
  document.body.removeChild(el);
}

function toggleVis(inputId, btnId) {
  const inp = $(inputId), btn = $(btnId); if (!inp || !btn) return;
  inp.type = inp.type === 'text' ? 'password' : 'text';
  btn.querySelector('.eye-open').style.display  = inp.type === 'password' ? 'block' : 'none';
  btn.querySelector('.eye-closed').style.display = inp.type === 'password' ? 'none'  : 'block';
}

async function _handoffAdminRole() {
  if (!state.roomCode || !state.me) return;
  try {
    const snap = await db.collection('rooms').doc(state.roomCode)
      .collection('members')
      .where('online', '==', true)
      .where('approved', '==', true)
      .get();

    let nextUid = null, nextName = null;

    // First try online members
    snap.forEach(doc => {
      if (doc.id !== state.me.id && doc.data().role !== 'admin' && !nextUid) {
        nextUid  = doc.id;
        nextName = doc.data().name;
      }
    });

    // If no online members found, fall back to any approved member (even offline)
    if (!nextUid) {
      const allSnap = await db.collection('rooms').doc(state.roomCode)
        .collection('members')
        .where('approved', '==', true)
        .get();
      allSnap.forEach(doc => {
        if (doc.id !== state.me.id && doc.data().role !== 'admin' && !nextUid) {
          nextUid  = doc.id;
          nextName = doc.data().name;
        }
      });
    }

    if (nextUid) {
      await db.collection('rooms').doc(state.roomCode)
        .collection('members').doc(nextUid)
        .update({ role: 'admin' });
      await sendSys(`${nextName} is now an admin ◆`);
    }
  } catch {}
}

async function handleLogout() {
  const ok = await showConfirm('Leave Room?', 'You can rejoin at any time using the room code.', 'LEAVE');
  if (!ok) return;

  clearMyTyping();
  clearInterval(_heartbeat);

  // D7: stop approval listener if pending
  if (_unsubApproval) { try { _unsubApproval(); } catch {} _unsubApproval = null; }
  _isAdmin = false;

  if (state.roomCode && state.me) {
    if (state.me.role === 'admin') await _handoffAdminRole();
    await sendSys(`${state.me.name} left the room`);
    await db.collection('rooms').doc(state.roomCode).collection('members').doc(state.me.id)
      .update({ online: false }).catch(() => {});
  }

  stopListeners();
  localStorage.removeItem(CONFIG.SESSION_KEY);
  localStorage.removeItem(CONFIG.ROOM_KEY);
  state.me = null; state.roomCode = null;
  _renderedIds.clear(); _lastCachedTs = 0;

  // PART 4: tear down screen protection on logout
  if (typeof destroyScreenProtection === 'function') {
    try { destroyScreenProtection(); } catch (_e) {}
  }

  const ma = $('messages-area'); if (ma) ma.innerHTML = '';
  const ml = $('members-list');  if (ml) ml.innerHTML = '';
  const oc = $('online-count');  if (oc) oc.textContent = '0';

  closeSidebar();
  showScreen('join-screen');

  [$('input-create-code'), $('input-room-code')].forEach(el => { if (el) el.value = ''; });
  const je = $('join-error'); if (je) je.textContent = '';
  switchJoinTab('create');
}

function openSettings() {
  const st = $('sound-toggle'), at = $('anim-toggle');
  const ap = $('approval-toggle'), approvalRow = $('approval-setting-row');
  if (st) st.checked = state.prefs.sound;
  if (at) at.checked = state.prefs.animations;

  const rotateRow = $('rotate-key-row');
  if (approvalRow) approvalRow.style.display = _isAdmin ? 'flex' : 'none';
  if (rotateRow)   rotateRow.style.display   = _isAdmin ? 'flex' : 'none';
  const ttlRow = $('ttl-row');
  if (ttlRow) {
    ttlRow.style.display = _isAdmin ? 'flex' : 'none';
    const sel = $('ttl-select');
    if (sel) {
      const opts = [...sel.options].map(o => +o.value);
      const best = opts.reduce((a, b) => Math.abs(b - _roomTtlMs) < Math.abs(a - _roomTtlMs) ? b : a, 0);
      sel.value = String(best);
    }
    const ttlEl = $('ttl-display'); if (ttlEl) ttlEl.textContent = _fmtTtl(_roomTtlMs);
  }
  const epochEl = $('epoch-display');
  if (epochEl) epochEl.textContent = String(_roomEpoch);

  if (ap && _isAdmin && state.roomCode) {
    ap.checked = false;
    db.collection('rooms').doc(state.roomCode).get()
      .then(s => { if (ap) ap.checked = s.data()?.approvalRequired === true; })
      .catch(() => {});
  }
  $('settings-modal').style.display = 'flex';
}

function closeSettings() { $('settings-modal').style.display = 'none'; }
function closeModal(e)   { if (e.target.classList.contains('modal-overlay')) closeSettings(); }

function saveSettings() {
  localStorage.setItem(CONFIG.PREFS_KEY, JSON.stringify(state.prefs));
  toast('Settings saved', '', '✓'); closeSettings();
}

function toggleSoundAlerts()   { state.prefs.sound         = $('sound-toggle').checked; }
function toggleAnimations()    { state.prefs.animations    = $('anim-toggle').checked; }

function toggleApprovalGate() {
  if (!_isAdmin || !state.roomCode) return;
  const on = $('approval-toggle')?.checked ?? false;
  db.collection('rooms').doc(state.roomCode)
    .update({ approvalRequired: on })
    .then(() => toast(
      on ? 'Approval gate ON' : 'Approval gate OFF',
      on ? 'New members must be approved' : 'Anyone with the code can join freely',
      on ? '🔒' : '🔓'
    ))
    .catch(() => {});
}


function showConfirm(title, msg, confirmLabel = 'CONFIRM') {
  return new Promise(resolve => {
    $('nx-confirm')?.remove();
    const ov = document.createElement('div');
    ov.id = 'nx-confirm';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--surface2);border:1px solid var(--teal-border);border-radius:14px;padding:28px 24px;max-width:320px;width:100%;display:flex;flex-direction:column;gap:18px;box-shadow:0 16px 48px rgba(0,0,0,0.6)';
    const h = document.createElement('div'); h.style.cssText = 'font-family:var(--fui);font-size:.9rem;font-weight:700;color:#fff;letter-spacing:1px'; h.textContent = title;
    const m = document.createElement('div'); m.style.cssText = 'font-size:.75rem;color:var(--text2);line-height:1.7;font-family:var(--fmono)'; m.textContent = msg;
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
    const no  = document.createElement('button'); no.textContent = 'CANCEL'; no.style.cssText = 'padding:10px 20px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--text2);font-family:var(--fui);font-size:.68rem;font-weight:700;letter-spacing:2px;cursor:pointer';
    const yes = document.createElement('button'); yes.textContent = confirmLabel;  yes.style.cssText = 'padding:10px 20px;border-radius:8px;background:var(--danger);border:1px solid var(--danger);color:#fff;font-family:var(--fui);font-size:.68rem;font-weight:700;letter-spacing:2px;cursor:pointer';
    const done = v => { ov.remove(); resolve(v); };
    no.addEventListener('click', () => done(false));
    yes.addEventListener('click', () => done(true));
    ov.addEventListener('click', e => { if (e.target === ov) done(false); });
    row.append(no, yes); box.append(h, m, row); ov.appendChild(box); document.body.appendChild(ov);
    setTimeout(() => no.focus(), 40);
  });
}

function showError(msg, type) {
  const el = $('join-error'); if (!el) return;
  el.textContent = msg;
  el.className = 'error-msg' + (type ? ' error-' + type : '');
  if (msg) {
    el.style.animation = 'none';
    requestAnimationFrame(() => { el.style.animation = 'shake .3s ease'; });
  }
}

function showSmartError(e, context) {
  const { title, detail, icon, type } = _classifyError(e);
  showError(icon + ' ' + title + ' — ' + detail, type);
  // For network errors, inject a Retry button below the error message
  if (type === 'network' || type === 'auth') {
    const errEl = $('join-error');
    if (errEl) {
      const retryFn = context === 'create' ? handleCreate : handleEnter;
      const existing = errEl.parentNode.querySelector('.error-retry-btn');
      if (existing) existing.remove();
      const btn = document.createElement('button');
      btn.className = 'error-retry-btn';
      btn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" width="12" height="12"><path d="M4 4v4h4M16 16v-4h-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.3 12A7 7 0 0015.7 8M15.7 8A7 7 0 004.3 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> RETRY';
      btn.addEventListener('click', () => { btn.remove(); _authReady = null; retryFn(); });
      errEl.insertAdjacentElement('afterend', btn);
    }
  }
}
function setLoading(btn, on, label) {
  if (!btn) return;
  const span = btn.querySelector('span');
  if (on)  { if (span) { btn.dataset.orig = span.textContent; span.textContent = label; } btn.disabled = true; }
  else     { if (span && btn.dataset.orig) span.textContent = btn.dataset.orig; btn.disabled = false; }
}

function setupClipboardPaste() {
  document.addEventListener('paste', async e => {
    if (!state.roomCode || !state.me) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleFileAttach({ target: { files: [file], value: '' } });
        return;
      }
    }
  });
}

function updateActionBtn() {
  const btn = $('send-btn');
  if (!btn) return;
  const hasText = ($('msg-input')?.value || '').trim().length > 0;
  btn.classList.toggle('has-input', hasText);
}

function setupActionBtn() {
  const btn = $('send-btn');
  if (!btn) return;
  btn.addEventListener('click', () => { _animateSend(); sendMessage(); });
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    _animateSend(); sendMessage();
  }, { passive: false });
}

function _animateSend() {
  const btn = $('send-btn');
  if (!btn || !state.prefs.animations) return;
  btn.style.transition = 'transform .06s ease';
  btn.style.transform = 'scale(.82)';
  requestAnimationFrame(() => {
    setTimeout(() => {
      btn.style.transition = 'transform .28s cubic-bezier(.34,1.56,.64,1)';
      btn.style.transform = '';
      setTimeout(() => { btn.style.transition = ''; }, 300);
    }, 70);
  });
}

function handleRipple(e) {
  if (!state.prefs.animations) return;
  if (!e.target.closest('.ripple-btn,.send-btn')) return;
  const x = e.touches?.[0]?.clientX ?? e.clientX, y = e.touches?.[0]?.clientY ?? e.clientY;
  const r = document.createElement('div');
  r.className = 'ripple-wave'; r.style.cssText = `left:${x-40}px;top:${y-40}px;width:80px;height:80px`;
  $('ripple-container')?.appendChild(r); setTimeout(() => r.remove(), 650);
}
let _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

function playSound(type) {
  if (!state.prefs.sound) return;
  try {
    const ctx  = _getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const s = { send:{freq:880,dur:.08,vol:.08}, receive:{freq:660,dur:.12,vol:.1} }[type] || {freq:880,dur:.08,vol:.08};
    osc.type = 'sine'; osc.frequency.value = s.freq;
    gain.gain.setValueAtTime(s.vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + s.dur);
    osc.start(); osc.stop(ctx.currentTime + s.dur);
  } catch {}
}

function toast(title, msg, icon='◈') {
  const c = $('toast-container'); if (!c) return null;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast-icon">${esc(icon)}</div>
    <div class="toast-body">
      <div class="toast-title">${esc(title)}</div>
      ${msg ? `<div class="toast-msg">${esc(msg)}</div>` : ''}
    </div><div class="toast-bar"></div>`;
  el.addEventListener('click', () => rmToast(el));
  c.appendChild(el); setTimeout(() => rmToast(el), 4500);
  return el;
}
function rmToast(el) {
  if (!el.parentNode) return;
  el.classList.add('removing'); setTimeout(() => el.remove(), 300);
}

let _deferredInstall = null;

function triggerPWAInstall() {
  if (!_deferredInstall) {
    toast('Already installed', 'MIUT is already installed.', '✓');
    return;
  }
  _deferredInstall.prompt();
  _deferredInstall.userChoice.then(choice => {
    if (choice.outcome === 'accepted') {
      toast('MIUT installed!', 'Find it on your home screen.', '✓');
    }
    _deferredInstall = null;
    /* Hide install button in settings */
    const row = $('install-app-row');
    if (row) row.style.display = 'none';
  }).catch(() => {});
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstall = e;
  /* Show install button in settings */
  const row = $('install-app-row');
  if (row) row.style.display = 'flex';
  /* Show tap-to-install toast after 3 seconds */
  setTimeout(() => {
    const t = toast('Install Miut Chat', 'Tap to add it to your home screen.', '📲');
    if (t) {
      t.style.cursor = 'pointer';
      /* Remove default dismiss, replace with install trigger */
      t.replaceWith(t.cloneNode(true));
      const fresh = $('toast-container')?.lastElementChild;
      if (fresh) fresh.addEventListener('click', () => { rmToast(fresh); triggerPWAInstall(); });
    }
  }, 3000);
});

window.addEventListener('appinstalled', () => {
  _deferredInstall = null;
  const row = $('install-app-row');
  if (row) row.style.display = 'none';
  toast('MIUT installed!', 'Find it on your home screen.', '✓');
});

// ── JSDoc type definitions ────────────────────────────────────────────────────
/**
 * @typedef {{ id:string, name:string, color:string, joinedAt:number, role?:string, approved?:boolean }} UserState
 * @typedef {{ me:UserState|null, roomCode:string|null, prefs:{sound:boolean,animations:boolean,approvalRequired:boolean} }} AppState
 * @typedef {{ type:string, enc?:string, senderId?:string, senderName?:string, senderColor?:string, ts?:number, sig?:string, edited?:boolean, reactions?:Object, replyTo?:Object, encData?:string, mime?:string, fileName?:string, fileSize?:number, groupId?:string, chunkIdx?:number, chunkOf?:number }} MsgData
 * @typedef {{ wrongCount:number, lockedUntil:number }} WrongState
 * @typedef {{ tokens:number, lastRefill:number }} RlState
 * @typedef {{ fwd:Uint8Array, rev:Uint8Array }} SubstTable
 */

// ── Public API — only these names escape the IIFE onto window ─────────────────
Object.assign(_W, {
  switchJoinTab, handleCreate, handleEnter, toggleVis, updateEntropyMeter, _wireEntropyListeners,
  _wireAllHandlers,
  cancelJoinRequest, checkInviteCode, joinFromInvite, cancelInvite,
  handleLogout, openSettings, closeSettings, closeModal, saveSettings,
  toggleSoundAlerts, toggleAnimations, toggleApprovalGate, rotateKey,
  triggerPWAInstall, copyRoomCode, shareRoomLink, toggleSearch, doSearch,
  closeMediaViewer, handleFileAttach, triggerAttach, handleKey, handleTyping, clearReply,
  setRoomTtl, toggleSidebar, closeSidebar,
  toast, startChatListeners, stopChatListeners,
  get state() { return state; },
  get db()    { return db; },
});

// Expose security module integration helpers for operator use
if (typeof registerHook === 'function') _W.registerHook = registerHook;
if (typeof runHooks     === 'function') _W.runHooks     = runHooks;
if (typeof HOOK_EVENTS  !== 'undefined') _W.HOOK_EVENTS = HOOK_EVENTS;
if (typeof isEnabled    === 'function') _W.isEnabled    = isEnabled;
if (typeof setFlag      === 'function') _W.setFlag      = setFlag;
if (typeof enforceRateLimit === 'function') _W.enforceRateLimit = enforceRateLimit;
})(window);
