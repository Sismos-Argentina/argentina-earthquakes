import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import geographiclib from "geographiclib-geodesic";

import {
  CUYO, CUYO_LENGTH_KM, positionAt, corridorEdge, projectToCuyo,
  selectCuyoEvents, classifyDepth, sampleGebco, sampleSlab, sampleCuyoProfile,
  LATITUDE_PROFILE, clampProfileLatitude, createLatitudeProfile,
  positionAtProfile, projectToProfile, sampleProfile,
} from "../src/lib/profile/cuyo.ts";

test("WGS84: endpoints, dirección, inversión y ambos lados del corredor", () => {
  assert.ok(Math.abs(CUYO_LENGTH_KM - 1145.493791325935) < 0.000001);
  for (const [s, p] of [[0, CUYO.a], [CUYO_LENGTH_KM, CUYO.b], [400, positionAt(400)]]) {
    const projection = projectToCuyo(p.longitude, p.latitude);
    assert.ok(Math.abs(projection.alongKm - s) < 0.001);
    assert.ok(projection.crossKm < 0.001);
  }
  const midpoint = positionAt(CUYO_LENGTH_KM / 2);
  const back = geographiclib.Geodesic.WGS84.Inverse(CUYO.b.latitude, CUYO.b.longitude, midpoint.latitude, midpoint.longitude);
  assert.ok(Math.abs(back.s12 / 1000 - CUYO_LENGTH_KM / 2) < 0.001);
  const reverse = geographiclib.Geodesic.WGS84.Inverse(CUYO.b.latitude, CUYO.b.longitude, CUYO.a.latitude, CUYO.a.longitude);
  const reversedFoot = geographiclib.Geodesic.WGS84.Direct(CUYO.b.latitude, CUYO.b.longitude, reverse.azi1, (CUYO_LENGTH_KM - 400) * 1000);
  const forwardFoot = positionAt(400);
  assert.ok(geographiclib.Geodesic.WGS84.Inverse(reversedFoot.lat2, reversedFoot.lon2, forwardFoot.latitude, forwardFoot.longitude).s12 < 0.001);
  for (const side of [-1, 1]) {
    const edge = corridorEdge(400, side);
    const foot = projectToCuyo(edge.longitude, edge.latitude);
    assert.ok(Math.abs(foot.alongKm - 400) < 0.005);
    assert.ok(Math.abs(foot.crossKm - 50) < 0.005);
    const out = geographiclib.Geodesic.WGS84.Direct(midpoint.latitude, midpoint.longitude, midpoint.azimuth + side * 90, 50020);
    assert.ok(projectToCuyo(out.lon2, out.lat2).crossKm > 50);
  }
  const before = positionAt(-5), after = positionAt(CUYO_LENGTH_KM + 5);
  assert.ok(projectToCuyo(before.longitude, before.latitude).alongKm < 0);
  assert.ok(projectToCuyo(after.longitude, after.latitude).alongKm > CUYO_LENGTH_KM);
});

test("el perfil móvil conserva la geodesia y alcanza Jujuy sin salir del dominio", () => {
  assert.equal(clampProfileLatitude(-50), LATITUDE_PROFILE.minLatitude);
  assert.equal(clampProfileLatitude(-20), LATITUDE_PROFILE.maxLatitude);
  assert.equal(clampProfileLatitude(-23.12), -23);
  const jujuy = createLatitudeProfile(-23);
  for (const [alongKm, expected] of [[0, jujuy.a], [jujuy.lengthKm, jujuy.b]]) {
    const point = positionAtProfile(jujuy, alongKm);
    assert.ok(Math.abs(point.longitude - expected.longitude) < 0.000001);
    assert.ok(Math.abs(point.latitude - expected.latitude) < 0.000001);
    const projected = projectToProfile(jujuy, point.longitude, point.latitude);
    assert.ok(Math.abs(projected.alongKm - alongKm) < 0.001);
    assert.ok(projected.crossKm < 0.001);
  }
});

