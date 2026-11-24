import copy
import csv
import datetime as dt
import gzip
import hashlib
import io
import json
import pathlib
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
import build_realtime_identities as identities
from build_timetable import instant


class IdentityIndexTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.archive = self.root / 'gtfs.zip'
        self.distribution = self.root / 'mobility'
        self.distribution.mkdir()
        self.day = dt.date(2026, 11, 23)
        self.tid = 'IDFM:KSOE:123'
        self.ref = hashlib.sha256(self.tid.encode()).hexdigest()[:16]
        self.tables = {
            'trips': [{'route_id': 'IDFM:C02565', 'service_id': 'weekday', 'trip_id': self.tid, 'direction_id': '0'}],
            'calendar_dates': [{'service_id': 'weekday', 'date': '20261123', 'exception_type': '1'}],
            'object_codes_extension': [
                {'object_type': 'trip', 'object_id': self.tid, 'object_system': 'source', 'object_code': 'KSOE:ServiceJourney:123:LOC'},
                {'object_type': 'trip', 'object_id': self.tid, 'object_system': 'external', 'object_code': '123'}],
            'stop_times': [
                {'trip_id': self.tid, 'stop_sequence': '5', 'stop_id': 'IDFM:23052', 'departure_time': '24:05:00', 'pickup_type': '0'},
                {'trip_id': self.tid, 'stop_sequence': '8', 'stop_id': 'IDFM:13497', 'departure_time': '24:15:00', 'pickup_type': '1'}],
            'stops': [
                {'stop_id': 'IDFM:23052', 'parent_station': 'IDFM:64931', 'location_type': '0', 'platform_code': 'A'},
                {'stop_id': 'IDFM:13497', 'parent_station': '', 'location_type': '0', 'platform_code': ''},
                {'stop_id': 'IDFM:64931', 'parent_station': '', 'location_type': '1', 'platform_code': ''}]
        }
        self.package = {'schemaVersion': 2, 'lineId': 'IDFM:C02565', 'validFromUtc': '2026-11-22T23:00:00+00:00', 'validUntilUtc': '2026-11-26T23:00:00+00:00', 'groups': {'["IDFM:23052","IDFM:C02565","IDFM:13497"]': [[instant(self.day, '24:05:00'), str(self.day), self.ref, 5, 'IDFM:13497', 8]]}}

    def tearDown(self):
        self.tmp.cleanup()

    def write(self):
        with zipfile.ZipFile(self.archive, 'w') as archive:
            for name, rows in self.tables.items():
                stream = io.StringIO()
                writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
                writer.writeheader(); writer.writerows(rows)
                archive.writestr(name + '.txt', stream.getvalue())
        raw = identities.encoded(self.package)
        (self.distribution / 'IDFM-C02565.json').write_bytes(raw)
        self.manifest = {'schemaVersion': 2, 'generationId': 'generation-fixture-1', 'sourceSha256': identities.digest(self.archive.read_bytes()), 'validFromUtc': self.package['validFromUtc'], 'validUntilUtc': self.package['validUntilUtc'], 'attribution': 'GTFS fixture', 'license_url': 'https://example.test/license', 'lines': {'IDFM:C02565': {'file': 'IDFM-C02565.json', 'sha256': identities.digest(raw), 'bytes': len(raw)}}}
        (self.distribution / 'manifest.json').write_bytes(identities.encoded(self.manifest))

    def build(self):
        return identities.build(self.archive, self.distribution, ['IDFM:C02565'])

    def payload(self):
        index, packets = self.build()
        return index, json.loads(gzip.decompress(next(iter(packets.values()))))

    def test_midnight_keeps_original_service_date_and_stop_sequence(self):
        self.write(); index, data = self.payload()
        self.assertFalse(index['activation'])
        self.assertEqual(data['visits'][0], [instant(self.day, '24:05:00'), '2026-11-23', self.ref, 5, 'IDFM:23052', 'IDFM:13497'])
        self.assertEqual(data['trips'][self.ref]['sourceAliases'], ['KSOE:ServiceJourney:123:LOC'])
        self.assertEqual(data['stops']['IDFM:23052']['parentStation'], 'IDFM:64931')

    def test_deterministic_packets_and_immutable_atomic_candidate(self):
        self.write(); index, packets = self.build()
        self.assertEqual((index, packets), self.build())
        target = identities.publish_candidate(index, packets, self.root / 'output')
        self.assertEqual(target, identities.publish_candidate(index, packets, self.root / 'output'))
        changed = copy.deepcopy(index); changed['activation'] = True
        with self.assertRaisesRegex(ValueError, 'GENERATION_ALREADY_EXISTS'):
            identities.publish_candidate(changed, packets, self.root / 'output')
        self.assertEqual(list(target.parent.glob('.candidate-*')), [])

    def test_exact_archive_and_packet_hashes_required(self):
        self.write(); self.archive.write_bytes(self.archive.read_bytes() + b'x')
        with self.assertRaisesRegex(ValueError, 'GTFS_SOURCE_HASH_MISMATCH'): self.build()
        self.write(); (self.distribution / 'IDFM-C02565.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'TIMETABLE_HASH_MISMATCH'): self.build()

    def test_declared_generation_conflict_rejected(self):
        self.package['generationId'] = 'another-generation'; self.write()
        with self.assertRaisesRegex(ValueError, 'TIMETABLE_GENERATION_MISMATCH'): self.build()

    def test_inactive_calendar_wrong_time_or_conditional_boarding_rejected(self):
        original = copy.deepcopy(self.tables)
        for mutate in ['calendar', 'time', 'boarding']:
            self.tables = copy.deepcopy(original)
            if mutate == 'calendar': self.tables['calendar_dates'][0]['exception_type'] = '2'
            if mutate == 'time': self.tables['stop_times'][0]['departure_time'] = '24:06:00'
            if mutate == 'boarding': self.tables['stop_times'][0]['pickup_type'] = '2'
            self.write()
            with self.assertRaisesRegex(ValueError, 'CANONICAL_VISIT_CONFLICT'): self.build()

    def test_loop_occurrences_remain_distinct_without_guessing_visit_number(self):
        self.tables['stop_times'].insert(1, {'trip_id': self.tid, 'stop_sequence': '6', 'stop_id': 'IDFM:23052', 'departure_time': '24:07:00', 'pickup_type': '0'})
        group = next(iter(self.package['groups'].values()))
        group.append([instant(self.day, '24:07:00'), str(self.day), self.ref, 6, 'IDFM:13497', 8])
        self.write(); _, data = self.payload()
        self.assertEqual([row[3] for row in data['visits']], [5, 6])

    def test_past_visits_not_removed_by_wall_clock_or_audit_window(self):
        self.write(); _, data = self.payload()
        self.assertEqual(len(data['visits']), 1)

    def test_ambiguous_publisher_code_rejected(self):
        other = self.tid + '-other'; ref = identities.digest(other.encode())[:16]
        self.tables['trips'].append({**self.tables['trips'][0], 'trip_id': other})
        self.tables['stop_times'].extend([{**r, 'trip_id': other} for r in list(self.tables['stop_times'])])
        self.tables['object_codes_extension'].append({**self.tables['object_codes_extension'][1], 'object_id': other})
        next(iter(self.package['groups'].values())).append([instant(self.day, '24:05:00'), str(self.day), ref, 5, 'IDFM:13497', 8])
        self.write()
        with self.assertRaisesRegex(ValueError, 'AMBIGUOUS_PUBLISHER_ALIAS'): self.build()

    def test_duplicate_canonical_row_and_duplicate_stop_sequence_rejected(self):
        rows = next(iter(self.package['groups'].values())); rows.append(rows[0][:]); self.write()
        with self.assertRaisesRegex(ValueError, 'DUPLICATE_CANONICAL_VISIT'): self.build()
        rows.pop(); self.tables['stop_times'].append(dict(self.tables['stop_times'][0])); self.write()
        with self.assertRaisesRegex(ValueError, 'DUPLICATE_STOP_SEQUENCE'): self.build()

    def test_path_traversal_and_resource_bound_fail_closed(self):
        self.write(); self.manifest['lines']['IDFM:C02565']['file'] = '../unsafe.json'
        (self.distribution / 'manifest.json').write_bytes(identities.encoded(self.manifest))
        with self.assertRaisesRegex(ValueError, 'INVALID_TIMETABLE_PATH'): self.build()
        self.write(); old = identities.MAX_VISITS
        try:
            identities.MAX_VISITS = 0
            with self.assertRaisesRegex(ValueError, 'IDENTITY_ROW_LIMIT'): self.build()
        finally: identities.MAX_VISITS = old

    def test_gtfs_direction_conflict_rejected(self):
        self.package['directionVersion'] = 1
        self.package['tripDirections'] = {self.ref: '1'}
        self.write()
        with self.assertRaisesRegex(ValueError, 'GTFS_DIRECTION_CONFLICT'): self.build()

    def test_terminal_is_never_indexed_as_a_boarding_departure(self):
        self.tables['stop_times'][1]['pickup_type'] = '0'
        self.package['groups'] = {'["IDFM:13497","IDFM:C02565","IDFM:13497"]': [[instant(self.day, '24:15:00'), str(self.day), self.ref, 8]]}
        self.write()
        with self.assertRaisesRegex(ValueError, 'CANONICAL_VISIT_CONFLICT'): self.build()

    def test_dst_elapsed_gtfs_time_is_preserved(self):
        self.day = dt.date(2026, 10, 25)
        self.tables['calendar_dates'][0]['date'] = '20261025'
        self.tables['stop_times'][0]['departure_time'] = '02:30:00'
        self.tables['stop_times'][1]['departure_time'] = '03:00:00'
        self.package['validFromUtc'] = '2026-10-24T22:00:00+00:00'
        self.package['validUntilUtc'] = '2026-10-26T23:00:00+00:00'
        next(iter(self.package['groups'].values()))[0][:2] = [instant(self.day, '02:30:00'), str(self.day)]
        self.write(); _, data = self.payload()
        self.assertEqual(data['visits'][0][0], int(dt.datetime(2026, 10, 25, 1, 30, tzinfo=dt.timezone.utc).timestamp()))


if __name__ == '__main__':
    unittest.main()
