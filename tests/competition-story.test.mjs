import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { navigateStory, storyScrollBehavior } from "../src/lib/story/navigation.ts";
import { photoPosition, photoOpacity, photoScrollProgress } from "../src/lib/story/photographs.ts";
import { createLatitudeProfile, selectProfileEvents, summarizeProfile } from "../src/lib/profile/cuyo.ts";

const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root));
const json = async (p) => JSON.parse(await read(p));
const history = await json("src/data/competition-history.json");
const manifest = await json("public/data/generated/historical/media-manifest.json");
const presets = await json("src/data/competition-presets.json");
const snapshot = await json("src/data/catalog-snapshot.json");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("prólogo cronológico: 1944, Caucete 1977 y norte con Mercalli y fuente", () => {
  assert.deepEqual(history.scenes.map((s) => s.date), ["1894-10-27", "1944-01-15", "1977-11-23", "2015-10-17"]);
  assert.match(history.scenes[2].place, /Caucete/);
  assert.match(history.scenes[3].place, /Salta/);
  assert.match(history.scenes[0].note, /INPRES.*mayor magnitud/);
  assert.match(history.scenes[0].note, /no aporta.*numérica/);
  for (const scene of history.scenes) {
    assert.ok(scene.mercalli.grado_principal);
    assert.equal(new URL(scene.sourceUrl).hostname, "contenidos.inpres.gob.ar");
    assert.ok(scene.sourceDescription.length > 30);
    assert.equal(scene.photos.length, 3);
    assert.ok(scene.photos.every((p) => p.alt.length > 60));
    assert.equal("magnitude" in scene, false);
  }
});

test("salto, regreso, avance, retroceso y salida del recorrido", () => {
  const start = { mode: "history", guideIndex: null };
  assert.deepEqual(navigateStory(start, "skip", 3), { mode: "explore", guideIndex: null });
  let state = navigateStory(start, "guide", 3);
  assert.equal(state.guideIndex, 0);
  state = navigateStory(state, "previous", 3);
  assert.equal(state.guideIndex, 0);
  state = navigateStory(state, "next", 3);
  assert.equal(state.guideIndex, 1);
  assert.equal(navigateStory(state, "previous", 3).guideIndex, 0);
  state = navigateStory(state, "next", 3);
  assert.equal(state.guideIndex, 2);
  state = navigateStory(state, "next", 3);
  assert.equal(state.guideIndex, null);
  assert.deepEqual(navigateStory(state, "history", 3), start);
  assert.equal(navigateStory({ mode: "explore", guideIndex: 1 }, "free", 3).guideIndex, null);
});

test("movimiento reducido usa cortes directos en la navegación", async () => {
  assert.equal(storyScrollBehavior(true), "instant");
  assert.equal(storyScrollBehavior(false), "smooth");
  const css = (await read("src/app/globals.css")).toString();
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition-duration: 0s !important/);
});

test("manifiesto: 12 fotos curadas, variantes íntegras y referencias locales completas", async () => {
  assert.equal(manifest.media.length, 24);
  assert.equal(new Set(manifest.media.map((m) => m.photoId)).size, 12);
  assert.equal(manifest.provenance.providerCommit, history.provenance.providerCommit);
  for (const m of manifest.media) {
    assert.ok(m.file.startsWith("public/data/generated/historical/fotos_historicas/"));
    assert.equal(m.url, `/${m.file.slice(7)}`);
    assert.equal(m.license, "pending-review");
    const bytes = await read(m.file);
    assert.equal(bytes.length, m.bytes);
    assert.equal(sha(bytes), m.sha256);
    assert.equal(bytes.subarray(0,4).toString(), "RIFF");
    assert.equal(bytes.subarray(8,12).toString(), "WEBP");
    assert.equal(new URL(m.sourceUrl).hostname, "contenidos.inpres.gob.ar");
  }
  for (const scene of history.scenes) for (const photo of scene.photos) for (const url of [photo.src, photo.thumbnail]) {
    assert.ok(manifest.media.some((m) => m.eventId === scene.id && m.photoId === photo.id && m.url === url));
  }
  const files = await readdir(new URL("public/data/generated/historical/fotos_historicas/", root), { recursive: true });
  assert.equal(files.filter((f) => f.endsWith(".webp")).length, manifest.media.length);
});

