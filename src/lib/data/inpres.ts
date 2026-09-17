export const CATALOG_URL =
  "/data/generated/inpres-2026-09-14.geojson";
export const CATALOG_EVENTS = 80470;
export const CATALOG_SOURCE_COMMIT =
  "81e230c782972a2996a32f1ef21d56a2ef22e2e7";

export type InpresProperties = {
  id: string; // ID hash derivado por inpres-sismos, no ID oficial INPRES.
  fecha: string; // DD/MM/YYYY.
  hora: string; // Hora local de la fuente cuando corresponda.
  latitud: number;
  longitud: number;
  profundidad: number; // km.
  magnitud: number; // Tipo/escala no disponibles.
  ubicacion_original: string | null;
  sentido: "Si" | "No" | null;
};

export type InpresFeature = {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitud, latitud], EPSG:4326.
  };
  properties: InpresProperties;
};

export type InpresCatalog = {
  type: "FeatureCollection";
  features: InpresFeature[];
};

export function assertCatalog(value: unknown): asserts value is InpresCatalog {
  if (
    !value ||
    typeof value !== "object" ||
    !("type" in value) ||
    value.type !== "FeatureCollection" ||
    !("features" in value) ||
    !Array.isArray(value.features) ||
    value.features.length !== CATALOG_EVENTS
  ) {
    throw new Error("El catálogo no coincide con el snapshot INPRES esperado.");
  }
}
