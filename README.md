# Sismos Visuales

Visualización científica e interactiva de los sismos catalogados en Argentina y su distribución en profundidad. El usuario puede explorar el catálogo real en 3D, inspeccionar eventos y superponer modelos geográficos y geofísicos diferenciados.

**Estado:** snapshot de 80.470 eventos INPRES (2011–14/09/2026), relieve GEBCO 2026, cartografía IGN/Natural Earth y primera superficie diagnóstica Slab2 South America 2018. La proyección horizontal es una aproximación local sustituible. Ninguna superposición clasifica tectónicamente los eventos. Fecha objetivo del MVP: 15 de octubre de 2026.

## Principios

- Separar observaciones INPRES, modelos externos, derivados e interpretaciones.
- Mostrar profundidad, unidades, procedencia y limitaciones sin inventar datos ausentes.
- Medir el catálogo real antes de optimizar.
- Mantener el scraping y la normalización en el repositorio proveedor `inpres-sismos`.

## Requisitos y desarrollo local

- Node.js 20.9 o superior y npm.
- WebGL en el navegador.
- Sin servicios pagos ni variables obligatorias. El repositorio hermano `../inpres-sismos` permite preparar los datos sin red; si no está presente, el script descarga el snapshot fijado desde GitHub Raw.

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). `predev` verifica el export y genera el artefacto web automáticamente. La primera preparación y descarga del navegador procesan aproximadamente 41 MB; pueden tardar.

```bash
npm run lint
npm run typecheck
npm run data:validate
npm run build
```

`prebuild` prepara los mismos datos y `npm run build` genera la exportación estática en `out/`. Aún no existe deploy configurado. La suite científica se ejecuta con `npm test`.

## Snapshot y transformación web

- Proveedor: `Sismos-Argentina/inpres-sismos`, commit `81e230c782972a2996a32f1ef21d56a2ef22e2e7`.
- Entrada: `data/exports/sismos.geojson`, SHA-256 `ae37584d4e5b45ad9225a10f74d5a44609bf202bee8fdca2f295af2025344a44`, 41.059.737 bytes.
- El export contiene 31 `NaN` en `ubicacion_original`, sintaxis inválida para `JSON.parse`. `tools/prepare-inpres.mjs` verifica el hash, convierte **sólo esos 31 valores** a `null` y valida los 80.470 puntos. No cambia coordenadas, profundidad, magnitud ni otros campos.
- Salida estática same-origin: `public/data/generated/inpres-2026-09-14.geojson`, SHA-256 `685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82`, 41.059.768 bytes. Se genera localmente y está ignorada de forma específica; no se versiona el dataset pesado.
- Opcional: `SISMOS_INPRES_GEOJSON` indica una ruta de entrada alternativa; debe coincidir con el checksum fijado.

La vista inicial se centra en el área científica y mantiene cargado el catálogo completo; la navegación libre permite abrir el encuadre hasta el contexto territorial. El panel «Filtros» combina fecha, magnitud reportada y profundidad sin perder el estado al cerrarse. «Capas» agrupa la exageración del relieve y Slab2; «Información» conserva metodología y mediciones sin ocupar permanentemente el mapa. Para una comparación reproducible, usar build de producción y el protocolo de `docs/BENCHMARK_PLAN.md`.

Navegación: arrastrar para rotar, botón derecho para desplazar, doble clic para centrar el mapa en el punto señalado y rueda para acercar hacia la posición del cursor.
Con ambos botones del mouse presionados, arrastrar traslada la escena en sentido inverso al movimiento en pantalla e incluye el eje de profundidad según la inclinación de la cámara.

El control «Modelo Slab2» dentro de «Capas» activa la superficie modelada sin modificar la profundidad de los hipocentros. Los controles 1×/5×/10× exageran sólo GEBCO. Los artefactos web GEBCO, cartografía y Slab2 ya están incluidos; `npm run dev` no requiere sus fuentes raw. Para regenerar Slab2 con `SISMOS_DATA_DIR`, consultar [la herramienta](tools/slab2/README.md).

«Perfil andino» abre una sección este–oeste de ancho ±50 km que puede desplazarse entre 45°S y 22°S arrastrando la franja sobre el mapa o usando el control de latitud. Cuyo 31°S sigue siendo la posición inicial y la única selección cotejada independientemente; las demás latitudes, incluido el acceso rápido Jujuy 23°S, son exploratorias y se rotulan como tales.

## Documentación activa

- [Constitución científica y técnica](CLAUDE.md)
- [Alcance del MVP](docs/MVP_SCOPE.md)
- [Contrato de datos](docs/DATA_CONTRACT.md)
- [Benchmark inicial](docs/BENCHMARK_PLAN.md)
- [Sistema de diseño](docs/DESIGN_SYSTEM.md)
- [Perfil andino interactivo](docs/research/INTERACTIVE_LATITUDE_PROFILE.md)
- [Manifiesto y checksums](manifests/DATASET_MANIFEST.md)
- [Hoja de ruta](plans/04-hoja-de-ruta-y-fases.md)

Los planes y marcadores de posición anteriores se preservan en [el archivo histórico](archive/2026-09-pre-mvp/README.md); no definen el MVP vigente.
