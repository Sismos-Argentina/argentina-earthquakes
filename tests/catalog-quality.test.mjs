import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { eventQuality, allowedInVisualization } from "../src/lib/data/catalog-quality.ts";
import { catalogFilterBounds, matchesCatalogFilters } from "../src/lib/filters/catalog.ts";
import { canPublishHistoricalPhoto } from "../src/lib/story/media-policy.ts";

const read = async (p) => JSON.parse(await readFile(new URL(`../${p}`, import.meta.url), "utf8"));
const quality = await read("src/data/catalog-quality.json");
const bytes = await readFile(new URL("../public/data/generated/inpres-2026-09-14.geojson", import.meta.url));
const features = JSON.parse(bytes).features;

test("exclusión M8 reversible, sin mutación ni reemplazo de campos", () => {
  assert.equal(createHash("sha256").update(bytes).digest("hex"), quality.snapshotSha256);
  const bounds = catalogFilterBounds(features);
  assert.equal(features.filter((feature) => matchesCatalogFilters(feature, bounds)).length, 80469);
  assert.equal(features.filter((feature) => matchesCatalogFilters(feature, { ...bounds, includeProvisional: true })).length, 80470);
  for (const entry of quality.entries) {
    const feature = features.find((f) => f.properties.id === entry.id);
    assert.deepEqual(feature, entry.originalRecord);
    assert.equal(allowedInVisualization(feature), entry.status !== "provisional-exclusion");
    assert.ok(entry.sources.length);
  }
  assert.equal(eventQuality("f69ff9337367a750").originalRecord.properties.magnitud, 8);
});

test("no se excluyen extremos corroborados ni discrepancias entre escalas", () => {
  for (const id of ["c09ca9c534e3de75", "cd1d35d2463ac283", "67a43d2fc2a103f5", "4df71e4c86efc2a3"]) {
    assert.equal(allowedInVisualization(features.find((f) => f.properties.id === id)), true);
  }
});

test("ninguna de las 20 fotos se publica sin evidencia de permisos", async () => {
  const history = await read("src/data/competition-history.json");
  const ids = history.scenes.flatMap((scene) => scene.photos.map((photo) => photo.id));
  assert.equal(ids.length, 20);
  assert.equal(ids.some(canPublishHistoricalPhoto), false);
  assert.equal(canPublishHistoricalPhoto("foto-desconocida"), false);
});
