# Presentation update · v0.3

Presentation v0.3 over scientific model v0.1. It covers two passes: Codex's identity pass, and Claude's close-out and hosting pass on 9 November 2026, which completed the v0.3 record and prepared the release for https://benamuwo.me/quiet-signal/.

## The Identity Pass (Codex)

Its main stylesheet is `web/identity.css`, titled "Blackout broadcast / presentation 0.3".

- **Palette:** near-black surfaces (`#030304`) with electric citron (`#dcff57`), ultraviolet (`#b592ff`) and coral (`#ff806a`), plus a light theme on warm paper (`#f1f0e7`). Both themes keep separate chart colours for all eight policies.
- **Type:** IBM Plex Sans and Mono and Libre Baskerville italic, copied byte for byte from the Hatchery site, with their OFL licences. Sources and hashes are in `identity_font_sources.json`. The display title uses the system Arial Black stack. No font is fetched remotely.
- **Hero:** a "signal object" SVG with three channels, a hatched signal and a silence cut. Its caption calls it a visual metaphor and points to the measurements below.
- **Unchanged:** `index.html` and `research.html` load `style.css` + `identity.css`. `identity_baseline.json` records that `app.js`, `runtime.js`, `data.js`, `companions.js`, `pets.js`, the engine, both CSVs and the primary figure are byte-identical to their pre-identity versions. The experiment, companion behaviour and results did not change.

The v0.2 portfolio stylesheet (`web/canon.css`) and its Space Mono fonts stay in the source tree as release history. No v0.3 page loads them, and the hosted release leaves them out.

## Close-Out and Hosting (Claude)

What was missing when this pass began: `README.md` already pointed to this file, which did not exist; the acceptance, provenance and research-note records still ended at v0.2; and no hosting existed (hosting was listed as deferred).

Changes:

- **Footer links:** both page footers now link to Neurascape (https://benamuwo.me/) beside the author link. This is the only edit to `web/`, and it changes no script, style or data file.
- **Private paths removed:** in `source_ledger.json`, `companion_sources.json` and `identity_font_sources.json`, the absolute home paths now start with `~/`. `scripts/verify_sources.py` expands `~`. Hashes are unchanged.
- **Record checks:** `tests/test_record.py` now also checks `identity_baseline.json` and `identity_font_sources.json`. The method count is still 14.
- **Hosted release:**
  - `scripts/build_release.py` builds the hosted release and its receipt.
  - `deploy/blog/` carries the blog blueprint and its installer.
  - `deploy/droplet_install.sh` installs the release on the droplet.
  - `scripts/check_hosted.cjs` checks the served release in a browser.
  - `deploy/DEPLOY.md` is the runbook.
- **Repository hygiene:** `.gitignore` excludes `dist/`, and `scripts/package.py` skips it.

## Verification (9 November 2026)

| Check | Result |
|---|---|
| Python tests (`unittest discover -s tests`) | 14 passed (NumPy 2.5.3, Python 3.13) |
| `scripts/check_export.cjs` | 640 Python/browser comparisons, 35,840 traces passed |
| `scripts/check_browser.cjs` from `file://` (v0.3 pages) | Passed; `desktop.png`, `mobile.png`, `companions.png`, `complementarity-replay.png` regenerated under v0.3 |
| Scientific and identity baselines | All hashes match |
| Blueprint inside the real blog `create_app()` | 48/48 files byte-identical to receipt; release CSP on both pages; blog CSP and `url_for('index')` unaffected |
| `scripts/check_hosted.cjs` through that server | No CSP violations, page errors or off-origin requests (`hosted_checks.json`, `hosted-desktop.png`) |
| Droplet installer against a local stand-in | Install, atomic switch, rollback on failed check, tamper refusal |

Limits: no screen-reader audit, no human comprehension study, and no check against the live droplet or nginx yet. The scientific claims, gates and limitations of v0.1 are unchanged.
