import { test } from "node:test";
import assert from "node:assert/strict";

import {
  catalogDateKey,
  catalogFilterBounds,
  depthPresetRange,
  matchesCatalogFilters,
  sameCatalogFilters,
} from "../src/lib/filters/catalog.ts";

function feature({ fecha, magnitud, profundidad }) {
  return {
    type: "Feature",
    id: `${fecha}-${magnitud}-${profundidad}`,
    geometry: { type: "Point", coordinates: [-66, -35] },
    properties: {
      id: `${fecha}-${magnitud}-${profundidad}`,
      fecha,
      hora: "00:00:00",
      latitud: -35,
      longitud: -66,
      profundidad,
      magnitud,
      ubicacion_original: null,
      sentido: null,
    },
  };
}

const features = [
  feature({ fecha: "16/07/2011", magnitud: 2.1, profundidad: 8 }),
  feature({ fecha: "10/05/2018", magnitud: 4.5, profundidad: 70 }),
  feature({ fecha: "14/09/2026", magnitud: 6.2, profundidad: 640 }),
];

test("fechas INPRES se ordenan por día, mes y año", () => {
  assert.equal(catalogDateKey("16/07/2011"), 20110716);
  assert.throws(() => catalogDateKey("2011-07-16"));
});

test("presets de profundidad respetan los cortes descriptivos exactos", () => {
  const bounds = catalogFilterBounds(features);
  assert.deepEqual(depthPresetRange(bounds, "shallow"), {
    depthMin: 8,
    depthMax: 69,
  });
  assert.deepEqual(depthPresetRange(bounds, "intermediate"), {
    depthMin: 70,
    depthMax: 299,
  });
  assert.deepEqual(depthPresetRange(bounds, "deep"), {
    depthMin: 300,
    depthMax: 640,
  });
});

test("límites de filtros preservan el rango real del catálogo", () => {
  assert.deepEqual(catalogFilterBounds(features), {
    dateFrom: "2011-07-16",
    dateTo: "2026-09-14",
    magnitudeMin: 2.1,
    magnitudeMax: 6.2,
    depthMin: 8,
    depthMax: 640,
  });
});

test("fecha, magnitud reportada y profundidad son inclusivas", () => {
  const exact = {
    dateFrom: "2018-05-10",
    dateTo: "2018-05-10",
    magnitudeMin: 4.5,
    magnitudeMax: 4.5,
    depthMin: 70,
    depthMax: 70,
  };
  assert.equal(matchesCatalogFilters(features[1], exact), true);
  assert.equal(matchesCatalogFilters(features[0], exact), false);
  assert.equal(matchesCatalogFilters(features[2], exact), false);
  assert.equal(sameCatalogFilters(exact, { ...exact }), true);
  assert.equal(sameCatalogFilters(exact, { ...exact, depthMax: 71 }), false);
});
