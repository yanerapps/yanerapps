# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two visitors, served equally:

- **Play Store users** arriving from an app's listing to read its privacy policy, get support, or understand the app before or after installing.
- **People discovering the studio** who decide whether to try its apps.

GPS-Go's product pages also serve its own audiences (the three the store listing names), mostly developers and testers checking how an app behaves in other places.

## Product Purpose

yanerapps.com is the home of Yaner Apps, an independent studio that builds a few small, focused apps. It is the studio's front door, each app's required privacy and support home, and, for GPS-Go, a full product site with a guide and FAQ.

Success means:

- visitors click through to a Google Play listing;
- visitors leave trusting that the apps respect their data and attention;
- guides and FAQs answer questions before people email;
- every privacy and support URL meets Play's requirements and stays accurate.

## Positioning

A small studio that builds native apps per platform and looks after each one until it deserves its place on your phone. No accounts, data kept on the device, no dark patterns, no synthetic urgency. The name comes from 燕儿 (Yaner, "little swallow"): a swallow builds its nest one beakful at a time.

## Operating Context

- Visitors usually arrive from a Google Play listing link, on a phone.
- Each app has `/<app>/privacy` and `/<app>/support`; these URLs are given to Google Play and must stay stable.
- Support happens by email (`yanerapps@gmail.com`); support pages prefill a bug-report template.
- English only; former `/zh` addresses redirect to English pages.

## Capabilities and Constraints

- Static Astro site with Svelte islands, deployed to Cloudflare Workers static assets. URLs never end in a slash.
- `src/apps/registry.ts` is the single source for the studio's name, email, URL and each app's name, blurb, Play link and showcase copy.
- Apps today, all Android: **GPS-Go** (no-root location simulator, live on Google Play), **PingDeck** (pings many hosts at once) and **Paperdot** (a Bullet Journal); the last two are "Coming soon to Google Play".
- The studio is native-first across operating systems (confirmed 2026-10-31). Do not name an iOS or macOS app until one ships.
- Today's apps are small tools, but the studio may later build medium-size apps or SaaS (2026-10-31). Studio-level copy should not lock it to "small", "tools" or "your phone".
- GPS-Go is free with ads and daily limits; the Ad-free and Pro monthly subscriptions are live for everyone since the release submitted on 2026-10-25. The site states prices nowhere, since Google Play sets them per region.
- GPS-Go's product pages keep their own look (`src/apps/gps-go/layouts/Base.astro`); its privacy and support pages use the studio layout.
- three.js is allowed only lazy-loaded; all content must remain readable without JavaScript.
- Light and dark themes; a manual choice carries across the studio and app pages.

## Brand Commitments

- Name: **Yaner Apps**. Studio motto: "Ride the Wind".
- Voice: "we", plain and calm. Product copy names platform conventions without version numbers.
- Legal pages present the publisher as "Yaner Apps, an independent developer studio" and name Yaner Yang only in the data-controller sentence; never mention the family behind the studio.
- The swallow is the studio's signature (the code-drawn swallow in the hero sky, the 燕 glyph).
- Claims stay true to the apps: "no dark patterns", "no account needed", "stays on your device" only where the privacy policy backs them.

## Evidence on Hand

- GPS-Go: light/dark app captures in `src/apps/gps-go/assets/screens/` and store-graphic crops in `src/apps/gps-go/assets/showcase/`; Play listing live.
- PingDeck and Paperdot: icons only (`public/pingdeck/icon.png`, `public/paperdot/icon.svg`); no screenshots yet.
- Each app's privacy policy is the source for every data claim.
- No testimonials, reviews, download counts, press or pricing exist. Do not invent them.

## Product Principles

1. Every claim is checkable against the app or its privacy policy.
2. Respect attention: no dark patterns, no urgency, no tracking.
3. Small and focused: show few apps, each well, rather than a catalogue.
4. Legal and support pages are first-class; they are often the first page a visitor sees.
5. Work without JavaScript; motion and 3D are enhancements.

## Accessibility & Inclusion

Content readable with JavaScript off; `prefers-reduced-motion` stops all motion; visible focus rings; keyboard-usable menus and demos; accent colors pass as text in both themes.
