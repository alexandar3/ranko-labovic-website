// VERSION 2 generator — Vinex Projekt brand, design after the "green business" reference.
// content/site.json + content/i18n/<lang>.json (deep-merged with content/v2/<lang>.json) + src/v2/ -> dist-v2/
// Usage: node build/build-v2.mjs   (or npm run build:v2 for images + this). v1 (build/build.mjs -> dist/) is untouched.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const DIST = path.join(ROOT, 'dist-v2');
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

/* ------------------------------------------------------------------ content (base + v2 overrides) */
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const deepMerge = (base, over) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  return out;
};
const site = readJSON('content/site.json');
const LANGS = site.languages;
const L = Object.fromEntries(LANGS.map((l) => {
  const over = fs.existsSync(path.join(ROOT, `content/v2/${l}.json`)) ? readJSON(`content/v2/${l}.json`) : {};
  return [l, deepMerge(readJSON(`content/i18n/${l}.json`), over)];
}));
const manifest = readJSON('assets/images/optimized/manifest.json');
const YEAR = new Date().getFullYear();
const warnings = [];
const usedImages = new Set();
const BRAND = 'Vinex Projekt';

/* ------------------------------------------------------------------ helpers */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const dig = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
function t(lang, key, vars = {}) {
  let v = dig(L[lang], key);
  if (v === undefined) { warnings.push(`missing ${lang}:${key}`); v = dig(L[site.defaultLang], key) ?? key; }
  if (typeof v === 'string') for (const [k, val] of Object.entries(vars)) v = v.replaceAll(`{${k}}`, val);
  return v;
}
const abs = (p) => site.siteUrl.replace(/\/$/, '') + p;
const clip = (s, n = 158) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…');
const fmtDate = (lang, iso) => new Intl.DateTimeFormat(L[lang].intlLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
const isTodo = (v) => v === 'TODO' || v === '' || v == null;
const pad2 = (n) => String(n).padStart(2, '0');
const phone = (l) => (l === 'sr' ? site.contact.phoneDisplay : site.contact.phoneIntl);

const pageUrl = (l, page) => {
  const P = L[l].paths;
  if (page.type === 'notFound') return P.home;
  return page.slug ? `${P[page.type]}${page.slug}/` : P[page.type];
};
const navOwner = { project: 'projects', news: 'newsList' };

/* ------------------------------------------------------------------ images */
const imgKey = (file) => file.replace(/\.(jpe?g|png|webp|tiff?|avif)$/i, '');
function imgMeta(key) {
  const m = manifest[key];
  if (!m) throw new Error(`Image not in manifest: ${key} — run "npm run images"`);
  return m;
}
const variant = (m, w) => { const f = `${m.file}-${w}.webp`; usedImages.add(f); return `/assets/images/${f}`; };
const srcsetOf = (m) => m.widths.map((w) => `${variant(m, w)} ${w}w`).join(', ');
const pickW = (m, target) => m.widths.find((w) => w >= target) ?? m.widths[m.widths.length - 1];
function img(key, { alt = '', sizes = '100vw', eager = false, high = false, style = '', fallback = 800, cls = '' } = {}) {
  const m = imgMeta(key);
  return `<img${cls ? ` class="${cls}"` : ''} src="${variant(m, pickW(m, fallback))}" srcset="${srcsetOf(m)}" sizes="${sizes}" width="${m.width}" height="${m.height}" alt="${esc(alt)}"${eager ? '' : ' loading="lazy"'} decoding="async"${high ? ' fetchpriority="high"' : ''} style="background-color:${m.color};${style}">`;
}
const lbAttrs = (key, group, caption, alt) => {
  const m = imgMeta(key);
  return `data-lightbox="${group}" data-full="${variant(m, pickW(m, 2000))}" data-srcset="${srcsetOf(m)}" data-caption="${esc(caption)}" data-alt="${esc(alt)}"`;
};
const fileKey = (f) => imgKey(f);

/* ------------------------------------------------------------------ icons + logo */
const MARK_PATH = fs.readFileSync(path.join(ROOT, 'assets/v2/logo-mark.path'), 'utf8').trim();
const mark = (cls = 'mark') => `<svg class="${cls}" viewBox="146 145 221 192" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="${MARK_PATH}"/></svg>`;
const svg = (body, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ICON = {
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 'arr'),
  arrowUR: svg('<path d="M7 17 17 7M8 7h9v9"/>', 'arr'),
  prev: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  next: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  design: svg('<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 11h6"/>'),
  build: svg('<path d="M4 20h16"/><path d="M6 20V9h4v11"/><path d="M10 9 18 4"/><path d="M18 4v10"/><path d="M16 14h4v3h-4z"/>'),
  expert: svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="m9.5 14 2 2 3.5-4"/>'),
  instagram: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r=".6" fill="currentColor"/>'),
  facebook: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3z"/></svg>',
  pin: svg('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
};
const GROUP_ICONS = [ICON.design, ICON.build, ICON.expert];
const social = (l) => `<div class="social">
  <a href="${site.social.instagram}" target="_blank" rel="noopener me" aria-label="Instagram @ranko.labovic">${ICON.instagram}</a>
  <a href="${site.social.facebook}" target="_blank" rel="noopener me" aria-label="Facebook — ${BRAND}">${ICON.facebook}</a>
</div>`;
// reference-style CTA: lime pill + separate square arrow
const btn = (href, label, { variant: v = 'lime', small = false, attrs = '' } = {}) =>
  `<a class="btn btn--${v}${small ? ' btn--sm' : ''}" href="${href}"${attrs}><span class="btn-t">${esc(label)}</span><span class="btn-a">${ICON.arrow}</span></a>`;
const pill = (text, v = '') => `<p class="pill${v ? ' pill--' + v : ''}"><span class="dot" aria-hidden="true"></span>${esc(text)}</p>`;

/* ------------------------------------------------------------------ assets */
const FONT_DIR = path.join(ROOT, 'src/themes/kostelov'); // Inter (read-only reuse of v1's self-hosted files)
const fonts = fs.readdirSync(path.join(FONT_DIR, 'fonts')).filter((f) => f.endsWith('.woff2'));
const PRELOAD_SUFFIX = { sr: ['-latin.woff2', '-latin-ext.woff2'], en: ['-latin.woff2'], ru: ['-cyrillic.woff2'] };
const FONT_PRELOAD = Object.fromEntries(LANGS.map((l) => [l, fonts.filter((f) => (PRELOAD_SUFFIX[l] || ['-latin.woff2']).some((s) => f.endsWith(s)))]));
const DARK = '#14190f', LIME = '#c6f01e';

async function buildAssets() {
  const fontsCss = fs.readFileSync(path.join(FONT_DIR, 'fonts.css'), 'utf8').replaceAll('url(fonts/', 'url(/assets/fonts/');
  const css = (fontsCss + '\n' + fs.readFileSync(path.join(ROOT, 'src/v2/style.css'), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}')
    .replace(/(\d)and\(/g, '$1 and (').replace(/\)and\(/g, ') and (').trim();
  const js = fs.readFileSync(path.join(ROOT, 'src/v2/main.js'), 'utf8');
  const h = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
  for (const d of ['assets/css', 'assets/js', 'assets/fonts', 'assets/v2']) fs.mkdirSync(path.join(DIST, d), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'assets/css/style.css'), css);
  fs.writeFileSync(path.join(DIST, 'assets/js/main.js'), js);
  for (const f of fonts) fs.copyFileSync(path.join(FONT_DIR, 'fonts', f), path.join(DIST, 'assets/fonts', f));
  // favicons: transparent SVG (adapts to light/dark tab bars) + transparent PNGs; apple-touch-icon on a solid background
  fs.copyFileSync(path.join(ROOT, 'assets/v2/favicon.svg'), path.join(DIST, 'assets/v2/favicon.svg'));
  fs.copyFileSync(path.join(ROOT, 'assets/v2/logo-mark.svg'), path.join(DIST, 'assets/v2/logo-mark.svg'));
  const square = (fill, bg, pad) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="140 140 233 233" width="512" height="512">${bg ? `<rect x="140" y="140" width="233" height="233" fill="${bg}"/>` : ''}<g transform="translate(256.5 256.5) scale(${pad}) translate(-256.5 -241)"><path fill="${fill}" fill-rule="evenodd" d="${MARK_PATH}"/></g></svg>`);
  for (const [name, size] of [['favicon-32.png', 32], ['icon-192.png', 192], ['icon-512.png', 512]])
    await sharp(square(DARK, null, 1)).resize(size, size).png().toFile(path.join(DIST, 'assets/v2', name));
  await sharp(square(LIME, DARK, 0.72)).resize(180, 180).png().toFile(path.join(DIST, 'assets/v2/apple-touch-icon.png'));
  return { css: `/assets/css/style.css?v=${h(css)}`, js: `/assets/js/main.js?v=${h(js)}` };
}

/* ------------------------------------------------------------------ layout */
const NAV = ['projects', 'services', 'method', 'credentials', 'newsList', 'contact'];
const PAGE_HERO = {
  projects: 'ranko-labovic-vineks-projekt-arhitektura-politova-fasada-26-03.webp',
  services: 'ranko-labovic-vineks-projekt-arhitektura-espanjola-fasada-apartmani-26-08.webp',
  method: 'ranko-labovic-vineks-projekt-arhitektura-espanjola-kolonada-ulaz-26-11.webp',
  credentials: 'ranko-labovic-vineks-projekt-arhitektura-espanjola-vestibil-26-10.webp',
  newsList: 'espanjola-03.webp',
  contact: 'ranko-labovic-vineks-projekt-arhitektura-espanjola-balkon-pogled-more-26-31.webp',
  company: 'ranko-labovic-vineks-projekt-arhitektura-espanjola-vestibil-detalj-26-28.webp',
  privacy: 'ranko-labovic-vineks-projekt-arhitektura-espanjola-vestibil-detalj-26-28.webp',
  notFound: 'espanjola-05.webp',
};
const SERVICES_BG = 'ranko-labovic-vineks-projekt-arhitektura-espanjola-eksterijer-bazen-26-07.webp';
const HERO_CARD = 'ranko-labovic-vineks-projekt-arhitektura-espanjola-eksterijer-bazen-26-07.webp';

function topbar(l, page) {
  const active = navOwner[page.type] || page.type;
  const links = NAV.map((k) => `<li><a href="${pageUrl(l, { type: k })}"${k === active ? ' aria-current="page"' : ''}>${esc(t(l, `nav.${k}`))}</a></li>`).join('');
  const langs = LANGS.map((x) => `<a href="${pageUrl(x, page)}" hreflang="${L[x].hreflang}" lang="${L[x].htmlLang}" data-lang-link${x === l ? ' aria-current="page"' : ''} title="${esc(L[x].languageName)}">${L[x].label}</a>`).join('');
  return `<header class="top" id="top-nav">
  <a class="logo" href="${pageUrl(l, { type: 'home' })}" aria-label="${BRAND} — ${esc(t(l, 'nav.home'))}">${mark()}<span class="logo-word">VINEX PROJEKT</span></a>
  <nav class="top-nav" aria-label="${esc(t(l, 'nav.menu'))}"><ul id="navlist">${links}</ul></nav>
  <div class="top-right">
    <div class="langs" role="group" aria-label="${esc(t(l, 'nav.language'))}">${langs}</div>
    ${btn(page.type === 'contact' ? '#contact' : pageUrl(l, { type: 'contact' }) + '#contact', t(l, 'hero.ctaContact'), { small: true, variant: 'lime top-cta' })}
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="navlist" aria-label="${esc(t(l, 'nav.openMenu'))}" data-open="${esc(t(l, 'nav.openMenu'))}" data-close="${esc(t(l, 'nav.closeMenu'))}"><span></span><span></span></button>
  </div>
</header>`;
}

function pageHero(l, page, { file, kicker, title, lead = '', crumbs = [], meta = '', alt = '' }) {
  const key = fileKey(file);
  return `<section class="hero hero--page" aria-labelledby="page-title">
  <div class="hero-media">${img(key, { alt, sizes: '(max-width: 1440px) 100vw, 1440px', eager: true, high: true, fallback: 1600 })}</div>
  ${topbar(l, page)}
  <div class="hero-body">
    ${crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map(([n, u]) => `<a href="${u}">${esc(n)}</a>`).join('<span aria-hidden="true">/</span>')}</nav>` : ''}
    ${pill(kicker, 'glass')}
    <h1 id="page-title">${esc(title)}</h1>
    ${lead ? `<p class="hero-lead">${esc(lead)}</p>` : ''}
    ${meta}
  </div>
</section>`;
}

function contactSection(l) {
  const c = site.contact, f = (k) => esc(t(l, `contact.form.${k}`));
  return `<section class="sec cta-wrap" id="contact" aria-labelledby="cta-h">
  <div class="cta">
    <div class="cta-l" data-reveal>
      ${pill(t(l, 'v2.ctaKicker'), 'dark')}
      <h2 id="cta-h">${esc(t(l, 'v2.ctaTitle'))}</h2>
      <p class="cta-text">${esc(t(l, 'v2.ctaText'))}</p>
      <ul class="cta-list">
        <li>${ICON.pin}<span>${esc(t(l, 'contact.address'))}</span></li>
        <li>${ICON.phone}<a href="tel:${c.phoneHref}">${phone(l)}</a></li>
        <li>${ICON.mail}<a href="mailto:${c.email}">${c.email}</a></li>
      </ul>
      ${social(l)}
    </div>
    <!-- Messages go to formEndpoint in content/site.json (FormSubmit -> vinex.projekt@gmail.com). -->
    <form class="form" id="contact-form" action="${esc(site.formEndpoint ? site.formEndpoint.replace('formsubmit.co/ajax/', 'formsubmit.co/') : '#contact')}" method="post" novalidate data-reveal
      data-endpoint="${esc(site.formEndpoint)}" data-email="${c.email}" data-phone="${phone(l)}" data-phone-href="${c.phoneHref}"
      data-err-name="${f('errName')}" data-err-email="${f('errEmail')}" data-err-message="${f('errMessage')}" data-err-summary="${f('errSummary')}"
      data-success="${f('success')}" data-failure="${f('failure')}" data-not-connected="${f('notConnected')}" data-sending="${f('sending')}">
      <h3>${esc(t(l, 'v2.formTitle'))}</h3>
      <input type="hidden" name="language" value="${l}">
      <input type="hidden" name="_subject" value="${esc(site.formSubject || 'Website Pitanje')}">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_captcha" value="false">
      <div class="fld"><label for="cf-name">${f('name')}</label><input id="cf-name" name="name" type="text" autocomplete="name" required aria-describedby="cf-name-err"><span class="err" id="cf-name-err" aria-live="polite"></span></div>
      <div class="fld"><label for="cf-email">${f('email')}</label><input id="cf-email" name="email" type="email" autocomplete="email" required aria-describedby="cf-email-err"><span class="err" id="cf-email-err" aria-live="polite"></span></div>
      <div class="fld"><label for="cf-message">${f('message')}</label><textarea id="cf-message" name="message" rows="4" required aria-describedby="cf-message-err"></textarea><span class="err" id="cf-message-err" aria-live="polite"></span></div>
      <div class="hp" aria-hidden="true"><label for="cf-website">Website</label><input id="cf-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <button class="btn btn--lime sub" type="submit"><span class="btn-t t">${f('submit')}</span><span class="btn-a">${ICON.arrow}</span></button>
      <p class="form-status" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>`;
}

function footer(l) {
  const c = site.contact;
  return `<footer class="foot">
  <div class="foot-top">
    <div class="foot-brand">
      <a class="lockup" href="${pageUrl(l, { type: 'home' })}" aria-label="${BRAND}">${mark('mark mark--lg')}<span class="logo-word">VINEX PROJEKT</span></a>
      <p>${esc(t(l, 'v2.footerText'))}</p>
      ${social(l)}
    </div>
    <nav aria-labelledby="f-nav"><h2 id="f-nav">${esc(t(l, 'footer.navTitle'))}</h2><ul>${NAV.map((k) => `<li><a href="${pageUrl(l, { type: k })}">${esc(t(l, `nav.${k}`))}</a></li>`).join('')}</ul></nav>
    <div><h2>${esc(t(l, 'footer.contactTitle'))}</h2><address>${esc(t(l, 'contact.address'))}<br><a href="tel:${c.phoneHref}">${phone(l)}</a><br><a href="mailto:${c.email}">${c.email}</a></address></div>
    <div><h2>${esc(t(l, 'footer.companyTitle'))}</h2><p>${esc(site.company.shortLegalName)}<br>${esc(t(l, 'footer.pib'))}: ${site.company.pib}<br>${esc(t(l, 'footer.mb'))}: ${site.company.mb}</p>
      <ul><li><a href="${pageUrl(l, { type: 'company' })}">${esc(t(l, 'footer.companyLink'))}</a></li><li><a href="${pageUrl(l, { type: 'privacy' })}">${esc(t(l, 'footer.privacyLink'))}</a></li></ul></div>
  </div>
  <div class="foot-bar"><span>© ${YEAR} ${esc(site.company.shortLegalName)} · ${esc(t(l, 'footer.rights'))}</span><a href="#top">${esc(t(l, 'footer.backToTop'))} ↑</a></div>
</footer>`;
}

const lightbox = (l) => `<dialog class="lightbox" id="lightbox" aria-label="${esc(t(l, 'lightbox.label'))}" data-of="${esc(t(l, 'lightbox.of'))}">
  <div class="lb-top"><span class="lb-count" aria-live="polite"></span><button class="lb-btn lb-close" type="button" aria-label="${esc(t(l, 'lightbox.close'))}">${ICON.close}</button></div>
  <div class="lb-stage">
    <button class="lb-btn lb-prev" type="button" aria-label="${esc(t(l, 'lightbox.prev'))}">${ICON.prev}</button>
    <img alt="">
    <button class="lb-btn lb-next" type="button" aria-label="${esc(t(l, 'lightbox.next'))}">${ICON.next}</button>
  </div>
  <p class="lb-cap"></p>
</dialog>`;

function layout({ l, page, title, description, ogImage, ogType = 'website', hero, content, jsonld, preload = '', needsLightbox = false, cta = true }) {
  const canonical = abs(pageUrl(l, page));
  const alternates = page.type === 'notFound' ? '' : LANGS.map((x) => `<link rel="alternate" hreflang="${L[x].hreflang}" href="${abs(pageUrl(x, page))}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${abs(pageUrl(site.defaultLang, page))}">`;
  const og = ogImage || '/assets/images/og/home.jpg';
  return `<!doctype html>
<html lang="${L[l].htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${page.type === 'notFound' ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">`}
${alternates}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${abs(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${L[l].ogLocale}">
${LANGS.filter((x) => x !== l).map((x) => `<meta property="og:locale:alternate" content="${L[x].ogLocale}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/assets/v2/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/v2/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/v2/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
${FONT_PRELOAD[l].map((f) => `<link rel="preload" href="/assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`).join('\n')}
${preload}
<link rel="stylesheet" href="${ASSETS.css}">
<script>document.documentElement.classList.add('js')</script>
<script src="${ASSETS.js}" defer></script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body class="page-${page.type}" id="top">
<a class="skip" href="#main">${esc(t(l, 'nav.skip'))}</a>
<div class="shell">
${hero}
<main id="main" tabindex="-1">
${content}
${cta ? contactSection(l) : ''}
</main>
${footer(l)}
</div>
${needsLightbox ? lightbox(l) : ''}
</body>
</html>
`;
}
const heroPreload = (file, sizes = '(max-width: 1440px) 100vw, 1440px') => { const m = imgMeta(fileKey(file)); return `<link rel="preload" as="image" imagesrcset="${srcsetOf(m)}" imagesizes="${sizes}" fetchpriority="high">`; };

/* ------------------------------------------------------------------ JSON-LD */
const publishedNews = () => site.news.filter((n) => n.published).sort((a, b) => b.date.localeCompare(a.date));
function orgLd(l) {
  const c = site.contact;
  const portrait = imgMeta(imgKey(site.images.portrait));
  return [
    {
      '@type': ['ProfessionalService', 'LocalBusiness'], '@id': abs('/#business'),
      name: BRAND, legalName: site.company.legalName, alternateName: site.company.shortLegalName,
      description: t(l, 'meta.homeDescription'), url: abs(pageUrl(l, { type: 'home' })),
      image: abs('/assets/images/og/home.jpg'), logo: abs('/assets/v2/icon-512.png'),
      telephone: c.phoneIntl, email: c.email, taxID: site.company.pib,
      identifier: { '@type': 'PropertyValue', propertyID: 'MB (Matični broj)', value: site.company.mb },
      foundingDate: site.company.founded,
      address: { '@type': 'PostalAddress', streetAddress: c.street, postalCode: c.postalCode, addressLocality: c.city, addressRegion: c.district, addressCountry: c.countryCode },
      hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapQuery)}`,
      areaServed: ['Serbia', 'Montenegro', 'Russia'].map((name) => ({ '@type': 'Country', name })),
      knowsAbout: t(l, 'services.items').map((s) => s.title),
      founder: { '@id': abs('/#ranko') }, sameAs: [site.social.instagram, site.social.facebook],
    },
    {
      '@type': 'Person', '@id': abs('/#ranko'), name: site.person.name, alternateName: site.person.nameRu,
      jobTitle: t(l, 'about.founderKicker'), image: abs(variant(portrait, pickW(portrait, 800))),
      worksFor: { '@id': abs('/#business') },
      hasCredential: t(l, 'credentials.items').map((cr) => ({
        '@type': 'EducationalOccupationalCredential', name: cr.caption, credentialCategory: 'license',
        recognizedBy: { '@type': 'Organization', name: 'Inženjerska komora Srbije' },
      })),
    },
  ];
}
const crumbsLd = (l, items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(u) })) });
const simpleLd = (l, type) => ({ '@context': 'https://schema.org', '@graph': [crumbsLd(l, [[t(l, 'nav.home'), pageUrl(l, { type: 'home' })], [t(l, `nav.${type}`), pageUrl(l, { type })]])] });
const homeCrumb = (l, type) => [[t(l, 'nav.home'), pageUrl(l, { type: 'home' })], ...(type ? [[t(l, `nav.${type}`), pageUrl(l, { type })]] : [])];

/* ------------------------------------------------------------------ shared blocks */
const secHead = (kicker, title, { text = '', center = false, side = '' } = {}) => `<header class="sec-head${center ? ' sec-head--center' : ''}" data-reveal>
  <div>${pill(kicker)}<h2>${esc(title)}</h2>${text && center ? `<p class="sec-text">${esc(text)}</p>` : ''}</div>
  ${!center && (text || side) ? `<div class="sec-side">${text ? `<p class="sec-text">${esc(text)}</p>` : ''}${side}</div>` : ''}
</header>`;

function credFile(slot) {
  const dir = path.join(ROOT, 'assets/images/diplomas');
  const f = fs.existsSync(dir) && fs.readdirSync(dir).find((x) => x.replace(/\.[^.]+$/, '') === slot && /\.(jpe?g|png|webp)$/i.test(x));
  return f && manifest[`diplomas/${slot}`] ? `diplomas/${slot}` : null;
}
function credCard(l, i, { large = false } = {}) {
  const it = t(l, 'credentials.items')[i], slot = site.credentials[i].slot, key = credFile(slot);
  const scan = key
    ? `<button type="button" class="cred-scan" ${lbAttrs(key, 'credentials', it.caption, it.alt)}><span class="sr-only">${esc(t(l, 'v2.enlarge'))}: </span>${img(key, { alt: it.alt, sizes: large ? '(max-width: 900px) 90vw, 30vw' : '(max-width: 900px) 90vw, 25vw', fallback: 480 })}</button>`
    : `<!-- REPLACE: ${slot}.jpg --><div class="cred-scan cred-scan--empty"><b>${esc(t(l, 'credentials.placeholderTitle'))}</b></div>`;
  return `<article class="cred${large ? ' cred--lg' : ''}" data-reveal>
  ${scan}
  <div class="cred-body"><span class="cred-num">${esc(it.big)}</span><h3>${esc(it.status)}</h3><p class="cred-org">${esc(it.title)}</p>${large ? `<p class="cred-meta">${esc(it.meta)}</p>` : ''}</div>
</article>`;
}

function projectCard(l, p, { big = false, eager = false } = {}) {
  const it = t(l, `projects.items.${p.slug}`);
  return `<a class="pcard${big ? ' pcard--big' : ''}" href="${pageUrl(l, { type: 'project', slug: p.slug })}" data-reveal>
  <div class="pcard-img">${img(fileKey(p.cover), { alt: `${it.name} — ${it.location}`, sizes: big ? '(max-width: 900px) 100vw, 55vw' : '(max-width: 900px) 100vw, 40vw', fallback: 1200, eager })}<span class="pcard-go">${ICON.arrowUR}</span></div>
  <h3>${esc(it.name)}</h3>
  <p>${esc(it.location)} · ${p.year} · ${esc(it.type)}</p>
</a>`;
}

function newsCard(l, n) {
  const it = t(l, `news.items.${n.slug}`);
  return `<a class="ncard" href="${pageUrl(l, { type: 'news', slug: n.slug })}" data-reveal>
  <div class="ncard-img">${img(fileKey(n.image), { alt: '', sizes: '(max-width: 900px) 100vw, 30vw', fallback: 800 })}</div>
  <time datetime="${n.date}">${esc(fmtDate(l, n.date))}</time>
  <h3>${esc(it.title)}</h3>
  <span class="more">${esc(t(l, 'v2.readMore'))} ${ICON.arrow}</span>
</a>`;
}

function serviceGroupCards(l) {
  const svc = t(l, 'services.items'), titles = t(l, 'home.serviceGroups');
  return `<div class="svc-cards">${site.serviceGroups.map((g, gi) => `<article class="svc-card" data-reveal>
  <span class="svc-ico">${GROUP_ICONS[gi % GROUP_ICONS.length]}</span>
  <h3>${esc(titles[gi])}</h3>
  <ul>${g.map((si) => `<li><a href="${pageUrl(l, { type: 'services' })}#svc-${si + 1}">${esc(svc[si].title)}</a></li>`).join('')}</ul>
</article>`).join('')}</div>`;
}

function facts(l, p) {
  const it = t(l, `projects.items.${p.slug}`), F = t(l, 'projects.facts');
  const todo = (field) => (site.showTodos ? `<span class="todo" title="${esc(t(l, 'projects.todo'))}">TODO</span><!-- TODO: ${field} -->` : null);
  const rows = [
    [F.location, it.location], [F.type, it.type], [F.year, p.year], [F.area, p.facts.area, 'area'],
    [F.status, p.facts.status, 'status'], ...(p.facts.client ? [[F.client, it.client]] : []),
    [t(l, 'projects.practice'), BRAND],
  ];
  return `<dl class="facts">${rows.map(([k, v, f]) => { const val = isTodo(v) ? todo(f) : esc(v); return val === null ? '' : `<div><dt>${esc(k)}</dt><dd>${val}</dd></div>`; }).join('')}</dl>`;
}

/* ------------------------------------------------------------------ pages */
function homePage(l) {
  const page = { type: 'home' };
  const H = t(l, 'hero'), A = t(l, 'about'), V = (k) => t(l, `v2.${k}`);
  const esp = site.projects.find((p) => p.slug === 'espanjola') || site.projects[0];
  const espIt = t(l, `projects.items.${esp.slug}`);
  const hero = `<section class="hero hero--home" aria-labelledby="hero-h">
  <div class="hero-media">${img(fileKey(site.images.hero), { alt: H.imageAlt, sizes: '(max-width: 1440px) 100vw, 1440px', eager: true, high: true, fallback: 1600 })}</div>
  ${topbar(l, page)}
  <div class="hero-body">
    ${pill(H.kicker, 'glass')}
    <h1 id="hero-h">${esc(H.title)}</h1>
    <p class="hero-lead">${esc(H.lead)}</p>
    <div class="btns">${btn(pageUrl(l, { type: 'projects' }), H.ctaProjects)}${btn('#contact', H.ctaContact, { variant: 'glass' })}</div>
  </div>
  <div class="hero-foot">
    <a class="founder-chip" href="#about">
      <span class="chip-row">${img(fileKey(site.images.portrait), { alt: '', sizes: '48px', fallback: 480, cls: 'chip-face' })}<span class="chip-go">${ICON.arrow}</span></span>
      <span class="chip-text">${esc(H.founderLine)}</span>
    </a>
    <a class="float-card" href="${pageUrl(l, { type: 'project', slug: esp.slug })}">
      ${img(fileKey(HERO_CARD), { alt: '', sizes: '96px', fallback: 480, cls: 'float-img' })}
      <span><small>${esc(H.cardKicker)}</small><b>${esc(espIt.name)}</b><span>${esc(espIt.location)} · ${esp.year}</span></span>
    </a>
  </div>
</section>`;
  const stats = `<section class="stats" aria-label="${esc(A.kicker)}">${t(l, 'stats').map((s) => `<div class="stat" data-reveal><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</section>`;
  const about = `<section class="sec about" id="about" aria-labelledby="about-h">
  <div data-reveal>${pill(A.kicker)}
  <h2 class="statement" id="about-h">${esc(A.statementStrong)} <span class="soft">${esc(A.statementSoft)}</span></h2></div>
  <div class="about-grid">
    <div class="about-text" data-reveal>${A.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}${btn(pageUrl(l, { type: 'method' }), A.cta)}</div>
    <figure class="founder" data-reveal>
      <div class="founder-img">${img(fileKey(site.images.portrait), { alt: A.founderAlt, sizes: '(max-width: 900px) 100vw, 30vw' })}</div>
      <figcaption><small>${esc(A.founderKicker)}</small><b>${esc(A.founderName)}</b><span>${esc(A.founderRole)}</span><q>${esc(A.founderQuote.replace(/^[„“"«]|[”"»]$/g, ''))}</q></figcaption>
    </figure>
  </div>
</section>`;
  const services = `<section class="dark-sec" aria-labelledby="svc-h">
  <div class="dark-bg">${img(fileKey(SERVICES_BG), { alt: '', sizes: '(max-width: 1440px) 100vw, 1440px', fallback: 1600 })}</div>
  <header class="dark-head" data-reveal>
    <div>${pill(V('servicesKicker'), 'glass')}<h2 id="svc-h">${esc(V('servicesTitle'))}</h2></div>
    <div class="dark-side"><p>${esc(V('servicesText'))}</p>${btn(pageUrl(l, { type: 'services' }), V('allServices'), { small: true })}</div>
  </header>
  ${serviceGroupCards(l)}
</section>`;
  const [p1, ...rest] = site.projects;
  const projects = `<section class="sec" aria-labelledby="proj-h">
  ${secHead(V('projectsKicker'), V('projectsTitle'), { text: V('projectsText'), center: true }).replace('<h2>', '<h2 id="proj-h">')}
  <div class="pgrid">${projectCard(l, p1, { big: true })}<div class="pgrid-side">${rest.map((p) => projectCard(l, p)).join('')}</div></div>
  <div class="sec-foot">${btn(pageUrl(l, { type: 'projects' }), V('allProjects'))}</div>
</section>`;
  const essays = t(l, 'method.items');
  const approach = `<section class="sec" aria-labelledby="app-h">
  ${secHead(V('approachKicker'), V('approachTitle'), { side: btn(pageUrl(l, { type: 'method' }), V('readMethod'), { variant: 'outline' }) }).replace('<h2>', '<h2 id="app-h">')}
  <div class="cards3">${essays.slice(0, 3).map((e, i) => `<a class="acard" href="${pageUrl(l, { type: 'method' })}#m${i + 1}" data-reveal><span class="acard-n">${pad2(i + 1)}</span><h3>${esc(e.title)}</h3><p>${esc(clip(e.text, 190))}</p><span class="more">${esc(V('readMore'))} ${ICON.arrow}</span></a>`).join('')}</div>
</section>`;
  const creds = `<section class="sec" aria-labelledby="cred-h">
  ${secHead(V('credsKicker'), V('credsTitle'), { text: V('credsText'), side: btn(pageUrl(l, { type: 'credentials' }), V('allCreds'), { variant: 'outline' }) }).replace('<h2>', '<h2 id="cred-h">')}
  <div class="cards3">${t(l, 'credentials.items').map((_, i) => credCard(l, i)).join('')}</div>
</section>`;
  const news = `<section class="sec" aria-labelledby="news-h">
  ${secHead(V('newsKicker'), V('newsTitle'), { side: btn(pageUrl(l, { type: 'newsList' }), V('allNews'), { variant: 'outline' }) }).replace('<h2>', '<h2 id="news-h">')}
  <div class="cards3">${publishedNews().slice(0, 3).map((n) => newsCard(l, n)).join('')}</div>
</section>`;
  return layout({
    l, page, title: t(l, 'meta.homeTitle'), description: t(l, 'meta.homeDescription'),
    preload: heroPreload(site.images.hero), hero, needsLightbox: true,
    content: [stats, about, services, projects, approach, creds, news].join('\n'),
    jsonld: { '@context': 'https://schema.org', '@graph': [...orgLd(l), { '@type': 'WebSite', '@id': abs('/#website'), url: abs(pageUrl(l, page)), name: BRAND, inLanguage: L[l].htmlLang, publisher: { '@id': abs('/#business') } }] },
  });
}

const stdHero = (l, type, extra = {}) => pageHero(l, { type }, { file: PAGE_HERO[type], kicker: t(l, `pages.${type}.kicker`), title: t(l, `pages.${type}.title`), crumbs: homeCrumb(l, null), ...extra });

function projectsPage(l) {
  const type = 'projects';
  return layout({ l, page: { type }, title: t(l, 'meta.projectsTitle'), description: t(l, 'meta.projectsDescription'), ogImage: `/assets/images/og/project-${site.projects[0].slug}.jpg`,
    preload: heroPreload(PAGE_HERO[type]), hero: stdHero(l, type, { lead: t(l, 'v2.projectsText') }),
    content: `<section class="sec"><div class="grid2">${site.projects.map((p) => projectCard(l, p, { big: true })).join('')}</div></section>`, jsonld: simpleLd(l, type) });
}

function servicesPage(l) {
  const type = 'services';
  const cards = t(l, 'services.items').map((s, i) => `<article class="scard" id="svc-${i + 1}" data-reveal><span class="scard-n">${pad2(i + 1)}</span><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></article>`);
  cards.push(`<article class="scard scard--cta" data-reveal><h2>${esc(t(l, 'services.cta'))}</h2><p>${esc(t(l, 'services.ctaText'))}</p>${btn('#contact', t(l, 'services.ctaLink'))}</article>`);
  return layout({ l, page: { type }, title: t(l, 'meta.servicesTitle'), description: t(l, 'meta.servicesDescription'), preload: heroPreload(PAGE_HERO[type]),
    hero: stdHero(l, type, { lead: t(l, 'v2.servicesText') }),
    content: `<section class="sec"><div class="cards3 cards3--svc">${cards.join('')}</div></section>`, jsonld: simpleLd(l, type) });
}

function methodPage(l) {
  const type = 'method';
  const rows = t(l, 'method.items').map((e, i) => `<article class="mrow${i % 2 ? ' flip' : ''}" id="m${i + 1}">
  <div class="mrow-img" data-reveal>${img(fileKey(site.methodImages[i % site.methodImages.length]), { alt: '', sizes: '(max-width: 900px) 100vw, 45vw' })}</div>
  <div class="mrow-txt" data-reveal><span class="acard-n">${pad2(i + 1)}</span><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p></div>
</article>`).join('');
  return layout({ l, page: { type }, title: t(l, 'meta.methodTitle'), description: t(l, 'meta.methodDescription'), preload: heroPreload(PAGE_HERO[type]),
    hero: stdHero(l, type), content: `<section class="sec mrows">${rows}</section>`, jsonld: simpleLd(l, type) });
}

function credentialsPage(l) {
  const type = 'credentials';
  return layout({ l, page: { type }, title: t(l, 'meta.credentialsTitle'), description: t(l, 'meta.credentialsDescription'), preload: heroPreload(PAGE_HERO[type]),
    hero: stdHero(l, type, { lead: t(l, 'v2.credsText') }), needsLightbox: true,
    content: `<section class="sec"><div class="cards3">${t(l, 'credentials.items').map((_, i) => credCard(l, i, { large: true })).join('')}</div></section>`, jsonld: simpleLd(l, type) });
}

function newsListPage(l) {
  const type = 'newsList';
  return layout({ l, page: { type }, title: t(l, 'meta.newsListTitle'), description: t(l, 'meta.newsListDescription'), preload: heroPreload(PAGE_HERO[type]),
    hero: stdHero(l, type), content: `<section class="sec"><div class="cards3">${publishedNews().map((n) => newsCard(l, n)).join('')}</div></section>`, jsonld: simpleLd(l, type) });
}

function contactPage(l) {
  const type = 'contact', c = site.contact, C = t(l, 'contactPage');
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(c.mapQuery)}&z=16&hl=${l}&ie=UTF8&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapQuery)}`;
  const cards = `<div class="cards3">${C.cards.map((cd, i) => `<a class="acard" href="#contact" data-reveal><span class="acard-n">${pad2(i + 1)}</span><h2>${esc(cd.title)}</h2><p>${esc(cd.text)}</p><span class="more">${esc(t(l, 'services.ctaLink'))} ${ICON.arrow}</span></a>`).join('')}</div>`;
  const office = `<div class="office">
  <div class="office-card" data-reveal>${pill(t(l, 'v2.officeTitle'))}<p class="office-lede">${esc(t(l, 'contact.visit'))}</p>
    <dl class="facts facts--1"><div><dt>${esc(t(l, 'contact.addressLabel'))}</dt><dd>${esc(t(l, 'contact.address'))}</dd></div>
    <div><dt>${esc(t(l, 'contact.phoneLabel'))}</dt><dd><a href="tel:${c.phoneHref}">${phone(l)}</a></dd></div>
    <div><dt>${esc(t(l, 'contact.emailLabel'))}</dt><dd><a href="mailto:${c.email}">${c.email}</a></dd></div></dl>${social(l)}</div>
  <div class="map"><iframe data-src="${esc(mapSrc)}" title="${esc(t(l, 'contact.mapTitle'))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><a class="map-link" href="${mapLink}" target="_blank" rel="noopener">${esc(t(l, 'contact.mapLink'))} ↗</a></div>
</div>`;
  return layout({ l, page: { type }, title: t(l, 'meta.contactTitle'), description: t(l, 'meta.contactDescription'), preload: heroPreload(PAGE_HERO[type]),
    hero: stdHero(l, type, { lead: t(l, 'v2.ctaText') }), content: `<section class="sec">${cards}</section><section class="sec">${office}</section>`,
    jsonld: { '@context': 'https://schema.org', '@graph': [orgLd(l)[0]] } });
}

function projectPage(l, p, i) {
  const page = { type: 'project', slug: p.slug };
  const it = t(l, `projects.items.${p.slug}`), g = p.gallery;
  const hero = pageHero(l, page, { file: p.cover, kicker: it.type, title: it.name, alt: `${it.name} — ${it.location}`,
    crumbs: homeCrumb(l, 'projects'), meta: `<p class="hero-meta">${esc(it.location)} · ${p.year}</p>` });
  const gallery = `<div class="gallery">${g.map((ph, j) => {
    const key = fileKey(ph.file), label = `${it.name} — ${t(l, `projects.rooms.${ph.room}`)}`;
    return `<button type="button" class="g-item${j % 7 === 0 ? ' g-item--wide' : ''}" ${lbAttrs(key, 'gallery', `${label} (${j + 1}/${g.length})`, label)}>${img(key, { alt: label, sizes: '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw' })}</button>`;
  }).join('')}</div>`;
  const prev = site.projects[(i - 1 + site.projects.length) % site.projects.length];
  const next = site.projects[(i + 1) % site.projects.length];
  const pcLink = (q, dir) => { const qi = t(l, `projects.items.${q.slug}`); return `<a class="pager-card${dir === 'next' ? ' pager-card--next' : ''}" href="${pageUrl(l, { type: 'project', slug: q.slug })}" rel="${dir}">${img(fileKey(q.cover), { alt: '', sizes: '120px', fallback: 480 })}<span><small>${esc(t(l, `projects.${dir}`))}</small><b>${esc(qi.name)}</b></span></a>`; };
  const content = `<section class="sec"><div class="proj-intro">
  <aside class="spec" data-reveal><h2>${esc(t(l, 'v2.specTitle'))}</h2>${facts(l, p)}</aside>
  <div class="proj-desc" data-reveal>${pill(t(l, 'v2.descTitle'))}${it.description.map((d) => `<p>${esc(d)}</p>`).join('')}</div>
</div></section>
<section class="sec" aria-labelledby="gal-h">${secHead(t(l, 'v2.galleryTitle'), `${g.length} ${t(l, 'projects.photos')}`).replace('<h2>', '<h2 id="gal-h">')}${gallery}</section>
<nav class="sec pager" aria-label="${esc(t(l, 'projects.all'))}">${pcLink(prev, 'prev')}${pcLink(next, 'next')}</nav>`;
  return layout({
    l, page, title: t(l, 'meta.projectTitle', { name: it.name, location: it.location }),
    description: clip(`${it.name}, ${it.location} (${p.year}) — ${it.type}. ${it.description.join(' ')}`),
    ogImage: `/assets/images/og/project-${p.slug}.jpg`, ogType: 'article', preload: heroPreload(p.cover), hero, content, needsLightbox: true,
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'CreativeWork', '@id': abs(pageUrl(l, page)) + '#project', name: it.name, description: it.description.join(' '), genre: it.type, dateCreated: String(p.year), inLanguage: L[l].htmlLang,
        locationCreated: { '@type': 'Place', name: it.location }, creator: { '@id': abs('/#business') }, publisher: { '@id': abs('/#business') },
        image: g.slice(0, 6).map((ph) => { const m = imgMeta(fileKey(ph.file)); return abs(variant(m, pickW(m, 1200))); }),
        ...(p.facts.client ? { funder: { '@type': 'Organization', name: it.client } } : {}) },
      crumbsLd(l, [[t(l, 'nav.home'), pageUrl(l, { type: 'home' })], [t(l, 'nav.projects'), pageUrl(l, { type: 'projects' })], [it.name, pageUrl(l, page)]]),
    ] },
  });
}

