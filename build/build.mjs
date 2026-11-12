// Static site generator: content/*.json + src/ -> dist/
// Usage: node build/build.mjs   (run `node build/images.mjs` first, or `npm run build` for both)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const DIST = path.join(ROOT, 'dist');
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const site = readJSON('content/site.json');
const LANGS = site.languages;
const L = Object.fromEntries(LANGS.map((l) => [l, readJSON(`content/i18n/${l}.json`)]));
const manifest = readJSON('assets/images/optimized/manifest.json');
const YEAR = new Date().getFullYear();
const warnings = [];
const usedImages = new Set();

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

/* ------------------------------------------------------------------ urls */
// page = { type, slug? }  — types: home method credentials newsList projects services contact company privacy project news notFound
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
const CELL = '(max-width: 540px) 100vw, (max-width: 820px) 50vw, 33vw';
function img(key, { alt = '', sizes = CELL, eager = false, high = false, style = '', fallback = 800 } = {}) {
  const m = imgMeta(key);
  return `<img src="${variant(m, pickW(m, fallback))}" srcset="${srcsetOf(m)}" sizes="${sizes}" width="${m.width}" height="${m.height}" alt="${esc(alt)}"${eager ? '' : ' loading="lazy"'} decoding="async"${high ? ' fetchpriority="high"' : ''} style="background-color:${m.color};${style}">`;
}
const lbAttrs = (key, group, caption, alt) => {
  const m = imgMeta(key);
  return `data-lightbox="${group}" data-full="${variant(m, pickW(m, 2000))}" data-srcset="${srcsetOf(m)}" data-caption="${esc(caption)}" data-alt="${esc(alt)}"`;
};
const IDX = '<span class="cidx">00</span>'; // renumbered per page after render

/* ------------------------------------------------------------------ icons */
const ICON = {
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 12H5M11 6l-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r=".9" fill="currentColor" stroke="none"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3z"/></svg>',
};
const more = (href, label) => `<a class="more" href="${href}" aria-label="${esc(label)}" title="${esc(label)}">&raquo;</a>`;
const social = (l) => `<div class="social">
  <a href="${site.social.instagram}" target="_blank" rel="noopener me" aria-label="Instagram @ranko.labovic">${ICON.instagram}</a>
  <a href="${site.social.facebook}" target="_blank" rel="noopener me" aria-label="Facebook — ${esc(t(l, 'brand.name'))}">${ICON.facebook}</a>
</div>`;

