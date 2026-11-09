# Deploying The Quiet Signal → https://benamuwo.me/quiet-signal/

**Status:** On 9 November 2026, `site-2026-11-09` through `-r5` were published. **`site-2026-11-09-r6`** (presentation 0.6, Reactions) is built and verified but not yet published.

## Updating to a New Release (Blog Already Done)

The blog blueprint is already on the droplet, so an update only touches the static files.

```sh
cd ~/Root/quiet-signal
git add -A && git commit -m "Presentation 0.6: companions re-enact episodes; the jar shows the policy"
git push
python3 scripts/build_release.py        # must print zip sha256: d78d4efd8818a0136029abfd3aecce0baaf2c07671cfb1a9ba48d6d37b878c56
gh release create site-2026-11-09-r6 dist/quiet-signal-site-2026-11-09-r6.zip \
  --title "The Quiet Signal · site 2026-11-09 r6 (Reactions)" \
  --notes "Presentation 0.6 over scientific model 0.1: companions re-enact each episode; the terrarium shows the policy's exact average. Verified by deploy/droplet_install.sh against RELEASE.json."
```

Then, in the DigitalOcean console:

```sh
curl -fsSL https://raw.githubusercontent.com/RavenSeldon/quiet-signal/main/deploy/droplet_install.sh | SKIP_BLOG=1 bash
```

The previous release stays on the droplet, and the installer switches back to it if a live check fails. A browser may show the old favicon until its cache refreshes, because favicons are cached separately from pages. Earlier releases stay on GitHub unchanged.

The sections below describe the first deployment and the serving rules. They still apply.

## What Is Prepared

| Piece | Where | State |
|---|---|---|
| Blog blueprint `quiet_signal` (prefix `/quiet-signal`, MIME allowlist, `nosniff`, release CSP) | `deploy/blog/quiet_signal/` | Applied to `~/Root/beamu-blog` working tree; **uncommitted** |
| Registration (last, after Seventh Seat) and sitemap entry | `app/routes/__init__.py`, `app/routes/main.py` in the blog | Applied; **uncommitted** |
| Release builder | `scripts/build_release.py` | Writes `dist/quiet-signal/` + `RELEASE.json` + deterministic zip |
| Release zip | `dist/quiet-signal-site-2026-11-09.zip` | 16,652,001 bytes, SHA-256 `a9f10c3d8164f884239089e83bf43f0694b43f193f41b57b54070edc450bf015` |
| Release receipt | `dist/quiet-signal/RELEASE.json` | SHA-256 `4227ebcc4d8600a5568cd1dad148d5410f728e6014b02fca315829f9c08467d5` |
| Droplet installer | `deploy/droplet_install.sh` | Both SHAs pinned; tested against a local copy of the blog |
| Hosted browser check | `scripts/check_hosted.cjs` | Passed through the real blog app (`results/hosted_checks.json`) |

No change to `app/__init__.py` is needed: the blog's site-wide CSP hook already uses `setdefault`, from the Seventh Seat change. `apply_to_blog.py` checks this and stops if it ever changes back.

## Author Steps, in Order

### 1. Blog: review, commit, push

```sh
cd ~/Root/beamu-blog
git status && git diff          # two edited files + new app/routes/quiet_signal/
git add WebDev/Blog/app/routes/quiet_signal WebDev/Blog/app/routes/__init__.py WebDev/Blog/app/routes/main.py
git commit -m "Serve The Quiet Signal at /quiet-signal/"
git push
```

Until step 3 runs, `/quiet-signal/` returns 503 ("Release files are not installed."). That is expected.

### 2. Quiet Signal repo: first commit, push, publish the release

```sh
cd ~/Root/quiet-signal
git init -b main
git remote add origin https://github.com/RavenSeldon/quiet-signal.git
git add -A
git commit -m "The Quiet Signal: presentation 0.3, hosted release site-2026-11-09"
git push -u origin main
```

If GitHub refuses the push because the new repository already holds a README or licence, run `git pull --rebase origin main` and push again.

Then confirm the zip's fingerprint and publish it:

```sh
shasum -a 256 dist/quiet-signal-site-2026-11-09.zip
#   a9f10c3d8164f884239089e83bf43f0694b43f193f41b57b54070edc450bf015
gh release create site-2026-11-09 dist/quiet-signal-site-2026-11-09.zip \
  --title "The Quiet Signal · site 2026-11-09" \
  --notes "Static release for https://benamuwo.me/quiet-signal/. Presentation 0.3 over scientific model 0.1. Verified by deploy/droplet_install.sh against RELEASE.json."
```