function newsPage(l, n) {
  const page = { type: 'news', slug: n.slug };
  const it = t(l, `news.items.${n.slug}`), nm = imgMeta(fileKey(n.image));
  const others = publishedNews().filter((x) => x.slug !== n.slug);
  const hero = pageHero(l, page, { file: n.image, kicker: fmtDate(l, n.date), title: it.title, crumbs: homeCrumb(l, 'newsList') });
  const content = `<section class="sec"><article class="article" data-reveal>${it.body}</article></section>
${others.length ? `<section class="sec">${secHead(t(l, 'v2.newsKicker'), t(l, 'news.back'), { side: btn(pageUrl(l, { type: 'newsList' }), t(l, 'v2.allNews'), { variant: 'outline' }) })}<div class="cards3">${others.map((x) => newsCard(l, x)).join('')}</div></section>` : ''}`;
  return layout({ l, page, title: t(l, 'meta.newsTitle', { title: it.title }), description: clip(it.excerpt), ogImage: `/assets/images/og/news-${n.slug}.jpg`, ogType: 'article', preload: heroPreload(n.image), hero, content,
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: it.title, description: it.excerpt, datePublished: n.date, inLanguage: L[l].htmlLang, image: abs(variant(nm, pickW(nm, 1200))), mainEntityOfPage: abs(pageUrl(l, page)),
        author: { '@id': abs('/#business'), '@type': 'Organization', name: BRAND }, publisher: { '@type': 'Organization', name: BRAND, logo: { '@type': 'ImageObject', url: abs('/assets/v2/icon-512.png') } } },
      crumbsLd(l, [[t(l, 'nav.home'), pageUrl(l, { type: 'home' })], [t(l, 'nav.newsList'), pageUrl(l, { type: 'newsList' })], [it.title, pageUrl(l, page)]]),
    ] } });
}

