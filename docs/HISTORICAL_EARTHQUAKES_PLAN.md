# Plan futuro: terremotos históricos

Estado al 19 de septiembre de 2026: **proveedor de datos implementado; subpágina
frontend no implementada**. No forma parte de la iteración Cuyo. Sólo puede entrar
como SHOULD del concurso después de cerrar y verificar el núcleo científico
principal; en caso contrario queda para postconcurso.

## Dos experiencias, dos contratos

- **Explorar el subsuelo:** catálogo instrumental/actual INPRES con hipocentros y
  profundidades, GEBCO, Slab2 y secciones. Mantener exploración libre como
  experiencia principal.
- **Terremotos históricos:** catálogo histórico separado con fecha, lugar,
  coordenadas publicadas, intensidad Mercalli y relato de consecuencias. La futura
  subpágina puede usar una narrativa cronológica para responder «¿Cómo se vivieron
  los grandes terremotos de la historia argentina?» sin imponer scrollytelling al
  hub principal.

El schema histórico es independiente de `InpresFeature` y de la lógica de
profundidad. No rellenar profundidad, magnitud instrumental, precisión geográfica
ni incertidumbres ausentes con valores inferidos. Intensidad Mercalli y magnitud no
son intercambiables. Distinguir siempre campos publicados por INPRES de IDs,
normalización y asociaciones derivados por nuestro proveedor.

## Estado y ubicación de los datos

El trabajo de scraping y normalización vive únicamente en el repositorio proveedor
[`Sismos-Argentina/inpres-sismos`](https://github.com/Sismos-Argentina/inpres-sismos).
No duplicarlo en este frontend.

| Recurso | Ruta en `inpres-sismos` | Uso |
|---|---|---|
| CSV fuente | `data/sismos_historicos.csv` | 80 registros raw; se conserva sin reescribir |
| Catálogo web | `data/exports/sismos_historicos.json` | Entrada principal de la futura subpágina |
| Manifiesto fotográfico | `data/exports/fotos_historicas.json` | Galerías, procedencia, disponibilidad y rutas de assets |
| Imágenes optimizadas | `data/exports/fotos_historicas/<evento>/*-480.webp` | Grillas y previews |
| Imágenes optimizadas | `data/exports/fotos_historicas/<evento>/*-1600.webp` | Visor ampliado |
| Exportador | `exporters/historical_exporter.py` | Normalización reproducible y asociación foto–evento |
| Scraper | `scripts/scrape_historical_photos.py` | Descarga, reintentos, caché y generación WebP |

Snapshot disponible al actualizar este plan:

- 80 eventos históricos normalizados;
- Mercalli estructurada para los 80 eventos;
- 10 galerías argentinas, con 98 fotos disponibles asociadas a 10 eventos;
- 2 galerías internacionales opcionales —Chile 2010 y Japón 2011— con 21 fotos,
  separadas del catálogo argentino;
- 119 fotos disponibles y 238 derivados WebP verificados;
- 1 foto de Caucete 1977 no disponible en ninguno de sus enlaces oficiales;
- 2 originales caídos recuperados mediante la miniatura oficial, marcados con
  `original_disponible: false`.

Las rutas anteriores son rutas del proveedor, no rutas públicas actuales de este
frontend. Al implementar la subpágina se debe fijar un commit del proveedor y copiar
los artefactos necesarios durante el build a una ruta como
`public/data/generated/historical/`. No depender en runtime de `main` ni de una URL
Raw mutable. Registrar commit, checksums y archivos incorporados en
`manifests/DATASET_MANIFEST.md` y `manifests/checksums.sha256`.

## Contrato de consumo

`sismos_historicos.json` tiene `schema_version: "1.0"` y expone:

- procedencia y timestamp de generación en el documento raíz;
- `id` derivado y estable dentro de esta versión del export;
- `fecha` original, `fecha_iso` y `anio`;
- `ubicacion_original`, `ubicacion` y `ubicaciones` normalizadas;
- `descripcion` con Unicode y espacios corregidos, sin reescritura editorial;
- `intensidad_mercalli` con grado/valor principal, mínimo, máximo, escala reportada
  y marca de estimación;
- `coordenadas.latitud` y `coordenadas.longitud` numéricas;
- `fotos_asociacion` y `fotos` cuando existe una galería argentina compatible.

Nueve asociaciones usan fecha exacta. Sampacho conserva una discrepancia entre las
fuentes: el catálogo dice `1934-06-11` y la galería `1934-06-10`; el export mantiene
ambas y usa `metodo: "fecha_fuente_discrepante"`. La coincidencia de fecha entre
Chile 2010 y un evento de Salta no produce asociación porque las galerías
internacionales quedan fuera del vínculo automático.

`fotos_historicas.json` conserva la URL oficial de cada galería, original y
miniatura, las dimensiones, la variante descargada y las rutas WebP. También separa
`ambito: "argentina" | "internacional"` y registra enlaces rotos en
`fotos_no_disponibles`. Las galerías genéricas por tipo de daño no se descargan
porque no identifican un terremoto concreto.

## Alcance recomendado de la subpágina

Primera entrega pequeña y terminada:

1. Ruta independiente `/historicos`, enlazada de forma secundaria desde el hub.
2. Cronología de los 80 eventos con búsqueda o filtros mínimos por año, ubicación e
   intensidad Mercalli; sin reutilizar filtros de magnitud/profundidad.
3. Selección de evento con fecha, lugar, descripción, Mercalli, ubicación en mapa y
   galería cuando exista.
4. Carga diferida de miniaturas y apertura del WebP de 1600 px sólo al solicitarlo.
5. Sección opcional «Terremotos en el mundo» separada y presentada únicamente como
   material fotográfico, no como parte del catálogo argentino.
6. Atribución visible a INPRES y explicación de campos derivados, ausencias y
   limitaciones.

No prometer en esta fase animación compleja, comparación de daños, clasificación
tectónica, reconstrucción de magnitudes, georreferenciación más precisa ni una
historia editorial extensa para cada evento.

## Derechos y créditos: bloqueo previo a publicar fotos

El manifiesto conserva procedencia técnica, pero las páginas de INPRES no exponen
de forma consistente crédito, autor ni licencia por archivo. La ficha del
[archivo SEGEMAR](https://archivointemin.segemar.gov.ar/handle/308849217/5080?show=full)
atribuye, por ejemplo, imágenes de Mendoza 1861 al Archivo General de la Nación.
Antes de publicar fotografías en producción hay que completar una revisión de
derechos y créditos por imagen. Hasta entonces se puede implementar y probar el
contrato con assets locales, pero no afirmar que las imágenes tienen licencia
abierta ni ocultar su fuente.

## Puerta de entrada y aceptación

No iniciar la UI mientras Cuyo, filtros esenciales, accesibilidad, mobile
simplificado, metodología y deploy estén incompletos. Si se aprueba después:

- fijar y verificar el commit proveedor;
- incorporar catálogo, manifiesto y assets con checksums;
- definir tipos TypeScript propios y validación de schema;
- comprobar que las 10 asociaciones argentinas y los dos eventos internacionales
  permanezcan separados;
- resolver créditos/licencias antes del deploy público de las fotos;
- probar teclado, lector de pantalla, carga diferida y fallback para imágenes
  ausentes.
