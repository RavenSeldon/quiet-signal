# Presentation update · v0.2

Requested by Ben Amuwo: align The Quiet Signal with benamuwo.com and integrate
more Hatchery companions. Follow-up: explicitly include Ochre and Buer.

## Delivered

- Portfolio-derived dark ink-blue and pale light palettes, lavender/blue accents,
  Space Mono typography, square fine-rule panels, numbered navigation, and an
  orbital hero illustration. The illustration is explicitly presentation.
- Space Mono regular/bold and the original SIL OFL licence bundled locally from
  the official Google Fonts repository. No remote font request at runtime.
- Ten existing companions: Piko, Aster, Nacre, Bookworm, Ajita, Batrina, Hel,
  Jayke, Shai-Ochre and Buer. Each sheet, manifest and Record is copied unchanged.
  All copies match their source hashes; each sheet and manifest matches the
  corresponding original Record.
- One active animated companion, a quiet field-guide picker with still previews,
  original descriptions, volume/plate identifiers, and original Record links.
  Buer's compact button uses “Buer”; its complete original title is retained in
  the description and accessibility label.
- Local companion/theme preferences; motion pause and operating-system reduced
  motion remain supported. Pausing also disables smooth page scrolling.
- Theme and companion choices never enter the experimental runtime. Changing
  either preserves the current episode, query decisions, costs and outcomes.

## Sources

Read-only live references: https://benamuwo.com and https://hatchery.world.
The portfolio was visually inspected in the browser. The Hatchery's live
collection and local production styles/Records were inspected. No public site,
canonical source or original companion asset was changed.

Local source identities are in `source_ledger.json`; companion identities in
`companion_sources.json`; font URLs and hashes in `font_sources.json`.
The portfolio font is Space Mono, not a generated imitation. The overall
composition is adapted for this experiment rather than replacing its results.

Original pet-use licences and AI-production disclosures remain intact. This
update grants no broader commercial replication or resale rights. No pet was
installed into the user's account or regenerated.

## Verification

- All ten companions selected through the browser; displayed identity changed
  and the complete episode explanation stayed byte-identical in the DOM.
- Light/dark switching preserved the same outcome.
- Ochre and Buer selected directly; Buer selected via keyboard from its card.
- Companion preference persisted across reload.
- Complementary-signal myopic silence and optimal two-signal behavior verified.
- Layout checked at 390 and 320 pixels with no document overflow. Gallery and
  desktop/light/mobile views captured; paused animation and gallery navigation
  checked. This is not a full screen-reader audit.
- No browser console errors observed in the local preview.
- Existing 14 Python tests and all 640 Python/export comparisons still pass.
  The asset integrity check now covers all copied companions and font assets.
- `presentation_baseline.json` confirms the scientific engine, runtime, exported
  data, both benchmark CSVs and primary results figure are byte-identical to
  their pre-redesign versions. No experiment was rerun to change a result.

This is presentation release v0.2 over scientific model v0.1. The original v0.1
handoff archive remains available; this release has a separate archive.
