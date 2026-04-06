#!/usr/bin/env node
/**
 * MIUT build script — run with: node build.js
 * Minifies app.js, style.css, sw.js, db-manager.js, sw-bridge.js into dist/
 * Then copies all static assets into dist/ ready for Cloudflare Pages.
 */
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ESBUILD = (() => {
  // Try local node_modules first, then global
  const candidates = [
    path.join(__dirname, 'node_modules/.bin/esbuild'),
    '/home/claude/.npm-global/lib/node_modules/tsx/node_modules/@esbuild/linux-x64/bin/esbuild',
    'esbuild',
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return 'esbuild';
})();

const DIST = path.join(__dirname, 'dist');
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

function run(cmd) {
  console.log('>', cmd);
  execSync(cmd, { stdio: 'inherit' });
}

// ── Minify JS ──────────────────────────────────────────────────────────────────
run(`${ESBUILD} app.js --minify --target=es2020 --platform=browser --outfile=dist/app.min.js`);
run(`${ESBUILD} db-manager.js --minify --target=es2020 --platform=browser --outfile=dist/db-manager.min.js`);

// sw-bridge: patch to reference sw.min.js
const swBridge = fs.readFileSync('sw-bridge.js', 'utf8').replace("'sw.js'", "'sw.min.js'");
fs.writeFileSync('/tmp/sw-bridge-build.js', swBridge);
run(`${ESBUILD} /tmp/sw-bridge-build.js --minify --target=es2020 --platform=browser --outfile=dist/sw-bridge.min.js`);

run(`${ESBUILD} sw.js --minify --target=es2020 --platform=browser --outfile=dist/sw.min.js`);
run(`${ESBUILD} placeholder-rotator.js --minify --target=es2020 --platform=browser --outfile=dist/placeholder-rotator.min.js`);

// ── Minify CSS ─────────────────────────────────────────────────────────────────
run(`${ESBUILD} style.css --minify --outfile=dist/style.min.css`);

// ── Copy static assets ─────────────────────────────────────────────────────────
const STATIC = [
  'manifest.json',
  'offline.html',
  '.nojekyll', 
  'security.txt',
  '_headers',
  '_redirects',
  'config.js',
  'placeholder-rotator.js',
  'privacy.html',
  'landing.html',
  'wrangler.toml',
  'CNAME',
  'robots.txt',
  'sitemap.xml',
];
for (const f of STATIC) {
  if (fs.existsSync(f)) {
    fs.copyFileSync(f, path.join(DIST, path.basename(f)));
    console.log(`> copied ${f}`);
  }
}

// Icons
const iconsDir = path.join(DIST, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);
for (const f of fs.readdirSync('icons')) {
  fs.copyFileSync(path.join('icons', f), path.join(iconsDir, f));
}
console.log('> copied icons/');

// ── Copy Cloudflare Pages Functions ────────────────────────────────────────────
const functionsDir = path.join(DIST, 'functions');
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src,  entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
if (fs.existsSync('functions')) {
  copyDirRecursive('functions', functionsDir);
  console.log('> copied functions/');
} else {
  console.warn('! functions/ not found — edge functions will NOT be deployed');
}

// ── Patch index.html with minified references ──────────────────────────────────
let html = fs.readFileSync('index.html', 'utf8');
html = html
  .replace('"style.css"', '"style.min.css"')
  .replace('"db-manager.js"', '"db-manager.min.js"')
  .replace('"app.js"', '"app.min.js"')
  .replace('"sw-bridge.js"', '"sw-bridge.min.js"')
  .replace('"placeholder-rotator.js"', '"placeholder-rotator.min.js"');
fs.writeFileSync(path.join(DIST, 'index.html'), html);
console.log('> patched index.html');

// ── Print sizes ────────────────────────────────────────────────────────────────
const files = ['app.min.js', 'style.min.css', 'sw.min.js', 'db-manager.min.js', 'placeholder-rotator.min.js'];
console.log('\n── Build complete ──────────────────────────────────');
for (const f of files) {
  const p = path.join(DIST, f);
  if (fs.existsSync(p)) {
    const kb = (fs.statSync(p).size / 1024).toFixed(1);
    console.log(`  ${f.padEnd(22)} ${kb} KB`);
  }
}
console.log('────────────────────────────────────────────────────\n');
