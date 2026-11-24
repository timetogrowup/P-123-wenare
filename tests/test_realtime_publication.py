import copy
import datetime as dt
import json
import pathlib
import shutil
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
import prepare_realtime_publication as publisher
import test_realtime_identities as fixtures


class PublicationTest(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.IdentityIndexTest()
        self.fixture.setUp(); self.fixture.write()
        self.distribution = self.fixture.root / 'distribution'
        shutil.copytree(self.fixture.distribution, self.distribution / 'mobility')
        self.now = dt.datetime(2026, 11, 24, tzinfo=dt.timezone.utc)

    def tearDown(self):
        self.fixture.tearDown()

    def prepare(self, **kwargs):
        return publisher.prepare(self.fixture.archive, self.distribution, now=self.now, lines=['IDFM:C02565'], **kwargs)

    def manifest(self, generation):
        p = self.distribution / 'mobility/manifest.json'
        data = json.loads(p.read_text()); data['generationId'] = generation
        p.write_bytes(publisher.encoded(data))

    def test_candidate_is_published_without_enabling_realtime_or_rewriting_theory(self):
        original = {p.name: p.read_bytes() for p in (self.distribution / 'mobility').iterdir()}
        result = self.prepare()
        self.assertTrue(result['indexReady']); self.assertFalse(result['activation'])
        self.assertEqual(original, {p.name: p.read_bytes() for p in (self.distribution / 'mobility').iterdir()})
        self.assertTrue((self.distribution / 'realtime-identities/generation-fixture-1/IDFM-C02565.json.gz').is_file())
        self.assertEqual(result, json.loads((self.distribution / 'realtime-identities/status.json').read_text()))

    def test_missing_archive_does_not_block_valid_theoretical_generation(self):
        self.fixture.archive.unlink(); result = self.prepare()
        self.assertFalse(result['indexReady']); self.assertEqual(result['warnings'], ['GTFS_ARCHIVE_UNAVAILABLE'])
        self.assertTrue((self.distribution / 'mobility/manifest.json').is_file())

    def test_failed_new_generation_preserves_previous_valid_index(self):
        self.prepare(); self.manifest('next-generation')
        def fail(*args):
            raise ValueError('GTFS_SOURCE_HASH_MISMATCH')
        result = self.prepare(builder=fail)
        self.assertFalse(result['indexReady']); self.assertEqual(result['generationId'], 'next-generation')
        self.assertEqual(result['generations'][0]['generationId'], 'generation-fixture-1')
        self.assertFalse((self.distribution / 'realtime-identities/next-generation').exists())

    def test_at_most_two_immutable_generations_and_expired_cleanup(self):
        for name in ['generation-1', 'generation-2', 'generation-3']:
            self.manifest(name); self.prepare()
        folder = self.distribution / 'realtime-identities'
        self.assertFalse((folder / 'generation-1').exists())
        old = json.loads((folder / 'generation-2/manifest.json').read_text())
        old['validUntilUtc'] = '2026-11-23T00:00:00Z'
        (folder / 'generation-2/manifest.json').write_bytes(publisher.encoded(old))
        self.prepare(); self.assertFalse((folder / 'generation-2').exists())

    def test_unrecognized_files_and_symlinks_are_not_removed(self):
        folder = self.distribution / 'realtime-identities'; folder.mkdir()
        (folder / 'notes').mkdir(); (folder / 'notes/keep.txt').write_text('operator note')
        (folder / 'linked').symlink_to(self.fixture.root, target_is_directory=True)
        self.prepare(); self.assertTrue((folder / 'notes/keep.txt').exists()); self.assertTrue((folder / 'linked').is_symlink())

    def test_absent_or_expired_theory_is_a_real_pipeline_error(self):
        p = self.distribution / 'mobility/manifest.json'
        old = json.loads(p.read_text()); old['validUntilUtc'] = '2026-11-23T00:00:00Z'; p.write_bytes(publisher.encoded(old))
        with self.assertRaisesRegex(ValueError, 'VALID_THEORETICAL_MANIFEST_REQUIRED'):
            self.prepare()

    def test_private_error_details_are_not_published(self):
        def fail(*args):
            raise ValueError('private-fixture-value-that-must-not-be-logged')
        result = self.prepare(builder=fail)
        self.assertEqual(result['warnings'], ['IDENTITY_INDEX_NOT_READY'])
        self.assertNotIn('private-fixture-value', (self.distribution / 'realtime-identities/status.json').read_text())

    def test_metadata_refresh_keeps_existing_index_bytes_immutable(self):
        first=self.prepare();folder=self.distribution/'realtime-identities'/first['generationId'];before=(folder/'manifest.json').read_bytes()
        p=self.distribution/'mobility/manifest.json';manifest=json.loads(p.read_text());manifest['generatedAtUtc']='2026-11-24T01:00:00Z';p.write_bytes(publisher.encoded(manifest))
        second=self.prepare();self.assertTrue(second['indexReady']);self.assertEqual((folder/'manifest.json').read_bytes(),before)


if __name__ == '__main__':
    unittest.main()
