"""Publish complete GTFS calls for the exact trips exposed by the dated timetables.

SQLite spools the raw calls: memory is bounded by one line, not the regional feed.
Existing timetable bytes are not rewritten; their SHA binds each dataset manifest.
"""
import collections, datetime as dt, gzip, hashlib, json, pathlib, shutil, sqlite3, tempfile, zipfile
from build_gtfs import records, service_day
from build_timetable import active_services, instant, seconds

VERSION = 'trip-calls-1-gzip'
LIMIT = 1024 * 1024

def encoded(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True) + '\n').encode()

def sha(value):
    return hashlib.sha256(value).hexdigest()

def descriptor(path, root):
    raw = path.read_bytes()
    return {'file': path.relative_to(root).as_posix(), 'bytes': len(raw), 'sha256': sha(raw)}

def write(path, value, limit=LIMIT):
    raw = encoded(value)
    if len(raw) > limit:
        raise ValueError('File budget exceeded: ' + str(path))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)

def course(rows, trip, dates, stops):
    """Normalize without omitting terminal, drop-off-only, or missing-time calls."""
    rows = sorted(rows, key=lambda r: r[0])
    if len(rows) < 2 or len({r[0] for r in rows}) != len(rows):
        raise ValueError('Invalid stop sequence')
    reasons = set()
    last = None
    for seq, sid, arr, dep, pickup, drop, point in rows:
        if sid not in stops:
            raise ValueError('Unknown stop ' + sid)
        if pickup not in ('0', '1', '2', '3') or drop not in ('0', '1', '2', '3'):
            raise ValueError('Unsupported boarding rule')
        if point not in (None, '0', '1'):
            raise ValueError('Invalid timepoint')
        if arr is not None and dep is not None and arr > dep:
            reasons.add('non_monotonic_time')
        for t in (arr, dep):
            if t is not None:
                if last is not None and t < last:
                    reasons.add('non_monotonic_time')
                last = t
        if arr is None or dep is None:
            reasons.add('missing_time')
    pattern = [[r[0], r[1], r[4], r[5]] for r in rows]
    times = [[r[2], r[3], r[6]] for r in rows]
    available = 'non_monotonic_time' not in reasons
    return pattern, times, {
        'patternRef': sha(encoded(pattern)), 'timeTemplateRef': sha(encoded(times)),
        'serviceDates': sorted(dates), 'gtfsDirectionId': trip.get('direction_id') or None,
        'headsign': trip.get('trip_headsign') or None,
        'terminusStopId': rows[-1][1], 'terminusStopSequence': rows[-1][0],
        'availability': {'state': 'available' if available else 'unavailable',
                         'pathComplete': True, 'timesComplete': 'missing_time' not in reasons,
                         'terminalArrivalKnown': rows[-1][2] is not None,
                         'reasonCodes': sorted(reasons)},
    }

def partition_payload(generation, line, refs, courses, patterns, templates, stops, bases):
    cs = {ref: courses[ref] for ref in refs}
    ps = {c['patternRef']: patterns[c['patternRef']] for c in cs.values()}
    ts = {c['timeTemplateRef']: templates[c['timeTemplateRef']] for c in cs.values()}
    ids = {r[1] for p in ps.values() for r in p}
    dates = {date for c in cs.values() for date in c['serviceDates']}
    return {'schemaVersion': 1, 'generationId': generation, 'lineId': line,
            'courses': cs, 'patterns': ps, 'timeTemplates': ts,
            'stops': {sid: stops[sid] for sid in sorted(ids)},
            'serviceDays': {d: {'baseUtcMs': bases[d]} for d in sorted(dates)}}

def emit_partitions(folder, root, generation, line, courses, patterns, templates, stops, bases):
    result = {}
    def emit(prefix, refs):
        payload = partition_payload(generation, line, refs, courses, patterns, templates, stops, bases)
        if len(encoded(payload)) > LIMIT:
            if len(refs) < 2 or len(prefix) >= 16:
                raise ValueError('A single course exceeds partition budget')
            groups = collections.defaultdict(list)
            for ref in refs:
                groups[ref[len(prefix)]].append(ref)
            for key, values in sorted(groups.items()):
                emit(prefix + key, values)
            return
        path = folder / ((prefix or 'all') + '.bin')
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = encoded(payload)
        path.write_bytes(gzip.compress(raw, compresslevel=6, mtime=0))
        result[prefix] = {**descriptor(path, root), 'encoding': 'gzip-json', 'decodedBytes': len(raw), 'courses': len(refs)}
    emit('', sorted(courses))
    return result

