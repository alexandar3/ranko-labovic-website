# Reference notes: kostelov.com

Studied 2026-11-11 at 1280 px and 375 px. kostelov.com is used **only** as a reference for layout and rhythm. No text, photos, logos or diplomas from it are reused.

## Overall system

- **One strict 3-column grid** (`grid-template-columns: repeat(3, 1fr)`) runs the full width of the window with **no outer gutter**. Every cell is separated by a **1 px hairline** (`#dbd3c5` on a beige background). Most cells are **square** (`aspect-ratio: 1/1`). Text cells grow taller when their content needs it.
- Cells are numbered `01`, `02`, … in tiny tracked caps in the top-left corner (`mix-blend-mode: difference` on photos).
- Palette: warm beige page (`#ece6db`), lighter panel (`#f5f0e7`) for text cells, dark brown-charcoal (`#403b35`) for nav and contact band, muted taupe text (`#988e80`), bronze accent (`#937a59`).
- Type: a single grotesque (Inter / Space Grotesk). There is **huge display type** for the name (`clamp(3rem, 11vw, 11rem)`, line-height 0.9, letter-spacing −0.04em), small body copy (13–15 px, line-height 1.7), and labels in 11–12 px uppercase with 0.12–0.3em tracking.
- Breakpoints: 3 cols → 2 cols at 820 px → 1 col at 540 px. The nav collapses to a hamburger at 1000 px.

## Section by section (homepage)

1. **Nav**: sticky, dark, 66 px tall. The wordmark (uppercase, bold) is on the left. Links are uppercase 12 px and each one sits in its own "cell" divided by vertical hairlines. The language buttons (RU / EN / KZ) are on the far right, also in hairline cells; the active one is white. On mobile the hamburger sits in a 48 px cell next to the language buttons, and the menu drops down as a full-width stacked list.
2. **Intro**: white band. A kicker line in accent colour (12 px, 0.3em tracking, uppercase), then the architect's name in enormous type in two tones: first name in a pale beige (almost invisible), surname in dark brown.
3. **Row 1, About**: portrait (black and white photo) | "Bio" text cell | "Awards" list cell (year in bold, then a muted title, separated by hairlines). Each text cell ends with a small `»` link.
4. **Row 2, Diplomas**: three cells, each with a framed diploma scan centred on the beige panel and a small label top-left (`АГТХИ`, `CUNY`, `ГАП`). They link to the full credentials page.
5. **Row 3, Press**: three dense link lists (online, books, magazines).
6. **Row 4, Projects**: three square photos, black and white by default. **On hover the photo slowly scales to 1.05 and fades to full colour** (1.1 s, `cubic-bezier(.19,1,.22,1)`), and a caption gradient slides up from the bottom.
7. **Row 5, Method**: three text cells directly under the project photos, each with a bold title and a long paragraph. Visually the photo and the text below it read as one tall card.
8. **Contact band**: dark background, two columns. Left: small accent kicker, then a huge two-weight heading ("Обратная / связь"). Right: an underline-only form (email, message) and a square accent submit button with `→`. The © line sits in the band.
9. **Footer** (inner pages): 4 columns (brand, then three link groups) with accent column headings.

## Interaction and motion

- Hover on text cells: panel turns white. Hover on photos: slow zoom plus greyscale to colour.
- A custom cursor dot (desktop only). **Not adopted**: it adds JS and hurts accessibility.
- No scroll-jacking. Motion is slow and quiet.

## Mobile (375 px)

- The grid becomes one column. Portrait, then bio, then awards, then each diploma at full width.
- The name stays very large. Nav: wordmark, hamburger and language buttons on one 66 px row.
- Squares stay square at full width, so a diploma cell is about 375 px tall.

## How Ranko's site maps onto it (version 2: near 1:1)

| Reference | Ranko |
| --- | --- |
| Dark sticky nav, uppercase links in hairline cells, RU/EN/KZ | Same, with SR / EN / RU |
| White intro, kicker, giant two-tone name | Same ("Ranko / Labović"), on every page with its own heading |
| Row: portrait / Bio / Awards list | Portrait / Bio / Chronology (projects + IKS licences) |
| Row: 3 framed diplomas | His 3 IKS licence scans, framed |
| Row: 3 press lists (online / books / magazines) | 3 service lists (design / construction & management / expertise) |
| Row: 3 project photos (B&W → colour) + 3 Method texts | Same, with his projects and 3 of 6 Method essays |
| Dark "Обратная связь" band with form | "Stupite / u kontakt" band with form |
| Pages: Method, Renome, Press, Projects, Collaboration, Your project | Metod, Kvalifikacije, Novosti, Projekti, Usluge, Vaš projekat |
| Type: Inter / Space Grotesk bold | Inter (self-hosted) |
| Palette #ece6db / #f5f0e7 / #403b35 / #937a59 | Same, with grey and bronze darkened slightly for WCAG AA |
| Custom cursor dot, live clock | Not adopted (JS weight, accessibility) |