/* ------------------------------------------------------------------ theme */
// Colours + fonts live in src/themes/<name>/ (theme.css, fonts.css, fonts/*.woff2).
const THEME = process.env.THEME || site.theme || 'kostelov';
const THEME_DIR = path.join(ROOT, 'src/themes', THEME);
if (!fs.existsSync(path.join(THEME_DIR, 'theme.css'))) throw new Error(`Unknown theme "${THEME}" — see src/themes/`);
const themeCss = fs.readFileSync(path.join(THEME_DIR, 'theme.css'), 'utf8');
const THEME_DARK = (themeCss.match(/--dark:\s*(#[0-9a-f]{3,6})/i) || [])[1] || '#403b35';
const THEME_BG = (themeCss.match(/--bg:\s*(#[0-9a-f]{3,6})/i) || [])[1] || '#ece6db';
const themeFonts = fs.readdirSync(path.join(THEME_DIR, 'fonts')).filter((f) => f.endsWith('.woff2'));
// preload the subsets each language needs: latin (+ tiny Serbian latin-ext for SR), cyrillic for RU
const PRELOAD_SUFFIX = { sr: ['-latin.woff2', '-latin-ext.woff2'], en: ['-latin.woff2'], ru: ['-cyrillic.woff2'] };
const FONT_PRELOAD = Object.fromEntries(LANGS.map((l) => [l, themeFonts.filter((f) => (PRELOAD_SUFFIX[l] || ['-latin.woff2']).some((s) => f.endsWith(s)))]));

/* ------------------------------------------------------------------ assets */
function buildAssets() {
  const fontsCss = fs.readFileSync(path.join(THEME_DIR, 'fonts.css'), 'utf8').replaceAll('url(fonts/', 'url(/assets/fonts/');
  const css = (fontsCss + '\n' + themeCss + '\n' + fs.readFileSync(path.join(ROOT, 'src/css/style.css'), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}')
    .replace(/(\d)and\(/g, '$1 and (').replace(/\)and\(/g, ') and (').trim();
  const js = fs.readFileSync(path.join(ROOT, 'src/js/main.js'), 'utf8');
  const h = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
  for (const d of ['assets/css', 'assets/js', 'assets/fonts']) fs.mkdirSync(path.join(DIST, d), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'assets/css/style.css'), css);
  fs.writeFileSync(path.join(DIST, 'assets/js/main.js'), js);
  for (const f of themeFonts) fs.copyFileSync(path.join(THEME_DIR, 'fonts', f), path.join(DIST, 'assets/fonts', f));
  return { css: `/assets/css/style.css?v=${h(css)}`, js: `/assets/js/main.js?v=${h(js)}` };
}

/* ------------------------------------------------------------------ layout */
const NAV = ['method', 'credentials', 'newsList', 'projects', 'services', 'contact'];

function nav(l, page) {
  const active = navOwner[page.type] || page.type;
  const links = NAV.map((k) => `<li><a class="link" href="${pageUrl(l, { type: k })}"${k === active ? ' aria-current="page"' : ''}>${esc(t(l, `nav.${k}`))}</a></li>`).join('');
  const langs = LANGS.map((x) => `<a href="${pageUrl(x, page)}" hreflang="${L[x].hreflang}" lang="${L[x].htmlLang}" data-lang-link${x === l ? ' aria-current="page"' : ''} title="${esc(L[x].languageName)}">${L[x].label}</a>`).join('');
  return `<nav class="nav" id="nav" aria-label="${esc(t(l, 'nav.menu'))}">
  <a class="logo" href="${pageUrl(l, { type: 'home' })}">${esc(t(l, 'brand.name'))}</a>
  <ul id="navlist">${links}</ul>
  <div class="langs" role="group" aria-label="${esc(t(l, 'nav.language'))}">${langs}</div>
  <button class="navtoggle" type="button" aria-expanded="false" aria-controls="navlist" aria-label="${esc(t(l, 'nav.openMenu'))}" data-open="${esc(t(l, 'nav.openMenu'))}" data-close="${esc(t(l, 'nav.closeMenu'))}"><span></span><span></span><span></span></button>
</nav>`;
}

function intro(l, { kicker, pale, dark, long = false, lead = '' }) {
  const label = [pale, dark].filter(Boolean).join(' ');
  return `<header class="intro${long ? ' intro--long' : ''}">
  <p class="kick">${esc(kicker)}</p>
  <h1><span class="sr-only">${esc(label)}</span><span aria-hidden="true">${pale ? `<span class="pale">${esc(pale)}</span> ` : ''}<span class="dk">${esc(dark)}</span></span></h1>
  ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
</header>`;
}
const pageIntro = (l, type) => intro(l, t(l, `pages.${type}`));

function band(l) {
  const c = site.contact, f = (k) => esc(t(l, `contact.form.${k}`));
  return `<section class="band" id="contact" aria-labelledby="band-h">
  <div data-reveal>
    <p class="s">${esc(t(l, 'band.kicker'))}</p>
    <h2 id="band-h">${esc(t(l, 'band.line1'))}<span class="light">${esc(t(l, 'band.line2'))}</span></h2>
    <p class="ncopy">© ${YEAR} ${esc(t(l, 'brand.name'))} · ${esc(t(l, 'band.copy'))}<br><a href="tel:${c.phoneHref}">${phone(l)}</a> · <a href="mailto:${c.email}">${c.email}</a></p>
  </div>
  <!-- TODO: set "formEndpoint" in content/site.json (Formspree / Netlify Forms / Basin / own PHP script). -->
  <form id="contact-form" action="${esc(site.formEndpoint ? site.formEndpoint.replace('formsubmit.co/ajax/', 'formsubmit.co/') : '#contact')}" method="post" novalidate
    data-endpoint="${esc(site.formEndpoint)}" data-email="${c.email}" data-phone="${phone(l)}" data-phone-href="${c.phoneHref}"
    data-err-name="${f('errName')}" data-err-email="${f('errEmail')}" data-err-message="${f('errMessage')}" data-err-summary="${f('errSummary')}"
    data-success="${f('success')}" data-failure="${f('failure')}" data-not-connected="${f('notConnected')}" data-sending="${f('sending')}">
    <input type="hidden" name="language" value="${l}">
    <input type="hidden" name="_subject" value="${esc(site.formSubject || 'Website Pitanje')}">
    <input type="hidden" name="_template" value="table">
    <input type="hidden" name="_captcha" value="false">
    <label for="cf-name">${f('name')}</label><input id="cf-name" name="name" type="text" autocomplete="name" required aria-describedby="cf-name-err"><span class="err" id="cf-name-err" aria-live="polite"></span>
    <label for="cf-email">${f('email')}</label><input id="cf-email" name="email" type="email" autocomplete="email" required aria-describedby="cf-email-err"><span class="err" id="cf-email-err" aria-live="polite"></span>
    <label for="cf-message">${f('message')}</label><textarea id="cf-message" name="message" rows="3" required aria-describedby="cf-message-err"></textarea><span class="err" id="cf-message-err" aria-live="polite"></span>
    <div class="hp" aria-hidden="true"><label for="cf-website">Website</label><input id="cf-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
    <button class="sub" type="submit"><span class="t">${f('submit')}</span><span class="go" aria-hidden="true">→</span></button>
    <p class="form-status" role="status" aria-live="polite"></p>
  </form>
</section>`;
}

function foot(l) {
  const c = site.contact;
  return `<footer class="foot">
  <div>
    <a class="brand" href="${pageUrl(l, { type: 'home' })}">${esc(t(l, 'brand.name'))}</a>
    <p class="copy">${esc(t(l, 'footer.tagline'))}<br>© ${YEAR} ${esc(site.company.shortLegalName)} · ${esc(t(l, 'footer.rights'))}</p>
    ${social(l)}
  </div>
  <nav aria-labelledby="f-nav"><h2 id="f-nav">${esc(t(l, 'footer.navTitle'))}</h2><ul>
    ${NAV.map((k) => `<li><a href="${pageUrl(l, { type: k })}">${esc(t(l, `nav.${k}`))}</a></li>`).join('')}
  </ul></nav>
  <div><h2>${esc(t(l, 'footer.contactTitle'))}</h2>
    <address>${esc(t(l, 'contact.address'))}<br><a href="tel:${c.phoneHref}">${phone(l)}</a><br><a href="mailto:${c.email}">${c.email}</a></address>
  </div>
  <div><h2>${esc(t(l, 'footer.companyTitle'))}</h2>
    <p>${esc(site.company.shortLegalName)}</p>
    <dl><dt>${esc(t(l, 'footer.pib'))}</dt><dd>${site.company.pib}</dd><dt>${esc(t(l, 'footer.mb'))}</dt><dd>${site.company.mb}</dd></dl>
    <ul><li><a href="${pageUrl(l, { type: 'company' })}">${esc(t(l, 'footer.companyLink'))}</a></li><li><a href="${pageUrl(l, { type: 'privacy' })}">${esc(t(l, 'footer.privacyLink'))}</a></li></ul>
  </div>
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

function layout({ l, page, title, description, ogImage, ogType = 'website', content, jsonld, preload = '', needsLightbox = false }) {
  const canonical = abs(pageUrl(l, page));
  const alternates = page.type === 'notFound' ? '' : LANGS.map((x) => `<link rel="alternate" hreflang="${L[x].hreflang}" href="${abs(pageUrl(x, page))}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${abs(pageUrl(site.defaultLang, page))}">`;
  const og = ogImage || '/assets/images/og/home.jpg';
  let k = 0;
  const body = content.replace(/<span class="cidx">00<\/span>/g, () => `<span class="cidx">${pad2(++k)}</span>`);
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
<meta property="og:site_name" content="${esc(t(l, 'meta.siteName'))}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${abs(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${L[l].ogLocale}">
${LANGS.filter((x) => x !== l).map((x) => `<meta property="og:locale:alternate" content="${L[x].ogLocale}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${THEME_DARK}">
<link rel="icon" href="/assets/images/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/images/icons/apple-touch-icon.png">
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
${nav(l, page)}
<main id="main" tabindex="-1">
${body}
</main>
${band(l)}
${foot(l)}
${needsLightbox ? lightbox(l) : ''}
</body>
</html>
`;
}

/* ------------------------------------------------------------------ cells */
// pad the last row with blank squares; cells with these classes span two columns
const span = (c) => (/class="[^"]*\b(map|article-cell|data-cell)\b/.test(c) ? 2 : 1);
const fill3 = (cells) => { const r = cells.reduce((s, c) => s + span(c), 0) % 3; return r ? [...cells, ...Array(3 - r).fill('<div class="cell blank" aria-hidden="true"></div>')] : cells; };
const grid = (cells, cls = '') => `<div class="grid${cls ? ' ' + cls : ''}">\n${fill3(cells).join('\n')}\n</div>`;

function credFile(slot) {
  const dir = path.join(ROOT, 'assets/images/diplomas');
  const f = fs.existsSync(dir) && fs.readdirSync(dir).find((x) => x.replace(/\.[^.]+$/, '') === slot && /\.(jpe?g|png|webp)$/i.test(x));
  return f && manifest[`diplomas/${slot}`] ? `diplomas/${slot}` : null;
}
function credImageCell(l, i, { asLink }) {
  const slot = site.credentials[i].slot, it = t(l, 'credentials.items')[i], key = credFile(slot);
  const label = `${IDX}<span class="dcap">${esc(it.label)}</span>`;
  const inner = key
    ? `<span class="frame">${img(key, { alt: it.alt, sizes: '(max-width: 540px) 66vw, (max-width: 820px) 33vw, 22vw', fallback: 480 })}</span>`
    : `<!-- REPLACE: ${slot}.jpg — drop the scan into assets/images/diplomas/ and run npm run build -->
<span class="frame"><span class="paper"><b>${esc(t(l, 'credentials.placeholderTitle'))}</b><small>${esc(t(l, 'credentials.placeholderSub'))}</small></span></span>`;
  if (asLink) return `<a class="cell cover" href="${pageUrl(l, { type: 'credentials' })}">${label}${inner}</a>`;
  if (!key) return `<div class="cell cover dim">${label}${inner}</div>`;
  return `<button type="button" class="cell cover dim" ${lbAttrs(key, 'credentials', it.caption, it.alt)}>${label}${inner}</button>`;
}

function specRows(l, p) {
  const it = t(l, `projects.items.${p.slug}`), F = t(l, 'projects.facts');
  const todo = (field) => (site.showTodos ? `<span class="todo" title="${esc(t(l, 'projects.todo'))}">TODO</span><!-- TODO: ${field} -->` : null);
  const rows = [
    [F.area, p.facts.area, 'area'], [F.location, it.location], [F.type, it.type], [F.year, p.year],
    [F.status, p.facts.status, 'status'], ...(p.facts.client ? [[F.client, it.client]] : []),
    [t(l, 'projects.practice'), t(l, 'projects.practiceValue')],
  ];
  return `<div class="tspec">${rows.map(([k, v, f]) => {
    const val = isTodo(v) ? todo(f) : esc(v);
    return val === null ? '' : `<div class="tspec-r"><span class="tspec-k">${esc(k)}</span><span class="tspec-v">${val}</span></div>`;
  }).join('')}</div>`;
}

const publishedNews = () => site.news.filter((n) => n.published).sort((a, b) => b.date.localeCompare(a.date));

/* ------------------------------------------------------------------ JSON-LD */
function orgLd(l) {
  const c = site.contact;
  const portrait = imgMeta(imgKey(site.images.portrait));
  return [
    {
      '@type': ['ProfessionalService', 'LocalBusiness'], '@id': abs('/#business'),
      name: site.company.shortLegalName, legalName: site.company.legalName,
      alternateName: [`${site.person.name} — ${t(l, 'brand.role')}`, site.company.brand],
      description: t(l, 'meta.homeDescription'), url: abs(pageUrl(l, { type: 'home' })),
      image: abs('/assets/images/og/home.jpg'), logo: abs('/assets/images/icons/icon-512.png'),
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
      jobTitle: t(l, 'brand.role'), image: abs(variant(portrait, pickW(portrait, 800))),
      worksFor: { '@id': abs('/#business') }, sameAs: [site.social.instagram],
      hasCredential: t(l, 'credentials.items').slice(0, 3).map((c) => ({
        '@type': 'EducationalOccupationalCredential', name: c.caption, credentialCategory: 'license',
        recognizedBy: { '@type': 'Organization', name: 'Inženjerska komora Srbije' },
      })),
    },
  ];
}
const crumbs = (l, items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(u) })) });
const simpleLd = (l, type, name) => ({ '@context': 'https://schema.org', '@graph': [crumbs(l, [[t(l, 'nav.home'), pageUrl(l, { type: 'home' })], [name, pageUrl(l, { type })]])] });

/* ------------------------------------------------------------------ pages */
function homePage(l) {
  const page = { type: 'home' };
  const H = t(l, 'home'), creds = t(l, 'credentials.items'), svc = t(l, 'services.items'), essays = t(l, 'method.items');
  const row1 = [
    `<div class="cell img color">${img(imgKey(site.images.portrait), { alt: H.portraitAlt, eager: true, high: true })}${IDX}</div>`,
    `<div class="cell txt prose" data-reveal><h2 class="bioh">${esc(H.bioTitle)}</h2>${H.bio.map((p, i) => `<p${i === H.bio.length - 1 ? ' class="quote"' : ''}>${esc(p)}</p>`).join('')}${more(pageUrl(l, { type: 'method' }), t(l, 'nav.method'))}</div>`,
    `<div class="cell txt prose" data-reveal style="--d:.1s"><h2 class="bioh">${esc(H.chronoTitle)}</h2><ul class="biolist">${H.chrono.map(([y, s]) => `<li><b>${esc(y)}</b> - ${esc(s)}</li>`).join('')}</ul>${more(pageUrl(l, { type: 'credentials' }), t(l, 'nav.credentials'))}</div>`,
  ];
  const row2 = [0, 1, 2].map((i) => credImageCell(l, i, { asLink: true }));
  const row3 = site.serviceGroups.map((g, gi) => `<div class="cell txt prose" data-reveal style="--d:${gi * 0.1}s"><h2 class="digh">${esc(H.serviceGroups[gi])}</h2><ul class="plist">${g.map((si) => `<li><a href="${pageUrl(l, { type: 'services' })}#svc-${si + 1}"><b>${esc(svc[si].title)}</b> <span class="pp">${pad2(si + 1)}</span></a></li>`).join('')}</ul>${more(pageUrl(l, { type: 'services' }), t(l, 'nav.services'))}</div>`);
  const row4 = site.projects.map((p) => {
    const it = t(l, `projects.items.${p.slug}`);
    return `<a class="cell img" href="${pageUrl(l, { type: 'project', slug: p.slug })}">${img(imgKey(p.cover), { alt: `${it.name} — ${it.location}` })}${IDX}<span class="ccap">${esc(it.name)}<small>${esc(it.location)} · ${p.year}</small></span></a>`;
  });
  const row5 = essays.slice(0, 3).map((e, i) => `<div class="cell txt essay" data-reveal style="--d:${i * 0.1}s"><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p>${more(pageUrl(l, { type: 'method' }), t(l, 'nav.method'))}</div>`);
  const pm = imgMeta(imgKey(site.images.portrait));
  return layout({
    l, page, title: t(l, 'meta.homeTitle'), description: t(l, 'meta.homeDescription'),
    preload: `<link rel="preload" as="image" imagesrcset="${srcsetOf(pm)}" imagesizes="${CELL}" fetchpriority="high">`,
    content: `${pageIntro(l, 'home')}\n${grid([...row1, ...row2, ...row3, ...row4, ...row5])}`,
    jsonld: { '@context': 'https://schema.org', '@graph': [...orgLd(l), { '@type': 'WebSite', '@id': abs('/#website'), url: abs(pageUrl(l, page)), name: t(l, 'meta.siteName'), inLanguage: L[l].htmlLang, publisher: { '@id': abs('/#business') } }] },
  });
}

function methodPage(l) {
  const essays = t(l, 'method.items');
  const cells = essays.flatMap((e, i) => {
    const file = site.methodImages[i % site.methodImages.length];
    return [
      `<div class="cell txt essay" data-reveal><span class="bignum" aria-hidden="true">${pad2(i + 1)}</span><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p></div>`,
      `<div class="cell img">${img(imgKey(file), { alt: '' })}${IDX}</div>`,
    ];
  });
  return layout({ l, page: { type: 'method' }, title: t(l, 'meta.methodTitle'), description: t(l, 'meta.methodDescription'), content: `${pageIntro(l, 'method')}\n${grid(cells)}`, jsonld: simpleLd(l, 'method', t(l, 'nav.method')) });
}

function credentialsPage(l) {
  const items = t(l, 'credentials.items');
  const cells = items.flatMap((it, i) => [
    credImageCell(l, i, { asLink: false }),
    `<div class="cell txt top" data-reveal><span class="big" aria-hidden="true">${esc(it.big)}</span><h2 class="stat">${esc(it.status)}</h2><p class="sub">${esc(it.title)}</p><p class="tail">${esc(it.meta)}</p></div>`,
  ]);
  return layout({ l, page: { type: 'credentials' }, title: t(l, 'meta.credentialsTitle'), description: t(l, 'meta.credentialsDescription'), content: `${pageIntro(l, 'credentials')}\n${grid(cells)}`, needsLightbox: true, jsonld: simpleLd(l, 'credentials', t(l, 'nav.credentials')) });
}

function projectsPage(l) {
  const cells = site.projects.flatMap((p) => {
    const it = t(l, `projects.items.${p.slug}`), href = pageUrl(l, { type: 'project', slug: p.slug });
    return [
      `<a class="cell img" href="${href}" tabindex="-1" aria-hidden="true">${img(imgKey(p.cover), { alt: '' })}${IDX}</a>`,
      `<a class="cell txt" href="${href}" data-reveal><h2 class="name">${esc(it.name)}</h2>${specRows(l, p)}</a>`,
    ];
  });
  return layout({ l, page: { type: 'projects' }, title: t(l, 'meta.projectsTitle'), description: t(l, 'meta.projectsDescription'), ogImage: `/assets/images/og/project-${site.projects[0].slug}.jpg`, content: `${pageIntro(l, 'projects')}\n${grid(cells)}`, jsonld: simpleLd(l, 'projects', t(l, 'nav.projects')) });
}

function newsListPage(l) {
  const cells = publishedNews().flatMap((n) => {
    const it = t(l, `news.items.${n.slug}`), href = pageUrl(l, { type: 'news', slug: n.slug });
    return [
      `<a class="cell img" href="${href}" tabindex="-1" aria-hidden="true">${img(imgKey(n.image), { alt: '' })}${IDX}</a>`,
      `<a class="cell txt" href="${href}" data-reveal><div><p class="meta"><time datetime="${n.date}">${esc(fmtDate(l, n.date))}</time></p><h2 class="name sm" style="margin-top:.8rem">${esc(it.title)}</h2></div><p class="tail">${esc(it.excerpt)} <span class="more" aria-hidden="true" style="margin:0;font-size:1rem">&raquo;</span></p></a>`,
    ];
  });
  return layout({ l, page: { type: 'newsList' }, title: t(l, 'meta.newsListTitle'), description: t(l, 'meta.newsListDescription'), content: `${pageIntro(l, 'newsList')}\n${grid(cells)}`, jsonld: simpleLd(l, 'newsList', t(l, 'nav.newsList')) });
}

function servicesPage(l) {
  const cells = t(l, 'services.items').map((s, i) => `<div class="cell txt svc hov" id="svc-${i + 1}" data-reveal style="--d:${(i % 3) * 0.08}s"><div><span class="num">${pad2(i + 1)}</span><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div></div>`);
  cells.push(`<a class="cell txt svc" href="#contact" data-reveal><div><span class="num">→</span><h2>${esc(t(l, 'services.cta'))}</h2><p>${esc(t(l, 'services.ctaText'))}</p></div><span class="more" aria-hidden="true">&raquo;</span></a>`);
  return layout({ l, page: { type: 'services' }, title: t(l, 'meta.servicesTitle'), description: t(l, 'meta.servicesDescription'), content: `${pageIntro(l, 'services')}\n${grid(cells)}`, jsonld: simpleLd(l, 'services', t(l, 'nav.services')) });
}

function contactPage(l) {
  const c = site.contact, C = t(l, 'contactPage');
  const cards = C.cards.map((cd, i) => `<a class="cell txt svc" href="#contact" data-reveal style="--d:${i * 0.1}s"><div><span class="num">${pad2(i + 1)}</span><h2>${esc(cd.title)}</h2><p>${esc(cd.text)}</p></div><span class="more" aria-hidden="true">&raquo;</span></a>`);
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(c.mapQuery)}&z=16&hl=${l}&ie=UTF8&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapQuery)}`;
  const office = `<div class="cell txt office top"><h2 class="bioh">${esc(C.officeTitle)}</h2><p class="lede">${esc(t(l, 'contact.visit'))}</p>
  <dl><dt>${esc(t(l, 'contact.addressLabel'))}</dt><dd>${esc(t(l, 'contact.address'))}</dd>
  <dt>${esc(t(l, 'contact.phoneLabel'))}</dt><dd><a href="tel:${c.phoneHref}">${phone(l)}</a></dd>
  <dt>${esc(t(l, 'contact.emailLabel'))}</dt><dd><a href="mailto:${c.email}">${c.email}</a></dd></dl>${social(l)}</div>`;
  const map = `<div class="cell map"><iframe data-src="${esc(mapSrc)}" title="${esc(t(l, 'contact.mapTitle'))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><a class="map-link" href="${mapLink}" target="_blank" rel="noopener">${esc(t(l, 'contact.mapLink'))} ↗</a></div>`;
  return layout({ l, page: { type: 'contact' }, title: t(l, 'meta.contactTitle'), description: t(l, 'meta.contactDescription'), content: `${pageIntro(l, 'contact')}\n${grid([...cards, office, map])}`, jsonld: { '@context': 'https://schema.org', '@graph': [orgLd(l)[0]] } });
}

function projectPage(l, p, i) {
  const page = { type: 'project', slug: p.slug };
  const it = t(l, `projects.items.${p.slug}`), coverKey = imgKey(p.cover), cm = imgMeta(coverKey);
  const g = p.gallery;
  const imgCell = (ph, j) => {
    const key = imgKey(ph.file), label = `${it.name} — ${t(l, `projects.rooms.${ph.room}`)}`;
    return `<button type="button" class="cell img" ${lbAttrs(key, 'gallery', `${label} (${j + 1}/${g.length})`, label)}>${img(key, { alt: label })}${IDX}</button>`;
  };
  const texts = [
    `<div class="cell txt top" data-reveal><h2 class="bioh">${esc(t(l, 'projects.specTitle'))}</h2>${specRows(l, p)}</div>`,
    `<div class="cell txt top" data-reveal><h2 class="bioh">${esc(t(l, 'projects.descTitle'))}</h2>${it.description.map((d) => `<p class="lede">${esc(d)}</p>`).join('')}</div>`,
  ];
  // kostelov rhythm: photos on the (row+col) even squares, text / blank cells on the odd ones
  const cells = []; let gi = 0, ti = 0;
  for (let n = 0; gi < g.length || ti < texts.length || n % 3; n++) {
    const even = ((Math.floor(n / 3) + (n % 3)) % 2) === 0;
    if (even && gi < g.length) cells.push(imgCell(g[gi], gi++));
    else if (!even && ti < texts.length) cells.push(texts[ti++]);
    else cells.push('<div class="cell blank" aria-hidden="true"></div>');
  }
  const prev = site.projects[(i - 1 + site.projects.length) % site.projects.length];
  const next = site.projects[(i + 1) % site.projects.length];
  const pn = (q) => t(l, `projects.items.${q.slug}.name`);
  const pager = [
    `<a class="cell txt" href="${pageUrl(l, { type: 'project', slug: prev.slug })}" rel="prev"><p class="meta">← ${esc(t(l, 'projects.prev'))}</p><h2 class="name sm">${esc(pn(prev))}</h2></a>`,
    `<a class="cell txt" href="${pageUrl(l, { type: 'projects' })}"><p class="meta">${esc(t(l, 'pages.projects.kicker'))}</p><h2 class="name sm">${esc(t(l, 'projects.all'))}</h2></a>`,
    `<a class="cell txt" href="${pageUrl(l, { type: 'project', slug: next.slug })}" rel="next"><p class="meta">${esc(t(l, 'projects.next'))} →</p><h2 class="name sm">${esc(pn(next))}</h2></a>`,
  ];
  const content = `<header class="phero">${img(coverKey, { alt: `${it.name} — ${it.location}`, sizes: '100vw', eager: true, high: true, fallback: 1600, style: `object-position:${p.heroPosition || '50% 50%'}` })}<h1>${esc(it.name)}</h1></header>
${grid(cells)}
${grid(pager)}`;
  return layout({
    l, page, title: t(l, 'meta.projectTitle', { name: it.name, location: it.location }),
    description: clip(`${it.name}, ${it.location} (${p.year}) — ${it.type}. ${it.description.join(' ')}`),
    ogImage: `/assets/images/og/project-${p.slug}.jpg`, ogType: 'article',
    preload: `<link rel="preload" as="image" imagesrcset="${srcsetOf(cm)}" imagesizes="100vw" fetchpriority="high">`,
    content, needsLightbox: true,
    jsonld: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CreativeWork', '@id': abs(pageUrl(l, page)) + '#project', name: it.name, description: it.description.join(' '),
          genre: it.type, dateCreated: String(p.year), inLanguage: L[l].htmlLang, locationCreated: { '@type': 'Place', name: it.location },
          creator: { '@id': abs('/#business') }, publisher: { '@id': abs('/#business') },
          image: g.slice(0, 6).map((ph) => { const m = imgMeta(imgKey(ph.file)); return abs(variant(m, pickW(m, 1200))); }),
          ...(p.facts.client ? { funder: { '@type': 'Organization', name: it.client } } : {}),
        },
        crumbs(l, [[t(l, 'nav.home'), pageUrl(l, { type: 'home' })], [t(l, 'nav.projects'), pageUrl(l, { type: 'projects' })], [it.name, pageUrl(l, page)]]),
      ],
    },
  });
}

function newsPage(l, n) {
  const page = { type: 'news', slug: n.slug };
  const it = t(l, `news.items.${n.slug}`);
  const others = publishedNews().filter((x) => x.slug !== n.slug);
  const nm = imgMeta(imgKey(n.image));
  const cells = [
    `<div class="cell img" style="aspect-ratio:auto">${img(imgKey(n.image), { alt: '', eager: true, high: true, style: 'position:absolute;inset:0' })}${IDX}</div>`,
    `<article class="cell txt article-cell">${it.body}</article>`,
  ];
  const pager = [
    ...others.slice(0, 2).map((x) => `<a class="cell txt" href="${pageUrl(l, { type: 'news', slug: x.slug })}"><p class="meta"><time datetime="${x.date}">${esc(fmtDate(l, x.date))}</time></p><h2 class="name sm">${esc(t(l, `news.items.${x.slug}.title`))}</h2></a>`),
    `<a class="cell txt" href="${pageUrl(l, { type: 'newsList' })}"><p class="meta">${esc(t(l, 'pages.newsList.kicker'))}</p><h2 class="name sm">${esc(t(l, 'news.back'))}</h2></a>`,
  ];
  return layout({
    l, page, title: t(l, 'meta.newsTitle', { title: it.title }), description: clip(it.excerpt),
    ogImage: `/assets/images/og/news-${n.slug}.jpg`, ogType: 'article',
    content: `${intro(l, { kicker: fmtDate(l, n.date), pale: '', dark: it.title, long: true })}\n${grid(cells, 'article-grid')}\n${grid(pager)}`,
    jsonld: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article', headline: it.title, description: it.excerpt, datePublished: n.date, inLanguage: L[l].htmlLang,
          image: abs(variant(nm, pickW(nm, 1200))), mainEntityOfPage: abs(pageUrl(l, page)),
          author: { '@id': abs('/#business'), '@type': 'Organization', name: site.company.shortLegalName },
          publisher: { '@type': 'Organization', name: site.company.shortLegalName, logo: { '@type': 'ImageObject', url: abs('/assets/images/icons/icon-512.png') } },
        },
        crumbs(l, [[t(l, 'nav.home'), pageUrl(l, { type: 'home' })], [t(l, 'nav.newsList'), pageUrl(l, { type: 'newsList' })], [it.title, pageUrl(l, page)]]),
      ],
    },
  });
}

function companyPage(l) {
  const cp = t(l, 'companyPage');
  const cells = [
    `<div class="cell txt data-cell top"><h2 class="bioh">${esc(cp.intro)}</h2><div class="tspec">${cp.rows.map(([k, v]) => `<div class="tspec-r"><span class="tspec-k">${esc(k)}</span><span class="tspec-v">${esc(v)}</span></div>`).join('')}</div><p class="tail">${esc(cp.source)}</p></div>`,
    `<div class="cell txt"><p class="meta">${esc(cp.kicker)}</p><p class="name sm">${esc(site.company.shortLegalName)}</p></div>`,
  ];
  return layout({ l, page: { type: 'company' }, title: t(l, 'meta.companyTitle'), description: t(l, 'meta.companyDescription'), content: `${intro(l, { kicker: cp.kicker, pale: '', dark: cp.title, long: true })}\n${grid(cells)}`, jsonld: { '@context': 'https://schema.org', '@graph': [orgLd(l)[0]] } });
}

function privacyPage(l) {
  const pp = t(l, 'privacyPage');
  const cells = [`<!-- TODO: privacy policy text (the form collects name + email; required under Serbian ZZPL / GDPR). -->
<div class="cell txt article-cell top">${pp.body}</div>`];
  return layout({ l, page: { type: 'privacy' }, title: t(l, 'meta.privacyTitle'), description: t(l, 'meta.privacyDescription'), content: `${intro(l, { kicker: pp.kicker, pale: '', dark: pp.title, long: true })}\n${grid(cells)}` });
}

function notFoundPage(l) {
  const nf = t(l, 'notFound');
  return layout({ l, page: { type: 'notFound' }, title: t(l, 'meta.notFoundTitle'), description: nf.text,
    content: `${intro(l, { kicker: '404', pale: '', dark: nf.title, long: true })}<div class="notfound"><p>${esc(nf.text)}</p><a href="${pageUrl(l, { type: 'home' })}">${esc(nf.back)} →</a></div>` });
}

/* ------------------------------------------------------------------ write */
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const ASSETS = buildAssets();
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

// Images actually referenced
fs.mkdirSync(path.join(DIST, 'assets/images'), { recursive: true });
for (const f of usedImages) fs.copyFileSync(path.join(ROOT, 'assets/images/optimized', f), path.join(DIST, 'assets/images', f));
for (const dir of ['og', 'icons']) fs.cpSync(path.join(ROOT, 'assets/images/optimized', dir), path.join(DIST, 'assets/images', dir), { recursive: true });

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
  name: t('sr', 'meta.siteName'), short_name: 'R. Labović', start_url: '/', display: 'browser', background_color: THEME_BG, theme_color: THEME_DARK,
  icons: [{ src: '/assets/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/assets/images/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2));

// Redirects from old WordPress URLs + host config
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
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml application/xml
</IfModule>
`);

console.log(`built ${LANGS.length * allPages.length + 1} pages, ${usedImages.size} image files -> dist/  (theme: ${THEME})`);
if (warnings.length) console.warn('warnings:\n  ' + [...new Set(warnings)].join('\n  '));
