"""Build immutable GTFS identity packets, without PRIM access or activation decisions.

Only visits already present in the hash-verified dated timetable are indexed.
The exact GTFS archive supplies aliases, calendars and stop occurrences; a time
proximity heuristic is never used. Output remains a candidate until publication.
"""
import argparse
import csv
import datetime as dt
import gzip
import hashlib
import io
import json
import pathlib
import re
import shutil
import tempfile
import zipfile
from build_timetable import active_services, instant, trip_direction

MAX_PACKET = 20 * 1024 * 1024
MAX_COMPRESSED = 2 * 1024 * 1024
MAX_TOTAL = 64 * 1024 * 1024
MAX_VISITS = 200000


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n').encode()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def timetable_binding(manifest, lines):
    scope = sorted(lines)
    basis = {key: manifest[key] for key in ['generationId', 'sourceSha256', 'validFromUtc', 'validUntilUtc']}
    basis['scope'] = scope
    basis['lines'] = {line: {key: manifest['lines'][line][key] for key in ['file', 'bytes', 'sha256']} for line in scope}
    return digest(encoded(basis))


def records(archive, name):
    if name not in archive.namelist():
        return
    with archive.open(name) as stream:
        yield from csv.DictReader(io.TextIOWrapper(stream, encoding='utf-8-sig'))


def read_package(distribution, manifest, line):
    meta = manifest['lines'][line]
    if not re.fullmatch(r'[A-Za-z0-9_-]+\.json', meta['file']):
        raise ValueError('INVALID_TIMETABLE_PATH')
    raw = (distribution / meta['file']).read_bytes()
    if len(raw) > MAX_PACKET or len(raw) != meta['bytes'] or digest(raw) != meta['sha256']:
        raise ValueError('TIMETABLE_HASH_MISMATCH')
    data = json.loads(raw)
    if data.get('generationId', manifest['generationId']) != manifest['generationId'] or data.get('lineId') != line or data.get('sourceSha256', manifest['sourceSha256']) != manifest['sourceSha256'] or any(data.get(k) != manifest[k] for k in ['validFromUtc', 'validUntilUtc']):
        raise ValueError('TIMETABLE_GENERATION_MISMATCH')
    return data


