# Resultado inicial del vertical slice — 17/09/2026

Este registro complementa `BENCHMARK_PLAN.md`. Son mediciones observadas, no metas ni promesas para otros equipos o redes. La aplicación probada parte de `c913ceb`; las correcciones pequeñas surgidas de la revisión quedaron en `c9bdc7e`.

## Entrada y entorno

- INPRES vía `inpres-sismos`: commit `81e230c782972a2996a32f1ef21d56a2ef22e2e7`, 80.470 eventos.
- Export proveedor: SHA-256 `ae37584d4e5b45ad9225a10f74d5a44609bf202bee8fdca2f295af2025344a44`, 41.059.737 bytes.
- Artefacto web: SHA-256 `685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82`, 41.059.768 bytes. Sólo cambia 31 `NaN` inválidos de `ubicacion_original` por `null`.
- Windows, Node.js 24.11.1, build estático de Next.js 16.3.5 servido en `localhost:3000` con Python 3.13.5 `http.server`; navegador Codex In-app (Chromium), viewport observado 1280 × 720. CPU, GPU y memoria física del equipo no registrados. Servidor local sin compresión HTTP.
- La instrumentación del slice no registra navegador/versión, CPU, GPU ni RAM. Esos datos quedaron no disponibles; no se infieren desde el entorno.
- Se probaron una primera carga del recurso completo y una recarga con caché. **No** son tres cargas frías independientes ni una prueba de red remota.

## Resultados observados

| Medida | Primera carga del GeoJSON sin caché | Recarga con caché |
|---|---:|---:|
| GeoJSON decodificado | 39,2 MiB | 39,2 MiB |
| Transferencia reportada por Resource Timing | 39,2 MiB | 0,0 MiB |
| `fetch` + lectura completa del cuerpo | 794 ms | 492 ms |
| `JSON.parse` + comprobación básica | 273 ms | 279 ms |
| Arrays/`BufferGeometry`/objetos Three | 103 ms | 40 ms |
| Efecto montado → primer frame con catálogo | 1.456 ms | 1.015 ms |
| Heap JS antes → después de construir | 14,7 → 101,1 MiB | 65,9 → 130,9 MiB |
| FPS aproximado mostrado por la aplicación | 120 en reposo/tras una rotación | 120 en reposo |
| Picking puntual | 8 ms y 5 ms en dos selecciones; una pulsación sin selección tardó 4 ms | no repetido |

La primera transferencia completa demuestra que el GeoJSON no salió de caché en esa carga. No demuestra que todos los demás recursos de la página estuvieran fríos. El servidor local no representa la latencia ni el throughput de un despliegue público. El heap es sólo JS, no memoria total de pestaña ni GPU; las muestras antes/después dependen del GC y no son comparables como límite estable. `fetch` incluye el cuerpo; la decodificación UTF-8 no tiene marca propia. La construcción no incluye necesariamente todo el trabajo de subida a GPU; el primer frame sí ocurre después de renderizar.

No se registraron tiempos de frame durante diez segundos de navegación ni una distribución de latencias de picking. El contador de 120 FPS es una muestra aproximada de un segundo, no una garantía durante el arrastre. Tampoco hubo observador de long tasks: **su ausencia no fue medida**. Se revisó la consola de esta prueba de producción y no aparecieron errores ni advertencias. No existen filtros aún; su latencia y los veinte cambios previstos en el plan no son medibles en este slice.

Una sesión anterior de `next dev` con el mismo snapshot había mostrado una transferencia reportada de 3,5 MiB, `fetch` 1.616 ms, parseo 213 ms, geometría 53 ms, primer frame 2.001 ms, heap 27,8 → 234,5 MiB y picking 5 ms. Fue una observación de desarrollo, no una segunda carga fría comparable.

## Decisión

