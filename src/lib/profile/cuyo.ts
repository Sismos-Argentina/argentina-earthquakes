import geographiclib from "geographiclib-geodesic";

import type { InpresFeature } from "../data/inpres";
import type { GebcoArtifact } from "../data/gebco";
import type { Slab2Artifact } from "../data/slab2";

export const CUYO = {
  a: { longitude: -73, latitude: -31 },
  b: { longitude: -61, latitude: -31 },
  halfWidthKm: 50,
  initialDepthKm: 350,
  sampleStepKm: 5,
} as const;

export const LATITUDE_PROFILE = {
  minLatitude: -45,
  maxLatitude: -22,
  defaultLatitude: CUYO.a.latitude,
  stepDegrees: 0.25,
  westLongitude: CUYO.a.longitude,
  eastLongitude: CUYO.b.longitude,
} as const;

export type ProfileDefinition = {
  latitude: number;
  a: ProfilePoint;
  b: ProfilePoint;
  halfWidthKm: number;
  initialDepthKm: number;
  sampleStepKm: number;
  lengthKm: number;
  initialAzimuth: number;
};

const geod = geographiclib.Geodesic.WGS84;
const inverse = geod.Inverse(CUYO.a.latitude, CUYO.a.longitude, CUYO.b.latitude, CUYO.b.longitude);
export const CUYO_LENGTH_KM = (inverse.s12 ?? NaN) / 1000;
const initialAzimuth = inverse.azi1 ?? NaN;
const line = geod.DirectLine(CUYO.a.latitude, CUYO.a.longitude, initialAzimuth, (CUYO_LENGTH_KM + 150) * 1000);
const profileLines = new Map<string, typeof line>([[`${CUYO.a.latitude}:${CUYO.a.longitude}:${CUYO.b.longitude}`, line]]);

export type ProfilePoint = { longitude: number; latitude: number };
export type ProjectedEvent = {
  feature: InpresFeature;
  alongKm: number;
  crossKm: number;
};
export type ProfileSample = {
  alongKm: number;
  point: ProfilePoint;
  elevationMeters: number | null;
  slab: { depthKm: number; uncertaintyKm: number } | null;
};

export function clampProfileLatitude(latitude: number): number {
  const clamped = Math.min(LATITUDE_PROFILE.maxLatitude, Math.max(LATITUDE_PROFILE.minLatitude, latitude));
  return Math.round(clamped / LATITUDE_PROFILE.stepDegrees) * LATITUDE_PROFILE.stepDegrees;
}

export function createLatitudeProfile(latitude: number): ProfileDefinition {
  const normalized = clampProfileLatitude(latitude);
  const a = { longitude: LATITUDE_PROFILE.westLongitude, latitude: normalized };
  const b = { longitude: LATITUDE_PROFILE.eastLongitude, latitude: normalized };
  const result = geod.Inverse(a.latitude, a.longitude, b.latitude, b.longitude);
  return {
    latitude: normalized,
    a,
    b,
    halfWidthKm: CUYO.halfWidthKm,
    initialDepthKm: CUYO.initialDepthKm,
    sampleStepKm: CUYO.sampleStepKm,
    lengthKm: (result.s12 ?? NaN) / 1000,
    initialAzimuth: result.azi1 ?? NaN,
  };
}

export const CUYO_PROFILE = createLatitudeProfile(CUYO.a.latitude);

export type ProfileSummary = {
  total: number;
  superficial: number;
  intermedio: number;
  profundo: number;
  outsideInitialDepth: number;
  fullDepthKm: number;
};

export function summarizeCuyoProfile(events: ProjectedEvent[]): ProfileSummary {
  const summary: ProfileSummary = {
    total: events.length,
    superficial: 0,
    intermedio: 0,
    profundo: 0,
    outsideInitialDepth: 0,
    fullDepthKm: CUYO.initialDepthKm,
  };
  for (const { feature } of events) {
    const depth = feature.properties.profundidad;
    summary[classifyDepth(depth)]++;
    if (depth > CUYO.initialDepthKm) summary.outsideInitialDepth++;
    summary.fullDepthKm = Math.max(summary.fullDepthKm, Math.ceil(depth / 50) * 50);
  }
  return summary;
}

