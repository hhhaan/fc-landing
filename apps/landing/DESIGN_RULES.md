# First Crack Design Rules (`ox`)

Authoritative guide for the landing-site visual system in use on the home page, auth pages, and download page. All new UI in `@fc/landing` should follow these rules unless there is a deliberate product reason to diverge.

> **Note:** `DESIGN.md` documents an older ElevenLabs-inspired spec (Pretendard, pill buttons, warm shadows). The live site uses **`ox`** — warm stone palette, sharp corners, Instrument Sans. Treat this file as the source of truth for current work.

---

## 1. Design principles

| Principle | Rule |
|-----------|------|
| **Warm minimalism** | Near-white stone canvas, near-black ink. No heavy shadows; borders and whitespace define structure. |
| **Sharp geometry** | `border-radius: 0` on buttons, inputs, and cards. Exception: nav link pills (`9999px`) and small dots. |
| **Typography-led** | Headings use tight negative tracking; labels use mono uppercase. Let type carry hierarchy, not decoration. |
| **Desktop-first product** | Copy and layout assume a serious B2B tool (roast floor, reproducibility, native app). |
| **Static-first** | Prefer `.astro` + scoped/global CSS. Interactivity via inline `<script>`; React only when state is required. |

---

## 2. Quick start

### Fonts (required on every `ox` page)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

### Page wrapper

```html
<body class="ox">
  <main class="ox-main noise-overlay">
    <div class="ox-grid-bg" aria-hidden="true"></div>
    <!-- content -->
  </main>
</body>
```

Copy the CSS variable block and base resets from any reference page (`index.astro`, `login.astro`, `download.astro`). Long-term, these should be extracted to a shared stylesheet; until then, duplicate the token block to stay consistent.

---

## 3. Design tokens

Define on `body.ox`:

```css
body.ox {
  --ox-bg: #fafaf9;           /* page background (warm stone) */
  --ox-fg: #080503;           /* primary text / solid buttons */
  --ox-muted: #5e534a;       /* secondary text */
  --ox-muted-bg: #ecebe7;     /* subtle fills (active nav pill) */
  --ox-border: rgba(8, 5, 3, 0.06);
  --ox-border-strong: rgba(8, 5, 3, 0.12);
  --ox-sans: "Instrument Sans", system-ui, -apple-system, sans-serif;
  --ox-mono: "JetBrains Mono", ui-monospace, monospace;
  --ox-max: 1400px;           /* content max-width */
  --ox-pad: 24px;             /* horizontal padding (48px at ≥1024px) */
}
```

### Semantic colors (hard-coded where needed)

| Role | Value | Usage |
|------|-------|-------|
| Card surface | `#fff` | Auth cards, download cards, price cards |
| Solid button text | `#fff` | On `--ox-fg` buttons |
| Error | `#b42318` | Form errors |
| Success | `#027a48` | Confirmation messages |
| Inverted section bg | `var(--ox-fg)` | Dark bands (e.g. workflow section) |
| Inverted section text | `var(--ox-bg)` | Text on dark bands |

### Do not use on `ox` pages

- `global.css` mint buttons (`.btn-primary`)
- Rounded auth cards from legacy pages
- Pretendard / Waldenburg (unless migrating old pages)
- Heavy box-shadow stacks from `DESIGN.md`

---

## 4. Typography

### Families

| Role | Family | Class / element |
|------|--------|-----------------|
| Display & UI | Instrument Sans | Default on `body.ox` |
| Labels, tags, eyebrows | JetBrains Mono | `.ox-eyebrow`, `.ox-dl-tag`, badges |

### Scale