def build(archive_path, distribution, lines, *, trip_scope=None):
    if trip_scope and trip_scope[0] not in lines:
        raise ValueError('INVALID_IDENTITY_SCOPE')
    manifest_raw = (distribution / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_raw)
    generation = manifest.get('generationId', '')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', generation) or not lines or len(set(lines)) != len(lines) or len(lines) > 8 or any(not re.fullmatch(r'IDFM:[A-Za-z0-9_]+', line) or line not in manifest['lines'] for line in lines):
        raise ValueError('INVALID_IDENTITY_SCOPE')
    if not re.fullmatch(r'[a-f0-9]{64}', manifest['sourceSha256']) or any(not re.fullmatch(r'\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)', manifest[k]) for k in ['validFromUtc', 'validUntilUtc']):
        raise ValueError('INVALID_GENERATION_METADATA')
    start = dt.datetime.fromisoformat(manifest['validFromUtc']).timestamp()
    end = dt.datetime.fromisoformat(manifest['validUntilUtc']).timestamp()
    if end <= start:
        raise ValueError('INVALID_GENERATION_METADATA')
    with archive_path.open('rb') as stream:
        source_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    if source_hash != manifest['sourceSha256']:
        raise ValueError('GTFS_SOURCE_HASH_MISMATCH')
    packages = {line: read_package(distribution, manifest, line) for line in sorted(lines)}
    # Retain only trips occurring in the exact published generation, before any future-time filtering.
    wanted = {row[2] for p in packages.values() for rows in p['groups'].values() for row in rows}
    with zipfile.ZipFile(archive_path) as archive:
        trips, refs = {}, {}
        for row in records(archive, 'trips.txt'):
            if row['route_id'] not in packages:
                continue
            ref = digest(row['trip_id'].encode())[:16]
            if ref in wanted:
                if ref in refs or row['trip_id'] in trips:
                    raise ValueError('TRIP_IDENTITY_COLLISION')
                trips[row['trip_id']] = row
                refs[ref] = row['trip_id']
        if set(refs) != wanted:
            raise ValueError('PUBLISHED_TRIP_NOT_IN_ARCHIVE')
        aliases = {tid: {'sourceAliases': set(), 'externalCodes': set()} for tid in trips}
        owners = {}
        for row in records(archive, 'object_codes_extension.txt'):
            tid = row['object_id']
            if row['object_type'] != 'trip' or tid not in trips or row['object_system'] not in ['source', 'external']:
                continue
            code = row['object_code']
            if not code or len(code) > 512:
                raise ValueError('INVALID_PUBLISHER_ALIAS')
            key = (trips[tid]['route_id'], row['object_system'], code)
            if key in owners and owners[key] != tid:
                raise ValueError('AMBIGUOUS_PUBLISHER_ALIAS')
            owners[key] = tid
            aliases[tid]['sourceAliases' if row['object_system'] == 'source' else 'externalCodes'].add(code)
        stop_rows = {tid: {} for tid in trips}
        for row in records(archive, 'stop_times.txt'):
            if row['trip_id'] not in trips:
                continue
            seq = int(row['stop_sequence'])
            if seq < 0 or seq in stop_rows[row['trip_id']]:
                raise ValueError('DUPLICATE_STOP_SEQUENCE')
            stop_rows[row['trip_id']][seq] = row
        stops = {row['stop_id']: row for row in records(archive, 'stops.txt')}
        calendars = list(records(archive, 'calendar.txt'))
        exceptions = list(records(archive, 'calendar_dates.txt'))
        frequency_trips = {row['trip_id'] for row in records(archive, 'frequencies.txt')}
    active = {}
    outputs, total = {}, 0
    for line, package in packages.items():
        bindings, identities, used_stops, seen = [], {}, set(), set()
        for group, values in sorted(package['groups'].items()):
            stop, grouped_line, destination = json.loads(group)
            if grouped_line != line:
                raise ValueError('LINE_CONFLICT')
            for row in values:
                stamp, date, ref, sequence = row[:4]
                tid = refs[ref]
                trip, visits = trips[tid], stop_rows[tid]
                occurrence = visits.get(sequence)
                day = dt.date.fromisoformat(date)
                if date not in active:
                    active[date] = active_services(calendars, exceptions, day)
                if trip['route_id'] != line or tid in frequency_trips or trip['service_id'] not in active[date] or not occurrence or occurrence['stop_id'] != stop or occurrence.get('pickup_type', '') not in ['', '0'] or sequence == max(visits) or visits[max(visits)]['stop_id'] != destination or not occurrence.get('departure_time') or instant(day, occurrence['departure_time']) != stamp:
                    raise ValueError('CANONICAL_VISIT_CONFLICT')
                if package.get('directionVersion') == 1 and package.get('tripDirections', {}).get(ref, 'missing') != trip_direction(trip):
                    raise ValueError('GTFS_DIRECTION_CONFLICT')
                if not start <= stamp < end:
                    raise ValueError('VISIT_OUTSIDE_GENERATION')
                key = (date, ref, sequence)
                if key in seen:
                    raise ValueError('DUPLICATE_CANONICAL_VISIT')
                seen.add(key)
                identities[ref] = {'rawTripId': tid, 'tripRef': ref, 'gtfsDirectionId': trip_direction(trip), 'destinationStopId': destination, **{k: sorted(v) for k, v in aliases[tid].items()}}
                used_stops.update([stop, destination])
                bindings.append([stamp, date, ref, sequence, stop, destination])
        if len(bindings) > MAX_VISITS:
            raise ValueError('IDENTITY_ROW_LIMIT')
        if trip_scope and line == trip_scope[0]:
            _, scoped_stop, scoped_destination = trip_scope
            selected = {row[2] for row in bindings
                        if row[4] == scoped_stop and row[5] == scoped_destination}
            if not selected:
                raise ValueError('NO_VISITS_FOR_SCOPED_SERVICE')
            # Keep every visit of a selected trip, including repeated calls.
            bindings = [row for row in bindings if row[2] in selected]
            identities = {ref: trip for ref, trip in identities.items() if ref in selected}
        # Preserve official point/parent relations without inventing provider aliases.
        pending = list(used_stops)
        selected_stops = {}
        while pending:
            stop = pending.pop()
            if stop in selected_stops:
                continue
            if stop not in stops:
                raise ValueError('MISSING_OFFICIAL_STOP')
            data = stops[stop]
            selected_stops[stop] = {'parentStation': data.get('parent_station', ''), 'locationType': data.get('location_type', ''), 'platformCode': data.get('platform_code', '')}
            if data.get('parent_station'):
                pending.append(data['parent_station'])
        payload = {'schemaVersion': 1, 'algorithmVersion': 1, 'kind': 'gtfs-visit-identities', 'generationId': generation, 'sourceSha256': source_hash, 'lineId': line, 'validFromUtc': manifest['validFromUtc'], 'validUntilUtc': manifest['validUntilUtc'], 'trips': identities, 'stops': selected_stops, 'visitFields': ['scheduledEpochSeconds', 'serviceDate', 'tripRef', 'stopSequence', 'stopId', 'destinationStopId'], 'visits': sorted(bindings)}
        raw = encoded(payload)
        compressed = gzip.compress(raw, compresslevel=9, mtime=0)
        total += len(raw)
        if len(raw) > MAX_PACKET or len(compressed) > MAX_COMPRESSED or total > MAX_TOTAL:
            raise ValueError('IDENTITY_SIZE_LIMIT')
        name = line.replace(':', '-') + '.json.gz'
        outputs[name] = (raw, compressed, len(identities), len(bindings))
    index = {'schemaVersion': 1, 'algorithmVersion': 1, 'kind': 'gtfs-identity-manifest', 'generationId': generation, 'sourceSha256': source_hash, 'timetableManifestSha256': digest(manifest_raw), 'validFromUtc': manifest['validFromUtc'], 'validUntilUtc': manifest['validUntilUtc'], 'attribution': manifest.get('attribution'), 'license_url': manifest.get('license_url'), 'scope': sorted(lines), 'activation': False, 'packets': {name: {'file': name, 'sha256': digest(compressed), 'bytes': len(compressed), 'decodedSha256': digest(raw), 'decodedBytes': len(raw), 'trips': trips, 'visits': visits} for name, (raw, compressed, trips, visits) in sorted(outputs.items())}}
    index.update(timetableBindingVersion=1, timetableBindingSha256=timetable_binding(manifest, lines))
    return index, {name: value[1] for name, value in outputs.items()}