export function summarizeProfile(events: ProjectedEvent[], profile: ProfileDefinition): ProfileSummary {
  const summary = summarizeCuyoProfile(events);
  summary.fullDepthKm = profile.initialDepthKm;
  summary.outsideInitialDepth = 0;
  for (const { feature } of events) {
    const depth = feature.properties.profundidad;
    if (depth > profile.initialDepthKm) summary.outsideInitialDepth++;
    summary.fullDepthKm = Math.max(summary.fullDepthKm, Math.ceil(depth / 50) * 50);
  }
  return summary;
}

function profileLine(profile: ProfileDefinition) {
  const key = `${profile.latitude}:${profile.a.longitude}:${profile.b.longitude}`;
  const cached = profileLines.get(key);
  if (cached) return cached;
  const created = geod.DirectLine(
    profile.a.latitude,
    profile.a.longitude,
    profile.initialAzimuth,
    (profile.lengthKm + 150) * 1000,
  );
  profileLines.set(key, created);
  return created;
}

export function positionAtProfile(profile: ProfileDefinition, alongKm: number): ProfilePoint & { azimuth: number } {
  const result = profileLine(profile).Position(alongKm * 1000);
  if (result.lon2 === undefined || result.lat2 === undefined || result.azi2 === undefined) {
    throw new Error("Posición geodésica no disponible");
  }
  return { longitude: result.lon2, latitude: result.lat2, azimuth: result.azi2 };
}

export function positionAt(alongKm: number): ProfilePoint & { azimuth: number } {
  return positionAtProfile(CUYO_PROFILE, alongKm);
}

export function corridorEdgeForProfile(profile: ProfileDefinition, alongKm: number, side: -1 | 1): ProfilePoint {
  const center = positionAtProfile(profile, alongKm);
  const result = geod.Direct(center.latitude, center.longitude, center.azimuth + side * 90, profile.halfWidthKm * 1000);
  return { longitude: result.lon2!, latitude: result.lat2! };
}

export function corridorEdge(alongKm: number, side: -1 | 1): ProfilePoint {
  return corridorEdgeForProfile(CUYO_PROFILE, alongKm, side);
}

// El mínimo se busca sobre la prolongación: proyectar al extremo más próximo
// admitiría falsamente eventos situados detrás de A o B.
export function projectToCuyo(longitude: number, latitude: number): { alongKm: number; crossKm: number } {
  return projectToProfile(CUYO_PROFILE, longitude, latitude);
}

export function projectToProfile(profile: ProfileDefinition, longitude: number, latitude: number): { alongKm: number; crossKm: number } {
  const fromA = geod.Inverse(profile.a.latitude, profile.a.longitude, latitude, longitude);
  const heading = ((fromA.azi1 ?? 0) - profile.initialAzimuth) * Math.PI / 180;
  const guess = (fromA.s12 ?? 0) * Math.cos(heading) / 1000;
  let left = Math.max(-150, guess - 85);
  let right = Math.min(profile.lengthKm + 150, guess + 85);
  const ratio = (Math.sqrt(5) - 1) / 2;
  const distance = (s: number) => {
    const foot = positionAtProfile(profile, s);
    return geod.Inverse(latitude, longitude, foot.latitude, foot.longitude).s12! / 1000;
  };
  let c = right - ratio * (right - left);
  let d = left + ratio * (right - left);
  let fc = distance(c);
  let fd = distance(d);
  while (right - left > 0.0005) { // menos de 1 m en la coordenada longitudinal
    if (fc < fd) {
      right = d;
      d = c;
      fd = fc;
      c = right - ratio * (right - left);
      fc = distance(c);
    } else {
      left = c;
      c = d;
      fc = fd;
      d = left + ratio * (right - left);
      fd = distance(d);
    }
  }
  const alongKm = (left + right) / 2;
  return { alongKm, crossKm: distance(alongKm) };
}

export function projectEvent(feature: InpresFeature): ProjectedEvent | null {
  return projectEventToProfile(feature, CUYO_PROFILE);
}

