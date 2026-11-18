"""Activate exactly the qualified staged files, together with generated trip data."""
import hashlib,json,pathlib,shutil
root=pathlib.Path('.')
manifest=json.loads((root/'release-client/trip-calls-release.json').read_text())
if not json.loads((root/'distribution/mobility/manifest.json').read_text()).get('tripCallsManifest'):
    raise ValueError('Complete trip dataset must be generated before client activation')
for name,expected in manifest['files'].items():
    if '/' in name or name not in ['index.html','nearby-ui.js','timetable.js','sw.js','trip-calls-core.js','trip-calls-loader.js','trip-calls-ui.js','trip-calls.css']:
        raise ValueError('Unexpected client path')
    source=root/'release-client'/name
    if hashlib.sha256(source.read_bytes()).hexdigest()!=expected:
        raise ValueError('Staged client differs from qualified release')
for name in manifest['files']:
    shutil.copyfile(root/'release-client'/name,root/name)
print('TRIP_CALLS_CLIENT_PREPARED',len(manifest['files']))
