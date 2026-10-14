// Only generated export files may be removed; source media are never changed.
import { readFile, unlink, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canPublishHistoricalPhoto } from "../src/lib/story/media-policy.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "out");
const manifest = JSON.parse(await readFile(path.join(root, "public/data/generated/historical/media-manifest.json"), "utf8"));
let removed = 0;
for (const media of manifest.media) {
  if (canPublishHistoricalPhoto(media.photoId)) continue;
  const target = path.resolve(outputRoot, `.${media.url}`);
  const relative = path.relative(outputRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !relative.startsWith(`data${path.sep}generated${path.sep}historical${path.sep}fotos_historicas${path.sep}`)) {
    throw new Error("Ruta de export no permitida en el manifiesto histórico.");
  }
  try {
    await access(target);
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  if (!process.argv.includes("--strip")) throw new Error(`Imagen sin permisos en export: ${relative}`);
  await unlink(target);
  removed++;
}
console.log(`Publicación histórica verificada: ${removed} derivados no autorizados retirados solo de out/. Originales y metadatos conservados.`);
