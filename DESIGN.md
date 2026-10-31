---
name: Yaner Apps
description: The Quiet Workshop — one shared, restrained look for the studio and its app sites, each signed by a single accent.
colors:
  studio-vermilion: '#c23b22'
  studio-vermilion-dark: '#e8664a'
  gps-go-pin-green: '#3f7a1a'
  gps-go-pin-green-dark: '#8cc152'
  bench-grey: '#f6f7f9'
  bench-grey-raised: '#eef0f3'
  sheet-white: '#ffffff'
  sheet-shade: '#f1f3f5'
  ink: '#0c0d10'
  ink-muted: '#4d535d'
  ink-dim: '#6b717b'
  night-bench: '#08090b'
  night-bench-raised: '#0d0e11'
  night-sheet: '#111215'
  night-sheet-shade: '#17181d'
  night-ink: '#f4f5f7'
  night-ink-muted: '#a0a6b0'
  night-ink-dim: '#868c96'
  sky-top: '#9dbdd0'
  sky-mid: '#bfd3dc'
  sky-bottom: '#e2e9e5'
  swallow-back: '#283b54'
typography:
  display:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: 'clamp(2.75rem, 9vw, 5.75rem)'
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: '-0.045em'
  headline:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: 'clamp(2.125rem, 5.4vw, 3.25rem)'
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: '-0.04em'
  title:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: '1.25rem'
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: '-0.015em'
  body:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: '12.5px'
    fontWeight: 400
    lineHeight: '20px'
    letterSpacing: '0.5px'
  motto:
    fontFamily: "'IBM Plex Serif', ui-serif, Georgia, serif"
    fontSize: '1rem'
    fontWeight: 400
    letterSpacing: '0.01em'
rounded:
  focus: '6px'
  control: '9px'
  button: '12px'
  card: '18px'
  pill: '999px'
spacing:
  gutter: '16px'
  page: '70rem'
  measure: '60ch'
  prose: '46rem'
  header: '3.5rem'
  section: 'clamp(4.5rem, 12vw, 8.75rem)'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.sheet-white}'
    rounded: '{rounded.button}'
    padding: '11px 18px'
    height: '2.75rem'
  button-primary-dark:
    backgroundColor: '{colors.night-ink}'
    textColor: '{colors.night-bench}'
    rounded: '{rounded.button}'
    padding: '11px 18px'
    height: '2.75rem'
  button-quiet:
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: '11px 18px'
    height: '2.75rem'
  button-quiet-hover:
    backgroundColor: '{colors.sheet-shade}'
  panel:
    backgroundColor: '{colors.sheet-white}'
    rounded: '{rounded.card}'
  panel-dark:
    backgroundColor: '{colors.night-sheet}'
    rounded: '{rounded.card}'
  kicker:
    textColor: '{colors.studio-vermilion}'
    typography: '{typography.label}'
  header-control:
    textColor: '{colors.ink-muted}'
    rounded: '{rounded.control}'
    size: '2.25rem'
---

# Design System: Yaner Apps

## Overview

**Creative North Star: "The Quiet Workshop"**

A tidy bench where a few small tools are made with care. The surfaces are cool, near-neutral greys and white sheets; type is Inter, set tight and heavy for headings and calm for reading; labels are typed in IBM Plex Mono like notes pinned to the bench. Restraint is the craft: most of every page is ink on grey, and the one thing that carries colour is the site's own accent.

Every page on yanerapps.com shares this base (`src/lib/ui/global.css`). The studio and each app site differ only in their accent: vermilion for the studio, the launcher icon's pin green for GPS-Go. The studio adds two signatures of its own: the swallow flying in a muted sky, drawn in code, and the motto "Ride the Wind" set in IBM Plex Serif italic.

Both themes are first-class. Light is the base; dark is a near-black night bench with the same structure, and a manual choice carries across the studio and app pages.

**Key Characteristics:**

- Cool neutral greys, white sheets, near-black ink; no warm paper.
- One accent per site, used for kickers, links, bullets, focus and the second line of the hero.
- Heavy, tightly tracked Inter headings fading top to bottom from ink to 60% ink.
- Mono numbered kickers ("01 · Manifesto") above every section heading.
- One soft ambient shadow under every card; nothing stacks higher.
- Motion is slow and optional: blur-up reveals, a 1px lift on hover, the swallow's glide.

## Colors

