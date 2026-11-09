"""Build a deterministic, self-contained handoff excluding local environments."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
SKIP={'.venv','.cache','node_modules','__pycache__','.git','.DS_Store','dist'}
manifest=ROOT/'results/release_manifest.json'
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and not any(s in SKIP for s in p.relative_to(ROOT).parts) and p!=manifest)
identities={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
manifest.write_text(json.dumps({'project':'The Quiet Signal','version':'0.3.0','files':identities},indent=2)+'\n')
archive=ROOT.parent/'quiet-signal-v0.3.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted([*files,manifest]):
        name='quiet-signal/'+str(p.relative_to(ROOT))
        info=zipfile.ZipInfo(name,date_time=(2026,11,8,0,0,0))
        info.external_attr=(p.stat().st_mode & 0xFFFF)<<16
        info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,p.read_bytes())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for name,digest in identities.items():
        assert hashlib.sha256(z.read('quiet-signal/'+name)).hexdigest()==digest
print(f'{archive}: {len(files)+1} files, {archive.stat().st_size:,} bytes; archive integrity verified.')
