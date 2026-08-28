"""Package the approved current OOXML designs without recreating obsolete templates."""
import argparse
import json
from pathlib import Path, PurePosixPath
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tools/document-sources'
CONTRACT = json.loads((ROOT / 'tools/document-contract.json').read_text(encoding='utf-8'))


def build_documents(output_dir=None, only=None):
    output_dir = Path(output_dir or ROOT / 'downloads').resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for doc in CONTRACT['documents']:
        if only and doc['id'] not in only:
            continue
        parts = json.loads((SOURCE / (doc['id'] + '.json')).read_text(encoding='utf-8'))
        target = output_dir / doc['filename']
        candidate = target.with_suffix('.docx.building')
        try:
            with ZipFile(candidate, 'w', compression=ZIP_DEFLATED) as package:
                for member, source in parts.items():
                    if PurePosixPath(member).is_absolute() or '..' in PurePosixPath(member).parts:
                        raise ValueError('Unsafe OOXML member')
                    part = (SOURCE / source).resolve()
                    if not part.is_relative_to(SOURCE.resolve()):
                        raise ValueError('Unsafe document source')
                    info = ZipInfo(member, date_time=(2026, 8, 28, 0, 0, 0))
                    info.compress_type = ZIP_DEFLATED
                    package.writestr(info, part.read_bytes())
            with ZipFile(candidate) as package:
                if package.testzip(): raise ValueError('Invalid generated DOCX')
            candidate.replace(target)
        finally:
            if candidate.exists(): candidate.unlink()
        results.append(target)
        print(f'Built {target.name}')
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path)
    args = parser.parse_args()
    build_documents(args.output_dir, only={d['id'] for d in CONTRACT['documents'] if d['id'] != 'review'})
