"""Optional local-only inherited-source integrity check; originals stay read-only."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for r in json.loads((root/'docs/source_ledger.json').read_text()) + json.loads((root/'docs/companion_sources.json').read_text()):
    p=Path(r['path']).expanduser()
    assert p.exists(), f'Source not available on this machine: {p}'
    assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256'],f'Source changed: {p}'
print('All recorded inherited-source identities are unchanged.')
