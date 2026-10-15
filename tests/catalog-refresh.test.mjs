import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import snapshot from '../src/data/catalog-snapshot.json' with { type: 'json' };
import policy from '../src/data/catalog-update-policy.json' with { type: 'json' };
import { nextCatalogReview, catalogReviewLabel } from '../src/lib/data/catalog-schedule.ts';
import { createRefreshPlan } from '../tools/lib/refresh-plan.mjs';
import { compareCatalogs, decodeProvider, validateCatalog, assertGeneratedChanges, updateChecksums, sha256 } from '../tools/lib/catalog-refresh.mjs';

const event = (id = '0000000000000001', day = '14/10/2026') => ({ type: 'Feature', id, geometry: { type: 'Point', coordinates: [-68, -31] },
  properties: { id, fecha: day, hora: '10:20:30', latitud: -31, longitud: -68, profundidad: 100, magnitud: 3, sentido: 'No', ubicacion_original: null } });
const catalog = (...features) => ({ type: 'FeatureCollection', features });

test('revisión semanal: hora argentina, límite exacto y cambio de año', async () => {
  assert.equal(nextCatalogReview(new Date('2026-10-15T08:00:00Z')).toISOString(), '2026-10-16T11:43:00.000Z');
  assert.equal(nextCatalogReview(new Date('2026-10-16T11:42:59Z')).toISOString(), '2026-10-16T11:43:00.000Z');
  assert.equal(nextCatalogReview(new Date('2026-10-16T11:43:00Z')).toISOString(), '2026-10-23T11:43:00.000Z');
  assert.equal(nextCatalogReview(new Date('2026-12-31T23:59:00Z')).toISOString(), '2027-01-01T11:43:00.000Z');
  assert.match(catalogReviewLabel(new Date('2026-10-15T08:00:00Z')), /16\/10\/2026.*08:43/);
  const workflow = await readFile(new URL('../.github/workflows/catalog-weekly.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes(`cron: '${policy.cron}'`));
});

test('adaptador conserva números y convierte sólo NaN de ubicación', () => {
  const text = JSON.stringify(catalog(event())).replace('"ubicacion_original":null', '"ubicacion_original": NaN');
  const decoded = decodeProvider(Buffer.from(text));
  assert.equal(decoded.invalidLocations, 1); assert.equal(decoded.catalog.features[0].properties.ubicacion_original, null);
  assert.equal(decoded.catalog.features[0].properties.profundidad, 100);
  assert.throws(() => decodeProvider(Buffer.from(text.replace('"magnitud":3', '"magnitud":NaN'))));
});

test('catálogo actual cumple contrato y fechas sin tocar extremos legítimos', async () => {
  const bytes = await readFile(new URL('../public' + snapshot.url, import.meta.url));
  assert.equal(sha256(bytes), snapshot.webSha256);
  assert.deepEqual(validateCatalog(JSON.parse(bytes), snapshot.date), { events: snapshot.events, startDate: snapshot.startDate, date: snapshot.date });
});

test('el validador rechaza vacío, fechas imposibles/futuras y duplicados', () => {
  assert.throws(() => validateCatalog(catalog(), '2026-10-15'));
  for (const date of ['31/02/2026', '2026-10-14', '16/10/2026']) assert.throws(() => validateCatalog(catalog(event(undefined, date)), '2026-10-15'));
  assert.throws(() => validateCatalog(catalog(event(), event()), '2026-10-15'));
  assert.throws(() => validateCatalog(catalog(event(), event('0000000000000002')), '2026-10-15'));
});

test('el validador rechaza geometría y números incoherentes', () => {
  for (const change of [e => e.geometry.coordinates[0] = 181, e => e.properties.latitud = -32,
    e => e.properties.profundidad = -1, e => e.properties.magnitud = Infinity, e => e.properties.hora = '25:00:00']) {
    const e = event(); change(e); assert.throws(() => validateCatalog(catalog(e), '2026-10-15'));
  }
});

test('append-only conserva identidad, no cambia orden semántico y detecta anomalías', () => {
  const old = event(), added = event('0000000000000002', '15/10/2026');
  const result = compareCatalogs(catalog(old), catalog(added, structuredClone(old)), 2000);
  assert.equal(result.automatic, true); assert.deepEqual(result.addedIds, [added.id]);
  assert.equal(compareCatalogs(catalog(old), catalog(structuredClone(old)), 2000).addedIds.length, 0);
  const corrected = structuredClone(old); corrected.properties.profundidad = 110;
  assert.equal(compareCatalogs(catalog(old), catalog(corrected), 2000).automatic, false);
  assert.equal(compareCatalogs(catalog(old), catalog(added), 2000).automatic, false);
  assert.equal(compareCatalogs(catalog(old), catalog(old, added), 0).automatic, false);
  assert.equal(old.properties.profundidad, 100);
});

test('publicación rechaza código, workflows, tests y archivos ajenos', () => {
  assert.doesNotThrow(() => assertGeneratedChanges(['src/data/catalog-snapshot.json', 'manifests/checksums.sha256']));
  for (const file of ['src/app/page.tsx', '.github/workflows/catalog-weekly.yml', 'tests/cuyo.test.mjs', 'src/data/catalog-update-policy.json', '../inpres-sismos/data/sismos.csv']) assert.throws(() => assertGeneratedChanges([file]));
  assert.throws(() => assertGeneratedChanges([]));
});

test('checksums sólo cambian la fuente y los derivados previstos', () => {
  const original = `${'1'.repeat(64)}  inpres/sismos.geojson\n${'2'.repeat(64)}  modelo.json\n`;
  const updated = updateChecksums(original, { 'src/data/catalog-snapshot.json': 'datos\n' }, '3'.repeat(64));
  assert.ok(updated.includes(`${'2'.repeat(64)}  modelo.json`));
  assert.ok(updated.includes(`${'3'.repeat(64)}  inpres/sismos.geojson`));
  assert.ok(updated.includes(`${sha256('datos\n')}  src/data/catalog-snapshot.json`));
});

test('el publicador no puede ejecutarse accidentalmente fuera del workflow de main', () => {
  const result = spawnSync(process.execPath, ['tools/publish-catalog-refresh.mjs'], { cwd: new URL('../', import.meta.url),
    env: { ...process.env, GITHUB_ACTIONS: 'false' }, encoding: 'utf8' });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /workflow confiable de main/);
});

test('plan real: regenera derivados, preserva ciencia/calidad y produce hashes consistentes', async () => {
  const load = async file => JSON.parse(await readFile(new URL('../' + file, import.meta.url), 'utf8'));
  const bytes = await readFile(new URL('../public' + snapshot.url, import.meta.url));
  const inputs = { snapshot, catalog: JSON.parse(bytes), quality: await load('src/data/catalog-quality.json'),
    guide: await load('src/data/flat-slab-guide.json'), presets: await load('src/data/competition-presets.json'),
    manifest: await readFile(new URL('../manifests/checksums.sha256', import.meta.url), 'utf8'),
    report: { ...snapshot, changed: true, automatic: true, addedIds: [], changedIds: [], removedIds: [] } };
  const before = structuredClone(inputs), { files, nextSnapshot } = createRefreshPlan(inputs);
  assert.deepEqual(inputs, before); assertGeneratedChanges(Object.keys(files));
  assert.equal(Object.keys(files).length, 6);
  assert.match(nextSnapshot.url, new RegExp(snapshot.webSha256.slice(0, 12)));
  assert.deepEqual(JSON.parse(files['src/data/competition-presets.json']), inputs.presets);
  assert.deepEqual(JSON.parse(files['src/data/catalog-quality.json']), inputs.quality);
  assert.deepEqual(JSON.parse(files['src/data/flat-slab-guide.json']), inputs.guide);
  for (const [file, contents] of Object.entries(files)) if (file !== 'manifests/checksums.sha256') assert.ok(files['manifests/checksums.sha256'].includes(`${sha256(contents)}  ${file}`));
  const bad = structuredClone(inputs); bad.quality.entries[0].originalRecord.properties.profundidad++;
  assert.throws(() => createRefreshPlan(bad), /registro anotado/);
});