function companyPage(l) {
  const cp = t(l, 'companyPage');
  const body = `<div class="doc-card" data-reveal><p class="office-lede">${esc(cp.intro)}</p><dl class="facts facts--1">${cp.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="note">${esc(cp.source)}</p></div>`;
  return layout({ l, page: { type: 'company' }, title: t(l, 'meta.companyTitle'), description: t(l, 'meta.companyDescription'), preload: heroPreload(PAGE_HERO.company),
    hero: pageHero(l, { type: 'company' }, { file: PAGE_HERO.company, kicker: cp.kicker, title: cp.title, crumbs: homeCrumb(l, null) }),
    content: `<section class="sec">${body}</section>`, jsonld: { '@context': 'https://schema.org', '@graph': [orgLd(l)[0]] } });
}

function privacyPage(l) {
  const pp = t(l, 'privacyPage');
  return layout({ l, page: { type: 'privacy' }, title: t(l, 'meta.privacyTitle'), description: t(l, 'meta.privacyDescription'), preload: heroPreload(PAGE_HERO.privacy),
    hero: pageHero(l, { type: 'privacy' }, { file: PAGE_HERO.privacy, kicker: pp.kicker, title: pp.title, crumbs: homeCrumb(l, null) }),
    content: `<!-- TODO: privacy policy text (the form collects name + email; required under Serbian ZZPL / GDPR). -->\n<section class="sec"><div class="doc-card article">${pp.body}</div></section>` });
}