def build(archive, distribution=pathlib.Path('distribution')):
    distribution = pathlib.Path(distribution)
    digest = hashlib.file_digest(open(archive, 'rb'), 'sha256').hexdigest()
    manifests = {}
    selected = {}
    line_info = {}
    for kind, folder in [('metro', 'timetable'), ('regional', 'mobility')]:
        path = distribution / folder / 'manifest.json'
        m = json.loads(path.read_bytes())
        if m['sourceSha256'] != digest:
            raise ValueError('GTFS does not match ' + folder + ': regenerate transport first')
        manifests[folder] = m
        for line, file in m['lines'].items():
            raw = (path.parent / file['file']).read_bytes()
            if sha(raw) != file['sha256']:
                raise ValueError('Timetable hash mismatch')
            package = json.loads(raw)
            dates = collections.defaultdict(set)
            for rows in package['groups'].values():
                for row in rows:
                    dates[row[2]].add(row[1])
            if dates:
                selected[line] = dates
                line_info[line] = {'transportKind': kind, 'networkSha256': m['networkSha256'],
                                   'timetablePackageSha256': file['sha256'], 'transportFolder': folder,
                                   'transportFile': file['file']}
    first = manifests['timetable']
    if any(m['validFromUtc'] != first['validFromUtc'] or m['validUntilUtc'] != first['validUntilUtc'] for m in manifests.values()):
        raise ValueError('Incompatible transport validity')
    # Transport generators replace their manifests; recover the previous immutable
    # dataset by its bindings rather than relying on a pointer they just removed.
    candidates = sorted((distribution / 'trip-calls').glob('*/manifest.json'), reverse=True)
    for previous_path in candidates:
        raw = previous_path.read_bytes()
        old = json.loads(raw)
        same = old.get('exporterVersion') == VERSION and old.get('sourceSha256') == digest and old.get('selectionValidFromUtc') == first['validFromUtc'] and old.get('selectionValidUntilUtc') == first['validUntilUtc'] and set(old['lines']) == set(line_info)
        same = same and all(all(old['lines'][line].get(k) == v for k, v in info.items()) for line, info in line_info.items())
        if same:
            reference = {**descriptor(previous_path, distribution), 'generationId': old['generationId']}
            for folder, m in manifests.items():
                m['tripCallsManifest'] = reference
                m['generationId'] = old['generationId']
                (distribution / folder / 'manifest.json').write_bytes(encoded(m))
            print('TRIP_CALLS_REUSED', old['generationId'], flush=True)
            return old
    generation = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '-' + digest[:12]
    target = distribution / 'trip-calls' / generation
    target.mkdir(parents=True)
    qa = {'lines': 0, 'courses': 0, 'complete': 0, 'partial': 0, 'unavailable': 0,
          'missingTerminalArrival': 0, 'calls': 0, 'rowsRead': 0, 'modes': {}, 'reineBlanche': [], 'lastCallUtcMs': 0}
    published = {}
    with zipfile.ZipFile(archive) as z, tempfile.TemporaryDirectory() as temp:
        stop_rows = {r['stop_id']: r for r in records(z, 'stops')}
        stops = {sid: {'name': r['stop_name'], 'parent': r.get('parent_station') or None,
                       'platform': r.get('platform_code') or None} for sid, r in stop_rows.items()}
        qa['reineBlanche'] = [{'stopId': sid, 'name': r['stop_name']} for sid, r in stop_rows.items() if r['stop_name'].casefold() == 'reine blanche']
        trips = {}
        tid_lookup = {}
        all_dates = set()
        for t in records(z, 'trips'):
            line = t['route_id']
            if line not in selected:
                continue
            ref = sha(t['trip_id'].encode())[:16]
            if ref not in selected[line]:
                continue
            if (line, ref) in trips:
                raise ValueError('Trip reference collision')
            trips[line, ref] = t
            tid_lookup[t['trip_id']] = (line, ref)
            all_dates.update(selected[line][ref])
        if len(trips) != sum(map(len, selected.values())):
            raise ValueError('Published trip missing from GTFS')
        calendars = list(records(z, 'calendar')) if 'calendar.txt' in z.namelist() else []
        exceptions = list(records(z, 'calendar_dates')) if 'calendar_dates.txt' in z.namelist() else []
        active = {d: active_services(calendars, exceptions, dt.date.fromisoformat(d)) for d in all_dates}
        bases = {d: instant(dt.date.fromisoformat(d), '00:00:00') * 1000 for d in all_dates}
        frequencies = {r['trip_id'] for r in records(z, 'frequencies')} if 'frequencies.txt' in z.namelist() else set()
        if frequencies & tid_lookup.keys():
            raise ValueError('Frequency trip unexpectedly exposed as dated departure')
        db = sqlite3.connect(pathlib.Path(temp) / 'calls.sqlite')
        db.execute('CREATE TABLE calls(line TEXT, ref TEXT, seq INTEGER, stop TEXT, arr INTEGER, dep INTEGER, pickup TEXT, dropoff TEXT, point TEXT)')
        batch = []
        for r in records(z, 'stop_times'):
            qa['rowsRead'] += 1
            pair = tid_lookup.get(r['trip_id'])
            if pair is None:
                continue
            if r.get('start_pickup_drop_off_window') or r.get('end_pickup_drop_off_window'):
                raise ValueError('Unsupported on-demand trip exposed in dated departures')
            batch.append((*pair, int(r['stop_sequence']), r['stop_id'],
                          seconds(r['arrival_time']) if r.get('arrival_time') else None,
                          seconds(r['departure_time']) if r.get('departure_time') else None,
                          r.get('pickup_type') or '0', r.get('drop_off_type') or '0', r.get('timepoint') or None))
            if len(batch) >= 25000:
                db.executemany('INSERT INTO calls VALUES (?,?,?,?,?,?,?,?,?)', batch)
                batch.clear()
        db.executemany('INSERT INTO calls VALUES (?,?,?,?,?,?,?,?,?)', batch)
        db.execute('CREATE INDEX by_trip ON calls(line,ref,seq)')
        db.commit()
        regional = json.loads((distribution / 'mobility' / 'index.json').read_bytes())
        metro = json.loads((distribution / 'network.json').read_bytes())
        modes = {l['route_id']: l.get('mode', 'metro') for l in regional['lines'] + metro['lines']}
        for line in sorted(selected):
            courses, patterns, templates = {}, {}, {}
            for ref, dates in selected[line].items():
                trip = trips[line, ref]
                if any(trip['service_id'] not in active[d] for d in dates):
                    raise ValueError('Trip exposed on an inactive service date')
                rows = list(db.execute('SELECT seq,stop,arr,dep,pickup,dropoff,point FROM calls WHERE line=? AND ref=? ORDER BY seq', (line, ref)))
                p, times, c = course(rows, trip, dates, stops)
                courses[ref] = c; patterns[c['patternRef']] = p; templates[c['timeTemplateRef']] = times
                state = 'unavailable' if c['availability']['state'] == 'unavailable' else 'complete' if c['availability']['timesComplete'] else 'partial'
                qa[state] += 1; qa['courses'] += 1; qa['calls'] += len(rows)
                qa['missingTerminalArrival'] += not c['availability']['terminalArrivalKnown']
                last_time = max((v for t in times for v in t[:2] if v is not None), default=0)
                qa['lastCallUtcMs'] = max(qa['lastCallUtcMs'], max(bases[d] + last_time * 1000 for d in dates))
                mode = modes[line]
                stats = qa['modes'].setdefault(mode, {'courses': 0, 'complete': 0, 'partial': 0, 'unavailable': 0})
                stats['courses'] += 1; stats[state] += 1
            folder = target / line.replace(':', '-')
            partitions = emit_partitions(folder, distribution, generation, line, courses, patterns, templates, stops, bases)
            info = line_info[line]
            index = {'schemaVersion': 1, 'generationId': generation, 'lineId': line,
                     **info, 'mode': modes[line], 'partitions': partitions}
            write(folder / 'index.json', index, 128 * 1024)
            published[line] = {**info, **descriptor(folder / 'index.json', distribution)}
            qa['lines'] += 1
        db.close()
    manifest = {'schemaVersion': 1, 'kind': 'trip-calls', 'quality': 'timetable',
                'generationId': generation, 'generatedAtUtc': dt.datetime.now(dt.timezone.utc).isoformat(),
                'timezone': 'Europe/Paris', 'sourceSha256': digest, 'exporterVersion': VERSION,
                'selectionValidFromUtc': first['validFromUtc'], 'selectionValidUntilUtc': first['validUntilUtc'],
                'source': first['source'], 'attribution': manifests['mobility']['attribution'],
                'license_url': manifests['mobility']['license_url'], 'lines': published, 'qa': qa}
    write(target / 'manifest.json', manifest)
    reference = {**descriptor(target / 'manifest.json', distribution), 'generationId': generation}
    for folder, m in manifests.items():
        m['tripCallsManifest'] = reference
        m['generationId'] = generation
        (distribution / folder / 'manifest.json').write_bytes(encoded(m))
    prune(distribution)
    print('TRIP_CALLS_BUILT', json.dumps({'generation': generation, **qa}, ensure_ascii=False), flush=True)
    return manifest

def prune(distribution):
    active = {json.loads((distribution / folder / 'manifest.json').read_bytes())['tripCallsManifest']['generationId'] for folder in ('timetable', 'mobility')}
    now = dt.datetime.now(dt.timezone.utc).timestamp() * 1000
    for path in (distribution / 'trip-calls').iterdir():
        if not path.is_dir() or path.name in active:
            continue
        file = path / 'manifest.json'
        if not file.is_file():
            continue
        old = json.loads(file.read_bytes())
        until = dt.datetime.fromisoformat(old['selectionValidUntilUtc']).timestamp() * 1000
        last = old.get('qa', {}).get('lastCallUtcMs', until)
        if now > max(until, last) + 86400000:
            shutil.rmtree(path)

if __name__ == '__main__':
    build(pathlib.Path('.cache') / ('gtfs-' + str(service_day()) + '.zip'))
