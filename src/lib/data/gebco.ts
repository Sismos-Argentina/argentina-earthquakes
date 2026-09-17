export const GEBCO_URL = "/data/generated/gebco-2026-provisional.json";
export const GEBCO_ARTIFACT_BYTES = 450758;
export const GEBCO_DIMENSIONS = [256, 358] as const;
export const GEBCO_PROVISIONAL_BBOX = [-80, -46, -60, -18] as const;

export type GebcoArtifact = {
  schemaVersion: 1;
  dataset: {
    name: string;
    version: "GEBCO_2026";
    category: "external-elevation-bathymetry-model";
    crs: "EPSG:4326";
    verticalReference: string;
    units: "meters";
  };
  grid: {
    bbox: [number, number, number, number];
    bboxStatus: string;
    width: number;
    height: number;
    registration: "cell-center";
    rowOrder: "north-to-south";
    columnOrder: "west-to-east";
    cellSizeDegrees: [number, number];
    nodata: null;
    elevationMeters: Array<number | null>;
  };
  statistics: {
    validCells: number;
    nodataCells: number;
    minElevationMeters: number;
    maxElevationMeters: number;
  };
};

export function assertGebcoArtifact(value: unknown): asserts value is GebcoArtifact {
  if (!value || typeof value !== "object") {
    throw new Error("El artefacto GEBCO no es un objeto.");
  }
  const artifact = value as Partial<GebcoArtifact>;
  const grid = artifact.grid;
  if (
    artifact.schemaVersion !== 1 ||
    artifact.dataset?.category !== "external-elevation-bathymetry-model" ||
    artifact.dataset.version !== "GEBCO_2026" ||
    artifact.dataset.crs !== "EPSG:4326" ||
    artifact.dataset.units !== "meters" ||
    !grid ||
    grid.width !== GEBCO_DIMENSIONS[0] ||
    grid.height !== GEBCO_DIMENSIONS[1] ||
    grid.rowOrder !== "north-to-south" ||
    grid.columnOrder !== "west-to-east" ||
    !Array.isArray(grid.bbox) ||
    !Array.isArray(grid.elevationMeters) ||
    grid.elevationMeters.length !== grid.width * grid.height ||
    grid.bbox.some((coordinate, index) => coordinate !== GEBCO_PROVISIONAL_BBOX[index])
  ) {
    throw new Error("El artefacto GEBCO no coincide con el prototipo esperado.");
  }
}
