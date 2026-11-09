"""URL registration for the static Quiet Signal release only."""
from flask import Blueprint

from .views import publication

quiet_signal_bp = Blueprint("quiet_signal", __name__, url_prefix="/quiet-signal")

# Endpoint names carry the "quietsignal_" prefix for the reason documented in
# first_notice/url.py: create_app() aliases the bare part of every
# "<blueprint>.<name>" endpoint when that short name is free, so a plain
# "index" would capture url_for('index') from the blog's own templates.
quiet_signal_bp.add_url_rule(
    "", endpoint="quietsignal_without_slash", view_func=publication,
    defaults={"asset_path": ""},
)
quiet_signal_bp.add_url_rule(
    "/", endpoint="quietsignal_index", view_func=publication,
    defaults={"asset_path": ""},
)
quiet_signal_bp.add_url_rule(
    "/<path:asset_path>", endpoint="quietsignal_file", view_func=publication,
)
