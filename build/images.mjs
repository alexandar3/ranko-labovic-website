// Image pipeline: originals -> responsive WebP + OG images + favicons.
// Usage: node build/images.mjs  (cached: only new/changed files are processed)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'assets/images/originals');
const DIPLOMAS = path.join(ROOT, 'assets/images/diplomas');
const OUT = path.join(ROOT, 'assets/images/optimized');
const MANIFEST = path.join(OUT, 'manifest.json');
const WIDTHS = [480, 800, 1200, 1600, 2000];
const QUALITY = 74;
const IMG_RE = /\.(jpe?g|png|webp|tiff?|avif)$/i;

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));
fs.mkdirSync(path.join(OUT, 'og'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const stamp = (f) => Math.round(fs.statSync(f).mtimeMs);

async function processImage(file, key) {
  const st = stamp(file);
  const prev = manifest[key];
  const outBase = key.replace(/\//g, '__');
  if (prev && prev.mtime === st && prev.widths.every((w) => fs.existsSync(path.join(OUT, `${outBase}-${w}.webp`)))) return false;
  const img = sharp(file).rotate();
  const meta = await img.metadata();
  const W = meta.width, H = meta.height;
  const widths = WIDTHS.filter((w) => w < W);
  if (!widths.length || W <= 2000) widths.push(Math.min(W, 2000));
  const uniq = [...new Set(widths)].sort((a, b) => a - b);
  for (const w of uniq) {
    await sharp(file).rotate().resize({ width: w, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 }).toFile(path.join(OUT, `${outBase}-${w}.webp`));
  }
  const { dominant } = await sharp(file).stats();
  manifest[key] = {
    file: outBase, mtime: st, width: W, height: H, widths: uniq,
    color: `rgb(${dominant.r},${dominant.g},${dominant.b})`
  };
  return true;
}

async function og(file, name, position = 'centre') {
  const out = path.join(OUT, 'og', `${name}.jpg`);
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(file).mtimeMs) return;
  await sharp(file).resize(1200, 630, { fit: 'cover', position }).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
}

let changed = 0;
for (const f of fs.readdirSync(SRC).filter((f) => IMG_RE.test(f)).sort()) {
  if (await processImage(path.join(SRC, f), f.replace(IMG_RE, ''))) { changed++; process.stdout.write('.'); }
}
// Diploma slots: any image file in assets/images/diplomas/
for (const k of Object.keys(manifest)) if (k.startsWith('diplomas/')) {
  const exists = fs.readdirSync(DIPLOMAS).some((f) => `diplomas/${f.replace(IMG_RE, '')}` === k);
  if (!exists) delete manifest[k];
}
if (fs.existsSync(DIPLOMAS)) {
  for (const f of fs.readdirSync(DIPLOMAS).filter((f) => IMG_RE.test(f)).sort()) {
    if (await processImage(path.join(DIPLOMAS, f), `diplomas/${f.replace(IMG_RE, '')}`)) { changed++; process.stdout.write('.'); }
  }
}

// Open Graph images (1200x630 JPG)
await og(path.join(SRC, site.images.hero), 'home');
for (const p of site.projects) await og(path.join(SRC, p.cover), `project-${p.slug}`, 'attention');
for (const n of site.news) await og(path.join(SRC, n.image), `news-${n.slug}`);

// Favicons from the site icon
const icon = path.join(SRC, site.images.icon);
for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const out = path.join(OUT, 'icons', name);
  if (!fs.existsSync(out)) await sharp(icon).resize(size, size).flatten({ background: '#ffffff' }).png().toFile(out);
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
console.log(`\nimages: ${Object.keys(manifest).length} in manifest, ${changed} (re)generated`);
