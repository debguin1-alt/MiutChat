/**
 * _middleware.js — Cloudflare Pages Middleware
 *
 * Runs on EVERY request before serving any page.
 * Checks KV for maintenance_mode flag and redirects to /maintenance.html.
 *
 * Bypass paths (never redirected):
 *   /maintenance.html  — the maintenance page itself
 *   /api/*             — API functions (so toggle still works during maintenance)
 *   /icons/*           — assets needed by maintenance page
 *   /manifest.json     — PWA manifest
 */

const BYPASS_PATHS = [
  '/maintenance.html',
  '/404.html',
  '/manifest.json',
];
const BYPASS_PREFIXES = ['/api/', '/icons/', '/functions/'];

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);
  const path = url.pathname;

  // Never block bypassed paths
  const isBypassed =
    BYPASS_PATHS.includes(path) ||
    BYPASS_PREFIXES.some(p => path.startsWith(p)) ||
    path.match(/\.(png|ico|svg|webmanifest|txt|xml|gz|br)$/i);

  if (!isBypassed && env?.MIUT_KV) {
    try {
      const mode = await env.MIUT_KV.get('maintenance_mode');
      if (mode === 'true' && !request.url.includes('maintenance.html')) {
  const url = new URL(request.url);
  url.pathname = '/maintenance.html';

  const response = await fetch(url);

  return new Response(await response.text(), {
    status: 503,
    headers: {
      "Content-Type": "text/html",
      "Retry-After": "60",
      "Cache-Control": "no-store"
    }
  });
      }
    } catch {
      // KV unavailable — fail open (serve normally)
    }
  }

  return next();
}
