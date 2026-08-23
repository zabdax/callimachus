# Landing design references

Extracted design systems from [Refero Styles](https://styles.refero.design/) —
a curated DESIGN.md library for AI agents. Each file is the machine-extracted
design system of a real product site, fetched from the public styles API
(`https://styles.refero.design/api/styles/{id}`).

| Reference | Site | North star | What we borrowed |
|---|---|---|---|
| [huly.design.md](./huly.design.md) | huly.io | "Aurora through a midnight observatory" | Single aurora-beam signature, iris→ember brand pair, pill controls, dark layered canvas, product-UI-as-photography, alternating section rhythm |
| [authkit.design.md](./authkit.design.md | AuthKit (WorkOS) | "Frosted glass cathedral at midnight" | The glass language: hairline `rgba` borders, frosted surfaces, inset top highlights, blueprint-grid atmosphere, floating product mockups |
| [dala.design.md](./dala.design.md | dala.craftedbygc.com | "Constellation floating on black velvet" | Particle constellation as the single hero visual, scale-over-weight typography, spacious asymmetric two-column layout, one filled action per view |

These informed `apps/web/src/features/landing/landing.css` — the landing's
scoped design system. They are reference material, not a style contract:
the landing keeps the app's own "Cool Slate" palette (steel-blue `#6B9BD1` /
signal-amber `#E0A458`) and typography (Space Grotesk / Plus Jakarta Sans /
Hind Siliguri) defined in the original product spec
(`docs/superpowers/specs/2026-07-29-hsc-study-tracker-design.md`).
