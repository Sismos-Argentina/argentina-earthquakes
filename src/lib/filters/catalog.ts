import type { InpresFeature } from "@/lib/data/inpres";

export type CatalogFilters = {
  dateFrom: string;
  dateTo: string;
  magnitudeMin: number;
  magnitudeMax: number;
  depthMin: number;
  depthMax: number;
};

export type CatalogFilterBounds = CatalogFilters;
export type DepthPreset = "shallow" | "intermediate" | "deep";

export function catalogDateKey(value: string): number {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error(`Fecha INPRES inválida: ${value}`);
  const [, day, month, year] = match;
  return Number(`${year}${month}${day}`);
}

function dateKeyToIso(value: number): string {
  const date = String(value);
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

export function isoDateKey(value: string): number {
  return Number(value.replaceAll("-", ""));
}

export function catalogFilterBounds(features: InpresFeature[]): CatalogFilterBounds {
  if (!features.length) throw new Error("No se pueden calcular filtros de un catálogo vacío.");

  let dateMin = Number.POSITIVE_INFINITY;
  let dateMax = Number.NEGATIVE_INFINITY;
  let magnitudeMin = Number.POSITIVE_INFINITY;
  let magnitudeMax = Number.NEGATIVE_INFINITY;
  let depthMin = Number.POSITIVE_INFINITY;
  let depthMax = Number.NEGATIVE_INFINITY;

  for (const feature of features) {
    const date = catalogDateKey(feature.properties.fecha);
    dateMin = Math.min(dateMin, date);
    dateMax = Math.max(dateMax, date);
    magnitudeMin = Math.min(magnitudeMin, feature.properties.magnitud);
    magnitudeMax = Math.max(magnitudeMax, feature.properties.magnitud);
    depthMin = Math.min(depthMin, feature.properties.profundidad);
    depthMax = Math.max(depthMax, feature.properties.profundidad);
  }

  return {
    dateFrom: dateKeyToIso(dateMin),
    dateTo: dateKeyToIso(dateMax),
    magnitudeMin,
    magnitudeMax,
    depthMin,
    depthMax,
  };
}

export function matchesCatalogFilters(
  feature: InpresFeature,
  filters: CatalogFilters,
): boolean {
  const date = catalogDateKey(feature.properties.fecha);
  return date >= isoDateKey(filters.dateFrom)
    && date <= isoDateKey(filters.dateTo)
    && feature.properties.magnitud >= filters.magnitudeMin
    && feature.properties.magnitud <= filters.magnitudeMax
    && feature.properties.profundidad >= filters.depthMin
    && feature.properties.profundidad <= filters.depthMax;
}

export function sameCatalogFilters(a: CatalogFilters, b: CatalogFilters): boolean {
  return a.dateFrom === b.dateFrom
    && a.dateTo === b.dateTo
    && a.magnitudeMin === b.magnitudeMin
    && a.magnitudeMax === b.magnitudeMax
    && a.depthMin === b.depthMin
    && a.depthMax === b.depthMax;
}

export function depthPresetRange(
  bounds: CatalogFilterBounds,
  preset: DepthPreset,
): Pick<CatalogFilters, "depthMin" | "depthMax"> {
  if (preset === "shallow") {
    return {
      depthMin: bounds.depthMin,
      depthMax: Math.min(69, bounds.depthMax),
    };
  }
  if (preset === "intermediate") {
    return {
      depthMin: Math.max(70, bounds.depthMin),
      depthMax: Math.min(299, bounds.depthMax),
    };
  }
  return {
    depthMin: Math.max(300, bounds.depthMin),
    depthMax: bounds.depthMax,
  };
}
