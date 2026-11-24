import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import departures from '../departures.js';
import mobility from '../mobility.js';

const distribution = process.argv[2] || 'distribution';
const read = file => JSON.parse(fs.readFileSync(path.join(distribution, file)));
function verify(file, digest) {
  const bytes = fs.readFileSync(path.join(distribution, file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), digest, file);
  return JSON.parse(bytes);
}
const metro = read('manifest.json');
const timetable = read('timetable/manifest.json');
const region = read('mobility/manifest.json');
assert.ok(region.generationId);
assert.equal(timetable.generationId, region.generationId);
assert.equal(timetable.sourceSha256, region.sourceSha256);
assert.equal(metro.source_gtfs_sha256, region.sourceSha256);
assert.equal(timetable.networkSha256, metro.sha256);

// Published observations describe a single service on each line at the time of its trial.
const historical = new Map([
  ['IDFM:C02565', 'estimation fraîche vérifiée en recette'],
  ['IDFM:C02566', 'visite identifiée, observations périmées'],
  ['IDFM:C01743', 'estimation fraîche vérifiée en recette']
]);
const lines = new Map();
const keys = new Set();
for (const network of [verify('network.json', metro.sha256),
  mobility.unpack(verify('mobility/index.json', region.index.sha256))]) {
  for (const line of network.lines) {
    if (!lines.has(line.route_id)) lines.set(line.route_id, {
      name: line.route_short_name || line.route_long_name || line.route_id,
      mode: line.mode || 'metro', services: 0
    });
  }
  for (const place of departures.catalogue(network)) {
    for (const service of place.services) {
      if (keys.has(service.key)) continue;
      keys.add(service.key);
      lines.get(service.lineId).services++;
    }
  }
}
const modes = {};
const csv = [['generation', 'mode', 'ligne', 'nom', 'dessertes', 'preuve_historique',
  'date_recette_historique', 'condition_de_reexamen']];
for (const [id, line] of [...lines].sort(([a], [b]) => a.localeCompare(b))) {
  const count = modes[line.mode] ??= {lines: 0, linesWithServices: 0, services: 0};
  count.lines++;
  if (line.services) count.linesWithServices++;
  count.services += line.services;
  const proof = historical.get(id);
  const condition = !line.services ? 'Vérifier la desserte dans la prochaine génération'
    : proof ? 'Vérifier la visite sur la génération courante et la décision d’ouverture'
    : 'Établir le rattachement exact et obtenir une observation fraîche';
  csv.push([region.generationId, line.mode, id, line.name, line.services, proof || 'aucune preuve publiée',
    proof ? '2026-11-24' : '', condition]);
}
assert.ok(keys.size && lines.size);
const quote = v => '"' + String(v).replaceAll('"', '""') + '"';
const bytes = gzipSync(csv.map(row => row.map(quote).join(',')).join('\n') + '\n');
const output = path.join(distribution, 'realtime-coverage');
fs.mkdirSync(output, {recursive: true});
fs.writeFileSync(path.join(output, 'lignes.csv.gz'), bytes);
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({
  generation: region.generationId, sourceSha256: region.sourceSha256,
  metroNetworkSha256: metro.sha256, regionalIndexSha256: region.index.sha256,
  validFromUtc: region.validFromUtc, validUntilUtc: region.validUntilUtc,
  lines: lines.size, services: keys.size, modes, file: 'lignes.csv.gz',
  sha256: createHash('sha256').update(bytes).digest('hex'),
  historicalEvidence: 'docs/temps-reel/registre-lignes-20261124T133205920626Z.csv.gz',
  scope: 'Inventaire des horaires et preuves historiques publiées. L’ouverture et les observations voyageurs figurent au suivi continu.'
}, null, 2) + '\n');
console.log(JSON.stringify({generation: region.generationId, lines: lines.size, services: keys.size, modes}));
