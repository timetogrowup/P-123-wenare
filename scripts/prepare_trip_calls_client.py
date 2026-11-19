"""Activate exactly the qualified staged files, together with generated trip data."""
import hashlib
import json
import pathlib
import shutil

root=pathlib.Path('.')
manifest=json.loads((root/'release-client/trip-calls-release.json').read_text())
trip_client = {
    'index.html', 'nearby-ui.js', 'timetable.js', 'sw.js', 'trip-calls-core.js',
    'trip-calls-loader.js', 'trip-calls-ui.js', 'trip-calls.css',
}
teleportation = {
    'teleportation.js', 'teleportation-ui.js', 'teleportation.css',
    'places-map-ui.js', 'opportunities-ui.js',
}
contracts = {1: trip_client, 2: trip_client | teleportation}
if set(manifest['files']) != contracts.get(manifest['version']):
    raise ValueError('A release must contain every file of its client contract')
if not json.loads((root/'distribution/mobility/manifest.json').read_text()).get('tripCallsManifest'):
    raise ValueError('Complete trip dataset must be generated before client activation')
for name,expected in manifest['files'].items():
    source=root/'release-client'/name
    if hashlib.sha256(source.read_bytes()).hexdigest()!=expected:
        raise ValueError('Staged client differs from qualified release')
for name in manifest['files']:
    shutil.copyfile(root/'release-client'/name,root/name)
print('TRIP_CALLS_CLIENT_PREPARED',len(manifest['files']))