`dist/` is git-ignored: the zip travels only as a release asset. Rebuilding with `python3 scripts/build_release.py` from the same tree gives the same SHA-256 on any machine, because the zip is stored rather than compressed and its timestamps are fixed. If the fingerprint differs, something in `web/` changed. Update the two pins in `deploy/droplet_install.sh`, commit and push before step 3.

### 3. Droplet: paste one command into the DigitalOcean web console (as root)

```sh
curl -fsSL https://raw.githubusercontent.com/RavenSeldon/quiet-signal/main/deploy/droplet_install.sh | bash
```

The command:

1. pulls the blog and restarts its service;
2. downloads the release, checks the zip and `RELEASE.json` against their pinned SHA-256 values, and checks every file against the receipt;
3. installs into `/srv/quiet-signal/releases/<stamp>/` and switches `current` atomically;
4. checks `/quiet-signal/`, the research page, data, a sprite, `/`, `/seventh-seat/`, `/first-notice/` and `/schrodingers_civ/`, plus the live receipt hash and the page's own CSP.

If a check fails, it switches back to the previous release when there is one. It keeps the newest three releases. If the blog was already updated, run it with `SKIP_BLOG=1`.

### 4. Look

Open https://benamuwo.me/quiet-signal/ on desktop and phone. Press **Listen & decide** once and open **Research note ↗**.

## Serving Rules (as Implemented)

- **MIME types:** `.html` (UTF-8), `.css`, `.js`, `.json`, `.webp`, `.png`, `.svg`, `.woff2`, `.txt` (UTF-8). Anything else returns 404, which includes the v0.2 Space Mono `.ttf` files, deliberately left out of the release.
- **Caching:** companion sprite sheets and fonts `public, max-age=86400`. HTML, scripts, styles, data and `RELEASE.json` use `no-cache`, so a new release shows at once.
- **CSP** (from `RELEASE.json`, on both HTML pages): `default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'`. `style-src-attr` exists only because the chart legend sets swatch colours through an inline `style` attribute in `app.js`. Under v0.3, `app.js` is frozen by `docs/identity_baseline.json`, so the policy was fitted to the page rather than the page to the policy. A browser that predates `style-src-attr` loses only the legend swatch colours; the policy names are still shown.
- **Paths:** `..` traversal returns 404. `/quiet-signal` redirects to `/quiet-signal/` with a 308.

## Measured, 9 November 2026

| | Bytes |
|---|---|
| Whole release (48 files + receipt) | 16,636,956 |
| First load, uncompressed (page, scripts, styles, four fonts, one companion sprite) | 2,148,507 |
| Largest first-load item: the active companion's original sprite sheet (Piko) | 1,392,278 |
| `data.js`, uncompressed (the blog compresses text responses) | 603,068 |

The other nine sprite sheets load only when the companion field guide is opened or a companion is chosen. The sprite sheets are the Hatchery's originals, byte for byte, and are not recompressed: the Records pin their hashes.

There are no third-party requests, accounts, analytics or server-side compute. Theme and companion preferences use `localStorage` keys prefixed `quiet-signal-`, wrapped in `try`, so they cannot collide with the blog.

## Rollback

Point `current` at an earlier release:

```sh
cd /srv/quiet-signal && ls releases && ln -sfn releases/<stamp> current.new && mv -T current.new current
```

To take the page down entirely, revert the blog commit from step 1 and pull on the droplet.

## Verification Behind This Runbook

- The blueprint was run inside the real Neurascape `create_app()`, with the blog's own requirements and an SQLite database. All 48 files were served byte-identical to `RELEASE.json`, with the release CSP on both pages. Blog pages kept the site CSP. `url_for('index')` still resolves to `/`, the sitemap lists `/quiet-signal/`, and traversal and excluded `.ttf` files return 404.
- `scripts/check_hosted.cjs` ran in Chromium through that server. It recorded zero CSP violations, zero page errors and zero off-origin requests. Fonts and sprites loaded, legend colours held under the policy, and results did not change across companion and theme switches. The 320, 390 and 768 px layouts had no horizontal overflow.
- `deploy/droplet_install.sh` was run against a local `/srv` stand-in. It installed and switched correctly, rolled back to the previous release when a check failed, and refused a tampered zip.
- Not verified: the droplet itself, nginx in front of gunicorn, and the live GitHub release download. None of these could be reached from the build environment.
