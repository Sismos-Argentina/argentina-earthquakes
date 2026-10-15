import snapshot from "../src/data/catalog-snapshot.json" with { type: "json" };
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import guide from "../src/data/flat-slab-guide.json" with { type: "json" };
import { allowedInVisualization } from "../src/lib/data/catalog-quality.ts";
import { createLatitudeProfile, selectProfileEvents, positionAtProfile, sampleSlab } from "../src/lib/profile/cuyo.ts";
import { navigateStory } from "../src/lib/story/navigation.ts";

test("comparación: mismo snapshot y corredor, conteos completos y exclusión reversible", async () => {
  const bytes = await readFile(new URL("../public"+snapshot.url, import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), guide.web.sha256);
  const features = JSON.parse(bytes).features;
  const result = [];
  for (const stop of guide.stops) {
    const profile = createLatitudeProfile(stop.latitude);
    assert.equal(profile.halfWidthKm, guide.comparison.halfWidthKm);
    assert.equal(profile.a.longitude, guide.comparison.longitudeFrom);
    assert.equal(profile.b.longitude, guide.comparison.longitudeTo);
    const raw = selectProfileEvents(features, profile);
    const eligible = raw.filter(({ feature }) => allowedInVisualization(feature));
    result.push({ latitude: stop.latitude, raw: raw.length, eligible: eligible.length,
      magnitude31: eligible.filter(({ feature }) => feature.properties.magnitud >= 3.1).length });
    assert.ok(eligible.every(({ feature }) => feature.properties.profundidad <= guide.comparison.depthKm));
    assert.equal(raw.filter(({ feature }) => allowedInVisualization(feature, true)).length, raw.length);
  }
  assert.deepEqual(result, [
    { latitude: -31, raw: 24762, eligible: 24761, magnitude31: 4359 },
    { latitude: -35, raw: 202, eligible: 202, magnitude31: 102 },
  ]);
});

test("Slab2 real: geometrías distintas sin mezclar muestras ni rellenar nodata", async () => {
  const slab = JSON.parse(await readFile(new URL("../public/data/generated/slab2-sam-2018-scientific.json", import.meta.url)));
  const depths = [-31, -35].map((latitude) => {
    const profile = createLatitudeProfile(latitude);
    return [300, 600].map((distance) => {
      const point = positionAtProfile(profile, distance);
      return sampleSlab(slab, point.longitude, point.latitude)?.depthKm;
    });
  });
  assert.ok(depths.every((values) => values.every(Number.isFinite)));
  assert.ok(depths[0][1] - depths[0][0] < 20);
  assert.ok(depths[1][1] - depths[1][0] > 150);
  assert.equal(sampleSlab(slab, -10, -35), null);
  let state = navigateStory({ mode: "explore", guideIndex: null }, "guide", guide.stops.length);
  assert.equal(state.guideIndex, 0);
  state = navigateStory(state, "next", guide.stops.length);
  assert.equal(state.guideIndex, 1);
  assert.equal(navigateStory(state, "next", guide.stops.length).guideIndex, null);
});
