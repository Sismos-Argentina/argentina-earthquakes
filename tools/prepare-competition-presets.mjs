import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createLatitudeProfile, selectProfileEvents, summarizeProfile } from "../src/lib/profile/cuyo.ts";

const root = new URL("../", import.meta.url);
const load = async (p) => readFile(new URL(p, root), "utf8");
const snapshot = JSON.parse(await load("src/data/catalog-snapshot.json"));
const webText = await load(`public${snapshot.url}`);
if (createHash("sha256").update(webText).digest("hex") !== snapshot.webSha256) throw new Error("Snapshot web cambió");
const catalog = JSON.parse(webText);
// Hash del texto UTF-8 con LF; Git puede entregar el mismo CSV con CRLF en Windows.
const csv = (await load("docs/research/eda-2026-09-19/latitude_scan_0_5deg.csv")).replaceAll("\r\n", "\n");
const [header, ...lines] = csv.trim().split(/\r?\n/);
const rows = lines.map((line) => Object.fromEntries(line.split(",").map((v, i) => [header.split(",")[i], Number(v)])));
const definitions = [
  { id: "north", latitude: -24.5, title: "Norte · otra profundidad", observation: "Buscá la concentración de puntos intermedios. En esta franja, la profundidad mediana es mayor que en las siguientes paradas.", prompt: "Leé el eje vertical: la profundidad aumenta hacia abajo." },
  { id: "transition", latitude: -27, title: "Transición · poblaciones distintas", observation: "Ahora aparecen juntos puntos superficiales, intermedios y un grupo profundo hacia el este. La mediana por sí sola no describe toda la distribución.", prompt: "Recorré el eje horizontal hacia B para encontrar los eventos más profundos." },
  { id: "cuyo", latitude: -30.5, title: "Cuyo · la distribución cambia", observation: "La mezcla de puntos superficiales e intermedios cambia otra vez. Mover el perfil revela distribuciones distintas; este recorrido no establece su causa.", prompt: "Compará las bandas y la mediana con el norte. Después mové vos la franja." },
];
const stops = definitions.map((d) => {
  const eda = rows.find((r) => r.latitude === d.latitude);
  if (!eda || eda.events < 500 || eda.depth_distribution_change_js < 0.3) throw new Error("Preset sin evidencia suficiente");
  const profile = createLatitudeProfile(d.latitude);
  const events = selectProfileEvents(catalog.features, profile);
  const depths = events.map((e) => e.feature.properties.profundidad).sort((a,b) => a-b);
  const mid = Math.floor(depths.length / 2);
  const median = depths.length % 2 ? depths[mid] : (depths[mid-1] + depths[mid]) / 2;
  const summary = summarizeProfile(events, profile);
  return { ...d, eda: { n: eda.events, medianKm: eda.depth_median_km, changeJS: eda.depth_distribution_change_js },
    web: { n: events.length, medianKm: median, shallow: summary.superficial, intermediate: summary.intermedio, deep: summary.profundo } };
});
const metadata = JSON.parse(await load("docs/research/eda-2026-09-19/run_metadata.json"));
await writeFile(new URL("src/data/competition-presets.json", root), JSON.stringify({
  schemaVersion: 1, eda: { date: "2026-09-18", events: metadata.audit.rows, catalogSha256: metadata.audit.sha256,
    evidence: "docs/research/eda-2026-09-19/latitude_scan_0_5deg.csv", evidenceSha256: createHash("sha256").update(csv).digest("hex"), evidenceHashEncoding: "UTF-8, LF",
    method: "WGS84 a azimutal equidistante local; distancia a segmento, ±50 km" },
  web: { date: snapshot.date, events: snapshot.events, sha256: snapshot.webSha256, method: "Distancia a geodésica WGS84, ±50 km; extremos 73°O–61°O" },
  stops,
}, null, 2) + "\n");
console.log(JSON.stringify(stops.map(({latitude, eda, web}) => ({latitude, eda, web})), null, 2));
