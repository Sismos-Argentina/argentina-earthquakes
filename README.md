# Sismos Visuales

Primer vertical slice: exploracion 3D de 80.470 sismos reales del catalogo INPRES. Esta escena de prueba no incluye terreno, cartografia oficial ni modelos tectonicos.

## Desarrollo local

Requisitos: Node.js 20.9 o superior, npm y un navegador con WebGL. No hacen falta servicios pagos ni variables de entorno obligatorias.

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. El comando `predev` prepara automaticamente el GeoJSON. Si existe un repositorio hermano `../inpres-sismos` con el snapshot esperado, se usa localmente; si falta o cambio, se descarga el commit fijado desde GitHub Raw. La primera preparacion y descarga en el navegador procesan unos 41 MB.

```bash
npm run lint
npm run typecheck
npm run build
```

`prebuild` prepara los datos y `npm run build` genera un sitio estatico en `out/`. No hay suite automatizada de tests ni deploy configurado todavia.

## Snapshot reproducible

- Proveedor: `Sismos-Argentina/inpres-sismos`, commit `81e230c782972a2996a32f1ef21d56a2ef22e2e7`.
- Entrada: `data/exports/sismos.geojson`, SHA-256 `ae37584d4e5b45ad9225a10f74d5a44609bf202bee8fdca2f295af2025344a44`, 41.059.737 bytes.
- El export contiene 31 `NaN` en `ubicacion_original` (JSON invalido). `tools/prepare-inpres.mjs` verifica el hash y convierte solo esos valores a `null`; valida los 80.470 eventos.
- Salida: `public/data/generated/inpres-2026-09-14.geojson`, SHA-256 `685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82`, 41.059.768 bytes. Se sirve desde el mismo origen, se genera localmente y no se versiona.
- Opcional: `SISMOS_INPRES_GEOJSON` permite indicar una ruta de entrada; su contenido debe tener el checksum fijado.

La escena usa una aproximacion equirectangular local (no apta para medir distancias geodesicas). La profundidad aumenta hacia abajo, sin exageracion vertical. La cuadricula es una referencia de 0 km, no topografia. El inspector muestra los campos disponibles sin asignar un tipo de magnitud desconocido. El panel de mediciones muestra tiempos, memoria cuando esta disponible, FPS y picking orientativos de la sesion.
