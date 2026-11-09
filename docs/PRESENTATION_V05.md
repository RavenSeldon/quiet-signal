# Presentation update · v0.5 (Terrarium)

Presentation v0.5 over scientific model v0.1. Ben Amuwo requested it on 9 November 2026: make the companions look as if they live in a cosmic terrarium, after Yggdrasil. It should be additive, stay inside the established palette, and be tempered by what already exists.

## What Was Added

All of it lives in one new stylesheet, `web/terrarium.css`, layered after `seal.css`, plus one inline SVG inside the companion panel in `web/index.html`.

- **The vessel:** the companion's existing arch becomes glass. It gets a faint iridescent rim drawn in the seal palette, a soft sheen on its left wall, and a lit floor.
- **The world tree:** a slender tree in the seal's violet stands behind the companion, so the companion sits at its heart.
  - Its canopy branches end in a dotted constellation.
  - Its three roots take the three channel colours: rose, violet and sky.
  - Nine small worlds sit on its branches and roots, after the nine worlds of Yggdrasil.
  - The ninth is a green point at the root: the quiet signal.
- **The sky inside the jar:** a few faint stars, plus two nebula glows built from radial gradients, with no blur filters.
- **Gallery jars:** each companion card in the field guide gets a lit floor under its companion, a few star specks and a glass sheen. Everything is CSS on a pseudo-element.
- **Motion:** three stars twinkle and the green signal breathes on 6–11 second opacity cycles. Nothing moves position. Motion stops under reduced motion and when motion is paused, and the whole terrarium is hidden in forced-colours mode.
- **Light theme:** the same vessel is drawn in ink tones on paper.

## Boundaries

- **Presentation only:** the terrarium carries `aria-hidden` and represents no data, event or result.
- **Original artwork untouched:** companion sprites and Records are unchanged and still byte-identical to their sources.
- **Nothing else changed:** `app.js`, `runtime.js`, `data.js`, `companions.js`, `pets.js` and the engine are byte-identical. The tests assert both byte-identity baselines. The security policy (CSP) is unchanged.
- **Cost:** about 7 KB of extra page weight. There are no images, no blur filters and no script.

## Verification (9 November 2026)

| Check | Result |
|---|---|
| Python tests | 14 passed |
| `check_export.cjs` | 640 comparisons, 35,840 traces passed |
| `check_browser.cjs` | Passed, including 320 px and keyboard checks |
| `check_hosted.cjs` through the real blog with the release CSP | No CSP violations, errors or off-origin requests |
| Visual review | Dark, light, 1440 / 1000 / 390 px; Piko and Buer; gallery |
| Release `site-2026-11-09-r5` | zip SHA-256 `ec8f195d…89d8`; receipt `ff22f75e…734d` |
