"""Serve a separately deployed static release; never import the blog or its models.

Follows the Seventh Seat blueprint: an explicit MIME allowlist (anything else is 404),
revalidated HTML/scripts/data, day-long caching only for companion artwork and fonts
(which a release never changes in place), and the release's own Content-Security-Policy,
read from its RELEASE.json at request time. The blog's site-wide CSP hook uses
setdefault (since the Seventh Seat change), so the policy set here survives.
"""
import json
import os
from pathlib import Path

from flask import Response, redirect, request, send_from_directory, url_for

# Release roots, in resolution order:
#   1. QUIET_SIGNAL_ROOT                       -- explicit override
#   2. <project root>/quiet_signal_release     -- a local copy beside the app, for preview
#   3. PRODUCTION_ROOT                         -- the deployed release symlink (see DEPLOY.md)
# views.py lives at <project root>/app/routes/quiet_signal/views.py.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
LOCAL_ROOT = PROJECT_ROOT / "quiet_signal_release"
PRODUCTION_ROOT = Path("/srv/quiet-signal/current/quiet-signal")

# Exactly the types the release builder permits. Anything else is refused with 404.
MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".webp": "image/webp",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
}
DAY = "public, max-age=86400"


def _release_root():
    """Resolve the release root once per request, so a release switch is atomic."""
    override = os.environ.get("QUIET_SIGNAL_ROOT")
    if override:
        return Path(override).resolve()
    if LOCAL_ROOT.is_dir():
        return LOCAL_ROOT.resolve()
    return PRODUCTION_ROOT.resolve()


def _release_csp(root):
    try:
        value = json.loads((root / "RELEASE.json").read_text(encoding="utf-8"))["content_security_policy"]
    except (OSError, ValueError, KeyError, TypeError):
        return None
    return value if isinstance(value, str) and value and "\n" not in value else None


def _cache_control(relative):
    suffix = Path(relative).suffix.lower()
    # Companion sprite sheets and bundled fonts are copied unchanged from their sources.
    if suffix in (".webp", ".woff2"):
        return DAY
    # HTML, scripts, styles, data and RELEASE.json revalidate, so a new release shows at once.
    return "no-cache"


def _headers(response, cache="no-cache"):
    response.headers["Cache-Control"] = cache
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def _missing():
    return _headers(Response("Not found.\n", status=404, mimetype="text/plain"))


def publication(asset_path=""):
    root = _release_root()
    if not root.is_dir():
        return _headers(Response("Release files are not installed.\n", status=503,
                                 mimetype="text/plain"))
    candidate = (root / asset_path).resolve()
    if not candidate.is_relative_to(root):
        return _missing()
    if candidate.is_dir():
        if not request.path.endswith("/"):
            target = (url_for("quiet_signal.quietsignal_file", asset_path=asset_path + "/")
                      if asset_path else url_for("quiet_signal.quietsignal_index"))
            if request.query_string:
                target += "?" + request.query_string.decode("latin-1")
            return redirect(target, code=308)
        candidate = (candidate / "index.html").resolve()
        if not candidate.is_relative_to(root):
            return _missing()
    mimetype = MIME_TYPES.get(candidate.suffix.lower())
    if mimetype is None or not candidate.is_file():
        return _missing()
    relative = str(candidate.relative_to(root))
    response = send_from_directory(str(root), relative, mimetype=mimetype, conditional=True)
    if candidate.suffix.lower() == ".html":
        csp = _release_csp(root)
        if csp is None:
            # A release without its verified policy is not served.
            return _headers(Response("Release policy missing.\n", status=503,
                                     mimetype="text/plain"))
        response.headers["Content-Security-Policy"] = csp
    return _headers(response, _cache_control(relative))