def publish_candidate(index, packets, output):
    """Directory rename makes a candidate complete or absent; generations are immutable."""
    output.mkdir(parents=True, exist_ok=True)
    target = output / index['generationId']
    if target.exists():
        if (target / 'manifest.json').read_bytes() == encoded(index) and all((target / name).read_bytes() == data for name, data in packets.items()):
            return target
        previous = json.loads((target / 'manifest.json').read_bytes())
        if index.get('timetableBindingVersion') == 1 and previous.get('timetableBindingVersion') == 1 and {k: v for k, v in previous.items() if k != 'timetableManifestSha256'} == {k: v for k, v in index.items() if k != 'timetableManifestSha256'} and all((target / name).read_bytes() == data for name, data in packets.items()):
            return target
        raise ValueError('GENERATION_ALREADY_EXISTS')
    temporary = pathlib.Path(tempfile.mkdtemp(prefix='.candidate-', dir=output))
    try:
        for name, data in packets.items():
            (temporary / name).write_bytes(data)
        (temporary / 'manifest.json').write_bytes(encoded(index))
        temporary.rename(target)
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)
    return target


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True, type=pathlib.Path)
    parser.add_argument('--timetable', required=True, type=pathlib.Path)
    parser.add_argument('--line', required=True, action='append')
    parser.add_argument('--output', required=True, type=pathlib.Path)
    args = parser.parse_args()
    index, packets = build(args.archive, args.timetable, args.line)
    target = publish_candidate(index, packets, args.output)
    print(json.dumps({'generationId': index['generationId'], 'scope': index['scope'], 'packets': index['packets'], 'activation': False, 'output': str(target)}))