function notFoundPage(l) {
  const nf = t(l, 'notFound');
  return layout({ l, page: { type: 'notFound' }, title: t(l, 'meta.notFoundTitle'), description: nf.text, cta: false,
    hero: pageHero(l, { type: 'notFound' }, { file: PAGE_HERO.notFound, kicker: '404', title: nf.title, lead: nf.text, meta: `<div class="btns">${btn(pageUrl(l, { type: 'home' }), nf.back)}</div>` }),
    content: '' });
}

/* ------------------------------------------------------------------ write */
fs.rmSync(DIST, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
fs.mkdirSync(DIST, { recursive: true });
const ASSETS = await buildAssets();
const write = (u, html) => {
  const f = path.join(DIST, u.replace(/^\//, ''), u.endsWith('/') ? 'index.html' : '');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
};
const PAGES = [
  ['home', homePage], ['method', methodPage], ['credentials', credentialsPage], ['newsList', newsListPage],
  ['projects', projectsPage], ['services', servicesPage], ['contact', contactPage], ['company', companyPage], ['privacy', privacyPage],
];
for (const l of LANGS) {
  for (const [type, fn] of PAGES) write(pageUrl(l, { type }), fn(l));
  site.projects.forEach((p, i) => write(pageUrl(l, { type: 'project', slug: p.slug }), projectPage(l, p, i)));
  for (const n of publishedNews()) write(pageUrl(l, { type: 'news', slug: n.slug }), newsPage(l, n));
}
fs.writeFileSync(path.join(DIST, '404.html'), notFoundPage(site.defaultLang));
const allPages = [...PAGES.map(([type]) => ({ type })), ...site.projects.map((p) => ({ type: 'project', slug: p.slug })), ...publishedNews().map((n) => ({ type: 'news', slug: n.slug }))];

fs.mkdirSync(path.join(DIST, 'assets/images'), { recursive: true });
for (const f of usedImages) fs.copyFileSync(path.join(ROOT, 'assets/images/optimized', f), path.join(DIST, 'assets/images', f));
fs.cpSync(path.join(ROOT, 'assets/images/optimized/og'), path.join(DIST, 'assets/images/og'), { recursive: true });

// sitemap.xml with hreflang alternates
const today = new Date().toISOString().slice(0, 10);
const sm = allPages.flatMap((pg) => LANGS.map((l) => `  <url>
    <loc>${abs(pageUrl(l, pg))}</loc>
    <lastmod>${pg.type === 'news' ? site.news.find((n) => n.slug === pg.slug).date : today}</lastmod>
${LANGS.map((x) => `    <xhtml:link rel="alternate" hreflang="${L[x].hreflang}" href="${abs(pageUrl(x, pg))}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(pageUrl(site.defaultLang, pg))}"/>
  </url>`)).join('\n');
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sm}
</urlset>
`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);
fs.writeFileSync(path.join(DIST, 'site.webmanifest'), JSON.stringify({
  name: BRAND, short_name: BRAND, start_url: '/', display: 'browser', background_color: '#ffffff', theme_color: '#ffffff',
  icons: [
    { src: '/assets/v2/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    { src: '/assets/v2/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/v2/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}, null, 2));

// Redirects from old WordPress URLs + host config (same as v1)
const OLD = [['/o-nama/', '/'], ['/kontakt/', '/vas-projekat/'], ['/gde-se-nalazimo/', '/vas-projekat/'], ['/mapa-sajta/', '/'], ['/pocetna/', '/'], ['/sample-page/', '/'], ['/novosti/dobrodosli-na-novi-sajt/', '/novosti/']];
fs.writeFileSync(path.join(DIST, '_redirects'), OLD.map(([a, b]) => `${a}  ${b}  301`).join('\n') + '\n');
fs.writeFileSync(path.join(DIST, '_headers'), `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
fs.writeFileSync(path.join(DIST, 'vercel.json'), JSON.stringify({
  trailingSlash: true,
  redirects: OLD.map(([a, b]) => ({ source: a.replace(/\/$/, ''), destination: b, permanent: true })),
  headers: [{ source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }],
}, null, 2));
fs.writeFileSync(path.join(DIST, '.htaccess'), `# Apache / cPanel
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddType font/woff2 .woff2
AddType image/webp .webp
AddType image/svg+xml .svg
AddType application/manifest+json .webmanifest

RewriteEngine On
# Force HTTPS (uncomment when the certificate is active)
# RewriteCond %{HTTPS} off
# RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
# Old WordPress URLs
${OLD.map(([a, b]) => `RewriteRule ^${a.replace(/^\//, '').replace(/\/$/, '')}/?$ ${b} [R=301,L]`).join('\n')}

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml application/xml
</IfModule>
`);

console.log(`v2 built ${LANGS.length * allPages.length + 1} pages, ${usedImages.size} image files -> dist-v2/`);
if (warnings.length) { console.warn('warnings:\n  ' + [...new Set(warnings)].join('\n  ')); process.exitCode = 1; }
