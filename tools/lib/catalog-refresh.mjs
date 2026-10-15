import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const jsonText = value => JSON.stringify(value, null, 2) + '\n';
export const GENERATED_FILES = Object.freeze([
  'src/data/catalog-snapshot.json', 'src/data/catalog-quality.json',
  'src/data/flat-slab-guide.json', 'src/data/competition-presets.json',
  'src/data/catalog-refresh.json', 'manifests/checksums.sha256',
]);
export function isoDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '');
  if (!match) throw new Error('Fecha de evento inválida');
  const [, day, month, year] = match, iso = `${year}-${month}-${day}`;
  if (new Date(iso + 'T12:00:00Z').toISOString().slice(0, 10) !== iso) throw new Error('Fecha imposible');
  return iso;
}

// Misma adaptación JSON documentada en prepare-inpres: sólo NaN de ubicación.
export function decodeProvider(bytes) {
  const raw = bytes.toString('utf8'), invalidValue = '"ubicacion_original": NaN';
  const invalidLocations = raw.split(invalidValue).length - 1;
  const webText = raw.replaceAll(invalidValue, '"ubicacion_original": null');
  const catalog = JSON.parse(webText);
  if (catalog.type !== 'FeatureCollection' || !Array.isArray(catalog.features) || !catalog.features.length) throw new Error('Catálogo vacío o esquema inválido');
  return { catalog, webText, invalidLocations };
}

export function validateCatalog(catalog, today) {
  if (catalog.type !== 'FeatureCollection' || !Array.isArray(catalog.features) || !catalog.features.length) throw new Error('Catálogo vacío');
  const ids = new Set(), observations = new Set();
  let startDate = '9999-12-31', date = '0000-01-01';
  for (const feature of catalog.features) {
    const p = feature.properties, coordinates = feature.geometry?.coordinates;
    if (feature.type !== 'Feature' || feature.geometry?.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length !== 2 || !p
      || typeof p.id !== 'string' || !/^[a-f0-9]{16}$/.test(p.id) || feature.id !== p.id || ids.has(p.id)) throw new Error('ID, geometría o registro duplicado inválido');
    ids.add(p.id);
    if (![...coordinates, p.latitud, p.longitud, p.profundidad, p.magnitud].every(Number.isFinite)
      || coordinates[0] !== p.longitud || coordinates[1] !== p.latitud || Math.abs(p.longitud) > 180 || Math.abs(p.latitud) > 90
      || p.profundidad < 0 || p.profundidad > 800 || p.magnitud < -2 || p.magnitud > 10) throw new Error('Coordenadas o valores fuera del contrato');
    if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(p.hora ?? '') || !['Si', 'No', null].includes(p.sentido)
      || !(p.ubicacion_original === null || typeof p.ubicacion_original === 'string')) throw new Error('Campos de evento fuera del contrato');
    const key = isoDate(p.fecha);
    if (key > today) throw new Error('Evento con fecha futura');
    startDate = key < startDate ? key : startDate; date = key > date ? key : date;
    const observation = JSON.stringify([p.fecha, p.hora, ...coordinates, p.profundidad, p.magnitud]);
    if (observations.has(observation)) throw new Error('Observación duplicada con otro ID');
    observations.add(observation);
  }
  return { events: catalog.features.length, startDate, date };
}

export function compareCatalogs(previous, candidate, maximumAddedEvents) {
  const old = new Map(previous.features.map(f => [f.properties.id, f]));
  const next = new Map(candidate.features.map(f => [f.properties.id, f]));
  const addedIds = [], changedIds = [], removedIds = [];
  for (const [id, feature] of old) {
    if (!next.has(id)) removedIds.push(id);
    else if (!isDeepStrictEqual(feature, next.get(id))) changedIds.push(id);
  }
  for (const id of next.keys()) if (!old.has(id)) addedIds.push(id);
  const reviewReasons = [];
  if (removedIds.length) reviewReasons.push('Hay registros eliminados');
  if (changedIds.length) reviewReasons.push('Hay registros anteriores modificados');
  if (addedIds.length > maximumAddedEvents) reviewReasons.push('Crecimiento mayor al umbral semanal');
  return { addedIds: addedIds.sort(), changedIds: changedIds.sort(), removedIds: removedIds.sort(), reviewReasons, automatic: reviewReasons.length === 0 };
}

export function assertGeneratedChanges(files) {
  if (!files.length || files.some(file => !GENERATED_FILES.includes(file))) throw new Error('La actualización incluye archivos no permitidos');
}

export function updateChecksums(text, files, sourceHash) {
  const updates = new Map(Object.entries(files).map(([file, contents]) => [file, sha256(contents)]));
  updates.set('inpres/sismos.geojson', sourceHash);
  const seen = new Set();
  const lines = text.trimEnd().split(/\r?\n/).map(line => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match || !updates.has(match[2])) return line;
    seen.add(match[2]); return `${updates.get(match[2])}  ${match[2]}`;
  });
  for (const [file, hash] of updates) if (!seen.has(file)) lines.push(`${hash}  ${file}`);
  return lines.join('\n') + '\n';
}
