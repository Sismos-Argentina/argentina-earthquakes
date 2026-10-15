import type { GebcoArtifact } from "../data/gebco";
import type { Slab2Artifact } from "../data/slab2";

export type RegionBounds = [west: number, south: number, east: number, north: number];

export function regionBounds(a: [number, number], b: [number, number]): RegionBounds {
  const bounds: RegionBounds = [Math.max(-85, Math.min(a[0], b[0])), Math.max(-72, Math.min(a[1], b[1])),
    Math.min(-20, Math.max(a[0], b[0])), Math.min(0, Math.max(a[1], b[1]))];
  if (!bounds.every(Number.isFinite) || bounds[2] - bounds[0] < 0.15 || bounds[3] - bounds[1] < 0.15) {
    throw new Error("Elegí una zona de al menos 0,15° por lado dentro del área cartográfica.");
  }
  return bounds;
}

export function insideRegion(longitude: number, latitude: number, bounds: RegionBounds): boolean {
  return longitude >= bounds[0] && longitude <= bounds[2] && latitude >= bounds[1] && latitude <= bounds[3];
}

// Recortes de celdas/nodos existentes, sin remuestreo ni relleno de nodata.
export function cropGebco(artifact: GebcoArtifact, bounds: RegionBounds): GebcoArtifact {
  const grid = artifact.grid;
  const [west, south, east, north] = grid.bbox;
  const dx = (east - west) / grid.width, dy = (north - south) / grid.height;
  const c0 = Math.max(0, Math.min(grid.width, Math.floor((bounds[0] - west) / dx) - 1));
  const c1 = Math.max(c0, Math.min(grid.width, Math.ceil((bounds[2] - west) / dx) + 1));
  const r0 = Math.max(0, Math.min(grid.height, Math.floor((north - bounds[3]) / dy) - 1));
  const r1 = Math.max(r0, Math.min(grid.height, Math.ceil((north - bounds[1]) / dy) + 1));
  const values: Array<number | null> = [];
  for (let row = r0; row < r1; row++) values.push(...grid.elevationMeters.slice(row * grid.width + c0, row * grid.width + c1));
  const stats = values.reduce((s,v)=>{if(v===null)s.nodataCells++;else{s.validCells++;s.minElevationMeters=Math.min(s.minElevationMeters,v);s.maxElevationMeters=Math.max(s.maxElevationMeters,v);}return s;},
    {validCells:0,nodataCells:0,minElevationMeters:Infinity,maxElevationMeters:-Infinity});
  if (!stats.validCells) { stats.minElevationMeters=0;stats.maxElevationMeters=0; }
  return { ...artifact, statistics:stats, grid: { ...grid, width: c1 - c0, height: r1 - r0,
    bbox: [west + c0 * dx, north - r1 * dy, west + c1 * dx, north - r0 * dy], elevationMeters: values } };
}

export function cropSlab(artifact: Slab2Artifact, bounds: RegionBounds): Slab2Artifact {
  const grid = artifact.grid, step = grid.stepDegrees;
  const c0 = Math.max(0, Math.min(grid.width, Math.floor((bounds[0] - grid.west) / step) - 1));
  const c1 = Math.max(c0, Math.min(grid.width, Math.ceil((bounds[2] - grid.west) / step) + 2));
  const r0 = Math.max(0, Math.min(grid.height, Math.floor((grid.north - bounds[3]) / step) - 1));
  const r1 = Math.max(r0, Math.min(grid.height, Math.ceil((grid.north - bounds[1]) / step) + 2));
  const depthKm: Array<number | null> = [], uncertaintyKm: Array<number | null> = [];
  for (let row = r0; row < r1; row++) {
    depthKm.push(...grid.depthKm.slice(row * grid.width + c0, row * grid.width + c1));
    uncertaintyKm.push(...grid.uncertaintyKm.slice(row * grid.width + c0, row * grid.width + c1));
  }
  return { ...artifact, grid: { ...grid, west: grid.west + c0 * step, north: grid.north - r0 * step,
    width: Math.max(0, c1 - c0), height: Math.max(0, r1 - r0), depthKm, uncertaintyKm },
    summary: { ...artifact.summary, validNodes: depthKm.filter(v => v !== null).length } };
}