test("artefactos reales: perfil muestreado a 1× conserva profundidad, UNC y huecos CLP", async () => {
  const [gebco, slab] = await Promise.all([
    readFile(new URL("../public/data/generated/gebco-2026-scientific.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../public/data/generated/slab2-sam-2018-scientific.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const samples = sampleCuyoProfile(gebco, slab);
  assert.equal(samples[0].alongKm, 0);
  assert.equal(samples.at(-1).alongKm, CUYO_LENGTH_KM);
  assert.equal(samples.length, 231);
  assert.ok(samples.some(({slab}) => slab === null));
  assert.ok(samples.some(({slab}) => slab && slab.depthKm > 100 && slab.uncertaintyKm > 0));
  assert.ok(samples.some(({elevationMeters}) => elevationMeters !== null && elevationMeters < 0));
  assert.ok(samples.some(({elevationMeters}) => elevationMeters !== null && elevationMeters > 0));

  const jujuy = sampleProfile(gebco, slab, createLatitudeProfile(-23));
  assert.ok(jujuy.some(({elevationMeters}) => elevationMeters !== null));
  assert.ok(jujuy.some(({slab: value}) => value !== null));
});

test("clasificación sin superposición a 70 y 300 km", () => {
  for (const [value, expected] of [[0,"superficial"],[69.999,"superficial"],[70,"intermedio"],[299.999,"intermedio"],[300,"profundo"],[750,"profundo"]]) {
    assert.equal(classifyDepth(value), expected);
  }
  assert.throws(() => classifyDepth(-1));
});

test("GEBCO interpola centros de celda con signo de elevación y nodata", () => {
  const artifact = { grid: { bbox: [0, 0, 2, 2], width: 2, height: 2, elevationMeters: [1000, 2000, -1000, -2000] } };
  assert.equal(sampleGebco(artifact, 0.5, 1.5), 1000);
  assert.equal(sampleGebco(artifact, 1, 1), 0);
  assert.equal(sampleGebco(artifact, 1.5, 0.5), -2000);
  assert.equal(sampleGebco(artifact, -1, 1), null);
  assert.equal(sampleGebco({ grid: { ...artifact.grid, elevationMeters: [1000, null, -1000, -2000] } }, 1, 1), null);
});

test("Slab2 interpola DEP y UNC en nodos WGS84 y respeta CLP/nodata", () => {
  const grid = { west: -73, north: -30, stepDegrees: 1, width: 3, height: 3,
    depthKm: [100, 120, null, 140, 160, null, 180, 200, null],
    uncertaintyKm: [10, 20, null, 30, 40, null, 50, 60, null] };
  assert.deepEqual(sampleSlab({grid}, -72.5, -30.5), { depthKm: 130, uncertaintyKm: 25 });
  assert.deepEqual(sampleSlab({grid}, -73, -30), { depthKm: 100, uncertaintyKm: 10 });
  assert.equal(sampleSlab({grid}, -71.5, -30.5), null);
  assert.equal(sampleSlab({grid: {...grid, uncertaintyKm: [10, null, null, 30, 40, null, 50, 60, null]}}, -72.5, -30.5), null);
});

test("snapshot auditado: hash, 24.689 eventos y conteos por profundidad", async () => {
  const bytes = await readFile(new URL("../public/data/generated/inpres-2026-09-14.geojson", import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82");
  const features = JSON.parse(bytes.toString("utf8")).features;
  assert.equal(features.length, 80470);
  const selected = selectCuyoEvents(features);
  const counts = { superficial: 0, intermedio: 0, profundo: 0, over350: 0 };
  for (const { feature, alongKm, crossKm } of selected) {
    counts[classifyDepth(feature.properties.profundidad)]++;
    if (feature.properties.profundidad > 350) counts.over350++;
    assert.ok(alongKm >= 0 && alongKm <= CUYO_LENGTH_KM && crossKm <= 50);
  }
  assert.equal(selected.length, 24689);
  // Digest del conjunto de IDs del CSV diagnóstico independiente de la auditoría.
  const selectedIds = selected.map(({feature}) => feature.properties.id).sort().join(String.fromCharCode(10));
  assert.equal(createHash("sha256").update(selectedIds).digest("hex"), "b62e470155f18521589201870b90886346786a254ccfa869dec79e95a9db1238");
  assert.deepEqual(counts, { superficial: 2797, intermedio: 21888, profundo: 4, over350: 2 });
});
