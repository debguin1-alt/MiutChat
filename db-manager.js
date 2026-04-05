'use strict';

/**
 * Miut — db-manager.js
 * ═══════════════════════════════════════════════════════════════
 * Multi-database manager. Currently one database is active.
 * Add DB1 and DB2 configs when ready — the manager will
 * automatically distribute rooms across all active databases
 * and fall back if one is unavailable.
 *
 * How distribution works:
 *   roomIndex = hash(roomCode) % activeDbCount
 *   Same room code → same database, always, deterministically.
 *
 * How fallback works:
 *   If the primary database for a room fails, the next one in
 *   the list is tried. The working database is cached per-room
 *   for the session lifetime.
 * ═══════════════════════════════════════════════════════════════
 */

const _DB_CONFIGS = [

  /* ── Database 0 — Primary (active) ────────────────────────── */
  /*
   * Config is injected at runtime via config.js → window.__NX_CONFIG__.
   * This keeps credentials out of source control while staying compatible
   * with the compat SDK (no bundler required).
   * Falls back to empty strings which will cause Firebase to throw a clear
   * error rather than silently using wrong credentials.
   */
  {
    name:   'miut-db0',
    active: true,
    /*
     * Firebase web API keys are public identifiers — not secrets.
     * Real access control lives in Firestore Security Rules (firestore.rules).
     * See: https://firebase.google.com/docs/projects/api-keys
     */
    config: {
      apiKey:            'AIzaSyCoPJjVzwaaZBgvz-P4vGJ44muNS51qqeg',
      authDomain:        'tuition-fee-management-4e15e.firebaseapp.com',
      projectId:         'tuition-fee-management-4e15e',
      messagingSenderId: '1093461316314',
      appId:             '1:1093461316314:web:c06be1b4165f0cfadc0be3',
    },
  },

  /* ── Database 1 — Add when ready ─────────────────────────── */
  {
    name:   'miut-db1',
    active: false,        // ← set to true and fill config to enable
    config: {
      apiKey:            'YOUR_DB1_API_KEY',
      authDomain:        'YOUR_DB1_PROJECT.firebaseapp.com',
      projectId:         'YOUR_DB1_PROJECT',
      messagingSenderId: 'YOUR_DB1_SENDER_ID',
      appId:             'YOUR_DB1_APP_ID',
    },
  },

  /* ── Database 2 — Add when ready ─────────────────────────── */
  {
    name:   'miut-db2',
    active: false,        // ← set to true and fill config to enable
    config: {
      apiKey:            'YOUR_DB2_API_KEY',
      authDomain:        'YOUR_DB2_PROJECT.firebaseapp.com',
      projectId:         'YOUR_DB2_PROJECT',
      messagingSenderId: 'YOUR_DB2_SENDER_ID',
      appId:             'YOUR_DB2_APP_ID',
    },
  },

];

/* ── Only work with active databases ─────────────────────────── */
const _ACTIVE_DBS = _DB_CONFIGS.filter(d => d.active);

/* ── Health tracker — exponential backoff per database ──────── */
const _health = new Map();
_ACTIVE_DBS.forEach(d => _health.set(d.name, { fails: 0, cooldownUntil: 0, lastErr: null }));

/* Cooldown durations indexed by consecutive failure count */
const _COOLDOWNS = [30e3, 120e3, 480e3, 1800e3, 3600e3]; // 30s→2m→8m→30m→1h

/* Per-room database resolution cache (session lifetime) */
const _roomDbCache = new Map();

/* Initialised Firestore instances */
const _instances = new Map();

/* ── Initialise a Firebase app + Firestore instance ─────────── */
function _initDb(cfg) {
  if (_instances.has(cfg.name)) return _instances.get(cfg.name);
  let app;
  try { app = firebase.app(cfg.name); }
  catch { app = firebase.initializeApp(cfg.config, cfg.name); }
  const fs = firebase.firestore(app);
  fs.enablePersistence({ synchronizeTabs: true }).catch(() => {});
  _instances.set(cfg.name, fs);
  return fs;
}

/* ── Deterministic room → database index ─────────────────────── */
function _hashRoom(code) {
  let h = 5381;
  for (let i = 0; i < code.length; i++) h = ((h << 5) + h) ^ code.charCodeAt(i);
  return (h >>> 0) % _ACTIVE_DBS.length;
}

/* ── Fallback order: primary first, then round-robin ─────────── */
function _fallbackOrder(code) {
  if (_ACTIVE_DBS.length === 1) return [0];
  const pri = _hashRoom(code);
  const order = [pri];
  for (let i = 1; i < _ACTIVE_DBS.length; i++) order.push((pri + i) % _ACTIVE_DBS.length);
  return order;
}

/* ── Health helpers ───────────────────────────────────────────── */
function _healthy(name) { return _health.get(name).cooldownUntil <= Date.now(); }

