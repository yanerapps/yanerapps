---
target: studio home page
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/Users/chenshi/Developer/yanerapps/yanerapps/.claude/worktrees/impeccable-init-bbfa5b/src/pages/index.astro"
target_fingerprint: "sha256:7f70c6b878c42698963f17489ada26c333eb3c9095cfbb2d99857d29e4a0b965"
target_path: /Users/chenshi/Developer/yanerapps/yanerapps/.claude/worktrees/impeccable-init-bbfa5b/src/pages/index.astro
timestamp: 2026-10-31T23-03-01Z
slug: src-pages-index-astro
closed: true
---
Method: dual-agent (A: design review · B: detector + browser overlay)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Sky is an empty blurred box for ~2-3s until three.js loads |
| 2 | Match System / Real World | 3 | Plain copy; "quality apps" and "Est. 2026" are generic |
| 3 | User Control and Freedom | 3 | Anchors clear the fixed header; nothing traps |
| 4 | Consistency and Standards | 2 | /privacy and /support rows indented 20px (.prose ul beats .app-links); coming-soon cards are dead ends |
| 5 | Error Prevention | 3 | Closing "Email us" mailto has no subject; support pages prefill one |
| 6 | Recognition Rather Than Recall | 2 | Privacy/Support only in the footer; not in header or mobile menu |
| 7 | Flexibility and Efficiency | n/a | Brochure page, no repeated tasks |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained; on mobile the square sky pushes Apps to ~1245px |
| 9 | Error Recovery | 3 | Clear support route in closing band |
| 10 | Help and Documentation | n/a | Help lives on /support and the GPS-Go guide |
| **Total** | | **22/32** | **Acceptable (69%)** |

## Design Specificity Verdict
Partly authored. Only the code-drawn swallow ("Ride the Wind"), the 燕儿 origin line and "Built one beakful at a time" are this studio's own. The headline "We make quality apps.", the faint grid + glow, two-button hero, meta line, identical bullet cards and "Questions?" band are category-standard; remove the swallow and the page reads as a template.
Detector: CLI exit 2, 29 findings (gradient-text 3, codex-grid-background 1, design-system-font-size 13, -color 5, -radius 7). Gradient headings, hero grid and numbered kickers are intentional per DESIGN.md. False positives: values documented in DESIGN.md prose (4.5rem hero cap, lede clamp, 15px/14px nav and buttons, 14px icon and 10px menu radii), #000 mask stop, all swallow-debug.ts hits (dev-only). Real drift: 0.9rem, 14.5px, 14px, 1.625rem, 1.15rem sizes and an 8px radius off the token ramp. Overlay: / 2 findings, /privacy 1, /support 1.

## Priority Issues
1. [P1] Privacy and Support are not reachable from the header or mobile menu (Layout.astro links: Manifesto, Apps, Contact). Play Store visitors, an equal audience per PRODUCT.md, must scroll ~3300px on mobile. Fix: header Apps · Privacy · Support (drop Manifesto); per-card Privacy · Support links. /impeccable clarify / layout.
2. [P1] Three-card app grid breaks: auto-fit minmax(30rem) gives 2+1 with Paperdot alone beside empty space; the :only-child feature layout never fires. Fix: GPS-Go (the only live app) as a full-width feature card, the two coming-soon apps paired below. /impeccable layout.
3. [P2] Coming-soon cards end in grey text only. Fix: link each app's existing privacy/support pages; optional "tell me at launch" mailto with subject. /impeccable clarify.
4. [P2] Generic hero H1 "We make quality apps."; "Est. 2026" undercuts. Fix: lead with the beakful/small-focused idea. Copy change needs your approval. /impeccable clarify.
5. [P2] Trust gap: home says "No dark patterns" and "no account" but never mentions that GPS-Go shows AdMob ads (banner, interstitial, rewarded) and has subscriptions, per its privacy policy. Fix: state it plainly on the GPS-Go card. /impeccable clarify.
6. [P3] Sky shows an empty blurred box for ~3s on load and is a large square on mobile. Fix: static poster of the glide pose until three.js is ready; shorter aspect on mobile. /impeccable optimize / adapt.

## Persona Red Flags
- Jordan: "Explore GPS-Go" in the hero before anything says what GPS-Go is; "quality apps" doesn't say what kind.
- Riley: a fourth or second-live app reflows the grid unpredictably; no subject on closing mailto; no WebGL-failure fallback for the sky.
- Casey: Apps start ~1.5 screens down; Menu holds only in-page anchors, no Privacy/Support.
- Play Store visitor: no privacy path above the fold; /privacy rows misaligned on mobile; ads disclosed only in section 4 of the GPS-Go policy.

## Minor Observations
- .coming-soon (0.9rem/600 muted) can read as a disabled button.
- Paperdot icon's cream square is heavy on Night Sheet in dark mode.
- "Manifesto" in the header of /gps-go/privacy is an odd destination.
- Footer colophon "Static site · No tracking · Swallow drawn in code" is on-brand and could be promoted.
- Grid + red glow behind the hero compete slightly with the swallow.

## Questions to Consider
- If GPS-Go is the only live app, why do PingDeck and Paperdot get equal billing?
- Would naming the ads plainly turn the biggest trust risk into proof of "no dark patterns"?
- Is "Manifesto" worth a header slot when privacy and support are why many visitors arrive?