| Element | Size | Weight | Tracking | Notes |
|---------|------|--------|----------|-------|
| Hero title | `clamp(2rem, 4.5vw, 3.5rem)` | 500 | `-0.04em` | `.ox-hero-title` |
| Section H2 | `clamp(2rem, 4vw, 3rem)` | 500 | `-0.035em` | `.ox-h2` |
| Auth / page title | `clamp(1.75rem, 4vw, 2.25rem)` | 500 | `-0.03em` | `.ox-auth-title`, `.ox-dl-title` |
| Card title | `1.5rem` | 600 | `-0.025em` | Price/download cards |
| Body | `16px` / `1rem` | 400 | — | Line-height `1.5–1.65` |
| Lead | `1rem`–`15px` | 400 | — | `.ox-lead`, `.ox-auth-lead`; color `--ox-muted` |
| Nav links | `14px` | 500 | `-0.01em` | `.ox-nav-link` |
| Buttons | `13–15px` | 500 | `-0.01em` | See button sizes |
| Eyebrow | `13px` mono | 400 | — | Uppercase feel via mono + line |
| Fine print | `13px` | 400 | — | `.ox-hero-fine`, `.ox-dl-note` |
| Footer column labels | `11px` mono | 500 | `0.1em` | Uppercase |

### Muted inline emphasis

Use `.ox-muted` or a second line in headings with `color: var(--ox-muted)` — do not use a lighter font weight for hierarchy.

---

## 5. Layout

### Shell

```html
<div class="ox-shell"><!-- max-width container --></div>
```

- `max-width: var(--ox-max)`, centered, `padding-inline: var(--ox-pad)`
- Bump `--ox-pad` to `48px` at `min-width: 1024px`

### Full-viewport sections (`.ox-pane`)

Marketing sections anchored in nav use at least one viewport height:

```css
.ox-pane {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  scroll-snap-align: start;
}
```

- **Hero:** `justify-content: center`, `padding-top: 80px` (fixed header clearance)
- **Other panes:** `justify-content: flex-start`, `padding-block: clamp(32px, 5vh, 56px)`
- Enable `scroll-snap-type: y proximity` on `body.ox` for marketing pages only

### Section rhythm

- Sections separated by `border-top: 1px solid var(--ox-border)`
- Default section padding: `96px` vertical (`128px` at ≥1024px) when not using `.ox-pane`
- Section head margin-bottom: `64px` (`96px` desktop)

---

## 6. Decorative layers

Apply in stacking order (back → front):

1. **`.ox-grid-bg`** — 8×8 grid at 12.5% cells, `opacity: 0.3`, borders use `--ox-border`
2. **`.noise-overlay::after`** — SVG fractal noise at `opacity: 0.03`, `pointer-events: none`
3. **Content** — `z-index: 2` on `.ox-shell` and main blocks

Optional on hero only: `.ox-hero-glow` (soft radial gradient), canvas globe, `.ox-marquee`.

### Eyebrow pattern

```html
<div class="ox-eyebrow">
  <span class="ox-line"></span>
  Section label
</div>
```

- 32×1px line before label; mono font; `--ox-muted` color
- On dark sections: `.ox-eyebrow-on-dark` + `.ox-line-on-dark` (light line, `rgba(250,250,249,0.3)`)

---

## 7. Components

### Buttons (`.ox-btn`)

| Class | Height | Use |
|-------|--------|-----|
| `.ox-btn-sm` | 32px | Header CTAs |
| default | — | Inline actions |
| `.ox-btn-lg` | 48px | Hero CTAs |
| `.ox-btn-block` | 48px, full width | Forms, download |

| Variant | Classes | Style |
|---------|---------|-------|
| Primary | `.ox-btn .ox-btn-solid` | `--ox-fg` bg, white text; hover `opacity: 0.9` |
| Secondary | `.ox-btn .ox-btn-outline` | Transparent, `--ox-border-strong` border; hover light gray fill |

Always `border-radius: 0`. Use `<a>` for navigation, `<button>` for actions.

### Form fields

```html
<div class="ox-field">
  <label for="id">Label</label>
  <input id="id" class="ox-input" />
</div>
```

- Input height `48px`, `border-radius: 0`, bg `--ox-bg`
- Focus: `border-color: var(--ox-fg)`, bg `#fff`, no ring shadow
- Labels: `13px`, weight 500, `rgba(8,5,3,0.75)`
- Checkbox row: `.ox-check` with `accent-color: var(--ox-fg)`

