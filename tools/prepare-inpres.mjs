import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localSource = path.resolve(
  projectRoot,
  "../inpres-sismos/data/exports/sismos.geojson",
);
const snapshot = JSON.parse(await readFile(path.join(projectRoot,"src/data/catalog-snapshot.json"),"utf8"));
const output = path.join(projectRoot,"public",snapshot.url);
const {sourceCommit,sourceSha256,webSha256} = snapshot;
const sourceUrl = `https://raw.githubusercontent.com/Sismos-Argentina/inpres-sismos/${sourceCommit}/data/exports/sismos.geojson`;
const expectedCount = snapshot.events;
const expectedInvalidLocations = snapshot.invalidLocations ?? 31;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function loadSource() {
  // Reutilizar el artefacto web fijado permite probar/build sin red ni drift.
  try {
    const webBytes = await readFile(output);
    if (sha256(webBytes) === webSha256) {
      console.log(`Snapshot web local verificado: ${snapshot.events} eventos, ${snapshot.date}.`);
      process.exit(0);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const customPath = process.env.SISMOS_INPRES_GEOJSON;
  const inputPath = customPath ? path.resolve(customPath) : localSource;

  try {
    const bytes = await readFile(inputPath);
    if (customPath || sha256(bytes) === sourceSha256) {
      return { bytes, origin: inputPath };
    }
    console.log("El export local cambió; el snapshot web no se actualiza automáticamente.");
  } catch (error) {
    if (customPath || error.code !== "ENOENT") throw error;
    console.log("No se encontró el export local fijado.");
  }

  if (process.env.SISMOS_ALLOW_PINNED_DOWNLOAD !== "1") {
    throw new Error("Falta el snapshot local verificado. No se descargan datos automáticamente. Ver README para preparar el snapshot fijado con autorización explícita.");
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

if (sha256(webText) !== webSha256) throw new Error("El hash web no coincide con el snapshot fijado.");
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