test("scroll fotográfico: cada foto tiene su tramo completo, incluida la última", () => {
  assert.equal(photoPosition(100, 1600, 1000, 3), 0);
  assert.equal(photoPosition(-300, 1600, 1000, 3), 1);
  assert.equal(photoPosition(-2000, 1600, 1000, 3), 2);
  assert.equal(photoPosition(-30, 1600, 1000, 3), 0);
  assert.equal(photoPosition(-120, 1600, 1000, 3), 0);
  assert.ok(Math.abs(photoPosition(-180, 1600, 1000, 3) - 0.5) < 1e-12);
  assert.equal(photoPosition(-270, 1600, 1000, 3), 1);
  assert.ok(Math.abs(photoPosition(-420, 1600, 1000, 3) - 1.5) < 1e-12);
  for (const top of [-480, -510, -540, -570, -600]) {
    assert.equal(photoPosition(top, 1600, 1000, 3), 2);
  }
  assert.equal(photoPosition(-570, 1600, 1000, 3), 2);
  assert.equal(photoPosition(-500, 1600, 1400, 3), 2);
  assert.equal(photoPosition(-100, 1000, 1000, 1), 0);
  assert.equal(photoOpacity(0.5, 0), 1);
  assert.equal(photoOpacity(0.5, 1), 0.5);
  assert.equal(photoScrollProgress(2, 3), 0.8);
  assert.equal(photoScrollProgress(0, 1), 0);
  for (const index of [0, 1, 2]) {
    const progress = photoScrollProgress(index, 3);
    assert.equal(photoPosition(-600 * progress, 1600, 1000, 3), index);
    assert.equal(photoPosition(-600 * (progress + 0.1), 1600, 1000, 3), index);
  }
  for (const position of [0, .2, .8, 1, 1.3, 1.9, 2]) {
    const uncoveredBackground = [0,1,2].reduce((n,i) => n * (1 - photoOpacity(position,i)),1);
    assert.equal(uncoveredBackground, 0);
    if (Number.isInteger(position)) assert.equal(photoOpacity(position, position), 1);
  }
});

test("presets seleccionados contra CSV EDA y snapshot identificados", async () => {
  const csv = await read(presets.eda.evidence);
  assert.equal(presets.eda.evidenceHashEncoding, "UTF-8, LF");
  assert.equal(sha(csv.toString().replaceAll("\r\n", "\n")), presets.eda.evidenceSha256);
  const [header, ...lines] = csv.toString().trim().split(/\r?\n/);
  const rows = lines.map((line) => Object.fromEntries(line.split(",").map((v,i) => [header.split(",")[i], Number(v)])));
  assert.deepEqual(presets.stops.map((s) => s.latitude), [-24.5, -27, -30.5]);
  for (const stop of presets.stops) {
    const row = rows.find((r) => r.latitude === stop.latitude);
    assert.equal(row.events, stop.eda.n);
    assert.equal(row.depth_median_km, stop.eda.medianKm);
    assert.ok(row.events >= 500 && row.depth_distribution_change_js > 0.3);
  }
  assert.equal(presets.web.events, snapshot.events);
  assert.equal(presets.web.sha256, snapshot.webSha256);
  assert.notEqual(presets.web.date, presets.eda.date);
});

test("muestras de cada preset reproducen el perfil web real y su mediana", async () => {
  const bytes = await read(`public${snapshot.url}`);
  assert.equal(sha(bytes), snapshot.webSha256);
  const catalog = JSON.parse(bytes);
  assert.equal(catalog.features.length, snapshot.events);
  for (const stop of presets.stops) {
    const events = selectProfileEvents(catalog.features, createLatitudeProfile(stop.latitude));
    const summary = summarizeProfile(events, createLatitudeProfile(stop.latitude));
    assert.equal(events.length, stop.web.n);
    assert.equal(summary.superficial, stop.web.shallow);
    assert.equal(summary.intermedio, stop.web.intermediate);
    assert.equal(summary.profundo, stop.web.deep);
    const depths = events.map((e) => e.feature.properties.profundidad).sort((a,b) => a-b);
    const mid = Math.floor(depths.length/2);
    assert.equal(depths.length % 2 ? depths[mid] : (depths[mid-1] + depths[mid])/2, stop.web.medianKm);
  }
});
