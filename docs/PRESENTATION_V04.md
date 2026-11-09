# Presentation update · v0.4 (Seal edition)

Presentation v0.4 over scientific model v0.1. Requested by Ben Amuwo on 9 November 2026, after the site went live:
- make some simple visual and quality-of-life updates;
- move the prominent colour to the same level as the author's other projects;
- keep and integrate the green;
- use the supplied Maitrism glyph as the main favicon and unifying palette.

Sīdus keeps its own gilded identity. This page is allowed to branch out.

## Seal and Palette

- **Source:** `docs/seal/maitrism-glyph.svg`. This is the glyph Ben supplied, kept byte-identical (SHA-256 `2ea82372…bff0b`).
- **Favicon:** `web/assets/seal-mark.svg` is a favicon derivative of the glyph. It uses the same circle and chord geometry and the same sampled stroke colours, taken from the crisp layer only. Strokes are thickened for legibility at 16–32 px, the frame is cropped to the figure, and the background is black with rounded corners. `favicon-32.png` and `apple-touch-icon.png` are rendered from it in Chromium. Both pages use these icons in place of the v0.3 `signal-mark.svg`, which stays in the source tree as history and is left out of the release.
- **Palette:** `web/seal.css` is layered after `identity.css`, which is unchanged. It moves the prominent accent from citron to the seal's iridescence:
  - peach `#fddab2`
  - rose `#fbb6c5`
  - orchid `#d996f8`
  - violet `#af90fb`
  - periwinkle `#8095fa`
  - sky `#7cc1ff`

  The hero channels, signal cards and companion cards now run rose → violet → sky. The "SIGNAL" title, the primary buttons and the observatory's top edge carry the seal gradient. The light theme uses a deeper ink version of the same gradient so its contrast holds.
- **The green:** kept as `--signal`, the colour of the signal itself. It marks:
  - where attention lands (keyboard focus ring, text selection);
  - the pulse and its endpoint, and the hatched channel in the hero;
  - the full stop after SIGNAL;
  - the READ label on a queried monitor and the outcome note;
  - the Exact optimal line in the chart, which was already green.

  Light theme: olive `#435b00`. Chart colours are otherwise unchanged.

## Quality of Life

- **Outcome placement:** the outcome and the "Try this" prompt now follow the observatory directly. Before, they sat below the companion field guide, so on a phone the result appeared far from the button that produced it.
- **Scroll to the outcome:** `web/ux.js` brings the outcome into view after **Listen & decide** only when it landed below the fold. It respects reduced motion and the page's own motion pause, and it never touches the experiment.
- **Link home:** both footers carry the seal mark, which links home to benamuwo.me.
- **Link previews:** both pages now have a canonical URL, Open Graph and Twitter-card metadata, and a 1200×630 preview image (`assets/og-card.png`, a screenshot of the hero). Links shared from benamuwo.me now show the seal palette and title.

## Content Credentials

The four generated images carry an embedded C2PA Content Credentials manifest naming Claude as the producer: `seal-mark.svg`, `favicon-32.png`, `apple-touch-icon.png` and `og-card.png`. The delivery path to the author's machine added this manifest, and it is kept as a disclosure. The release is built from those stamped bytes. The same path had also stamped the supplied glyph. That stamp was removed so `docs/seal/maitrism-glyph.svg` matches the original exactly (SHA-256 `2ea82372…bff0b`).

## Unchanged

`app.js`, `runtime.js`, `data.js`, `companions.js`, `pets.js`, the engine, both CSVs and the primary figure are byte-identical. The tests assert both `presentation_baseline.json` and `identity_baseline.json`. The CSP is unchanged, so the blog blueprint needs no change.

## Verification (9 November 2026)

| Check | Result |
|---|---|
| Python tests | 14 passed |
| `check_export.cjs` | 640 comparisons, 35,840 traces passed |
| `check_browser.cjs` (file://) | Passed; screenshots regenerated under v0.4 |
| `check_hosted.cjs` through the real blog `create_app()` with the release CSP | Passed: no CSP violations, page errors or off-origin requests; favicons and `og:image` served |
| Release `site-2026-11-09-r2` | 53 files + receipt; zip SHA-256 `dc34ebca…278f`; receipt `c8d40e7e…ec60`; identical when rebuilt on the author's machine |
| Droplet installer against a local stand-in | Verified and installed |

Visual review: dark, light and 390 px mobile were inspected by screenshot. There was no screen-reader audit or human study.
