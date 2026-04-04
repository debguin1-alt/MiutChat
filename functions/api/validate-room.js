/**
 * MIUT — /functions/api/validate-room.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Server-side room code validation at the CF edge.
 * Runs BEFORE the client touches Firestore — blocks bad codes early.
 *
 * Endpoint: POST /api/validate-room
 * Body:     { "code": string, "action": "create" | "enter" }
 * Returns:  { "valid": true } | { "valid": false, "error": "..." }
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CORS = {
  'Access-Control-Allow-Origin':  'https://miutchat.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CODE_RE = /^[a-zA-Z0-9 _\-@#!?+*=.]{6,64}$/;

// Known trivially-weak patterns to block server-side
const WEAK_PATTERNS = [
  /^(.)\1+$/,          // all same character: aaaaaa
  /^123456/,           // starts with 123456
  /^(abc|qwerty|password)/i,
  /^000000/,
];

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request } = context;

  let body;
  try { body = await request.json(); }
  catch { return json({ valid: false, error: 'bad_request' }, 400); }

  const code   = (body?.code || '').trim();
  const action = body?.action;

  if (!code) return json({ valid: false, error: 'missing_code' }, 400);

  // Zero-width / invisible chars
  if (/[\u200B-\u200D\uFEFF\u00AD]/.test(code))
    return json({ valid: false, error: 'invalid_chars' });

  // Regex allowlist
  if (!CODE_RE.test(code))
    return json({ valid: false, error: 'invalid_format' });

  // Reserved paths
  if (code === '.' || code === '..')
    return json({ valid: false, error: 'reserved_code' });

  // Weak pattern check (create only)
  if (action === 'create') {
    for (const pat of WEAK_PATTERNS) {
      if (pat.test(code)) return json({ valid: false, error: 'weak_code' });
    }
    // Entropy check: require at least 2 character classes
    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(code));
    if (classes.length < 2)
      return json({ valid: false, error: 'low_entropy' });
  }

  return json({ valid: true });
}