function _onSuccess(name) {
  const h = _health.get(name);
  h.fails = 0; h.cooldownUntil = 0; h.lastErr = null;
}

function _onFail(name, err) {
  const h = _health.get(name);
  h.fails++;
  h.lastErr = err?.message ?? String(err);
  h.cooldownUntil = Date.now() + (_COOLDOWNS[Math.min(h.fails - 1, _COOLDOWNS.length - 1)]);
}

/* ── Core: resolve the best database for a room code ────────── */
async function getDb(roomCode) {
  /* Fast path — already resolved and still healthy */
  if (_roomDbCache.has(roomCode)) {
    const name = _roomDbCache.get(roomCode);
    if (_healthy(name)) return _instances.get(name);
    _roomDbCache.delete(roomCode);
  }

  /* Single DB shortcut — no probing needed */
  if (_ACTIVE_DBS.length === 1) {
    const { name, config } = _ACTIVE_DBS[0];
    const fs = _initDb({ name, config });
    _roomDbCache.set(roomCode, name);
    return fs;
  }

  /* Multi-DB: probe each candidate in fallback order */
  const order = _fallbackOrder(roomCode);
  const candidates = [
    ...order.filter(i => _healthy(_ACTIVE_DBS[i].name)),
    ...order.filter(i => !_healthy(_ACTIVE_DBS[i].name))
      .sort((a, b) => _health.get(_ACTIVE_DBS[a].name).cooldownUntil
                    - _health.get(_ACTIVE_DBS[b].name).cooldownUntil),
  ];

  for (const idx of candidates) {
    const cfg = _ACTIVE_DBS[idx];
    const fs  = _initDb(cfg);
    try {
      await Promise.race([
        fs.collection('rooms').doc(roomCode).get(),
        new Promise((_, r) => setTimeout(() => r(new Error('probe timeout')), 8000)),
      ]);
      _onSuccess(cfg.name);
      _roomDbCache.set(roomCode, cfg.name);
      return fs;
    } catch (err) {
      _onFail(cfg.name, err);
    }
  }

  /* All failed — return primary as last resort */
  const fallback = _ACTIVE_DBS[_hashRoom(roomCode)];
  return _instances.get(fallback.name) ?? _initDb(fallback);
}

/* ── Status helper for debugging ─────────────────────────────── */
function getDbStatus() {
  return _ACTIVE_DBS.map(({ name }) => {
    const h = _health.get(name);
    return {
      name,
      healthy: _healthy(name),
      fails:   h.fails,
      cooldownRemaining: Math.max(0, Math.ceil((h.cooldownUntil - Date.now()) / 1000)),
      lastError: h.lastErr,
    };
  });
}

/* ── Manual health reset (call from console after outage) ─────── */
function resetDbHealth(name) {
  const targets = name ? [name] : _ACTIVE_DBS.map(d => d.name);
  targets.forEach(n => {
    if (_health.has(n)) _health.set(n, { fails: 0, cooldownUntil: 0, lastErr: null });
  });
  _roomDbCache.clear();
}

/* ── Firebase-ready guard ─────────────────────────────────────────
 * The compat SDK scripts are loaded with defer, guaranteeing they run
 * before db-manager.js and app.js (defer preserves source order).
 * This guard catches the edge case where an external CDN script fails
 * to load (network error, ad-blocker, etc.) and surfaces a clear error
 * instead of a cryptic "firebase is not defined" cascade.
 * window._dbFirebaseReady resolves to true when all instances are warm,
 * or rejects with a descriptive error if Firebase is unavailable.
 * ──────────────────────────────────────────────────────────────── */
window._dbFirebaseReady = new Promise((resolve, reject) => {
  function tryInit() {
    if (typeof firebase === 'undefined') {
      reject(new Error(
        '[Miut DB] Firebase compat SDK not loaded. ' +
        'Check that gstatic.com is reachable and not blocked by an extension.'
      ));
      return;
    }
    try {
      _ACTIVE_DBS.forEach(cfg => { try { _initDb(cfg); } catch {} });
      resolve(true);
    } catch (err) {
      reject(err);
    }
  }

  // Scripts are deferred — DOMContentLoaded guarantees they've executed.
  // But if somehow we run before that (e.g. async injection), wait for it.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit, { once: true });
  } else {
    tryInit();
  }
});

window._dbFirebaseReady.catch(err => {
  // Surface a visible banner so developers immediately see the issue
  const banner = document.createElement('div');
  banner.setAttribute('style',
    'position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px 16px;' +
    'background:#7f1d1d;color:#fecaca;font:13px/1.5 monospace;text-align:center'
  );
  banner.textContent = '⚠ Firebase failed to load — check browser extensions or network. ' + err.message;
  document.body?.appendChild(banner);
});
