export const CARTOGRAPHY_URL =
  "/data/generated/cartography-argentina-context.json";

export type CartographicLine = [number, number][];

export type CartographicFeature = {
  name: string;
  code: string | null;
  sovereignty?: string;
  lines: CartographicLine[];
};

export type CartographyArtifact = {
  schemaVersion: 1;
  crs: "EPSG:4326";
  territorialBbox: [number, number, number, number];
  gebcoContextBbox: [number, number, number, number];
  sources: {
    ign: { agency: "Instituto Geográfico Nacional (IGN)"; sourceSha256: string };
    naturalEarth: { agency: "Natural Earth"; version: "5.1.1" };
  };
  layers: {
    ignProvinces: CartographicFeature[];
    naturalEarthCountries: CartographicFeature[];
  };
  diagnostics: {
    ignJurisdictions: number;
    naturalEarthFeatures: number;
    includesTierraDelFuego: boolean;
    includesMalvinas: boolean;
    includesAntarcticaTo90S: boolean;
  };
};

export function assertCartographyArtifact(
  value: unknown,
): asserts value is CartographyArtifact {
  if (!value || typeof value !== "object") {
    throw new Error("La cartografía no es un objeto.");
  }
  const artifact = value as Partial<CartographyArtifact>;
  const diagnostics = artifact.diagnostics;
  if (
    artifact.schemaVersion !== 1 ||
    artifact.crs !== "EPSG:4326" ||
    artifact.sources?.ign?.agency !== "Instituto Geográfico Nacional (IGN)" ||
    artifact.sources?.naturalEarth?.version !== "5.1.1" ||
    !Array.isArray(artifact.layers?.ignProvinces) ||
    artifact.layers.ignProvinces.length !== 24 ||
    !Array.isArray(artifact.layers?.naturalEarthCountries) ||
    !diagnostics?.includesTierraDelFuego ||
    !diagnostics.includesMalvinas ||
    !diagnostics.includesAntarcticaTo90S
  ) {
    throw new Error("La cartografía no coincide con el contrato esperado.");
  }
}
