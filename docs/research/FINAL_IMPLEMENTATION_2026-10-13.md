# Bajo nuestros pies: implementación final

Fecha: 13/10/2026. Base: `72fabf8`; rama local `feat/competition-final-2026-10-13`. Implementación autorizada por fases; commit, push y despliegue requieren autorización separada.

Revisión posterior: el [cierre del 14/10](FINAL_REVIEW_2026-10-14.md) incorpora movimiento, temas y descarga, actualiza las pruebas y enlaza el plan de presentación. Este documento conserva el registro de la implementación del 13/10.

## Fase 1: catálogo y derechos

### M8 del 29/01/2019

Se reconsultaron ficha INPRES, USGS e ISC el 13/10. INPRES conserva M8, profundidad 10 km, latitud −31,076, longitud −68,439, hora local 03:02:38,9. El snapshot redondea esa hora a 03:02:39. La ubicación textual está ausente; un campo derivado `es_argentina:false` no prueba ubicación fuera del país.

USGS, 28–31/01/2019, radio 300 km, M≥2: dos eventos de Chile de M4,3/4,4, ninguno equivalente a M8. ISC 617802051: 06:02:37,90 UTC, −31,297/−68,775, 98,9 km, ML2,00, aportado por SJA, no revisado por ISC. Separación horizontal aproximada 40,4 km. La coincidencia temporal no certifica que sea el mismo evento ni autoriza sustituir campos.

Se implementó una **exclusión provisional y reversible del catálogo visualizado**, mediante `src/data/catalog-quality.json`, separada del GeoJSON original. El panel de filtros permite reincluir el registro; su inspector muestra la discrepancia y las fuentes. Por defecto hay 80.469 elegibles de 80.470 registros originales. No hay un máximo de puntos ni cambios de magnitud, coordenadas o profundidad.

El sidecar conserva el Feature original completo de cada anotación y el checksum del snapshot. Otras alertas se mantienen visibles: candidatos M7,1/M7,6 del 16/09/2015 con magnitudes/escala diferentes en USGS/ISC, y 750 km de Mendoza. No se excluyen extremos corroborados ni eventos por ausencia en otro catálogo.