export function projectEventToProfile(feature: InpresFeature, profile: ProfileDefinition): ProjectedEvent | null {
  const [longitude, latitude] = feature.geometry.coordinates;
  // Preselección conservadora en grados, jamás reemplaza el criterio WGS84.
  if (
    longitude < profile.a.longitude - 2 || longitude > profile.b.longitude + 2
    || latitude < profile.latitude - 2 || latitude > profile.latitude + 2
  ) return null;
  const projected = projectToProfile(profile, longitude, latitude);
  if (projected.alongKm < 0 || projected.alongKm > profile.lengthKm || projected.crossKm > profile.halfWidthKm) return null;
  return { feature, ...projected };
}

export function selectCuyoEvents(features: InpresFeature[]): ProjectedEvent[] {
  return selectProfileEvents(features, CUYO_PROFILE);
}

export function selectProfileEvents(features: InpresFeature[], profile: ProfileDefinition): ProjectedEvent[] {
  const selected: ProjectedEvent[] = [];
  for (const feature of features) {
    const point = projectEventToProfile(feature, profile);
    if (point) selected.push(point);
  }
  return selected;
}

export function classifyDepth(depthKm: number): "superficial" | "intermedio" | "profundo" {
  if (depthKm < 0 || !Number.isFinite(depthKm)) throw new Error("Profundidad inválida");
  return depthKm < 70 ? "superficial" : depthKm < 300 ? "intermedio" : "profundo";
}

export function sampleGebco(artifact: GebcoArtifact, longitude: number, latitude: number): number | null {
  const { bbox, width, height, elevationMeters } = artifact.grid;
  const [west, south, east, north] = bbox;
  const x = (longitude - west) * width / (east - west) - 0.5;
  const y = (north - latitude) * height / (north - south) - 0.5;
  if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return null;
  const col = Math.min(width - 2, Math.floor(x));
  const row = Math.min(height - 2, Math.floor(y));
  const values = [elevationMeters[row * width + col], elevationMeters[row * width + col + 1], elevationMeters[(row + 1) * width + col], elevationMeters[(row + 1) * width + col + 1]];
  if (values.some((value) => value === null || !Number.isFinite(value))) return null;
  return bilinear(values as number[], x - col, y - row);
}

function bilinear(values: number[], x: number, y: number): number {
  return (1 - x) * (1 - y) * values[0] + x * (1 - y) * values[1]
    + (1 - x) * y * values[2] + x * y * values[3];
}

export function sampleSlab(artifact: Slab2Artifact, longitude: number, latitude: number): { depthKm: number; uncertaintyKm: number } | null {
  const { west, north, stepDegrees, width, height, depthKm, uncertaintyKm } = artifact.grid;
  const x = (longitude - west) / stepDegrees;
  const y = (north - latitude) / stepDegrees;
  if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return null;
  const col = Math.min(width - 2, Math.floor(x));
  const row = Math.min(height - 2, Math.floor(y));
  const indexes = [row * width + col, row * width + col + 1, (row + 1) * width + col, (row + 1) * width + col + 1];
  const depths = indexes.map((index) => depthKm[index]);
  const uncertainties = indexes.map((index) => uncertaintyKm[index]);
  // El artefacto ya aplica CLP a los nodos. Una celda con cualquier esquina
  // invalidada no se interpola ni se conecta con la siguiente celda válida.
  if ([...depths, ...uncertainties].some((value) => value === null || !Number.isFinite(value))) return null;
  return {
    depthKm: bilinear(depths as number[], x - col, y - row),
    uncertaintyKm: bilinear(uncertainties as number[], x - col, y - row),
  };
}

export function sampleCuyoProfile(gebco: GebcoArtifact, slab: Slab2Artifact): ProfileSample[] {
  return sampleProfile(gebco, slab, CUYO_PROFILE);
}

export function sampleProfile(gebco: GebcoArtifact, slab: Slab2Artifact, profile: ProfileDefinition): ProfileSample[] {
  const steps = Math.ceil(profile.lengthKm / profile.sampleStepKm);
  return Array.from({ length: steps + 1 }, (_, index) => {
    const alongKm = profile.lengthKm * index / steps;
    const point = positionAtProfile(profile, alongKm);
    return {
      alongKm, point,
      elevationMeters: sampleGebco(gebco, point.longitude, point.latitude),
      slab: sampleSlab(slab, point.longitude, point.latitude),
    };
  });
}