A cool, almost colourless workshop with a single signed accent per site.

### Primary

- **Studio Vermilion** (`studio-vermilion`, dark `studio-vermilion-dark`): the studio's seal red. Kickers, links, highlight bullets, focus rings, text selection, the coloured second line of the home hero, the 燕儿 characters, and the swallow's brick-red face in light mode. Its glow (14–16% alpha) sits behind the primary button and the hero sky.
- **GPS-Go Pin Green** (`gps-go-pin-green`, dark `gps-go-pin-green-dark`): replaces vermilion on GPS-Go's product pages only. Darkened in light mode until it passes as text.

### Neutral

- **Bench Grey** (`bench-grey`) / **Night Bench** (`night-bench`): page background.
- **Raised Bench** (`bench-grey-raised` / `night-bench-raised`): bands that sit a step off the page.
- **Sheet White** (`sheet-white`) / **Night Sheet** (`night-sheet`): cards, framed pictures, menus.
- **Sheet Shade** (`sheet-shade` / `night-sheet-shade`): hover fills, table heads, inline code, the open menu.
- **Ink** (`ink` / `night-ink`): headings, strong text, the primary button's fill.
- **Muted Ink** (`ink-muted` / `night-ink-muted`): body copy and ledes.
- **Dim Ink** (`ink-dim` / `night-ink-dim`): meta lines, footer, taglines, list markers.
- Hairlines are ink at 8% (`--line`) and 14% (`--line-2`) alpha; white at 7% and 12% in dark mode.

### Tertiary

- **The swallow's sky** (`sky-top`, `sky-mid`, `sky-bottom`): a muted print-like blue washing out toward the page; dark mode turns it to dusk indigo. The bird is navy-backed (`swallow-back`) with a white belly and a rust face. These belong to the studio's sky only.

### Named Rules

**The One Signature Rule.** Each site has exactly one accent, set as `--accent`, `--on-accent` and `--glow` for both themes in that site's own stylesheet. A new app picks a colour from its own launcher icon and darkens it in light mode until it reads as text on Bench Grey.

**The Ink Button Rule.** The primary button is ink, never the accent. The accent appears only as the soft glow beneath it.

## Typography

**Display Font:** Inter Variable (with -apple-system, system-ui, Segoe UI, Roboto)
**Body Font:** Inter Variable
**Label/Mono Font:** IBM Plex Mono (with ui-monospace, SF Mono, Menlo)
**Motto Font:** IBM Plex Serif italic, studio only

**Character:** A plain, confident sans doing nearly all the work, a typewriter mono for labels and readouts, and one serif italic line that signs the studio's work. All three are self-hosted through Fontsource.

### Hierarchy

- **Display** (700, `clamp(2.75rem, 9vw, 5.75rem)`, 1.02): page heroes. The studio home hero caps at 4.5rem.
- **Headline** (700, `clamp(2.125rem, 5.4vw, 3.25rem)`, 1.06): section headings and document titles, painted with the ink-to-60% gradient.
- **Title** (650, 1.25rem, 1.25): card titles, document h2s.
- **Body** (400, 16px, 1.6): reading text in Muted Ink. Ledes run `clamp(1rem, 1.8vw, 1.125rem)` at a 60ch measure; legal documents sit in a 46rem column.
- **Label** (Plex Mono 400, 12.5px/20px, +0.5px): section kickers in the accent, meta lines, table heads, the contents rail. Not uppercase.

### Named Rules

**The Tight Heading Rule.** Headings track negative (−0.015em to −0.045em) and balance their lines; body text never does.

**The Numbered Kicker Rule.** Every major section opens with a mono kicker in the form `01 · Name` above its heading.

## Layout

A single centred page column, `min(100% − 32px, 70rem)`, with a 16px side gutter at every width. Sections are separated by half of `clamp(4.5rem, 12vw, 8.75rem)` on each side; the closing band takes the full amount below it. The header is fixed at 3.5rem and becomes a blurred, 72%-opaque bench with a hairline once the page scrolls.

Heroes and two-part sections use two-column grids (`1fr / 1.05fr`, or `0.8fr / 1.2fr`) that stack to one column at 900px. App cards flow in `auto-fit` columns of at least 30rem; a card alone in its row spreads into two internal columns. Long documents (privacy, support) use a 46rem column and gain a sticky mono contents rail in the left margin from 80rem when they have four or more h2s; narrower screens get an "On this page" disclosure instead. At 860px and below, the header's links collapse into a native disclosure menu.

