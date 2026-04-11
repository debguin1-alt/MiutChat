/**
 * functions/_middleware.js — Cloudflare Pages Middleware
 *
 * HOW TO TOGGLE MAINTENANCE:
 *   POST /api/maintenance  {"enabled":true}   with Authorization: Bearer YOUR_ADMIN_SECRET
 *   POST /api/maintenance  {"enabled":false}  to restore
 *
 * Error 1019 fix: NEVER fetch() the same origin inside middleware — that
 * causes a Worker-to-Worker loop. Instead, embed the maintenance HTML
 * directly so we return a Response without any outbound fetch.
 */

const BYPASS_PATHS = [
  '/maintenance.html',
  '/404.html',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/security.txt',
];
const BYPASS_PREFIXES = ['/api/', '/icons/', '/functions/'];
const BYPASS_EXT = /\.(png|ico|svg|jpg|jpeg|webp|webmanifest|txt|xml|gz|br|woff2?|css|js)$/i;
// Known crawler user-agents — never show maintenance to Googlebot etc.
const CRAWLER_UA = /googlebot|bingbot|yandexbot|duckduckbot|slurp|baiduspider|facebot|ia_archiver/i;

/** Maintenance page HTML — embedded here to avoid fetch() loops (error 1019) */
const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Maintenance — MiutChat</title>
<meta name="robots" content="noindex,nofollow"/>
<meta http-equiv="refresh" content="60"/>
<meta name="theme-color" content="#050d0c"/>
<style>
:root{--t:#4ecdc4;--t2:#39bdb4;--bg:#050d0c;--bdr:rgba(78,205,196,.12);--tb:rgba(78,205,196,.17);--tdim:rgba(78,205,196,.08);--tx:#cdeae7;--tx2:#4e7a77}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:var(--bg);color:var(--tx);font-family:'Space Mono',monospace,'Courier New',monospace;-webkit-font-smoothing:antialiased}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px 6%;text-align:center;position:relative;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(ellipse 55% 50% at 50% 50%,rgba(78,205,196,.07) 0%,transparent 65%);pointer-events:none}
.card{position:relative;z-index:1;max-width:480px;padding:48px 40px;background:rgba(12,22,21,.9);border:1px solid var(--bdr);border-radius:24px}
.icon{width:64px;height:64px;border-radius:18px;background:var(--tdim);border:1px solid var(--tb);display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
@keyframes spin{to{transform:rotate(360deg)}}
.ring{width:36px;height:36px;border:2px solid rgba(78,205,196,.15);border-top-color:var(--t);border-radius:50%;animation:spin 1.2s linear infinite}
.label{font-size:.55rem;font-weight:700;letter-spacing:5px;color:var(--t);margin-bottom:14px;font-family:inherit}
h1{font-size:1.6rem;font-weight:700;color:#fff;line-height:1.2;margin-bottom:12px}
p{font-size:.76rem;color:var(--tx2);line-height:1.85;margin-bottom:20px}
.badge{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;background:var(--tdim);border:1px solid var(--tb);border-radius:100px;font-size:.58rem;font-weight:700;letter-spacing:2px;color:var(--t)}
@keyframes pd{0%,100%{opacity:1}50%{opacity:.35}}
.pulse{width:6px;height:6px;border-radius:50%;background:var(--t);animation:pd 1.6s ease-in-out infinite}
#cd{color:var(--t);font-weight:700}
</style>
</head>
<body>
<div class="bg"></div>
<div class="card">
  <div class="icon"><div class="ring"></div></div>
  <div class="label">MAINTENANCE</div>
  <h1>We'll be back soon.</h1>
  <p>MiutChat is currently undergoing scheduled maintenance. No data is lost. We'll be back shortly.</p>
  <div class="badge"><span class="pulse"></span>WORKING ON IT</div>
  <p style="font-size:.65rem;margin-top:16px;margin-bottom:0;color:var(--tx2)">Auto-refreshes in <span id="cd">60</span>s</p>
</div>
<script>var t=60,e=document.getElementById('cd');setInterval(function(){t--;e&&(e.textContent=t);t<=0&&location.reload()},1000);</script>
</body>
</html>`;

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);
  const path = url.pathname;

  // Always pass through bypassed paths — never check KV for these
  const isBypassed =
    BYPASS_PATHS.includes(path) ||
    BYPASS_PREFIXES.some(p => path.startsWith(p)) ||
    BYPASS_EXT.test(path);

  if (!isBypassed && env?.MIUT_KV) {
    try {
      const mode = await env.MIUT_KV.get('maintenance_mode');
      if (mode === 'true') {
        // Return embedded HTML directly — NO fetch() to avoid error 1019
        return new Response(MAINTENANCE_HTML, {
          status: 503,
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Retry-After': '60',
            'Cache-Control': 'no-store, no-cache',
            'X-Robots-Tag': 'noindex',
          },
        });
      }
    } catch {
      // KV unavailable — fail open, serve normally
    }
  }

  return next();
}
