import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const commit = "9380cca83db5f9aef52d5e762765100745f84b27";
const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${commit}/geojson/ne_10m_populated_places_simple.geojson`;
const expected = "c7b8dbe8918f9b8bc2173bb343078d63d757a7f3d3663e7707e5e9ec4741f94f";
const bytes = process.argv[2] ? await readFile(process.argv[2]) : Buffer.from(await (await fetch(url)).arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error("Checksum Natural Earth diferente de la fuente fijada.");
const source = JSON.parse(bytes);
const places = source.features.filter(f => f.properties.iso_a2 === "AR").map(f => ({
  name: f.properties.name, longitude: f.geometry.coordinates[0], latitude: f.geometry.coordinates[1],
  rank: f.properties.min_zoom, id: f.properties.ne_id,
})).sort((a,b) => a.rank-b.rank || a.name.localeCompare(b.name));
await writeFile(new URL("../../src/data/place-labels.json", import.meta.url), JSON.stringify({
  source: "Natural Earth populated places", collection: "v5.1.1", sourceCommit: commit, sourceUrl: url,
  sourceSha256: expected, licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
  selection: "iso_a2 = AR; rótulos cartográficos, no clasificación oficial de jurisdicciones",
  places,
}, null, 2) + "\n");
console.log(`Rótulos cartográficos preparados: ${places.length} lugares; fuente y checksum fijados.`);
