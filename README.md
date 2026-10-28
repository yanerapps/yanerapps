# yanerapps.com

The **Yaner Apps** site: the studio home page in English and Simplified Chinese, each app's privacy policy and support page, and GPS-Go's product site under `/gps-go`. Built with [Astro](https://astro.build), fully static.

## Develop

Node 22.23.4 or later (`.node-version` pins the major version for Cloudflare builds).

```sh
npm install
npm run dev           # http://localhost:4321
npm run check         # astro check, then tsc
npm run lint          # eslint
npm run format:check  # prettier
npm test              # node --test
npm run build         # check, then a static build in dist/
```

Every commit passes `check`, `lint`, `format:check`, `test` and `build`. The tooling matches the PingDeck product site, with one difference: Prettier leaves `.astro` files alone, because `prettier-plugin-astro` pads inline elements with whitespace and that puts visible spaces around links in Chinese text.

## Architecture

| Path                   | What lives there                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`           | Routes only. `/x` is English and `/zh-hans/x` its Chinese counterpart. `/<app>/privacy` and `/<app>/support` exist for every app                              |
| `src/studio/`          | The studio's look: `layouts/Layout.astro`, `styles/global.css`, and the swallow in `components/`                                                              |
| `src/apps/registry.ts` | The studio's name, email and URL, and each app's name and Play listing, written once and read by every page                                                   |
| `src/apps/<app>/`      | An app's own product site: components, data, layout, scripts, styles and images                                                                               |
| `src/lib/`             | What both looks share: `SeoHead.astro` (title, description, canonical, Open Graph), `ThemeBoot.astro` and `theme.ts`, `paths.ts` (with its tests) and `at.ts` |

- **URLs drop trailing slashes.** `trailingSlash: 'never'` and `build.format: 'file'` here, `html_handling: drop-trailing-slash` on Cloudflare. Write every link without one; `cleanPath()` in `src/lib/paths.ts` gives a page its published path.
- **Language** comes from the path: the studio layout reads it with `isZh()` and pairs pages with `localize()`. App product sites are English only and carry no `zh-hans` counterpart; the Chinese home page links to GPS-Go's with `hreflang="en"`.
- **Theme**: `ThemeBoot.astro` sets `data-theme` on `<html>` before first paint, and `initTheme()` in `src/lib/theme.ts` wires every `[data-theme-toggle]`. Only a choice that differs from the system theme is stored (`localStorage` key `theme`), so it carries across the studio and the app pages, and switching back to the system theme follows it again.
- **Navigation** is plain page loads; there is no client router.
- `compressHTML` is off: Astro 7's compressor drops the space where a line break comes before an inline element.

## Deploy — Cloudflare Workers static assets

`wrangler.jsonc` serves `dist/` as static assets with `drop-trailing-slash` and the `404-page` fallback. Connect the repository under Workers & Pages (Workers Builds) with the build command `npm run build` and the deploy command `npx wrangler deploy`, then add the custom domain `yanerapps.com`.

## GPS-Go product pages

`/gps-go`, `/gps-go/guide` and `/gps-go/faq` keep GPS-Go's own look: they use `src/apps/gps-go/layouts/Base.astro`, not the studio layout. GPS-Go's privacy and support pages stay on the studio layout. `base` in `src/apps/gps-go/data/site.ts` is `/gps-go`, so a link is `${base}/guide`.

- **Google Play**: `playStoreUrl` for `gps-go` in `src/apps/registry.ts` is the listing every call to action links to, including the studio home pages, and the product page's structured data gives it as `installUrl`. Set it to `null` and the product pages say "Coming soon to Google Play" while the home pages drop the button.

### How the pages are put together

| Page                   | File                           | Sections                                                                                                       |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Home, `/gps-go`        | `src/pages/gps-go/index.astro` | Hero, 01 Why, 02 Features, 03 How it works, 04 Honest, Closing                                                 |
| Guide, `/gps-go/guide` | `src/pages/gps-go/guide.astro` | Its own contents list, then 01 Setup, 02 Mock a place, 03 Joystick, 04 Routes, 05 Library, 06 Realism, Closing |
| FAQ, `/gps-go/faq`     | `src/pages/gps-go/faq.astro`   | FAQ, Closing                                                                                                   |

Every page uses `src/apps/gps-go/layouts/Base.astro`, which takes the page's title and description and adds the app's structured data on the home page only. A section brings its own script, so a page ships only the scripts of the sections on it.

| Section                              | Component          | Content                                                                                                                                                                                                                                  |
| ------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero                                 | `Hero.astro`       | Headline, lede, the one Play button and Read the guide on the left, in the site's own type and buttons; on the right the store feature graphic's three crops of real captures, light or dark to match the site theme. Stacks below 900px |
| Why                                  | `Why.astro`        | Without / with GPS-Go for the three audiences the store listing names                                                                                                                                                                    |
| Features                             | `Features.astro`   | Four cards (Pick, Routes, Joystick, Library), each drawing a small HTML copy of the app's UI with the app's own labels and linking to its chapter in the guide; the Pick card lists the accepted input. Then "And the rest"              |
| How it works                         | `HowItWorks.astro` | Static rounded-bus diagram of the three location providers; connectors follow card edges on resize (`scripts/provider-diagram.ts`)                                                                                                       |
| Honest                               | `Honest.astro`     | What GPS-Go does with data and what apps can tell, matching the listing's Good to know                                                                                                                                                   |
| Closing                              | `Closing.astro`    | Every page ends on one band: the Play button, the setup guide and the developer's email                                                                                                                                                  |
| Tour                                 | `Tour.astro`       | Used twice, for `pointChapters` and `routeChapters` in `data/tour.ts`, in the order of the app's quickstart; sticky phone and scroll-driven highlights (`scripts/tour.ts`)                                                               |
| Joystick                             | `Anatomy.astro`    | Overlay parts from `data/anatomy.ts` (`scripts/anatomy.ts`)                                                                                                                                                                              |
| Setup (guide), Library, Realism, FAQ | one component each | Copy lives next to the markup; FAQ in `data/faq.ts`                                                                                                                                                                                      |

- All content is in the HTML. Scripts only add behaviour; with JavaScript off, the tour and the joystick parts render as plain lists.
- Look: neutral light and dark surfaces, system fonts, a mono `01 · Why` kicker and a gradient heading per section, and one accent, the launcher icon's pin green (`#8cc152` in dark mode, darkened to `#3f7a1a` in light mode so it passes as text). Tokens live in `src/apps/gps-go/styles/global.css`.
- Motion is CSS only: `.reveal` blocks fade up once as they scroll in (an `IntersectionObserver` in `Base.astro`), the tour crossfades its screenshots and the spotlight glides between parts. `prefers-reduced-motion` turns all of it off.
- The header toggle uses the site-wide theme (see Architecture): the choice carries between the studio and GPS-Go pages. `scripts/theme.ts` keeps the toggle's state and the browser theme colour in sync.
- At widths up to 860px, the header keeps the brand and theme toggle and shows a native disclosure menu for Home, Why, Features, How it works, Guide and FAQ. The current page is marked. Escape, outside clicks and link selection close it; keyboard focus can leave the menu without a trap, and leaving closes it. The trigger keeps its visible "Menu" name and reports state through `aria-expanded`. Switching to desktop closes the disclosure and moves focus from the hidden menu to the brand. The links remain usable without JavaScript.

### Screenshots

`src/apps/gps-go/assets/showcase/` holds the Places, running-map and joystick captures from `doc/release/store/feature-graphic-variants` in the GPS-Go repository (`ui-light-bg-light.html`, `ui-dark-bg-dark.html`), cut to the part each card shows and saved at 2x as WebP. Re-cut them when the store graphic changes.

Everything in `src/apps/gps-go/assets/screens/` comes as a `-light` / `-dark` pair captured from the app itself on the `Pixel_10` emulator (1080 × 2424, 420 dpi), and `Screenshot` / `PhoneFrame` take the pair as `src` and `dark` and show the one that matches the site theme. Set up as for the store shots (`doc/release/store-listing.md` in the GPS-Go repository): a `DEBUG_TIER=PRO`, `DEBUG_MENU_ENABLED=false` debug build, the store demo backup imported, English, the System theme, the default colour and metric units.

1. `scripts/gps-go/capture-guide.sh [scene ...]` enters the demo status bar (9:41, full battery), then for each scene prints what to set up, captures it in the light theme, switches the system to dark, captures again and switches back. The pair shares one layout, so the hotspots fit both. Raw PNGs go to `scripts/gps-go/captures/` (git-ignored).
2. `scripts/gps-go/guide-images.sh` crops and converts them into `src/apps/gps-go/assets/screens/`; the crop of each asset is listed at the top of the script.

Hotspot rectangles in `src/apps/gps-go/data/tour.ts` and `src/apps/gps-go/data/anatomy.ts` are percentages of the image, so re-measure them if the layout on screen changed.

`public/gps-go/og.png` (1200 × 630) and `public/gps-go/apple-touch-icon.png` are generated from the same assets and the launcher icon in `doc/assets/app-icon.svg` in the GPS-Go repository.

### Copy

Product terms follow the app's strings (`app/src/main/res/values/strings.xml`) and `CONTEXT.md` in the GPS-Go repository. The site follows the store listing's scene rules in the first paragraph of `doc/release/store-listing.md` and the word lists in `doc/release/app-naming-and-tags.md` §5: write only the scenes the listing writes, and name no third-party apps or games beyond the map apps GPS-Go accepts shares from. Facts on the page match the listing's Good to know.

## OG image

`public/og.png` is generated by `npm run og` (renders an inline SVG via resvg; fetches Instrument Sans TTF on first run and caches it in `scripts/fonts/`). Re-run only if the wordmark or tagline changes.

## Fonts

The studio pages self-host Instrument Sans and Newsreader (both variable) through Fontsource, so there are no external font requests at runtime. GPS-Go's pages use system fonts.