## Elevation & Depth

Depth is a single soft ambient lift. Cards, framed pictures, the mobile menu and the closing band all share one shadow and one hairline border; nothing floats above anything else. Hover lifts an element by 1px, never more. Headings get a quiet sense of depth from their top-to-bottom gradient, and the home hero adds a faint 56px grid fading out from behind the sky, plus a blurred accent glow.

### Shadow Vocabulary

- **Ambient lift** (`0 1px 2px rgb(12 13 16 / 0.06), 0 16px 48px -16px rgb(12 13 16 / 0.18)`; dark: `0 1px 0 rgb(255 255 255 / 0.04) inset, 0 24px 64px -24px rgb(0 0 0 / 0.8)`): every panel.
- **Accent glow** (`0 8px 28px -8px var(--glow)`): beneath primary buttons only.

### Named Rules

**The One Lift Rule.** There is one elevation. A card on a card is a sign the layout is wrong.

## Shapes

Soft, even rounding sized to the object: 6px focus outlines, 9px header controls, 10px menu rows, 12px buttons, 14px app icons, 18px cards and sheets, full pills for small markers. Borders are 1px hairlines at low ink alpha. Highlight bullets are 7px accent dots. App screenshots are framed pictures, not loose images: no drag, no selection.

## Components

### Buttons

- **Shape:** gently rounded (12px), at least 2.75rem tall, 11px × 18px padding, 600 weight at 15px.
- **Primary:** ink fill with white text (inverted in dark mode) and the accent glow beneath.
- **Quiet:** transparent with a 14% hairline border and ink text; fills with Sheet Shade on hover.
- **Hover / Focus:** a 1px lift over 0.2s on the workshop ease (`cubic-bezier(0.22, 1, 0.36, 1)`); focus is a 2px accent outline offset 2px.
- **Static:** "Coming soon to Google Play" is plain muted 600 text, not a disabled button.

### Cards / Containers

- **Corner Style:** 18px.
- **Background:** Sheet White / Night Sheet.
- **Shadow Strategy:** the ambient lift (see Elevation & Depth).
- **Border:** 1px hairline.
- **Internal Padding:** `clamp(20px, 3vw, 28px)` for app cards, `clamp(20px, 4vw, 32px)` for the closing band, 16–20px for link rows and notes.

### Navigation

- **Header:** brand name (650, 15px) on the left, muted 14px links that turn ink on hover or when current, and a 2.25rem square theme toggle with a 9px hairline frame on the right. Transparent at the top; blurred bench with a hairline after scrolling.
- **Mobile (≤860px):** a "Menu" disclosure opens a sheet-white panel with 2.75rem rows, 10px rounded, the current page filled with Sheet Shade.
- **Footer:** dim 13px text over a hairline; the studio signs it with the favicon, the motto in serif italic, and a mono fineprint colophon.

### App link rows

Sheet-white rows listing each app on privacy and support overviews: name in ink, blurb in muted text, an accent arrow at the end, a 1px lift on hover.

### Swallow Sky

The studio's signature: a lazy-loaded three.js barn swallow gliding in a muted blue sky, inscribed "Ride the Wind" in the top-right corner. Flat unlit colour, mostly gliding with occasional wingbeats and gusts; a slow camera arc alternates two oblique views and leans a little after the pointer. Reduced motion shows a still glide pose; without JavaScript the sky stays a static gradient.

## Do's and Don'ts

### Do:

- **Do** take every colour from the shared tokens and set only `--accent`, `--on-accent` and `--glow` per site.
- **Do** open each section with a mono `01 · Name` kicker and a gradient Inter heading.
- **Do** give every card the same 18px radius, hairline and ambient lift.
- **Do** design both themes together and use theme-matched `-light` / `-dark` screenshot pairs.
- **Do** keep all motion optional: `prefers-reduced-motion` switches it off, and pages read fully without JavaScript.

### Don't:

- **Don't** fill a button with the accent; primary buttons are ink.
- **Don't** add a second accent colour to a site, or reuse one app's accent on another app's pages.
- **Don't** stack shadows or lift anything more than 1px on hover.
- **Don't** load three.js eagerly; the swallow is lazy-loaded.
- **Don't** let drag-to-orbit or other heavy interaction into the sky; it only leans.
