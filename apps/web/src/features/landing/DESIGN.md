# Landing design system — "The Constellation"

The `/welcome` marketing page. One idea carries everything: **the HSC syllabus
as a night sky** — every chapter is a dark star; studying it lights it; three
spaced revisions lock it into your constellation. The 3D hero is that metaphor
made literal, and every section below retells it at lower volume.

References: `docs/design-references/` (Huly, Authkit, Dala via
styles.refero.design). Implementation: `src/features/landing/landing.css`,
scoped under `.lpg` so the authed app's tokens are untouched.

## Palette — dark observatory (landing only)

| Token | Value | Role |
|---|---|---|
| `--lpg-bg` | `#070B12` | Page canvas — near-black blue |
| `--lpg-void` | `#04070C` | Deepest layer, behind the starfield |
| `--lpg-text` | `#E9EEF6` | Primary text |
| `--lpg-dim` | `#97A3B6` | Secondary text |
| `--lpg-faint` | `#5E6B7E` | Tertiary/micro text |
| `--lpg-iris` | `#6B9BD1` | Brand blue (= app dark `--primary`) |
| `--lpg-iris-hi` | `#9CC3EF` | Glow stop, gradient top |
| `--lpg-amber` | `#E0A458` | Signal amber (= app `--accent`) |
| `--lpg-amber-hi` | `#F2C287` | Warm glow stop |
| `--lpg-green` | `#7FB48E` | Success / streak (= app dark `--success`) |
| glass bg | `rgba(125,164,215,0.045)` | Frosted surface fill |
| glass border | `rgba(125,164,215,0.14)` | Hairline edges, never solid |
| glass highlight | `inset 0 1px 0 rgba(216,236,248,0.09)` | Lit-from-behind top edge |

The aurora gradient (`iris-hi → iris → amber → amber-hi`) appears **once**, in
the hero (Huly rule: the beam is signature, not wallpaper). Text on glass uses
the text→dim→faint progression (Authkit rule).

## Typography

- Display: **Space Grotesk Variable** — 500–700, tracking −0.02…−0.04em at
  display sizes; scale creates hierarchy, not weight (Dala rule).
- Body/UI: **Plus Jakarta Sans Variable** — 400–600, 15–17px, 1.6 line-height.
- Bangla: **Hind Siliguri** (400/500/600/700) — first-class, not a fallback:
  hero headline, chapter marquee, and all `bn` locale copy render in it.
- Eyebrow labels: PJS 600, 11–12px, uppercase, +0.16em tracking, amber or dim.
- Timer/instrument digits: Space Grotesk with `font-variant-numeric:
  tabular-nums`.

## Surfaces & elevation

Glass cards: `rgba(125,164,215,0.045)` fill, 1px `rgba(125,164,215,0.14)`
border, `backdrop-filter: blur(14px)`, inset top highlight, radius 16–20px.
No drop shadows on dark cards (Huly rule) — depth comes from borders, blur,
and the layer beneath. Floating frames (app mockups) get one soft black halo.

The Authkit blueprint grid (`1px` lines at ~5% iris, masked radially) backs
the walkthrough section only.

## The signature 3D — Chapter Constellation

WebGL (three.js), dynamically imported so `/welcome` is the only route paying
for it:

- ~500 stars on a fibonacci sphere + dimmer halo shell; iris-dominant with
  amber/green sparks; additive blending; per-star size + phase twinkle shader.
- Constellation lines: nearest-neighbour pairs under a distance threshold.
- **Four orbit rings** = first study + revisions 1·2·3 (the app's actual
  `Stage` model), each with one glowing satellite orbiting at its own pace.
- Pointer parallax (lerped), scroll dolly-in, slow drift; DPR capped at 2;
  paused when hidden/offscreen; `prefers-reduced-motion` renders a still frame.

## Motion rules

- Smooth scroll: Lenis, mounted only while the landing is mounted.
- Reveals: IntersectionObserver → opacity + translateY(26px) + blur(8px),
  950ms `cubic-bezier(.16,1,.3,1)`, 70ms stagger. Transform/opacity only.
- The walkthrough is the scroll showpiece: a 320vh pinned stage where scroll
  progress crossfades three real app mockups (timer → syllabus map → pace).
  Below 900px it un-pins into stacked blocks.
- Marquee: real Bangla chapter names from the syllabus seed, 46s linear loop,
  `aria-hidden` (decoration, not content).
- `prefers-reduced-motion`: no Lenis, no marquee, no pin, instant reveals,
  static WebGL frame. The page must remain fully readable.

## Anti-slop contract

No invented stats, no fake testimonials, no emoji icons, no purple gradient
blobs, no "✨ Introducing" badges. Numbers on the page are real (plan prices
from `PLAN_CATALOG`, syllabus chapters from the seed, 7-day trial from the
spec). The product UI mockups are the photography. One accent pair. One
signature visual. Copy is specific enough to be wrong.
