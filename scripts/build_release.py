"""Build the hosted release of the playable prototype for https://benamuwo.me/quiet-signal/.

    python3 scripts/build_release.py            # writes dist/quiet-signal/ and the release zip

Copies web/ unchanged except for files the v0.3 pages no longer load (the v0.2 canon
stylesheet and its Space Mono fonts, kept in the source tree as release history).
Writes RELEASE.json beside the files: every file's SHA-256 and size, the page's
Content-Security-Policy, and the source-tree identity it was built from. The zip is
deterministic (fixed timestamps, sorted entries, stored rather than deflated so no zlib
version can change its bytes), so rebuilding the same tree on any machine gives the same
SHA-256. Refuses to build if a file type is outside the blueprint's allowlist, a
local reference does not resolve, a shipped page names a third-party script or
stylesheet, or the release exceeds its size cap.
"""
import hashlib
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
DIST = ROOT / "dist"
OUT = DIST / "quiet-signal"
TAG = "site-2026-11-09-r3"
ZIP = DIST / f"quiet-signal-{TAG}.zip"

# Loaded by no current page; retained in web/ as release history only
# (v0.2 canon stylesheet and Space Mono; v0.3 favicon).
EXCLUDE = {
    "assets/signal-mark.svg",
    "canon.css",
    "assets/fonts/SpaceMono-Regular.ttf",
    "assets/fonts/SpaceMono-Bold.ttf",
    "assets/fonts/LICENSE-SpaceMono.txt",
}
ALLOWED = {".html", ".css", ".js", ".json", ".webp", ".png", ".svg", ".woff2", ".txt"}
MAX_RELEASE = 20 * 1024 * 1024

# Only this site's own files. The legend swatches set colour through an inline style
# attribute, hence style-src-attr; no inline <style> element or script is permitted.
CSP = "; ".join([
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
])


def sha(data):
    return hashlib.sha256(data).hexdigest()


def source_identity():
    """Hash of every scientific and presentation input, so RELEASE.json names its source."""
    parts = []
    for base in ("quiet_signal", "web", "results/benchmark.csv", "results/sensitivity.csv"):
        p = ROOT / base
        files = [p] if p.is_file() else sorted(x for x in p.rglob("*") if x.is_file() and "__pycache__" not in x.parts and x.name != ".DS_Store")
        parts += [f"{f.relative_to(ROOT)}:{sha(f.read_bytes())}" for f in files]
    return sha("\n".join(parts).encode())


def main():
    files = sorted(p for p in WEB.rglob("*") if p.is_file() and p.name != ".DS_Store")
    ship = [p for p in files if str(p.relative_to(WEB)) not in EXCLUDE]
    names = {str(p.relative_to(WEB)) for p in ship}
    problems = []
    for p in ship:
        rel = str(p.relative_to(WEB))
        if p.suffix.lower() not in ALLOWED:
            problems.append(f"type not allowed: {rel}")
        if p.suffix.lower() in (".html", ".css"):
            text = p.read_text(encoding="utf-8")
            if re.search(r"<script(?![^>]*\bsrc=)[^>]*>", text) or re.search(r"<style[\s>]", text):
                problems.append(f"inline script or style element: {rel}")
            refs = re.findall(r'(?:src|href)="([^"#?]+)"', text) + re.findall(r"url\('([^']+)'\)", text)
            for ref in refs:
                if re.match(r"^(https?:|mailto:|data:)", ref):
                    loads = (rf'<script[^>]*\bsrc="{re.escape(ref)}"',
                             rf'<link[^>]*\brel="(?:stylesheet|preload|modulepreload|icon|apple-touch-icon|manifest)"[^>]*\bhref="{re.escape(ref)}"')
                    if p.suffix == ".html" and any(re.search(x, text) for x in loads):
                        problems.append(f"third-party script or stylesheet in {rel}: {ref}")
                    continue
                target = str((p.parent / ref).resolve().relative_to(WEB.resolve())) if not ref.endswith("/") else None
                if target and target not in names:
                    problems.append(f"{rel} references a file not in the release: {ref}")
    total = sum(p.stat().st_size for p in ship)
    if total > MAX_RELEASE:
        problems.append(f"release is {total:,} bytes, over {MAX_RELEASE:,}")
    if problems:
        sys.exit("refusing to build:\n  " + "\n  ".join(problems))

    if OUT.exists():
        shutil.rmtree(OUT)
    entries = {}
    for p in ship:
        rel = str(p.relative_to(WEB))
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        data = p.read_bytes()
        dest.write_bytes(data)
        entries[rel] = {"sha256": sha(data), "bytes": len(data)}
    release = {
        "project": "The Quiet Signal",
        "release": TAG,
        "presentation": "0.4",
        "scientific_model": "0.1",
        "route": "/quiet-signal/",
        "source_identity": source_identity(),
        "content_security_policy": CSP,
        "excluded_history": sorted(EXCLUDE),
        "total_bytes": total,
        "files": entries,
    }
    (OUT / "RELEASE.json").write_text(json.dumps(release, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    with zipfile.ZipFile(ZIP, "w", compression=zipfile.ZIP_STORED) as z:
        for p in sorted(x for x in OUT.rglob("*") if x.is_file()):
            info = zipfile.ZipInfo("quiet-signal/" + str(p.relative_to(OUT)), date_time=(2026, 11, 9, 0, 0, 0))
            info.external_attr = 0o644 << 16
            info.compress_type = zipfile.ZIP_STORED
            z.writestr(info, p.read_bytes())
    with zipfile.ZipFile(ZIP) as z:
        assert z.testzip() is None
        for rel, meta in entries.items():
            assert sha(z.read("quiet-signal/" + rel)) == meta["sha256"], rel
    print(f"{OUT.relative_to(ROOT)}: {len(entries)} files + RELEASE.json, {total:,} bytes")
    print(f"{ZIP.relative_to(ROOT)}: {ZIP.stat().st_size:,} bytes")
    print(f"zip sha256: {sha(ZIP.read_bytes())}")


if __name__ == "__main__":
    main()