### Cards

White surface, 1px `--ox-border`, no shadow, no radius:

| Context | Class | Padding |
|---------|-------|---------|
| Auth | `.ox-auth-card` | `40–48px` |
| Download | `.ox-dl-card` | `32px 28px` |
| Pricing | `.ox-price-card` | `32px 28px` |
| Featured pricing | `.ox-price-card.is-featured` | Inverted: `--ox-fg` bg |

**Recommended state** (OS-detected download): `.is-recommended` → `border-color: var(--ox-fg)` + mono badge top-right.

### Dividers

Auth forms use mono uppercase “or” divider:

```html
<div class="ox-auth-divider" aria-hidden="true"><span>or</span></div>
```

---

## 8. Header

### Marketing header (`.ox-header`)

- Fixed, `z-index: 50`, height `80px` → `64px` when `.is-compact`
- Scrolled: `background: rgba(250,250,249,0.85)`, `backdrop-filter: blur(16px)`, bottom border
- **Scroll progress:** `.ox-scroll-progress` — 2px top bar, `scaleX` tied to scroll
- **Hide behavior:** hides on scroll down past 40px; shows on scroll up; nav jump forces hide until top
- Nav links: pill active state `.is-active` → `--ox-muted-bg` + underline
- Mobile: full-screen `.ox-mobile` overlay, large `2.5rem` links, burger → X morph

### Utility header (`.ox-auth-header`)

Used on login, signup, download — static (not fixed), same blur/border treatment:

```html
<header class="ox-auth-header">
  <nav class="ox-auth-nav">
    <a href="/" class="ox-brand"><span class="ox-brand-name">First Crack</span></a>
    <div class="ox-auth-nav-end"><!-- CTAs --></div>
  </nav>
</header>
```

- Logged out: ghost “Log in” + solid “Start trial”
- Logged in: truncated email + “Account”

---

## 9. Page templates

### A. Marketing (`index.astro`)

```
body.ox
└── main.ox-main.noise-overlay
    ├── header.ox-header (fixed, dynamic)
    ├── section.ox-hero.ox-pane
    │   └── .ox-hero-inner (2-col grid ≥1024px: copy + drum wireframe canvas)
    ├── section.ox-section.ox-pane#anchor
    ├── section.ox-process.ox-pane (inverted)
    ├── section.ox-section.ox-pane
    ├── section.ox-final
    └── footer.ox-footer
```

### B. Auth (`login.astro`, `signup.astro`)

```
body.ox
└── main.ox-auth.noise-overlay
    ├── .ox-grid-bg
    ├── header.ox-auth-header
    └── .ox-auth-main
        └── .ox-auth-card (max-width 420px)
```

### C. Utility (`download.astro`)

```
body.ox
└── main.ox-dl.noise-overlay
    ├── .ox-grid-bg
    ├── header.ox-auth-header
    ├── .ox-dl-main > .ox-shell (wider content, ~880px grid)
    └── footer.ox-dl-footer (minimal)
```

### D. Company (`about.astro`)

```
body.ox
└── main.ox-about.noise-overlay
    ├── .ox-grid-bg
    ├── header.ox-auth-header (utility nav)
    ├── section.ox-about-hero
    ├── section.ox-about-story (2-col + chart panel)
    ├── section.ox-about-work
    ├── section.ox-about-values-section
    ├── section.ox-about-hw
    ├── section.ox-about-product (inverted — product CTA)
    ├── section.ox-about-cta (light band — careers)
    └── footer.ox-utility-footer
```

### E. Careers (`careers.astro`, `OxJobShell.astro`)

```
body.ox
└── main.ox-careers | main.ox-jd
    ├── header.ox-auth-header
    ├── hero + content (table or 2-col article + apply sidebar)
    ├── optional inverted CTA band
    └── footer.ox-utility-footer
```

### F. Legal (`OxLegalShell.astro`)

