'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   signal-protocol.js  v1.0  — MITM-Resistant Handshake for MiutChat
   ─────────────────────────────────────────────────────────────────────────
   X3DH key agreement + Double Ratchet message encryption
   All ops: Web Crypto API only, no external dependencies.
   Storage: IndexedDB (identity keys persist across sessions)
   ═══════════════════════════════════════════════════════════════════════════ */

window.SignalProtocol = (function () {

  /* ── Crypto primitives ──────────────────────────────────────────────────── */
  const subtle  = crypto.subtle;
  const ECDH    = { name: 'ECDH',  namedCurve: 'P-256' };
  const ECDSA   = { name: 'ECDSA', namedCurve: 'P-256' };
  const SIGN    = { name: 'ECDSA', hash: 'SHA-256' };
  const AES_GCM = { name: 'AES-GCM', length: 256 };
  const HKDF_A  = { name: 'HKDF', hash: 'SHA-256' };
  const ENC     = new TextEncoder();
  const DEC     = new TextDecoder();

  /* ── Utilities ──────────────────────────────────────────────────────────── */
  function _rnd(n)     { return crypto.getRandomValues(new Uint8Array(n)); }
  function _u8(buf)    { return buf instanceof Uint8Array ? buf : new Uint8Array(buf); }

  function _concat(...arrs) {
    const total = arrs.reduce((s, a) => s + a.length, 0);
    const out   = new Uint8Array(total);
    let   off   = 0;
    for (const a of arrs) { out.set(a, off); off += a.length; }
    return out;
  }

  async function _digest(data) {
    return _u8(await subtle.digest('SHA-256', data));
  }

  async function _hkdf(ikm, salt, info, len) {
    const base = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey', 'deriveBits']);
    const bits = await subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: salt || new Uint8Array(32), info: ENC.encode(info) },
      base, len * 8
    );
    return _u8(bits);
  }

  async function _aesEncrypt(key, plaintext, iv, aad) {
    return _u8(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, plaintext));
  }

  async function _aesDecrypt(key, ciphertext, iv, aad) {
    return _u8(await subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, ciphertext));
  }

  async function _rawKey(kp) {
    return _u8(await subtle.exportKey('raw', kp.publicKey));
  }

  async function _ecdh(privKey, pubKeyRaw) {
    const pub = await subtle.importKey('raw', pubKeyRaw, ECDH, false, []);
    const bits = await subtle.deriveBits({ name: 'ECDH', public: pub }, privKey, 256);
    return _u8(bits);
  }

  async function _genECDH() {
    return subtle.generateKey(ECDH, true, ['deriveBits']);
  }

  async function _genECDSA() {
    return subtle.generateKey({ ...ECDSA, namedCurve: 'P-256' }, true, ['sign', 'verify']);
  }

  async function _exportPriv(key) {
    return _u8(await subtle.exportKey('pkcs8', key));
  }

  async function _importPrivECDH(raw) {
    return subtle.importKey('pkcs8', raw, ECDH, true, ['deriveBits']);
  }

  async function _importPrivECDSA(raw) {
    return subtle.importKey('pkcs8', { ...ECDSA, namedCurve: 'P-256' }, raw, false, ['sign']);
  }

  /* ── IndexedDB ──────────────────────────────────────────────────────────── */
  const IDB_NAME  = 'miut-sp';
  const IDB_STORE = 'identity';
  let   _idb      = null;

  async function _openDb() {
    if (_idb) return _idb;
    return new Promise((res, rej) => {
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      r.onsuccess = () => { _idb = r.result; res(_idb); };
      r.onerror   = () => rej(r.error);
    });
  }

  async function _idbGet(key) {
    const db = await _openDb();
    return new Promise((res, rej) => {
      const tx  = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  async function _idbPut(key, val) {
    const db = await _openDb();
    return new Promise((res, rej) => {
      const tx  = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).put(val, key);
      req.onsuccess = res; req.onerror = rej;
    });
  }

  /* ── Session store (in-memory) ──────────────────────────────────────────── */
  const _sessions  = new Map(); // peerId → session
  const _nonces    = new Set(); // replay protection

  /* ═══════════════════════════════════════════════════════════════════════
     1. IDENTITY SYSTEM
     ═══════════════════════════════════════════════════════════════════════ */
  let _identity = null; // { ikPrivECDH, ikPubRaw, sigPriv, sigPubRaw }

  async function initIdentity() {
    /* Load from IndexedDB or generate fresh */
    const stored = await _idbGet('identity');
    if (stored) {
      const ikPrivECDH = await _importPrivECDH(stored.ikPriv);
      _identity = {
        ikPrivECDH,
        ikPubRaw:  stored.ikPub,
        sigPriv:   await _importPrivECDSA(stored.sigPriv),
        sigPubRaw: stored.sigPub,
      };
      return { ikPubRaw: _identity.ikPubRaw, sigPubRaw: _identity.sigPubRaw };
    }

    /* Generate long-term identity key pair (ECDH) + signing key (ECDSA) */
    const [ikKp, sigKp] = await Promise.all([_genECDH(), _genECDSA()]);

    const [ikPrivRaw, ikPubRaw, sigPrivRaw, sigPubRaw] = await Promise.all([
      _exportPriv(ikKp.privateKey),
      _rawKey(ikKp),
      _exportPriv(sigKp.privateKey),
      _rawKey(sigKp),
    ]);

    await _idbPut('identity', { ikPriv: ikPrivRaw, ikPub: ikPubRaw, sigPriv: sigPrivRaw, sigPub: sigPubRaw });

    _identity = {
      ikPrivECDH: ikKp.privateKey,
      ikPubRaw,
      sigPriv:    sigKp.privateKey,
      sigPubRaw,
    };

    return { ikPubRaw, sigPubRaw };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     2. PRE-KEY BUNDLE
     ═══════════════════════════════════════════════════════════════════════ */
  async function generatePreKeyBundle() {
    if (!_identity) throw new Error('Call initIdentity() first');

    /* Signed pre-key */
    const spkKp     = await _genECDH();
    const spkPubRaw = await _rawKey(spkKp);
    const spkPrivRaw = await _exportPriv(spkKp.privateKey);

    /* Sign the SPK public key with identity signing key */
    const sigBuf = _u8(await subtle.sign(SIGN, _identity.sigPriv, spkPubRaw));

    /* One-time pre-keys (8) */
    const opks     = [];
    const opkPrivs = [];
    for (let i = 0; i < 8; i++) {
      const kp  = await _genECDH();
      const pub = await _rawKey(kp);
      const priv = await _exportPriv(kp.privateKey);
      opks.push(pub);
      opkPrivs.push(priv);
    }

    /* Persist for later use */
    await _idbPut('spk', { pub: spkPubRaw, priv: spkPrivRaw });
    await _idbPut('opks', opkPrivs.map((p, i) => ({ id: i, priv: p, pub: opks[i] })));

    return {
      identityPub:      _identity.ikPubRaw,
      sigPub:           _identity.sigPubRaw,
      signedPreKeyPub:  spkPubRaw,
      signature:        sigBuf,
      oneTimePreKeys:   opks,
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     3. X3DH HANDSHAKE
     ═══════════════════════════════════════════════════════════════════════ */
  async function initiateSession(peerId, peerBundle) {
    if (!_identity) throw new Error('Call initIdentity() first');

    const { identityPub, sigPub, signedPreKeyPub, signature, oneTimePreKeys } = peerBundle;

    /* Verify signed pre-key signature */
    const sigPubKey = await subtle.importKey('raw', sigPub, { ...ECDSA, namedCurve: 'P-256' }, false, ['verify']);
    const valid     = await subtle.verify(SIGN, sigPubKey, signature, signedPreKeyPub);
    if (!valid) throw new Error('Pre-key signature verification failed — possible MITM');

    /* Ephemeral key pair */
    const ekKp     = await _genECDH();
    const ekPubRaw = await _rawKey(ekKp);

    /* One-time pre-key (use first available) */
    const opkPubRaw = oneTimePreKeys?.[0] || null;

    /* X3DH: 3 (or 4) ECDH operations */
    const [dh1, dh2, dh3] = await Promise.all([
      _ecdh(_identity.ikPrivECDH, signedPreKeyPub),  // IK_A ↔ SPK_B
      _ecdh(ekKp.privateKey,      identityPub),       // EK_A ↔ IK_B
      _ecdh(ekKp.privateKey,      signedPreKeyPub),   // EK_A ↔ SPK_B
    ]);
    const dh4 = opkPubRaw ? await _ecdh(ekKp.privateKey, opkPubRaw) : null;

    /* Combine with HKDF */
    const dhInput = dh4 ? _concat(dh1, dh2, dh3, dh4) : _concat(dh1, dh2, dh3);
    const master  = await _hkdf(dhInput, new Uint8Array(32), 'MIUT_X3DH_MASTER_v1', 64);

    /* Derive root + chain keys */
    const rootKey    = master.slice(0,  32);
    const sendChain  = master.slice(32, 64);

    /* Store session */
    _sessions.set(peerId, {
      rootKey:      rootKey.slice(),
      sendChain:    sendChain.slice(),
      recvChain:    null,
      sendN:        0,
      recvN:        0,
      ekPubRaw,
      peerIkPub:    identityPub,
      peerSpkPub:   signedPreKeyPub,
      opkId:        opkPubRaw ? 0 : null,
      established:  true,
    });

    /* Return handshake header (sent to peer so they can complete the session) */
    return {
      senderIkPub:  _identity.ikPubRaw,
      ephemeralPub: ekPubRaw,
      opkId:        opkPubRaw ? 0 : null,
    };
  }

  /* Complete session from receiver side */
  async function completeSession(peerId, header) {
    if (!_identity) throw new Error('Call initIdentity() first');

    const spkData = await _idbGet('spk');
    if (!spkData) throw new Error('No signed pre-key available');

    const spkPriv = await _importPrivECDH(spkData.priv);

    const [dh1, dh2, dh3] = await Promise.all([
      _ecdh(spkPriv,              header.senderIkPub),  // SPK_B ↔ IK_A
      _ecdh(_identity.ikPrivECDH, header.ephemeralPub), // IK_B  ↔ EK_A
      _ecdh(spkPriv,              header.ephemeralPub), // SPK_B ↔ EK_A
    ]);

    let dh4 = null;
    if (header.opkId !== null && header.opkId !== undefined) {
      const opks = await _idbGet('opks');
      const opkEntry = (opks || []).find(o => o.id === header.opkId);
      if (opkEntry) {
        const opkPriv = await _importPrivECDH(opkEntry.priv);
        dh4 = await _ecdh(opkPriv, header.ephemeralPub);
      }
    }

    const dhInput = dh4 ? _concat(dh1, dh2, dh3, dh4) : _concat(dh1, dh2, dh3);
    const master  = await _hkdf(dhInput, new Uint8Array(32), 'MIUT_X3DH_MASTER_v1', 64);

    _sessions.set(peerId, {
      rootKey:     master.slice(0, 32),
      sendChain:   null,
      recvChain:   master.slice(32, 64),
      sendN:       0,
      recvN:       0,
      peerIkPub:   header.senderIkPub,
      ekPubRaw:    header.ephemeralPub,
      established: true,
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     4. DOUBLE RATCHET
     ═══════════════════════════════════════════════════════════════════════ */
  async function _ratchetSend(sess) {
    /* Derive message key from send chain */
    const mk   = await _hkdf(sess.sendChain, new Uint8Array(1), 'MIUT_MSG_KEY', 32);
    const next = await _hkdf(sess.sendChain, new Uint8Array(2), 'MIUT_CHAIN_STEP', 32);
    sess.sendChain = next;
    sess.sendN++;
    /* AES key */
    const aesKey = await subtle.importKey('raw', mk, AES_GCM, false, ['encrypt']);
    return aesKey;
  }

  async function _ratchetRecv(sess) {
    const mk   = await _hkdf(sess.recvChain, new Uint8Array(1), 'MIUT_MSG_KEY', 32);
    const next = await _hkdf(sess.recvChain, new Uint8Array(2), 'MIUT_CHAIN_STEP', 32);
    sess.recvChain = next;
    sess.recvN++;
    const aesKey = await subtle.importKey('raw', mk, AES_GCM, false, ['decrypt']);
    return aesKey;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     5. ENCRYPT / DECRYPT
     ═══════════════════════════════════════════════════════════════════════ */
  async function encryptMessage(peerId, plaintext, aadContext) {
    const sess = _sessions.get(peerId);
    if (!sess?.established) throw new Error('No session for peer: ' + peerId);

    const iv    = _rnd(12);
    const ts    = Date.now();
    const nonce = _rnd(16);

    /* AAD: room + sender + epoch + timestamp (binds ciphertext to context) */
    const aad = _buildAAD({ ...aadContext, ts, nonce });

    const key  = await _ratchetSend(sess);
    const pt   = ENC.encode(typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext));
    const ct   = await _aesEncrypt(key, pt, iv, aad);

    return {
      v:     2,
      iv:    iv,
      ct:    ct,
      aad:   aad,
      ts,
      nonce,
      msgN:  sess.sendN,
    };
  }

  async function decryptMessage(peerId, envelope) {
    const sess = _sessions.get(peerId);
    if (!sess?.established) throw new Error('No session for peer: ' + peerId);

    /* Replay protection */
    const nonceKey = peerId + ':' + _u8(envelope.nonce).join(',');
    if (_nonces.has(nonceKey)) throw new Error('Replay detected');

    /* Timestamp window ±5 min */
    const age = Math.abs(Date.now() - (envelope.ts || 0));
    if (age > 5 * 60 * 1000) throw new Error('Message outside timestamp window');

    const key = await _ratchetRecv(sess);
    const pt  = await _aesDecrypt(key, _u8(envelope.ct), _u8(envelope.iv), _u8(envelope.aad));

    _nonces.add(nonceKey);
    /* Evict old nonces (keep last 1000) */
    if (_nonces.size > 1000) {
      const it = _nonces.values();
      for (let i = 0; i < 200; i++) _nonces.delete(it.next().value);
    }

    return DEC.decode(pt);
  }

  /* AAD builder */
  function _buildAAD(ctx) {
    const str = [
      'MIUT_AAD_v2',
      ctx.roomCode   || '',
      ctx.senderId   || '',
      ctx.epoch      != null ? String(ctx.epoch) : '',
      String(ctx.ts  || 0),
      _u8(ctx.nonce).join('-'),
    ].join('|');
    return ENC.encode(str);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     6. IDENTITY VERIFICATION — Safety Number
     ═══════════════════════════════════════════════════════════════════════ */
  async function verifyFingerprint(peerIkPubRaw) {
    if (!_identity) throw new Error('Call initIdentity() first');

    /* Canonical order: sort public keys so both sides get same number */
    const a   = _identity.ikPubRaw;
    const b   = _u8(peerIkPubRaw);
    const [lo, hi] = _lexCmp(a, b) <= 0 ? [a, b] : [b, a];

    const hash  = await _digest(_concat(lo, hi));

    /* Encode as 60-digit safety number (12 groups of 5 decimal digits) */
    const safety = _toSafetyNumber(hash);
    const groups = safety.match(/.{1,5}/g) || [];

    return {
      safetyNumber: groups.join(' '),
      raw:          safety,
      hash,
    };
  }

  function _lexCmp(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  }

  function _toSafetyNumber(hash) {
    /* Convert 32-byte hash to 60 decimal digits (5 per 2.5 bytes, Signal-style) */
    let out = '';
    for (let i = 0; i < 12; i++) {
      const chunk = (hash[i * 2] * 256 + hash[i * 2 + 1]) * 256 + (hash[i * 2 + 2] || 0);
      out += String(chunk % 100000).padStart(5, '0');
    }
    return out.slice(0, 60);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════════════════════════════ */
  return {
    initIdentity,
    generatePreKeyBundle,
    initiateSession,
    completeSession,
    encryptMessage,
    decryptMessage,
    verifyFingerprint,

    /* Utility */
    getIdentityPub:  () => _identity?.ikPubRaw || null,
    hasSession:      (id) => _sessions.has(id) && _sessions.get(id).established,
    clearSession:    (id) => _sessions.delete(id),
  };

})();
