"""Optional GTFS identity publication: an index failure never blocks valid theory.

Only redistributable GTFS facts are produced here. No PRIM or private profiles.
"""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import re
import shutil
from build_realtime_identities import build, publish_candidate, encoded

UTC = dt.timezone.utc
LINES = ['IDFM:C02565', 'IDFM:C01742']
ERRORS = {'GTFS_SOURCE_HASH_MISMATCH', 'TIMETABLE_HASH_MISMATCH', 'TIMETABLE_GENERATION_MISMATCH', 'AMBIGUOUS_PUBLISHER_ALIAS', 'TRIP_IDENTITY_COLLISION', 'CANONICAL_VISIT_CONFLICT', 'IDENTITY_SIZE_LIMIT', 'IDENTITY_ROW_LIMIT', 'GENERATION_ALREADY_EXISTS'}


def live_generations(root, now):
    result = []
    for folder in root.iterdir():
        if not folder.is_dir() or folder.is_symlink() or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', folder.name):
            continue
        try:
            raw = (folder / 'manifest.json').read_bytes()
            if len(raw) > 2 * 1024 ** 2:
                continue
            manifest = json.loads(raw)
            if manifest.get('schemaVersion') != 1 or manifest.get('kind') != 'gtfs-identity-manifest' or manifest.get('generationId') != folder.name:
                continue
            end = dt.datetime.fromisoformat(manifest['validUntilUtc'].replace('Z', '+00:00'))
            start = dt.datetime.fromisoformat(manifest['validFromUtc'].replace('Z', '+00:00'))
            if end <= now:
                shutil.rmtree(folder)
                continue
            result.append({'id': folder.name, 'folder': folder, 'from': start, 'until': end, 'sha256': hashlib.sha256(raw).hexdigest()})
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return result


def prepare(archive, distribution, *, now=None, builder=build, lines=None):
    now = now or dt.datetime.now(UTC)
    raw = (distribution / 'mobility/manifest.json').read_bytes()
    theory = json.loads(raw)
    generation = theory.get('generationId')
    if theory.get('schemaVersion') != 2 or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', generation or '') or not re.fullmatch(r'[a-f0-9]{64}', theory.get('sourceSha256', '')) or dt.datetime.fromisoformat(theory['validUntilUtc'].replace('Z', '+00:00')) <= now:
        raise ValueError('VALID_THEORETICAL_MANIFEST_REQUIRED')
    root = distribution / 'realtime-identities'
    root.mkdir(parents=True, exist_ok=True)
    ready, warnings = False, []
    try:
        index, packets = builder(archive, distribution / 'mobility', lines or LINES)
        if index['generationId'] != generation:
            raise ValueError('TIMETABLE_GENERATION_MISMATCH')
        publish_candidate(index, packets, root)
        ready = True
    except Exception as error:
        code = str(error) if str(error) in ERRORS else 'GTFS_ARCHIVE_UNAVAILABLE' if isinstance(error, FileNotFoundError) else 'IDENTITY_INDEX_NOT_READY'
        warnings.append(code)
    candidates = sorted(live_generations(root, now), key=lambda g: (g['id'] == generation and ready, g['from'], g['until'], g['id']), reverse=True)
    for old in candidates[2:]:
        shutil.rmtree(old['folder'])
    status = {'schemaVersion': 1, 'algorithmVersion': 1, 'generationId': generation, 'sourceSha256': theory['sourceSha256'], 'checkedAtUtc': now.isoformat(), 'indexReady': ready, 'activation': False, 'scope': lines or LINES, 'warnings': warnings, 'generations': [{'generationId': g['id'], 'validFromUtc': g['from'].isoformat(), 'validUntilUtc': g['until'].isoformat(), 'manifest': g['id'] + '/manifest.json', 'sha256': g['sha256']} for g in candidates[:2]], 'limitations': ['GTFS identity scope is not verified realtime coverage.', 'Only the private server can qualify and enable a service.']}
    temporary = root / '.status.tmp'
    temporary.write_bytes(encoded(status))
    temporary.replace(root / 'status.json')
    return status


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True, type=pathlib.Path)
    parser.add_argument('--distribution', type=pathlib.Path, default=pathlib.Path('distribution'))
    args = parser.parse_args()
    result = prepare(args.archive, args.distribution)
    print(json.dumps({k: result[k] for k in ['generationId', 'indexReady', 'activation', 'warnings']}))
