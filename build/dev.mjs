// Dev mode: build, serve dist/, watch sources, rebuild on change and live-reload the browser.
// Usage: npm run dev   (optional port: npm run dev -- 3001)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const DIST = path.join(ROOT, 'dist');
let port = Number(process.argv[2] || process.env.PORT || 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};
const RELOAD = `<script>(()=>{const s=new EventSource('/__reload');s.onmessage=()=>location.reload();})()</script>`;

function run(script) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'build', script)], { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
}
function build(withImages) {
  const t = Date.now();
  const ok = (!withImages || run('images.mjs')) && run('build.mjs');
  console.log(ok ? `✓ rebuilt in ${Date.now() - t} ms` : '✗ build failed — fix the error above, then save again');
  return ok;
}

// ---- live-reload clients (Server-Sent Events)
const clients = new Set();
const reload = () => { for (const res of clients) res.write('data: reload\n\n'); };

// ---- server
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('\n'); clients.add(res); req.on('close', () => clients.delete(res));
    return;
  }
  let file = path.join(DIST, p);
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }).end(); return; }
    file = path.join(file, 'index.html');
  }
  let status = 200;
  if (!fs.existsSync(file)) { status = 404; file = path.join(DIST, '404.html'); }
  const ext = path.extname(file);
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' };
  // never crash: files vanish briefly while a rebuild recreates dist/
  const busy = () => { if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(`<p>Rebuilding…</p>${RELOAD}`); };
  if (ext === '.html') {
    let html;
    try { html = fs.readFileSync(file, 'utf8'); } catch { busy(); return; }
    res.writeHead(status, headers);
    res.end(html.replace('</body>', `${RELOAD}</body>`));
  } else {
    const s = fs.createReadStream(file);
    s.on('open', () => { res.writeHead(status, headers); s.pipe(res); });
    s.on('error', busy);
  }
});

// ---- watch sources
const WATCH = [
  ['content', false], ['src', false], ['build', false], ['assets/fonts', false],
  ['assets/images/originals', true], ['assets/images/diplomas', true],
];
let timer = null, needImages = false;
for (const [dir, images] of WATCH) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  fs.watch(abs, { recursive: true }, (_e, name) => {
    if (!name || /(^|[\\/])\.|~$|\.tmp$/.test(name) || name.endsWith('dev.mjs')) return;
    needImages = needImages || images;
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`\n↻ change in ${dir}/${name}`);
      if (build(needImages)) reload();
      needImages = false;
    }, 200);
  });
}

// ---- start
if (!build(true)) console.log('(serving the last successful build)');
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { console.log(`port ${port} is busy, trying ${port + 1}…`); port += 1; server.listen(port); }
  else throw e;
});
server.on('listening', () => console.log(`\n  Dev server: http://localhost:${port}/   (watching content/, src/, assets/ — Ctrl+C to stop)\n`));
server.listen(port);
