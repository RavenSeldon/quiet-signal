#!/usr/bin/env python3
"""Install The Quiet Signal blueprint into the Neurascape blog checkout. Never commits.

    python3 deploy/blog/apply_to_blog.py --blog ~/Root/beamu-blog            # dry run: show the diff
    python3 deploy/blog/apply_to_blog.py --blog ~/Root/beamu-blog --write    # apply to the working tree

Three edits, each idempotent and anchored on text that must already exist (else it stops):
  1. copy deploy/blog/quiet_signal/ to WebDev/Blog/app/routes/quiet_signal/
  2. app/routes/__init__.py: import and register quiet_signal_bp last (after The Seventh Seat)
  3. app/routes/main.py: add /quiet-signal/ to the sitemap after /seventh-seat/
The blog's CSP hook already uses setdefault (from the Seventh Seat change), so the release's
own policy survives without touching app/__init__.py. The author reviews `git diff`,
commits, pushes and reloads the droplet.
"""
import argparse
import difflib
import filecmp
import shutil
import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent / "quiet_signal"
FILES = ("__init__.py", "url.py", "views.py")
CSP_HOOK = "        response.headers.setdefault('Content-Security-Policy', csp)\n"

EDITS = [
    ("app/routes/__init__.py",
     "    from app.routes.seventh_seat.url import seventh_seat_bp\n",
     "    from app.routes.seventh_seat.url import seventh_seat_bp\n"
     "    from app.routes.quiet_signal.url import quiet_signal_bp\n"),
    ("app/routes/__init__.py",
     "    app.register_blueprint(seventh_seat_bp)\n",
     "    app.register_blueprint(seventh_seat_bp)\n"
     "    # Static playable experiment at /quiet-signal/ -- same pattern, same reason.\n"
     "    app.register_blueprint(quiet_signal_bp)\n"),
    ("app/routes/main.py",
     "        {'loc': '/seventh-seat/', 'priority': '0.7', 'changefreq': 'monthly'},\n",
     "        {'loc': '/seventh-seat/', 'priority': '0.7', 'changefreq': 'monthly'},\n"
     "        # Static playable experiment served by the quiet_signal blueprint.\n"
     "        {'loc': '/quiet-signal/', 'priority': '0.7', 'changefreq': 'monthly'},\n"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--blog", required=True, help="beamu-blog checkout")
    ap.add_argument("--write", action="store_true", help="apply (default: dry run)")
    a = ap.parse_args()
    repo = Path(a.blog).expanduser().resolve()
    app = repo / "WebDev/Blog"
    if not (app / "app/routes/seventh_seat/url.py").is_file():
        sys.exit(f"not the blog checkout (no Seventh Seat blueprint): {repo}")
    if CSP_HOOK not in (app / "app/__init__.py").read_text(encoding="utf-8"):
        sys.exit("app/__init__.py no longer uses setdefault for the site CSP; the release policy would be overwritten")
    if a.write and (repo / ".git").exists():
        dirty = subprocess.run(["git", "-C", str(repo), "status", "--porcelain"],
                               capture_output=True, text=True, check=True).stdout.strip()
        if dirty:
            sys.exit("blog working tree has uncommitted changes; commit or stash them first")

    new_texts, changed = {}, False
    for rel, anchor, replacement in EDITS:
        path = app / rel
        text = new_texts.get(rel, path.read_text(encoding="utf-8"))
        if replacement in text:
            new_texts[rel] = text
            continue
        if text.count(anchor) != 1:
            sys.exit(f"{rel}: expected anchor exactly once, found {text.count(anchor)}; stopping")
        new_texts[rel] = text.replace(anchor, replacement)
    for rel, text in new_texts.items():
        old = (app / rel).read_text(encoding="utf-8")
        if old != text:
            changed = True
            sys.stdout.writelines(difflib.unified_diff(
                old.splitlines(True), text.splitlines(True), f"a/WebDev/Blog/{rel}", f"b/WebDev/Blog/{rel}"))

    dest = app / "app/routes/quiet_signal"
    copies = [f for f in FILES if not (dest / f).is_file() or not filecmp.cmp(SRC / f, dest / f, shallow=False)]
    for f in copies:
        changed = True
        print(f"{'new' if not (dest / f).exists() else 'update'}: WebDev/Blog/app/routes/quiet_signal/{f}")

    if not changed:
        print("blog already carries the Quiet Signal blueprint; nothing to do")
        return
    if not a.write:
        print("\ndry run only; re-run with --write to apply to the working tree")
        return
    dest.mkdir(exist_ok=True)
    for f in copies:
        shutil.copyfile(SRC / f, dest / f)
    for rel, text in new_texts.items():
        (app / rel).write_text(text, encoding="utf-8")
    print("\napplied. Review with: git -C", repo, "diff && git -C", repo, "status")


if __name__ == "__main__":
    main()
