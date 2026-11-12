# rankolabovic.com: redesign

A static, three-language (SR / EN / RU) website for architect **Ranko Labović** and **Vinex Projekt d.o.o.**, Belgrade.
The layout, page structure and visual language follow **kostelov.com** closely. The content is Ranko's own, rewritten into kostelov's structure.
It is plain HTML, CSS and a little vanilla JS, generated from JSON content by a small Node script. There is no framework and no backend, so `dist/` runs on any host.

- Layout study of the reference: [docs/reference-notes.md](docs/reference-notes.md)
- Original site text, archived verbatim: [content/source/rankolabovic-original.md](content/source/rankolabovic-original.md)
- No text, photos, logos or diplomas from kostelov.com are used. Only its layout and style are copied.

---

## Quick start

```bash
npm install          # once: installs sharp (image processing)
npm run dev          # build + local server + auto-rebuild & browser reload on save -> http://localhost:3000/
```

Other commands:

```bash
npm run build        # images (cached) + HTML -> dist/
npm run serve        # serve dist/ at http://localhost:4321/ (no watching)
npm run html         # rebuild HTML/CSS/JS only (fast, text changes)
npm run images       # rebuild image variants only
```

Node 18 or newer. Open the site through a server (`npm run dev` / `npm run serve`), not by double-clicking `dist/index.html`. The paths are root-relative, as they will be on the real domain.

## Pages (mirrors kostelov.com)

| kostelov.com | This site (SR / EN / RU) | Content |
| --- | --- | --- |
| Home | `/` · `/en/` · `/ru/` | Giant two-tone name; rows: portrait / Bio / Chronology → 3 framed licences → 3 service lists → 3 project photos → 3 Method essays → dark contact band |
| Метод | `/metod/` · `/en/method/` · `/ru/metod/` | 6 essays alternating with photos, with large pale numbers |
| Реноме | `/kvalifikacije/` · `/en/credentials/` · `/ru/kvalifikaciya/` | His 3 framed licence scans + text cells with a large number (200 / 300 / 400) |
| Пресса | `/novosti/` · `/en/news/` · `/ru/novosti/` | His news posts (photo + text cells) |
| Проекты | `/projekti/` · `/en/projects/` · `/ru/proekty/` | Photo + spec-table cells (area, location, type, year, status, practice) |
| Project page | `/projekat/<slug>/` · `/en/project/<slug>/` · `/ru/proekt/<slug>/` | Full-width photo with a giant title, then photos on alternating squares with spec and description cells and blank squares in between |
| Сотрудничество | `/usluge/` · `/en/services/` · `/ru/uslugi/` | All 11 services as numbered squares |
| Ваш проект | `/vas-projekat/` · `/en/your-project/` · `/ru/vash-proekt/` | 3 enquiry cards, office details, map |
| — | `/podaci-o-firmi/`, `/politika-privatnosti/` (+ EN/RU) | Company register data, privacy |

Every page ends with the dark **"Stupite u kontakt / Get in touch / Свяжитесь с нами"** band (form) and the 4-column footer.

## Themes (colours + fonts) and how to revert

The layout is shared; the **look** comes from a theme in `src/themes/<name>/`:

| Theme | Look | Fonts |
| --- | --- | --- |
| `bordo` (**active**) | Warm parchment beige, oxblood burgundy nav, contact band and heading word, deep olive accents (links, kickers, button), pale-olive first word, burgundy lacquer licence frames | **Inter** |
| `formbureau` | Palette of formbureau.co.uk: pale blue-grey radial ground, ultramarine `#002295` nav and band, electric blue accent (`#105AFF`, AA-safe `#0A4FE8`), thin blue-outlined frames | **Inter** |
| `terracotta` | Cool concrete greys, deep oxidised-copper green nav and contact band, terracotta accent (the red roofs above the Bay of Kotor in his Espanjola photos), pale-terracotta giant headings, blackened-steel licence frames | **Unbounded** (wide geometric display) + **Onest** (text) |
| `kostelov` (saved version 2) | kostelov.com beige / dark brown / bronze, wooden frames | **Inter** |

The intro band is compact: on screens wider than 820 px the two-tone heading sits on one line ("Ranko Labović"); on phones it stacks into two lines. The nav bar is 58 px tall (`--nav-h` in `style.css`).

**To switch theme**, set `"theme": "kostelov"` (or `bordo`, `formbureau`, `terracotta`) in `content/site.json` and rebuild (`npm run dev` picks it up on save). To preview without editing the file: `THEME=kostelov npm run html` (PowerShell: `$env:THEME='kostelov'; npm run html`).

