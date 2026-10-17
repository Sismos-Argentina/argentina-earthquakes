import { geographicToScene } from "./scene-coordinates.ts";
import type { RegionBounds } from "./region";

export const TERRITORY_BOUNDS: RegionBounds = [-85, -90, -20, 0];
export type Point3 = [number, number, number];
export type PlanViewport = { x: number; z: number; span: number };

export function navigationEnvelope(bounds: RegionBounds, aspect: number, depth = 800, regional = false) {
  const [west, , north] = geographicToScene(bounds[0], bounds[3], 0);
  const [east, , south] = geographicToScene(bounds[2], bounds[1], 0);
  const width = east - west, height = south - north;
  const fit = Math.max(width / Math.max(.2, aspect), height, depth) / (2 * Math.tan(44 * Math.PI / 360));
  const margin = regional ? .03 : .015;
  return {
    min: [west - width * margin, -depth, north - height * margin] as Point3,
    max: [east + width * margin, regional ? 30 : 200, south + height * margin] as Point3,
    minDistance: regional ? Math.max(5, Math.min(35, Math.min(width, height) * .12)) : 35,
    maxDistance: Math.max(200, fit * (regional ? 1.6 : 1.2)),
  };
}

export function constrainCamera(position: Point3, target: Point3, limits: ReturnType<typeof navigationEnvelope>) {
  const center = target.map((value, axis) => Math.max(limits.min[axis], Math.min(limits.max[axis], Number.isFinite(value) ? value : 0))) as Point3;
  let offset = position.map((value, axis) => value - target[axis]) as Point3;
  let distance = Math.hypot(...offset);
  if (!Number.isFinite(distance) || distance < 1e-6) { offset = [0, 1, 1]; distance = Math.SQRT2; }
  const bounded = Math.max(limits.minDistance, Math.min(limits.maxDistance, distance));
  return { target: center, position: center.map((value, axis) => value + offset[axis] * bounded / distance) as Point3 };
}

export function constrainPlanView(view: PlanViewport, aspect: number): PlanViewport {
  const limits = navigationEnvelope(TERRITORY_BOUNDS, aspect);
  const maxSpan = Math.max(limits.max[0] - limits.min[0], (limits.max[2] - limits.min[2]) * Math.max(.2, aspect)) * 1.08;
  return {
    x: Math.max(limits.min[0], Math.min(limits.max[0], Number.isFinite(view.x) ? view.x : 0)),
    z: Math.max(limits.min[2], Math.min(limits.max[2], Number.isFinite(view.z) ? view.z : 0)),
    span: Math.max(30, Math.min(maxSpan, Number.isFinite(view.span) ? view.span : maxSpan)),
  };
}
