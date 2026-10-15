import { isDeepStrictEqual } from 'node:util';
import { createLatitudeProfile, selectProfileEvents, summarizeProfile } from '../../src/lib/profile/cuyo.ts';
import { jsonText, updateChecksums } from './catalog-refresh.mjs';

export function createRefreshPlan({ snapshot, quality, guide, presets, manifest, catalog, report }) {
  // El plan no modifica las entradas; política, textos científicos y EDA permanecen intactos.
  quality = structuredClone(quality); guide = structuredClone(guide); presets = structuredClone(presets);
  for (const annotation of quality.entries) {
    if (!isDeepStrictEqual(catalog.features.find(f => f.properties.id === annotation.id), annotation.originalRecord)) throw new Error('Un registro anotado cambió: requiere revisión humana');
  }
  const { events, startDate, date, sourceCommit, sourceSha256, webSha256, invalidLocations } = report;
  const nextSnapshot = { ...snapshot, events, startDate, date, sourceCommit, sourceSha256, webSha256,
    url: `/data/generated/inpres-${date}-${webSha256.slice(0, 12)}.geojson`, invalidLocations };
  const dmy = iso => iso.split('-').reverse().join('/');
  guide.web = { ...guide.web, date, period: `${dmy(startDate)}–${dmy(date)}`, sha256: webSha256 };
  quality.snapshotSha256 = webSha256;
  presets.web = { ...presets.web, date, events, sha256: webSha256 };
  for (const stop of presets.stops) {
    const profile = createLatitudeProfile(stop.latitude), selected = selectProfileEvents(catalog.features, profile);
    const depths = selected.map(e => e.feature.properties.profundidad).sort((a, b) => a - b), middle = Math.floor(depths.length / 2);
    const summary = summarizeProfile(selected, profile);
    stop.web = { n: selected.length, medianKm: depths.length ? (depths.length % 2 ? depths[middle] : (depths[middle - 1] + depths[middle]) / 2) : null,
      shallow: summary.superficial, intermediate: summary.intermedio, deep: summary.profundo };
  }
  const files = {
    'src/data/catalog-snapshot.json': jsonText(nextSnapshot), 'src/data/catalog-quality.json': jsonText(quality),
    'src/data/flat-slab-guide.json': jsonText(guide), 'src/data/competition-presets.json': jsonText(presets),
    'src/data/catalog-refresh.json': jsonText(report),
  };
  files['manifests/checksums.sha256'] = updateChecksums(manifest, files, sourceSha256);
  return { files, nextSnapshot };
}
