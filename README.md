# Sismos Visuales

Visualización científica e interactiva de los sismos catalogados en Argentina y su distribución en profundidad. El usuario puede explorar el catálogo real en 3D, inspeccionar eventos y superponer modelos geográficos y geofísicos diferenciados.

**Estado:** catálogo INPRES identificado en [catalog-snapshot.json](src/data/catalog-snapshot.json), relieve GEBCO 2026, cartografía IGN/Natural Earth y superficie diagnóstica Slab2 South America 2018. La proyección horizontal es una aproximación local sustituible. Ninguna superposición clasifica tectónicamente los eventos. Fecha objetivo del MVP: 15 de octubre de 2026.

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

- Proveedor: `Sismos-Argentina/inpres-sismos`. El commit exacto está en `sourceCommit` de [catalog-snapshot.json](src/data/catalog-snapshot.json).
- Entrada: `data/exports/sismos.geojson`; `sourceSha256` conserva su identidad.
- `tools/prepare-inpres.mjs` verifica el hash y convierte **sólo los `NaN` de `ubicacion_original`** a `null`, según `invalidLocations`. No cambia coordenadas, profundidad, magnitud ni otros campos.
- Salida estática same-origin: ruta `url` y checksum `webSha256` de ese archivo. El GeoJSON pesado se genera desde la fuente fijada y no se versiona. Cantidad y cobertura también se consultan en esa identidad, sin duplicarlas como constantes editoriales.
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

Barra compacta, filtros por tarea, selección rectangular por mouse o un dedo con confirmación, grilla y regla adaptativas, degradé de profundidad y opción de magnitud. Los detalles y pruebas de esa versión están en [CIERRE_2026-10-15](docs/CIERRE_2026-10-15.md). Memoria permite consultar los 80 registros históricos y enlaza las galerías de INPRES.

## Actualización semanal

El workflow revisa el proveedor los viernes a las 08:43 de Argentina, y admite
ejecución manual. Sólo integra PRs de datos generados después de validar esquema,
comparación append-only, tests y build. Sin novedades no genera commits; ante una
anomalía conserva el último catálogo publicado. Los detalles y requisitos de
activación están en [Actualización semanal](docs/ACTUALIZACION_SEMANAL.md).

`npm run catalog:refresh -- --check` verifica sin cambiar el producto; `--write`
prepara la actualización sin publicarla. `npm run catalog:verify` comprueba la
identidad y hash en el sitio público. Las pruebas numéricas auditadas del 14/10
permanecen fijadas y separadas del snapshot vigente; el bot no modifica tests.