A theme folder contains:
- `theme.css`: every colour, plus the display/text font names, a display-size multiplier (`--ds`) and letter-spacing. Each colour is commented, and all text colours pass WCAG AA.
- `fonts.css` + `fonts/*.woff2`: self-hosted Google Fonts. The Latin Extended files are **subset to the ten Serbian letters** (č ć đ š ž, upper and lower case), which makes them about 3.5 KB instead of 30–120 KB. If you add text with other accented letters (e.g. German ü), re-download that subset.

To make a new theme, copy a folder (e.g. `src/themes/terracotta` → `src/themes/myname`), edit `theme.css`, and set `"theme": "myname"`.

## Folder structure

```
content/
  site.json             language-neutral data: company, contact, socials, projects (facts + gallery), news list,
                        credential slots, Method photos, homepage service groups, form endpoint
  i18n/sr.json          ALL Serbian text (default language)
  i18n/en.json          English (same keys)
  i18n/ru.json          Russian (same keys)
  source/               verbatim snapshot of the old site (archive, do not edit)
assets/
  images/originals/     photos + logo downloaded from rankolabovic.com
  images/diplomas/      licence scans: diploma-1 … diploma-3 (.jpg / .png / .webp)
  images/optimized/     GENERATED: responsive WebP, OG images, favicons
src/themes/<name>/      theme.css (colours, fonts, type scale) + fonts.css + fonts/*.woff2
src/css/style.css       layout stylesheet (shared by all themes)
src/js/main.js          nav dropdown, lightbox, scroll fade, form validation, lazy map
build/                  images.mjs · build.mjs · serve.mjs · dev.mjs
dist/                   GENERATED: deploy this folder
```

## Editing text

All wording is in `content/i18n/<lang>.json`. Save, and `npm run dev` rebuilds and reloads automatically (or run `npm run html`).

| What | Key |
| --- | --- |
| Giant two-tone page headings + small line above | `pages.<page>.kicker` / `pale` (light word) / `dark` (dark word) |
| Bio cell, Chronology cell, homepage service-list titles | `home.bio`, `home.chrono`, `home.serviceGroups` |
| Method essays (6) | `method.items[]` (`title`, `text`); photos: `methodImages` in `site.json` |
| Licences / diploma texts | `credentials.items[]`: `label` (small caption), `big` (large number), `status`, `title`, `meta`, `caption`, `alt` |
| Services (11) | `services.items[]` |
| Projects | `projects.items.<slug>` (`name`, `location`, `type`, `description`, `client`) |
| News | `news.items.<slug>` (`title`, `excerpt`, `body` HTML) |
| Contact band | `band.kicker`, `band.line1` (bold), `band.line2` (light) |
| Enquiry cards on "Vaš projekat" | `contactPage.cards[]` |
| Page titles / meta descriptions | `meta.*` (keep descriptions under about 160 characters) |

**About the text:** Serbian keeps Ranko's original sentences wherever they exist (services, project descriptions, news, contact, company data). Kostelov's structure also needs text his site never had. It is **new copy written from his own statements** and should be approved by Ranko:
- the **Bio** cell (built only from verifiable facts: dipl. inž. arh., Vinex Projekt since 2008, three IKS licences, projects in Serbia, Montenegro and Russia)
- the **Chronology**
- the **six Method essays** (expanding his lines "preciznost svake linije", "toplina prirodnih materijala", "tihi dijalog između svetlosti, teksture i proporcije", "lepota prostora koja odoleva zubu vremena")
- the three **enquiry cards**

## Diplomas & licences

The site shows **only his three licences** (the university-diploma slot was removed on request). Slots live in `assets/images/diplomas/`:

| Slot | Shows | Texts |
| --- | --- | --- |
| diploma-1 | Licence 200 0888 06: responsible urban planner (IKS) | `credentials.items[0]` |
| diploma-2 | Licence 300 Ц292 05: responsible designer (IKS) | `credentials.items[1]` |
| diploma-3 | Licence 400 9189 05: responsible contractor (IKS) | `credentials.items[2]` |

To replace a scan, drop `diploma-N.jpg` (or `.png` / `.webp`) into `assets/images/diplomas/`, update that item's texts in the three language files, and rebuild. To add a slot, add `{ "slot": "diploma-4" }` to `credentials` in `site.json` and a 4th item in each language file. A slot without a file shows a paper placeholder, with a `<!-- REPLACE: diploma-N.jpg -->` comment in the HTML. The homepage shows slots 1–3; the Kvalifikacije page shows all slots, and clicking a scan opens the lightbox.

## Adding a project

