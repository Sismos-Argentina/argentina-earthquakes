# Sismos Visuales

Visualización científica e interactiva de los sismos catalogados en Argentina y su distribución en profundidad. El usuario puede explorar el catálogo real en 3D, inspeccionar eventos y superponer modelos geográficos y geofísicos diferenciados.

**Estado:** snapshot de 80.850 eventos INPRES (2011–14/10/2026), relieve GEBCO 2026, cartografía IGN/Natural Earth y primera superficie diagnóstica Slab2 South America 2018. La proyección horizontal es una aproximación local sustituible. Ninguna superposición clasifica tectónicamente los eventos. Fecha objetivo del MVP: 15 de octubre de 2026.

## Principios

- Separar observaciones INPRES, modelos externos, derivados e interpretaciones.
- Mostrar profundidad, unidades, procedencia y limitaciones sin inventar datos ausentes.
- Medir el catálogo real antes de optimizar.
- Mantener el scraping y la normalización en el repositorio proveedor `inpres-sismos`.

## Requisitos y desarrollo local

- Node.js 20.9 o superior y npm.
- WebGL en el navegador.
- Sin servicios pagos ni variables obligatorias en ejecución. Se necesita el artefacto web fijado o el export original con el checksum esperado; el repositorio hermano `../inpres-sismos` puede aportarlo. No se descarga un catálogo automáticamente.

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). `predev` verifica el export y genera el artefacto web automáticamente. La primera preparación y descarga del navegador procesan aproximadamente 41 MB; pueden tardar.

Si ya existe el artefacto web con el hash fijado, se reutiliza sin red. Si falta,
`SISMOS_INPRES_GEOJSON` permite proporcionar el export original. Sólo cuando se
autorice obtener ese mismo snapshot, `SISMOS_ALLOW_PINNED_DOWNLOAD=1` habilita su
descarga desde el commit fijado. Esta opción no sigue `main` ni actualiza datos.

```bash
npm run lint
npm run typecheck
npm run data:validate
npm run build
```

`prebuild` prepara los mismos datos y `npm run build` genera la exportación estática en `out/`. `netlify.toml` configura ese build y permite descargar exclusivamente el snapshot fijado si falta en el entorno de construcción. Un build local no publica una versión. La suite científica se ejecuta con `npm test`.

## Snapshot y transformación web

- Proveedor: `Sismos-Argentina/inpres-sismos`, commit `a87088128f5e87566979e4c9bc186dcdff85b47a`.
- Entrada: `data/exports/sismos.geojson`, SHA-256 `d1a53fa2743f08b49288756b0116892ed4b8d1f4e10d3017cd27362e8549327e`, 41.252.711 bytes.
- El export contiene 31 `NaN` en `ubicacion_original`, sintaxis inválida para `JSON.parse`. `tools/prepare-inpres.mjs` verifica el hash, convierte **sólo esos 31 valores** a `null` y valida los 80.850 puntos. No cambia coordenadas, profundidad, magnitud ni otros campos.
- Salida estática same-origin: `public/data/generated/inpres-2026-10-14.geojson`, SHA-256 `eb856bc832c11ff3d16d644cd96be717d5791aa7c0e2db291578349596a8ccbf`, 41.252.742 bytes. Se genera localmente y está ignorada de forma específica; no se versiona el dataset pesado.
- Opcional: `SISMOS_INPRES_GEOJSON` indica una ruta de entrada alternativa; debe coincidir con el checksum fijado.

La vista inicial se centra en el área científica y mantiene cargado el catálogo completo; la navegación libre permite abrir el encuadre hasta el contexto territorial. Las acciones aparecen una sola vez: directamente en pantallas amplias, parcialmente bajo «Más» en tamaños intermedios y bajo «Explorar» en móvil. «Filtros» combina fecha, magnitud y profundidad, simultáneamente cuando caben o mediante pestañas. El control flotante «Capas» agrupa superficie, relieve y placa de Nazca; «Información y fuentes» (?) conserva metodología y criterios. Las mediciones técnicas sólo se habilitan mediante `?diagnostico=1`. Para comparar rendimiento, usar build de producción y `docs/BENCHMARK_PLAN.md`.

