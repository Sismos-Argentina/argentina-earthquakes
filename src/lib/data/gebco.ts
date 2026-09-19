export type GebcoProfile = "scientific" | "context";

export const GEBCO_PROFILES = {
  scientific: {
    url: "/data/generated/gebco-2026-scientific.json",
    bytes: 9892637,
    bbox: [-85, -72, -20, 0] as const,
    dimensions: [1300, 1440] as const,
  },
  context: {
    url: "/data/generated/gebco-2026-context.json",
    bytes: 583677,
    bbox: [-100, -90, 8, 0] as const,
    dimensions: [360, 300] as const,
  },
} as const;

export type GebcoArtifact = {
  schemaVersion: 2;
  profile: GebcoProfile;
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

export function assertGebcoArtifact(
  value: unknown,
  expectedProfile: GebcoProfile,
  expectedDimensions: readonly [number, number] = GEBCO_PROFILES[expectedProfile].dimensions,
): asserts value is GebcoArtifact {
  if (!value || typeof value !== "object") {
    throw new Error("El artefacto GEBCO no es un objeto.");
  }
  const artifact = value as Partial<GebcoArtifact>;
  const grid = artifact.grid;
  const expected = GEBCO_PROFILES[expectedProfile];
  if (
    artifact.schemaVersion !== 2 ||
    artifact.profile !== expectedProfile ||
    artifact.dataset?.category !== "external-elevation-bathymetry-model" ||
    artifact.dataset.version !== "GEBCO_2026" ||
    artifact.dataset.crs !== "EPSG:4326" ||
    artifact.dataset.units !== "meters" ||
    !grid ||
    grid.width !== expectedDimensions[0] ||
    grid.height !== expectedDimensions[1] ||
    grid.rowOrder !== "north-to-south" ||
    grid.columnOrder !== "west-to-east" ||
    !Array.isArray(grid.bbox) ||
    !Array.isArray(grid.elevationMeters) ||
    grid.elevationMeters.length !== grid.width * grid.height ||
    grid.bbox.some((coordinate, index) => coordinate !== expected.bbox[index])
  ) {
    throw new Error(`El perfil GEBCO ${expectedProfile} no coincide con el contrato.`);
  }
}