1. Copy photos into `assets/images/originals/`.
2. Add to `projects` in `content/site.json`:
   ```json
   { "slug": "nova-kuca", "year": 2024, "cover": "nova-kuca-01.jpg", "heroPosition": "50% 50%",
     "facts": { "area": "TODO", "status": "TODO" },
     "gallery": [ { "file": "nova-kuca-01.jpg", "room": "facade" }, { "file": "nova-kuca-02.jpg", "room": "living" } ] }
   ```
   `room` is a key from `projects.rooms` in the language files (used for alt text and captions). Use `"client": true` in `facts` to show an investor row.
3. Add `projects.items["nova-kuca"]` (`name`, `location`, `type`, `description`[, `client`]) to each language file.
4. Rebuild. Projects appear in pairs (photo + spec) on `/projekti/`, and the first three appear on the homepage.

## Adding a news post

Add `{ "slug", "date": "YYYY-MM-DD", "image", "published": true }` to `news` in `site.json`, plus `news.items[slug]` in each language. The old post "Dobrodošli na zvanični sajt Vinex Projekt" is kept but unpublished: it announces the *previous* site.

## Contact form

The form has three fields (name, email, message) with validation messages in all three languages, plus a honeypot field against spam bots. It is on every page in the dark band.
**TODO:** set `"formEndpoint"` in `content/site.json` (e.g. Formspree `https://formspree.io/f/xxxx`, Basin, Getform, or your own PHP script). Until then, a valid submission shows a "not connected yet, please email/call" message, so nothing is lost silently.

## Deploying

Run `npm run build`, then publish **`dist/`**:
- **Netlify:** drag `dist/` onto app.netlify.com/drop, or use build command `npm run build` and publish directory `dist`. `_redirects` and `_headers` are included.
- **Vercel:** `vercel deploy dist --prod`. `vercel.json` is included.
- **cPanel / Apache:** upload the *contents* of `dist/` into `public_html/`, including the hidden `.htaccess`.

Old WordPress URLs keep working. `/usluge/`, `/projekti/` and `/novosti/` exist again as real pages, and `/projekat/<slug>/` and `/novosti/<slug>/` are unchanged. `/o-nama/` → `/`; `/kontakt/` and `/gde-se-nalazimo/` → `/vas-projekat/` (301).

Before launch:
- set `"showTodos": false` in `site.json`, which hides unknown spec rows instead of showing a TODO tag
- confirm `siteUrl`
- submit `/sitemap.xml` in Google Search Console

## Design decisions

- **Copied from kostelov.com:**
  - dark sticky bar (66 px) with uppercase links in hairline cells and the language switch on the right
  - white intro with a kicker in wide tracking and a giant **two-tone** heading (pale first word, dark second)
  - full-bleed 3-column grid of **square cells** with 1 px hairlines and `01, 02…` numbering
  - photos in **greyscale that bloom into colour with a slow 1.05 zoom** on hover, plus a gradient caption
  - framed documents on beige squares, text cells with spec tables, big pale numbers and `»` links
  - the alternating photo/text pattern; project pages with photos on alternate squares
  - the dark contact band with an underline form and a square bronze `→` button
  - the 4-column footer
  - the same breakpoints (3 → 2 → 1 columns at 820 / 540 px; hamburger dropdown below 1080 px)
- **Palette and type:** set by the theme (see "Themes" above). In the `kostelov` theme the grey and bronze are darkened slightly from the original so small text passes WCAG AA. Fonts are self-hosted from Google Fonts, which is faster and avoids sending visitor IPs to Google.
- **Accessibility trade-off:** the pale first word of each giant heading, and the large pale numbers on the Method and Kvalifikacije pages, are deliberately low-contrast decoration, as on kostelov. They are hidden from screen readers (the full heading is announced). Lighthouse flags them, so Accessibility scores 97 on those pages instead of 100. To change this, make `--pale` darker in the theme's `theme.css`.
- **Not copied:** kostelov's custom cursor dot and live clock (extra JS, no value for accessibility), its Kazakh language, and its press-scan library (Ranko has no press archive; his news fills that slot).

## Quality checks (last run 2026-11-11)

- All 45 pages × 360 / 375 / 768 / 1280 / 1920 px: no horizontal scroll and no console errors. All internal links and anchors resolve, every image has alt text and loads, there is one `<h1>` per page, JSON-LD is valid, and there are 4 hreflang links per page.
- Interactions (Chromium, automated):
  - hamburger dropdown: focus moves in, Esc closes, a link navigates
  - nav `aria-current`
  - licence links from the homepage
  - licence and gallery lightboxes: keyboard, arrows, captions, focus return, single-image mode
  - language switch keeping the page and `#anchor`
  - form validation and "not connected" message
  - lazy map
  - hover caption and colour
  - content visible with reduced motion and with JS disabled
  - 404 status
