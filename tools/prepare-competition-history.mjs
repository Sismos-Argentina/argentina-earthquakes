// Curación de exports existentes; no scraping, descargas ni cambios al proveedor.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const provider = path.resolve(root, "../inpres-sismos");
const providerCommit = "c5634cac3bb3d3757ed79dfd897b58c128fb5798";
if (execFileSync("git", ["rev-parse", "HEAD"], { cwd: provider, encoding: "utf8" }).trim() !== providerCommit) {
  throw new Error("El proveedor no coincide con el commit histórico fijado.");
}
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exportsRoot = path.join(provider, "data/exports");
const historicalBytes = await readFile(path.join(exportsRoot, "sismos_historicos.json"));
const photoBytes = await readFile(path.join(exportsRoot, "fotos_historicas.json"));
const historical = JSON.parse(historicalBytes);
const photos = JSON.parse(photoBytes);
const selection = [
  { date: "1894-10-27", photoId: "f1889208", place: "San Juan", title: "Un recuerdo en el archivo",
    text: "Afectó el noroeste de San Juan y causó daños también en La Rioja.",
    note: "INPRES lo describe como el terremoto de mayor magnitud de la historia argentina. Este catálogo no aporta una magnitud instrumental numérica.",
    alt: "Fotografía de archivo: muros derrumbados, vigas expuestas y escombros en Angaco, San Juan, en 1894." },
  { date: "1944-01-15", photoId: "7dd69738", place: "San Juan", title: "La memoria de una ciudad",
    text: "El catálogo registra destrucción en San Juan y daños en el norte de Mendoza.",
    note: "La intensidad describe los efectos reportados en superficie.",
    alt: "Fotografía de archivo: fachada dañada de la Catedral de San Juan y escombros junto a la calle después del terremoto de 1944." },
  { date: "1977-11-23", photoId: "008290c6", place: "Caucete, San Juan", title: "La huella vuelve a aparecer",
    text: "El terremoto destruyó construcciones de Caucete y afectó otros departamentos de San Juan y el norte de Mendoza.",
    note: "Una fotografía conserva efectos visibles; no muestra la profundidad del hipocentro.",
    alt: "Fotografía de archivo: construcción de adobe derrumbada, árboles y escombros en Caucete después del terremoto de 1977." },
  { date: "2015-10-17", photoId: "d75bfc2b", place: "El Galpón, Salta", title: "La historia también está al norte",
    text: "INPRES documenta viviendas dañadas, demolidas y apuntaladas en El Galpón.",
    note: "Estos son algunos de los terremotos que recordamos. Bajo esa memoria, un catálogo de más de 80.000 eventos permite mirar otra dimensión: la profundidad.",
    alt: "Fotografía de archivo: viviendas con muros dañados y escombros en una calle de El Galpón, Salta, después del terremoto de 2015." },
];
const media = [];
const scenes = [];
const extraPhotos = {
  "1894-10-27": [
    { id: "79d1934c", alt: "Fotografía de archivo: edificios derrumbados y escombros del establecimiento de fundición de Malimán, San Juan, en 1894." },
    { id: "fa7a69a8", alt: "Fotografía de archivo: una persona junto a una grieta visible en el terreno de Mogna, San Juan, en 1894." },
    { id: "c6dbad85", alt: "Fotografía de archivo: muros sin techo, vigas caídas, barriles y escombros entre la vegetación en Angaco, San Juan, en 1894." },
    { id: "eb4a64e3", alt: "Fotografía de archivo: terreno irregular con grietas y vegetación en Angaco, San Juan, en 1894; INPRES la titula Licuefacción, Angaco." },
  ],
  "1944-01-15": [
    { id: "e7e276bc", alt: "Fotografía de archivo: fachada de la Casa de Sarmiento con daños y escombros junto a la vereda en San Juan, en 1944." },
    { id: "4b59c268", alt: "Fotografía de archivo: cúpula dañada de la iglesia Santo Domingo, muros incompletos y vegetación en San Juan, en 1944." },
    { id: "4163d2c9", alt: "Fotografía de archivo: calle céntrica con fachadas derrumbadas, vigas inclinadas y montones de escombros en San Juan, en 1944." },
    { id: "746f39b6", alt: "Fotografía de archivo: tribuna del estadio con gradas y muros derrumbados, junto a árboles en San Juan después del terremoto de 1944." },
  ],
  "1977-11-23": [
    { id: "035e79cc", alt: "Fotografía de archivo: estructura de una bodega con losas y columnas dañadas e inclinadas después del terremoto de Caucete de 1977." },
    { id: "6d794f70", alt: "Fotografía de archivo: dos personas frente a escaleras y estructuras derrumbadas de la Escuela Normal después del terremoto de Caucete de 1977." },
    { id: "81380b82", alt: "Fotografía de archivo: detalle de un riel sobre terreno agrietado y piedras, publicado en la galería del terremoto de Caucete de 1977." },
    { id: "de061e8a", alt: "Fotografía de archivo: tanques cilíndricos con grietas y partes caídas, junto a barriles en el suelo después del terremoto de Caucete de 1977." },
  ],
  "2015-10-17": [
    { id: "1b024eb6", alt: "Fotografía de archivo: escombros y chapas caídas junto a una calle, árboles y viviendas en El Galpón, Salta, en 2015." },
    { id: "acd873a9", alt: "Fotografía de archivo: automóvil parcialmente cubierto por una estructura de techo caída, muros y escombros en El Galpón, Salta, en 2015." },
    { id: "73427a3d", alt: "Fotografía de archivo: vivienda de paredes verdes con un muro derrumbado, árboles y una pila de ladrillos en El Galpón, Salta, en 2015." },
    { id: "d4bf6b0b", alt: "Fotografía de archivo: otra vista de una vivienda dañada, con muros incompletos, techos caídos y escombros en El Galpón, Salta, en 2015." },
  ],
};
for (const chosen of selection) {
  const event = historical.eventos.find((e) => e.fecha_iso === chosen.date);
  const gallery = photos.galerias.find((g) => g.fecha_iso === chosen.date && g.ambito === "argentina");
  const selectedPhotos = [];
  for (const selected of [{ id: chosen.photoId, alt: chosen.alt }, ...extraPhotos[chosen.date]]) {
  const photo = gallery?.fotos.find((p) => p.id === selected.id);
  if (!event || !photo || !event.fotos.some((p) => p.id === photo.id)) throw new Error(`Selección inválida: ${chosen.date}`);
  const variants = [];
  for (const sourcePath of [photo.miniatura, photo.archivo]) {
    const bytes = await readFile(path.join(exportsRoot, sourcePath));
    const target = `public/data/generated/historical/${sourcePath}`;
    await mkdir(path.dirname(path.join(root, target)), { recursive: true });
    await copyFile(path.join(exportsRoot, sourcePath), path.join(root, target));
    const url = `/${target.slice(7)}`;
    variants.push(url);
    media.push({ eventId: event.id, eventDate: event.fecha_iso, photoId: photo.id,
      providerPath: `data/exports/${sourcePath}`, file: target, url,
      sha256: digest(bytes), bytes: bytes.length, sourceUrl: photo.fuente_url,
      galleryUrl: gallery.pagina_fuente, originalAvailable: photo.original_disponible,
      credit: "Archivo publicado por INPRES; autor no consignado en el manifiesto",
      license: "pending-review" });
  }
  selectedPhotos.push({ id: photo.id, title: photo.titulo, thumbnail: variants[0], src: variants[1],
    width: photo.ancho_optimizado, height: photo.alto_optimizado, alt: selected.alt,
    credit: "Archivo INPRES · autor y licencia pendientes de verificación" });
  }
  scenes.push({ id: event.id, date: event.fecha_iso, place: chosen.place,
    title: chosen.title, text: chosen.text, note: chosen.note,
    sourceDescription: event.descripcion, mercalli: event.intensidad_mercalli,
    sourceUrl: historical.source.catalog_url, galleryUrl: gallery.pagina_fuente,
    photos: selectedPhotos });
}
const provenance = { provider: "Sismos-Argentina/inpres-sismos", providerCommit,
  catalogGeneratedAt: historical.generated_at, photosGeneratedAt: photos.generated_at,
  inputs: [ { file: "data/exports/sismos_historicos.json", sha256: digest(historicalBytes) },
    { file: "data/exports/fotos_historicas.json", sha256: digest(photoBytes) },
    { file: "data/sismos_historicos.csv", sha256: digest(await readFile(path.join(provider, "data/sismos_historicos.csv"))) } ] };
await mkdir(path.join(root, "src/data"), { recursive: true });
await writeFile(path.join(root, "src/data/competition-history.json"), JSON.stringify({ schemaVersion: 1, provenance, scenes }, null, 2) + "\n");
await writeFile(path.join(root, "public/data/generated/historical/media-manifest.json"), JSON.stringify({ schemaVersion: 1, provenance, publication: "local-prototype-only", media }, null, 2) + "\n");
console.log(`${scenes.length} escenas, ${media.length} derivados existentes, ${media.reduce((n, m) => n + m.bytes, 0)} bytes.`);
