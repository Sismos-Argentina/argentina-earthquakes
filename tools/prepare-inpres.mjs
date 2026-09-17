import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localSource = path.resolve(
  projectRoot,
  "../inpres-sismos/data/exports/sismos.geojson",
);
const output = path.join(
  projectRoot,
  "public/data/generated/inpres-2026-09-14.geojson",
);

// Snapshot from inpres-sismos, not a live feed.
const sourceCommit = "81e230c782972a2996a32f1ef21d56a2ef22e2e7";
const sourceSha256 =
  "ae37584d4e5b45ad9225a10f74d5a44609bf202bee8fdca2f295af2025344a44";
const sourceUrl = `https://raw.githubusercontent.com/Sismos-Argentina/inpres-sismos/${sourceCommit}/data/exports/sismos.geojson`;
const expectedCount = 80470;
const expectedInvalidLocations = 31;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function loadSource() {
  const customPath = process.env.SISMOS_INPRES_GEOJSON;
  const inputPath = customPath ? path.resolve(customPath) : localSource;

  try {
    const bytes = await readFile(inputPath);
    if (customPath || sha256(bytes) === sourceSha256) {
      return { bytes, origin: inputPath };
    }
    console.log("El export local cambió; descargando el snapshot fijado.");
  } catch (error) {
    if (customPath || error.code !== "ENOENT") throw error;
    console.log("No se encontró el export local; descargando el snapshot fijado.");
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Descarga INPRES fallida: HTTP ${response.status}`);
  }
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    origin: sourceUrl,
  };
}

const { bytes, origin } = await loadSource();
const actualSourceHash = sha256(bytes);
if (actualSourceHash !== sourceSha256) {
  throw new Error(
    `Checksum INPRES inesperado (${actualSourceHash}). Se esperaba ${sourceSha256}; no se generó el artefacto web.`,
  );
}

const rawText = bytes.toString("utf8");
const invalidValue = '"ubicacion_original": NaN';
const occurrences = rawText.split(invalidValue).length - 1;
if (occurrences !== expectedInvalidLocations) {
  throw new Error(
    `Se esperaban ${expectedInvalidLocations} valores NaN en ubicacion_original; aparecieron ${occurrences}.`,
  );
}

// Única transformación: NaN no pertenece a JSON. No altera eventos ni números.
const webText = rawText.replaceAll(
  invalidValue,
  '"ubicacion_original": null',
);
const catalog = JSON.parse(webText);
if (
  catalog.type !== "FeatureCollection" ||
  !Array.isArray(catalog.features) ||
  catalog.features.length !== expectedCount
) {
  throw new Error("El export no coincide con el esquema/cantidad fijados.");
}

for (const [index, feature] of catalog.features.entries()) {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;
  if (
    feature.geometry?.type !== "Point" ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !coordinates.every(Number.isFinite) ||
    !Number.isFinite(properties?.profundidad) ||
    !Number.isFinite(properties?.magnitud) ||
    !Number.isFinite(properties?.latitud) ||
    !Number.isFinite(properties?.longitud)
  ) {
    throw new Error(`Evento ${index} no cumple el esquema esperado.`);
  }
}

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, webText, "utf8");
console.log(
  JSON.stringify(
    {
      source: origin,
      sourceCommit,
      sourceSha256,
      events: catalog.features.length,
      nullLocations: occurrences,
      output: path.relative(projectRoot, output),
      outputBytes: Buffer.byteLength(webText),
      outputSha256: sha256(webText),
    },
    null,
    2,
  ),
);