**B — viable para continuar, con una optimización pequeña pendiente antes del despliegue.** El parseo, la geometría, el primer render local y el picking puntual no justifican ahora Worker, formato binario ni rediseño. El riesgo visible es transferir 41 MB sin compresión en una red real; el hosting estático deberá servir compresión HTTP (gzip/Brotli) y se deberá repetir la medición en un entorno desplegado. La transferencia de 3,5 MiB vista en desarrollo sugiere que la compresión puede bastar, pero no se toma como tamaño garantizado de producción.

## Revisión técnica y límites abiertos

- Corregido el norte de la escena a `−Z`, conservando +X este y +Y arriba; los valores geográficos del catálogo no cambiaron.
- El `fetch` ahora se aborta al desmontar el componente, evitando continuar una descarga que ya no se utilizará.
- La transferencia desde caché se registra como 0,0 MiB en vez de confundirse con «no disponible»; se usa la última entrada de Resource Timing del recurso.
- `BufferGeometry`, materiales, controles, observador de resize y renderer se liberan en el cleanup; los marcadores de selección se reutilizan, no se recrean por clic.
- Raycaster usa un umbral en unidades de escena dependiente de la distancia; puede seleccionar un vecino en zonas densas o fallar en zonas dispersas. No hay tasa de acierto sistemática aún.
- La escena no ofrece selección por teclado y la vista inicial no es cartografía oficial. Son límites conocidos, no correcciones incluidas en este cierre.
- La proyección equirectangular local no sirve para mediciones geodésicas ni para el país completo. Las futuras capas deben pasar por el mismo módulo de transformación o reemplazarlo de forma conjunta.

## Propuesta breve: prueba de alineación con GEBCO (sin implementar)

Elegir **sólo** `gebco_2026_n0.0_s-77.0_w-85.0_e-9.0_geotiff.tif` del ZIP local `GEBCO_07_Aug_2026_5422771e0b37.zip` (GeoTIFF de 674.269.122 bytes dentro del archivo). NetCDF contiene la misma grilla y es una alternativa válida, pero GeoTIFF facilita recorte y remuestreo por ventana con GDAL; ASCII e imágenes renderizadas no aportan elevaciones más útiles. La fuente es el modelo GEBCO_2026 de 15 segundos de arco, no terreno observado uniformemente: [documentación de GEBCO](https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid).

Para la primera comparación usar BBOX **80°O–60°O, 46°S–18°S**, que contiene 80.044/80.470 hipocentros del snapshot (99,5 %). Es un **recorte científico**, no una representación territorial de toda Argentina. Procesar offline una ventana GeoTIFF y remuestrearla inicialmente a aproximadamente **256 × 358 celdas** (unos 8–9 km en latitud por celda). Registrar método, nodata, checksum, resolución y rango de elevaciones. Emitir una grilla web sencilla de elevaciones en metros con metadatos de BBOX/resolución, idealmente por debajo de 1 MiB comprimido; no se necesita un formato sísmico nuevo. El loader de la futura malla debe aceptar dimensiones desde metadatos para cambiar resolución sin reescribir la escena.

Conservar alturas positivas y batimetría negativa de la **misma** grilla, sin aplanar océano ni inventar fondo. El plano de nivel del mar nominal será `y = 0`; la superficie utilizaría `y = elevación_m / 1000` con exageración vertical 1×. Para cada celda, longitud y latitud pasarían por `geographicToScene` igual que los sismos. **Puerta científica:** antes de afirmar que un hipocentro está a cierta distancia bajo la superficie GEBCO, verificar a qué referencia vertical se refiere la profundidad INPRES. Si no coincide con el nivel del mar nominal de GEBCO, mostrar la comparación como aproximada y no publicar separaciones verticales cuantitativas. GEBCO integra fuentes heterogéneas y puede incluir datums distintos del nivel medio del mar en aguas someras; atribuirlo como modelo de elevación/batimetría, no como terreno real exacto.

La pregunta exclusiva de esa iteración será: «¿Podemos colocar correctamente nuestros hipocentros debajo de una superficie derivada de GEBCO?» No se procesó el ZIP ni se generó ninguna malla en este cierre.