- Lighthouse 12, local server, mobile unless noted (Performance / Accessibility / Best Practices / SEO):

  | Page | Score |
  | --- | --- |
  | Home | 96 / 97 / 100 / 100 |
  | Home, desktop | 100 / 97 / 100 / 100 |
  | Metod | 95 / 97 / 100 / 100 |
  | Credentials (EN) | 96 / 97 / 100 / 100 |
  | Espanjola | 92 / 100 / 100 / 100 |
  | Ваш проект (RU) | 99 / 97 / 100 / 100 |

  The local server does not gzip; production hosts will score higher on Performance.
- `terracotta` theme (Lighthouse, after font subsetting): Home mobile 98 / 97 / 100 / 100 and desktop 100 / 97 / 100 / 100. The full QA suite passes on all 45 pages.

## Open items

| Item | Needed from Ranko |
| --- | --- |
| Approve the new texts (Bio, Chronology, Method essays, enquiry cards) | Read-through in SR; native check of EN and RU |
| Current licence confirmations | The scans shown are 2024 IKS confirmations valid to 25.08.2024 |
| Project area and status | m² and status for Espanjola, Politova 12, Sochi |
| More photos | Sochi has a single visualisation; Politova 12 has 3 images |
| Form endpoint | Choice of form service |
| Privacy policy text | The form collects name and email (ZZPL / GDPR); his current site has "Stranica u izradi" |
| Optional: SVG logo | His Vinex mark is used for favicons only; the nav uses a text wordmark, like kostelov |

## Version 2: Vinex Projekt (company site)

A second, separate site built **alongside** v1. v1 (`build/build.mjs` → `dist/`) is untouched, and after the v2 work its build was checked byte-for-byte against a baseline: all 258 files are identical.

- **Brand:** the company **Vinex Projekt d.o.o.** Ranko Labović appears as founder and director (dipl. inž. arh.). Titles, meta, Open Graph, JSON-LD, the nav and the footer all say Vinex Projekt.
- **Design:** follows the Dribbble "Sustainable Energy / Green Business" reference: white page, rounded full-width hero card with the nav laid over the photo, medium-weight Inter headlines, one lime accent `#C6F01E` (buttons and dots only, always with dark text on top), "pill + square arrow" buttons, pill labels, a stats strip, a dark photo section with floating white service cards, an uneven project grid and grey cards. Only the style is copied; all text and images are Vinex's own.
- **Logo:** the "V" mark is an inline SVG (`assets/v2/logo-mark.svg`, path in `logo-mark.path`). It was traced and then fitted to the original PNG (99.3% overlap). The "VINEX PROJEKT" wordmark is real text with wide letter-spacing.
- **Favicon:** `favicon.svg` has a transparent background: dark on light tab bars, white on dark ones (via `prefers-color-scheme`). There are also transparent `favicon-32.png`, `icon-192.png` and `icon-512.png`. `apple-touch-icon.png` sits on a solid background because iOS doesn't support transparency.

| Command | What it does |
| --- | --- |
| `npm run build:v2` | images + `build/build-v2.mjs` → `dist-v2/` |
| `npm run html:v2` | rebuild v2 pages only |
| `npm run dev:v2` | live-reload dev server at http://localhost:3002 |
| `npm run serve:v2` | serve `dist-v2/` at http://localhost:3002 |

**Files:**
- `build/build-v2.mjs`: the v2 generator. It shares the URLs, sitemap, hreflang, JSON-LD, redirects and host configs with v1.
- `src/v2/style.css` and `src/v2/main.js`: v2 styles and behaviour.
- `content/v2/{sr,en,ru}.json`: **overrides** deep-merged over `content/i18n/<lang>.json` (brand, meta, nav, hero, stats, about, page titles, v2 labels). Change shared texts (services, projects, news) in `content/i18n/` and both versions update.
- `assets/v2/`: logo and favicon.
- Fonts: the Inter files already in `src/themes/kostelov/`, read-only.
- The contact form uses the same `formEndpoint` and `formSubject` as v1 (FormSubmit → vinex.projekt@gmail.com, subject "Website Pitanje").
- Screenshots: `docs/v2-screens/`.

**Checked:**
- All 45 pages at 360, 375, 768, 1280 and 1920 px: no horizontal scroll and no console errors. Every page has one `<h1>`, every image has alt text, and all links and anchors resolve.
- The mobile menu, lightboxes, form validation, language switch (keeps the page and `#hash`) and lazy map all work. Content stays visible with reduced motion and with JS off.
- Lighthouse: Accessibility, Best Practices and SEO score 100 on every page tested; Performance scores 93–100.
