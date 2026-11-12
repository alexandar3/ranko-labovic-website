// Minimal static server for previewing dist/ locally. Usage: node build/serve.mjs [port] [--v2]  (--v2 serves dist-v2/, default port 3002)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', process.argv.includes('--v2') ? 'dist-v2' : 'dist');
const PORT = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) || process.env.PORT || (process.argv.includes('--v2') ? 3002 : 4321));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }).end(); return; }
    file = path.join(file, 'index.html');
  }
  // never crash: a file can vanish briefly while a rebuild recreates dist/
  const send = (status, f) => {
    const s = fs.createReadStream(f);
    s.on('open', () => { res.writeHead(status, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); s.pipe(res); });
    s.on('error', () => { if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'text/plain' }); res.end('Rebuilding — refresh in a moment.'); });
  };
  if (!fs.existsSync(file)) { send(404, path.join(ROOT, '404.html')); return; }
  send(200, file);
}).listen(PORT, () => console.log(`Serving ${path.basename(ROOT)}/ at http://localhost:${PORT}/`));
