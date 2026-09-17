export const SLAB2_URL = "/data/generated/slab2-sam-2018-scientific.json";

export type Slab2Artifact = {
  schemaVersion: 1;
  dataset: "USGS Slab2 South America";
  modelVersion: "02.23.18";
  modelType: "geophysical-model-not-observation";
  sourceDoi: string;
  sourceSha256: Record<"dep" | "unc" | "clp", string>;
  method: string;
  horizontalReference: string;
  verticalReference: string;
  grid: {
    west: number;
    north: number;
    stepDegrees: number;
    width: number;
    height: number;
    depthKm: Array<number | null>;
    uncertaintyKm: Array<number | null>;
  };
  summary: {
    validNodes: number;
    maskedNodes: number;
    uncertaintyNodes: number;
    depthRangeKm: [number, number];
    uncertaintyRangeKm: [number, number];
    uncertaintyMedianKm: number;
    sanityDepthKm: Record<string, number>;
  };
};

export function assertSlab2Artifact(value: unknown): asserts value is Slab2Artifact {
  if (!value || typeof value !== "object") throw new Error("Slab2 no es un objeto");
  const artifact = value as Partial<Slab2Artifact>;
  const grid = artifact.grid;
  if (
    artifact.schemaVersion !== 1 ||
    artifact.modelVersion !== "02.23.18" ||
    artifact.modelType !== "geophysical-model-not-observation" ||
    !grid || grid.west !== -82 || grid.north !== -18 ||
    grid.stepDegrees !== 0.1 || grid.width !== 241 || grid.height !== 311 ||
    !Array.isArray(grid.depthKm) || !Array.isArray(grid.uncertaintyKm) ||
    grid.depthKm.length !== grid.width * grid.height ||
    grid.uncertaintyKm.length !== grid.depthKm.length ||
    !artifact.summary || artifact.summary.validNodes < 10000
  ) {
    throw new Error("El artefacto Slab2 no coincide con el contrato esperado");
  }
}
