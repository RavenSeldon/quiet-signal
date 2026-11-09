#!/usr/bin/env bash
# One-shot install of https://benamuwo.me/quiet-signal/ on the droplet.
# Paste into the DigitalOcean web console as root:
#   curl -fsSL https://raw.githubusercontent.com/RavenSeldon/quiet-signal/main/deploy/droplet_install.sh | bash
# It (1) pulls the blog (which must already carry the quiet_signal blueprint) and restarts it,
# (2) downloads the public site release, checks its pinned SHA-256, checks every file against
# its RELEASE.json receipt, installs it as a new release and switches to it atomically,
# (3) checks the live site, and switches back to the previous release if a check fails.
# It stops at the first problem and changes nothing it has not verified.
# Same pattern as The Seventh Seat's deploy/droplet_install.sh.
set -euo pipefail

TAG="site-2026-11-09-r2"
ZIP_URL="https://github.com/RavenSeldon/quiet-signal/releases/download/$TAG/quiet-signal-$TAG.zip"
ZIP_SHA="dc34ebcadb920f67a810b0663759c8f83125a43e2cf29dc0d811716c2293278f"
RELEASE_SHA="c8d40e7e94313be2b7fa4fe1ab403cf81e1c6170601b411dcd3196facbe2ec60"
BASE="${QUIET_SIGNAL_BASE:-/srv/quiet-signal}"
SITE="${QUIET_SIGNAL_SITE:-https://benamuwo.me}"
say() { printf '\n== %s\n' "$*"; }
die() { printf '\nSTOPPED: %s\n' "$*"; exit 1; }

if [[ -z "${SKIP_BLOG:-}" ]]; then
  say "1/3 Updating the blog"
  VIEWS="$(find / -path '*/WebDev/Blog/app/routes/seventh_seat/views.py' -not -path '*/.venv/*' -not -path '/proc/*' 2>/dev/null | head -1)"
  [[ -n "$VIEWS" ]] || die "could not find the blog checkout on this droplet"
  APP="${VIEWS%/app/routes/seventh_seat/views.py}"; REPO="${APP%/WebDev/Blog}"
  OWNER="$(stat -c %U "$REPO")"; echo "blog: $REPO (owner $OWNER)"
  if [[ "$OWNER" == root ]]; then git -C "$REPO" pull --ff-only; else sudo -u "$OWNER" git -C "$REPO" pull --ff-only; fi
  [[ -f "$APP/app/routes/quiet_signal/url.py" ]] || die "the blog on GitHub does not have the quiet_signal page yet; commit and push beamu-blog first"
  UNIT="$(grep -lsF "$APP" /etc/systemd/system/*.service /lib/systemd/system/*.service | head -1)"
  [[ -n "$UNIT" ]] || UNIT="$(grep -lsiE 'gunicorn' /etc/systemd/system/*.service | head -1)"
  [[ -n "$UNIT" ]] || die "could not find the blog's service; run: systemctl list-units --type=service | grep -i gunicorn"
  SERVICE="$(basename "$UNIT")"; echo "service: $SERVICE"
  systemctl restart "$SERVICE"; sleep 3
  systemctl is-active --quiet "$SERVICE" || die "$SERVICE did not come back; run: journalctl -u $SERVICE -n 40"
fi

say "2/3 Installing the verified release"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
if [[ -n "${QUIET_SIGNAL_ZIP_FILE:-}" ]]; then cp "$QUIET_SIGNAL_ZIP_FILE" "$TMP/r.zip"; else curl -fsSL "$ZIP_URL" -o "$TMP/r.zip" || die "could not download $ZIP_URL (is the GitHub release published?)"; fi
echo "$ZIP_SHA  $TMP/r.zip" | sha256sum -c --quiet - || die "downloaded release does not match its pinned SHA-256"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)-$TAG"
DEST="$BASE/releases/$STAMP/quiet-signal"
python3 - "$TMP/r.zip" "$DEST" "$RELEASE_SHA" <<'PY'
import hashlib, json, os, sys, zipfile
from pathlib import Path
z = zipfile.ZipFile(sys.argv[1]); dest = Path(sys.argv[2]); prefix = "quiet-signal/"
files = {n[len(prefix):]: z.read(n) for n in z.namelist() if n.startswith(prefix) and not n.endswith("/")}
if set(z.namelist()) - {prefix + n for n in files}: sys.exit("archive holds files outside quiet-signal/")
if hashlib.sha256(files["RELEASE.json"]).hexdigest() != sys.argv[3]: sys.exit("RELEASE.json is not the pinned receipt")
rel = json.loads(files["RELEASE.json"])
names = set(files) - {"RELEASE.json"}
if names != set(rel["files"]): sys.exit("release files differ from the receipt")
for name in sorted(names):
    if ".." in Path(name).parts or name.startswith("/"): sys.exit("unsafe path in archive")
    if hashlib.sha256(files[name]).hexdigest() != rel["files"][name]["sha256"]: sys.exit(f"{name} does not match the receipt")
for name, data in files.items():
    p = dest / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(data); os.chmod(p, 0o644)
for d in [dest, *[p for p in dest.rglob("*") if p.is_dir()]]: os.chmod(d, 0o755)
print(f"verified and installed {len(names)} files + RELEASE.json")
PY
mkdir -p "$BASE/releases"; chmod 755 "$BASE" "$BASE/releases" "$BASE/releases/$STAMP"
PREVIOUS="$(readlink "$BASE/current" 2>/dev/null || true)"
ln -sfn "releases/$STAMP" "$BASE/current.new" && mv -T "$BASE/current.new" "$BASE/current"
echo "live release: $STAMP${PREVIOUS:+ (previous: $PREVIOUS)}"
[[ -n "${SKIP_CHECKS:-}" ]] && exit 0

say "3/3 Checking the live site"
fail=0
for path in /quiet-signal/ /quiet-signal/research.html /quiet-signal/data.js /quiet-signal/assets/piko/spritesheet.webp / /seventh-seat/ /first-notice/ /schrodingers_civ/; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$SITE$path")"; echo "  $code  $path"; [[ "$code" == 200 ]] || fail=1
done
live="$(curl -fsS "$SITE/quiet-signal/RELEASE.json?$(date +%s)" | sha256sum | cut -d' ' -f1)"
[[ "$live" == "$RELEASE_SHA" ]] && echo "  live RELEASE.json is this release" || { echo "  live RELEASE.json differs"; fail=1; }
CSP="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["content_security_policy"])' "$BASE/current/quiet-signal/RELEASE.json")"
curl -sI "$SITE/quiet-signal/" | tr -d '\r' | grep -qiF "content-security-policy: $CSP" && echo "  page carries its own verified CSP" || { echo "  page CSP is not the release's"; fail=1; }
if [[ $fail != 0 ]]; then
  if [[ -n "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "$BASE/current.new" && mv -T "$BASE/current.new" "$BASE/current"
    die "a check failed; switched back to $PREVIOUS. Copy everything above to Claude."
  fi
  die "a check failed (the files are installed; nothing else was changed). Copy everything above to Claude."
fi
(cd "$BASE/releases" && ls -1 | sort | head -n -3 | xargs -r rm -rf --)
printf '\nDONE: %s/quiet-signal/\n' "$SITE"