Fuentes: [INPRES](http://contenidos.inpres.gob.ar/epicentro3.php?s=20190129060236), [USGS regional](https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2019-01-28&endtime=2019-01-31&latitude=-31.076&longitude=-68.439&maxradiuskm=300&minmagnitude=2), [ISC candidato](https://www.isc.ac.uk/fdsnws/event/1/query?eventid=617802051&includeallorigins=true&includeallmagnitudes=true&format=xml). El contraste de los demás extremos está documentado en la auditoría aprobada y en las anotaciones con URLs.

### Fotografías

Las 20 fotos seleccionadas (40 derivados WebP) tienen `pending-review` en el manifiesto; no se encontraron permisos demostrados por imagen. La política inicial es **no reproducirlas**. Se conservan escenas, créditos, hashes, archivos locales y enlaces a las galerías originales. Para habilitar una imagen se necesita registrar su ID, licencia y URL de evidencia en `historical-rights.json`; estar disponible públicamente no basta.

`HistoricalChapter` no genera elementos img ni carga fotos bloqueadas. `npm run build` genera el export y ejecuta un control que retira sus derivados **solo de out/**. No elimina originales de `public/` ni del proveedor. `netlify.toml` fija ese comando y el directorio estático sanitizado; cualquier entrega manual también debe usar `npm run build`, no omitir el control mediante `next build` aislado.

El sitio publicado anterior puede seguir sirviendo esas fotografías hasta un despliegue aprobado. La implementación local no cambia retroactivamente producción.

### Descubrimientos existentes

Se revisó que los textos distingan observación de interpretación, no conviertan conteos en riesgo y no interpreten Mercalli como magnitud. La explicación de San Juan se incorporó con bibliografía específica y sin atribuir cada hipocentro a una placa.

## Verificación

Fase 1: siete pruebas de calidad/filtros, typecheck, lint y build pasaron. El navegador mostró 80.469 por defecto y 80.470 al reincluir el registro. El archivo histórico no generó imágenes. El control del export retiró 40 derivados sin tocar los originales.

## Fase 2 Corte completo y filtros

Archivos principales: `CuyoSection.tsx`, `SeismicViewer.tsx` y `globals.css`. Puntos constantes de 1,4 px y opacidad 0,32, sin cupo de eventos. Todas las magnitudes y rango completo de eventos/modelo por defecto. El filtro opcional de magnitud actúa sobre la selección completa; distingue cantidad visible, descartes por magnitud y registros fuera del rango vertical. Los filtros heredados del mapa se explicitan y se pueden restablecer desde el corte.

Relieve verde, DEP Slab2 amarillo discontinuo, banda UNC diferenciada y tres colores descriptivos de profundidad. DEP/UNC se dibujan sobre los puntos para mantener legibilidad. Ambos ejes usan el mismo factor de píxeles por km. Al cambiar latitud se oculta el gráfico anterior durante el cálculo. La huella 3D se reconstruye con la geodésica real de cada perfil y libera sus recursos anteriores.

La cámara vuelve a su posición y objetivo iniciales mediante «Vista inicial». El reset del corte también restaura rango completo, Slab2 visible y desplazamiento horizontal inicial. Una franja vacía conserva los modelos y permite recuperar los filtros sin abandonar el corte.

Verificación de fase: typecheck y 14 pruebas de catálogo/geodesia pasaron. QA final confirmó los controles y el inspector. El catálogo y los modelos exportados son idénticos a los archivos fuente.

## Fase 3 Comparación de San Juan

Archivos: `flat-slab-guide.json`, `GuidedDiscovery.tsx`, `CompetitionExperience.tsx`, `SeismicViewer.tsx`, `CuyoSection.tsx`; dos pruebas nuevas en `flat-slab-guide.test.mjs`. La guía anterior conserva sus archivos y evidencia, pero el recorrido activo usa dos paradas: 31°S y 35°S. No se añadieron datasets.

| Muestra | 31°S | 35°S |
|---|---:|---:|
| Selección original, sin exclusión de calidad | 24.689 | 201 |
| Habilitados por defecto | 24.688 | 201 |
| Habilitados con magnitud ≥3,1 | 4.348 | 102 |
| Corredor | ±50 km | ±50 km |
| Rango vertical de la guía | 0–700 km | 0–700 km |

Período común 16/07/2011–14/09/2026. Extremos comunes 73°O–61°O; cambia la latitud de los extremos. Los dos gráficos mantienen el mismo factor píxeles/km y escala 1×, aunque sus longitudes geodésicas difieren. El umbral opcional persiste al pasar de una parada a otra. Los conteos no son una comparación de riesgo ni de tasas regionales.

Gao et al. (2021), §§3.1, 4 y conclusiones, respaldan la interpretación tomográfica de cierre/expulsión y enfriamiento de la cuña del manto, menor magmatismo del segmento plano y reapertura bajo Payenia al aumentar la inclinación. Esta explicación procede de la bibliografía, no de inferir volcanes o causas a partir de nuestros puntos. No se afirma horizontalidad perfecta ni un umbral de 30°. La proximidad al modelo no clasifica eventos.

Fuentes primarias: [Gao et al.](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2021GL095509) y [Slab2](https://doi.org/10.5066/F7PV6JNV). Las afirmaciones concretas se cotejaron con los apartados indicados de Gao; la tomografía del artículo no se integró como nueva capa. Los textos expandibles separan observación INPRES, modelo Slab2 e interpretación. La explicación extensa está debajo del gráfico para priorizar el corte.

Verificación: las dos pruebas nuevas pasaron con catálogo y Slab2 reales. El navegador reprodujo los conteos de ambas latitudes y el mismo rango vertical; los bitmaps cambian al ocultar Slab2.

## Fase 4 Navegación y presentación

Archivos: `CompetitionExperience.tsx`, `SeismicViewer.tsx`, `layout.tsx`, `globals.css`, `next.config.ts`. La entrada es el mapa, con identidad Bajo nuestros pies; memoria histórica y comparación son opcionales. Se añadieron reset de cámara, control de opacidad Slab2 y nota sobre la escala horizontal aproximada del mapa 3D. La profundidad de hipocentros/Slab2 permanece 1× y la exageración GEBCO sigue indicada.

Los controles móviles fluyen según su contenido para evitar superposiciones; el encabezado tiene fondo oscuro para contraste. El gráfico conserva su scroll horizontal propio y la página no desborda. `trailingSlash:true` genera una página estática real para `/metodologia/`, verificada por acceso directo.

El reset de cámara se verificó tras rotar: el bitmap del mapa volvió a coincidir exactamente con el inicial. Se ocultaron los controles en esa comparación de imágenes para que un estado hover no falseara el resultado. Las otras vistas se verificaron a 1440×900, 768×1024, 390×844 y 320×740. Los tres tamaños menores usan movimiento reducido.

## Fase 5 Archivo histórico acotado

Las cuatro fichas son San Juan 27/10/1894, San Juan 15/01/1944, Caucete 23/11/1977 y El Galpón 17/10/2015. Sus fechas ISO, descripciones originales e intensidad Mercalli coinciden con `inpres-sismos/data/exports/sismos_historicos.json`. Las galerías originales respondieron HTTP 200 durante el chequeo. La UI conserva referencias y elimina controles de reproducción vacíos; permite volver al mapa.

No se incorporaron 80 eventos ni se construyeron vínculos automáticos con hipocentros instrumentales. La localización histórica adicional queda fuera de esta entrega. `docs/HISTORIA_VISUAL_POST_CONCURSO.md` define responsables, dependencias, derechos por imagen y aceptación para una obra posterior independiente.

## Fase 6 QA del export y candidatura

- `npm test`: **22/22** pasaron, incluyendo geodesia, CLP/nodata, artefactos reales, integridad de originales, política de derechos y comparación 31°S/35°S.
- `npm run typecheck`: pasó. El último build también completó TypeScript.
- `npm run lint`: pasó sin errores ni warnings de lint.
- `npm run build`: pasó y generó `/` y `/metodologia/`; postbuild retiró las 40 variantes bloqueadas únicamente del export. Comprobación posterior: cero derivados sin permiso restantes.
- `git diff --check`: pasó. Proveedor limpio; catálogos, grillas y fotografías originales conservados.
- QA de navegador del export de producción: **4/4 escenarios pasaron**, sin errores JavaScript, HTTP ni solicitudes fallidas de la aplicación. Cubrió navegación, conteos, filtros, opacidad, selección, reset, perfil exploratorio 23°S, franja vacía, rango 350/completo, móvil y movimiento reducido.
- Comparación byte a byte de las cinco capas científicas/cartográficas entre `public/data/generated` y `out/data/generated`: coincidencia completa. El SHA-256 INPRES sigue siendo `685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82`.

Evidencia reproducible fuera del repositorio del producto: `competition-evidence/final-2026-10-13/`, en el workspace. Incluye scripts de QA, `qa-browser.json`, capturas, `data-checks.json`, `export-checks.json`, `source-links.json` y `published-baseline.txt`. La primera ejecución de QA detectó dos problemas de la prueba: comparación de hover del botón y un nombre accesible que incluía una flecha oculta. Se corrigieron los selectores/máscaras y se ejecutó nuevamente el flujo completo; el resultado previo está conservado en `qa-browser-initial.json`.

| Escenario | Mapa listo | Primer corte 31°S | Cambio a 35°S |
|---|---:|---:|---:|
| Escritorio 1440×900 | 3,03 s | 5,29 s | 1,48 s |
| Móvil 390×844 | 2,26 s | 5,18 s | 1,48 s |
| Tablet 768×1024 | 3,80 s | 6,26 s | 1,52 s |
| Compacto 320×740 | 2,27 s | 5,67 s | 1,48 s |

Medición orientativa en Brave headless, build estático local, contextos nuevos, DPR 1, sin limitar CPU/red. No equivale a rendimiento en teléfonos físicos o Internet. La selección geodésica inicial tarda varios segundos y tiene estado de carga; no se descartaron registros para acelerarla. Se mantiene la malla GEBCO completa: unas 1,98 millones de posiciones y 3,95 millones de triángulos entre las dos capas, con heap observado cercano a 269 MiB. No se añadió infraestructura de renderizado ni se promete un FPS en otros equipos.

El chequeo automático de fuentes obtuvo 200 para INPRES, las cuatro galerías, proveedor fijado, GEBCO, IGN, Natural Earth e ISC. Los DOI de Gao y Slab2 redirigieron a sus destinos oficiales y devolvieron 403; esto limita la verificación automática de acceso y queda documentado. La consulta USGS, verificada durante la investigación inicial del M8, agotó 20 s en este chequeo posterior. No se cambian las referencias canónicas ni se interpreta ese timeout como ausencia de evento.

Documentación de candidatura: `docs/CONCURSO_2026_ENTREGA.md` contiene metodología de **173 palabras**, fuentes, declaración de asistencia IA y guion para video ≤60 s. `/metodologia/` expone fuentes y límites en la app. Se preparó el texto, no se grabó/subió el video ni se enviaron formularios o declaraciones legales.

## Publicación pendiente de autorización

La versión pública se inspeccionó nuevamente en [Netlify](https://spiffy-smakager-b28e63.netlify.app/): título **Sismos Visuales**, entrada histórica, fotos visibles y guía anterior de tres paradas. No contiene estas correcciones. La evidencia se conserva en `published-baseline.txt`; las fotografías pendientes siguen disponibles allí hasta un despliegue aprobado.

`netlify.toml` configura `npm run build`, publicación de `out`, Node 24.11.1 (la versión probada) y descarga exclusiva del snapshot fijado con validación de SHA-256. La URL canónica del proveedor fijado respondió 200; no se descargó un catálogo nuevo. El build remoto de Netlify y la nueva versión pública todavía no están probados porque **no se hizo commit, push ni despliegue**.

Pendientes: revisión científica/editorial del autor; autorización de commit, push y despliegue; validación posterior de la URL publicada y ausencia de fotos bloqueadas; video, seudónimo y formulario del concurso. La restricción de publicación procede del pedido del usuario. No se solicita ni ejecuta comunicación en Discord.
