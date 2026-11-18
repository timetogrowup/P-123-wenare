"""Exhaustively bind every published departure to a complete GTFS call occurrence."""
import json, pathlib, hashlib, gzip
from build_trip_calls import LIMIT

def read(root, entry, limit=LIMIT):
    path = pathlib.PurePosixPath(entry['file'])
    if path.is_absolute() or '..' in path.parts or not entry['file'].startswith('trip-calls/'):
        raise ValueError('Unsafe trip-calls path')
    raw = (root / path).read_bytes()
    if len(raw) != entry['bytes'] or len(raw) > limit or hashlib.sha256(raw).hexdigest() != entry['sha256']:
        raise ValueError('Trip-calls integrity failure: ' + str(path))
    if entry.get('encoding') == 'gzip-json':
        raw = gzip.decompress(raw)
        if len(raw) != entry['decodedBytes'] or len(raw) > limit:
            raise ValueError('Decoded file budget exceeded')
    return json.loads(raw)

def validate(root=pathlib.Path('distribution')):
    root = pathlib.Path(root)
    transport = {folder: json.loads((root / folder / 'manifest.json').read_bytes()) for folder in ('timetable', 'mobility')}
    ref = transport['timetable']['tripCallsManifest']
    if transport['mobility']['tripCallsManifest'] != ref:
        raise ValueError('Transport generations differ')
    m = read(root, ref)
    if m['generationId'] != ref['generationId'] or m['schemaVersion'] != 1:
        raise ValueError('Generation mismatch')
    checks = courses = 0
    for line, desc in m['lines'].items():
        tm = transport[desc['transportFolder']]
        item = tm['lines'][line]
        if tm['sourceSha256'] != m['sourceSha256'] or desc['networkSha256'] != tm['networkSha256'] or desc['timetablePackageSha256'] != item['sha256']:
            raise ValueError('Source binding mismatch')
        index = read(root, desc, 128 * 1024)
        if index['lineId'] != line or index['generationId'] != m['generationId']:
            raise ValueError('Line identity mismatch')
        prefixes = sorted(index['partitions'])
        if any(a != b and b.startswith(a) for a in prefixes for b in prefixes):
            raise ValueError('Overlapping partitions')
        by_trip = {}
        for prefix, entry in index['partitions'].items():
            p = read(root, entry)
            if p['generationId'] != m['generationId'] or p['lineId'] != line:
                raise ValueError('Partition identity mismatch')
            for trip, c in p['courses'].items():
                if not trip.startswith(prefix) or trip in by_trip:
                    raise ValueError('Partition membership failure')
                pattern = p['patterns'][c['patternRef']]
                times = p['timeTemplates'][c['timeTemplateRef']]
                if len(pattern) != len(times) or len(pattern) < 2 or len({r[0] for r in pattern}) != len(pattern):
                    raise ValueError('Invalid call sequence')
                if pattern != sorted(pattern, key=lambda r: r[0]) or pattern[-1][1] != c['terminusStopId'] or pattern[-1][0] != c['terminusStopSequence']:
                    raise ValueError('Terminus or order mismatch')
                if any(r[1] not in p['stops'] for r in pattern):
                    raise ValueError('Unresolved stop')
                by_trip[trip] = (p, c, {row[0]: (row, t) for row, t in zip(pattern, times)})
                courses += 1
        raw = (root / desc['transportFolder'] / item['file']).read_bytes()
        if hashlib.sha256(raw).hexdigest() != item['sha256']:
            raise ValueError('Departure package changed')
        package = json.loads(raw)
        for key, rows in package['groups'].items():
            origin, expected_line, terminus = json.loads(key)
            if expected_line != line:
                raise ValueError('Invalid departure line')
            for event in rows:
                p, c, calls = by_trip[event[2]]
                call, times = calls[event[3]]
                if event[1] not in c['serviceDates'] or call[1] != origin or c['terminusStopId'] != terminus:
                    raise ValueError('Departure occurrence mismatch')
                if times[1] is None or p['serviceDays'][event[1]]['baseUtcMs'] + times[1] * 1000 != event[0] * 1000:
                    raise ValueError('Departure time mismatch')
                parent = lambda sid: p['stops'][sid].get('parent') or sid
                onward = [row for row in p['patterns'][c['patternRef']] if row[0] > event[3] and not (row[2] == row[3] == '1') and parent(row[1]) != parent(origin)]
                if not onward or onward[0][1] != event[4] or onward[0][0] != event[5]:
                    raise ValueError('Next useful stop mismatch')
                if c['gtfsDirectionId'] != package.get('tripDirections', {}).get(event[2]):
                    raise ValueError('Direction mismatch')
                checks += 1
    if courses != m['qa']['courses']:
        raise ValueError('Incomplete course count')
    print('TRIP_CALLS_VALID', json.dumps({'departuresChecked': checks, 'courses': courses, 'lines': len(m['lines'])}), flush=True)
    return {'departuresChecked': checks, 'courses': courses, 'lines': len(m['lines'])}

if __name__ == '__main__':
    validate()