Navegación: arrastrar para rotar, botón derecho para desplazar, doble clic para centrar el mapa en el punto señalado y rueda para acercar hacia la posición del cursor.
Con ambos botones del mouse presionados, arrastrar traslada la escena en sentido inverso al movimiento en pantalla e incluye el eje de profundidad según la inclinación de la cámara.

«Capas → Placa de Nazca» activa Slab2 sin modificar la profundidad de los hipocentros. Los controles 1×/5×/10× exageran sólo GEBCO. Los artefactos web GEBCO, cartografía y Slab2 ya están incluidos; `npm run dev` no requiere sus fuentes raw. Para regenerar Slab2 con `SISMOS_DATA_DIR`, consultar [la herramienta](tools/slab2/README.md).

«Comparar San Juan y Mendoza» abre las secciones 31°S y 35°S con período, corredor ±50 km y rango 0–700 km comunes. «Corte A–B» permite elegir otra línea geodésica; «Elegir zona 3D» dibuja un rectángulo por arrastre en cualquier dirección, con mouse o un dedo, y confirmación. La zona conserva un localizador; el mapa 2D comparte catálogo, filtros y colores. La leyenda puede representar profundidad o magnitud reportada.

## Documentación activa

- [Constitución científica y técnica](CLAUDE.md)
- [Alcance del MVP](docs/MVP_SCOPE.md)
- [Contrato de datos](docs/DATA_CONTRACT.md)
- [Benchmark inicial](docs/BENCHMARK_PLAN.md)
- [Sistema de diseño](docs/DESIGN_SYSTEM.md)
- [Perfil andino interactivo](docs/research/INTERACTIVE_LATITUDE_PROFILE.md)
- [Manifiesto y checksums](manifests/DATASET_MANIFEST.md)
- [Experiencia de competencia: decisión y alcance](docs/research/competition-experience-plan.md)
- [Auditoría final del prototipo](docs/research/competition-experience-review.md)
- [Diagnóstico de actualización del catálogo](docs/research/catalog-refresh-diagnosis.md)
- [Revisión de calidad del catálogo y controles del mapa](docs/research/catalog-quality-and-map-controls-review.md)
- [Hoja de ruta](plans/04-hoja-de-ruta-y-fases.md)

Los planes y marcadores de posición anteriores se preservan en [el archivo histórico](archive/2026-09-pre-mvp/README.md); no definen el MVP vigente.

## Archivo histórico y preparación

La entrada pública abre la exploración libre. «Memoria histórica» lleva a
`/memoria/`: 80 terremotos documentados entre 1692 y 2021, con búsqueda y una
selección de diez casos con galerías. La fuente común aparece una vez arriba y
cada caso enlaza únicamente a sus fotografías oficiales disponibles. Mercalli
describe efectos; estos registros no se vinculan automáticamente con el catálogo
instrumental ni se les asigna una magnitud supuesta.

Se conserva el material del prototipo narrativo de cuatro capítulos para su
trazabilidad. Sus 20 fotografías curadas tienen permisos de reproducción sin
demostrar: el build retira sus 40 derivados únicamente de `out/` y mantiene
originales y metadatos. La interfaz pública ofrece enlaces al archivo INPRES.
La curación se prepara explícitamente, separada del build:

```bash
node tools/prepare-competition-history.mjs
node --experimental-strip-types tools/prepare-competition-presets.mjs
```

La primera herramienta lee exports/medios del proveedor fijado en `c5634ca`; la
segunda lee el CSV EDA existente y el snapshot web identificado. No realizan
scraping. Los presets antiguos se conservan para reproducibilidad y no definen
los conteos de la comparación actual de 31°S y 35°S.

## Revisión local del 15/10

Barra compacta, filtros por tarea, selección rectangular por mouse o un dedo con confirmación, grilla y regla adaptativas, degradé de profundidad y opción de magnitud. Los detalles, datos actualizados y pruebas están en [CIERRE_2026-10-15](docs/CIERRE_2026-10-15.md). Memoria permite consultar los 80 registros históricos y enlaza las galerías de INPRES. El scraping diario y el sitio estático siguen siendo procesos separados; no se activó un refresh diario automático del producto.