```
body.ox
└── main.ox-legal.noise-overlay
    ├── header.ox-auth-header
    ├── article.ox-legal-prose (slot)
    └── footer.ox-utility-footer
```

---

## 10. Dark (inverted) sections

`.ox-process` pattern:

- `background: var(--ox-fg)`, `color: var(--ox-bg)`
- Headings: `.ox-h2-on-dark`, muted sublines: `.ox-on-dark-muted` (`rgba(250,250,249,0.45)`)
- Borders: `rgba(250,250,249,0.08)` instead of `--ox-border`
- Code/chart panels: near-black UI mock with light strokes

Use **one** inverted band per page flow for contrast; do not stack multiple dark sections back-to-back.

---

## 11. Motion

| Pattern | Implementation |
|---------|----------------|
| Scroll reveal | `.reveal` + `IntersectionObserver` → `.is-in` |
| Stagger | `.reveal-d1` / `d2` / `d3` or inline `--d: Nms` |
| Marquee | `.ox-marquee-track`, `45s linear infinite` |
| Header | `transform` / `opacity` transitions, 0.2–0.4s ease |
| Easing | `cubic-bezier(0.22, 1, 0.36, 1)` for reveals |

**Reduced motion:** disable transforms/transitions on animated elements; keep content visible (`opacity: 1`, no marquee).

---

## 12. Responsive breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `< 640px` | Hide header hint text; single-column grids |
| `< 768px` | Hide desktop nav; show burger; hide header solid CTA |
| `≥ 768px` | Full nav, 2-column download grid |
| `≥ 1024px` | Wider padding, richer capability grids, 4-column footer |

---

## 13. Content & tone

- **Language:** English for marketing and product UI (legacy Korean strings should be migrated when touching a page).
- **Voice:** Direct, technical, floor-oriented. Avoid buzzwords.
- **CTAs:** “Start trial”, “Download”, “Sign in” — verb-first, no exclamation marks.
- **Trial facts:** 14 days, 20 batches, no credit card — repeat where relevant.

---

## 14. Accessibility checklist

- [ ] Visible focus on inputs (border change, not outline removal without replacement)
- [ ] `aria-expanded` on burger; `aria-controls` pointing to mobile panel
- [ ] `aria-hidden="true"` on decorative grid/noise/dividers
- [ ] Form labels associated with `for` / `id`
- [ ] Color contrast: `--ox-muted` on `--ox-bg` for body text only, not small critical UI
- [ ] Respect `prefers-reduced-motion`

---

## 15. Reference implementations

| Page | Path | Patterns demonstrated |
|------|------|------------------------|
| Home | `src/pages/index.astro` | Full system: header, panes, dark section, pricing, footer, motion |
| Sign in | `src/pages/login.astro` | Auth shell, form, Google OAuth button |
| Sign up | `src/pages/signup.astro` | Auth + checkbox + success state |
| Download | `src/pages/download.astro` | Utility layout, platform cards, OS detect |
| Privacy / Terms | `src/pages/privacy.astro`, `terms.astro` | Legal prose via `OxLegalShell.astro` |
| Careers | `src/pages/careers.astro` | Job table, filters, inverted CTA band |
| Job detail | `src/pages/careers/*.astro` | Role prose via `OxJobShell.astro` |
| About | `src/pages/about.astro` | Company story, values grid, inverted product CTA + light careers band |

When adding a new page:

1. Start from the closest template (§9).
2. Copy tokens + base component CSS from that file.
3. Use existing class names before inventing new ones.
4. Run `pnpm build:landing` before shipping.

---

## 16. Future extraction (optional)

To reduce duplication across pages, consider:

```
src/styles/ox/
├── tokens.css      /* variables + resets */
├── components.css  /* buttons, inputs, cards, header */
├── layout.css      /* shell, pane, grid, noise */
└── auth.css        /* auth + download-specific */
```

Import once in a shared layout or per-page `<style is:global>` until a layout wrapper exists. **Do not** mix `ox` tokens into `global.css` without namespacing — legacy pages still depend on the old system.