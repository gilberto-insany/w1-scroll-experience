"""Prepare runtime maps from the user-supplied licensed Poliigon 7037 package."""
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
import hashlib
import json
import sys
from PIL import Image

root = Path(__file__).resolve().parent.parent
archive = Path(sys.argv[1]) if len(sys.argv) == 2 else None
if archive is None:
    raise SystemExit('Usage: python3 scripts/prepare-material.py /path/to/material.zip')
source_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
if source_hash != '7f551f9cbe11837fa72b59be65b55cc3f7a4bbe7bfe7aac199fe6ebbd99e0215':
    raise SystemExit('This build expects the verified Poliigon Metal Matte 7037 package.')
output = root / 'dist/assets/materials/matte-7037'
output.mkdir(parents=True, exist_ok=True)
with ZipFile(archive) as package:
    def read_map(name, mode):
        image = Image.open(BytesIO(package.read(f'2K/Poliigon_MetalPaintedMatte_7037_{name}'))).convert(mode)
        return image.resize((1024, 1024), Image.Resampling.LANCZOS)
    read_map('BaseColor.jpg', 'RGB').save(output / 'color.webp', quality=92, method=6)
    read_map('Normal.png', 'RGB').save(output / 'normal.webp', lossless=True, method=6)
    # Three.js samples AO from R, roughness from G, and metalness from B.
    orm = Image.merge('RGB', (read_map('AmbientOcclusion.jpg', 'L'), read_map('Roughness.jpg', 'L'), read_map('Metallic.jpg', 'L')))
    orm.save(output / 'orm.webp', lossless=True, method=6)
files = {file.name: {'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'bytes': file.stat().st_size} for file in sorted(output.glob('*.webp'))}
manifest = {'material': 'Poliigon Metal Painted Matte 7037', 'source_sha256': source_hash, 'resolution': 1024, 'files': files}
(root / 'dist/material-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Prepared material 7037: {sum(item["bytes"] for item in files.values()):,} bytes across {len(files)} runtime maps.')
