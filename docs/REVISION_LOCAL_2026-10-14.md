# Revisión local de Bajo nuestros pies — 14/10/2026

> Antecedente del 14/10: los estados, controles y conteos siguientes describen
> esa revisión. El [cierre del 15/10](CIERRE_2026-10-15.md) registra la versión
> aprobada para entrega, con snapshot nuevo y revisión E2E.

Versión para revisión del autor, en la rama `feat/regional-3d-review-2026-10-14`,
desde `5dafc0e` (PR #7 ya integrado). Esta revisión no está commiteada, subida ni
desplegada. La versión publicada y esta propuesta mantienen el snapshot del
14/09/2026; el proveedor tiene datos más recientes.

## Resultado y recorrido breve

1. Abrir el mapa. La navegación habitual permite girar con vertical fija, usar
   rueda/pellizco para acercar y recuperar la **Vista inicial**. Los cuatro modos
   explícitos están en **Herramientas de cámara**, de uso opcional. En móvil se
   elige el modo desde una lista; no se muestran cuatro herramientas de entrada.
2. Abrir **Corte del subsuelo · San Juan y Mendoza**. Comparar 31°S y 35°S,
   conservar período, corredor y escala, pasar el mouse o tocar un punto.
   El tema inicial es oscuro; Claro adapta ejes, textos, grilla y leyendas.
   Las coordenadas y cálculos quedan en un detalle opcional. La leyenda identifica
   **Placa de Nazca · modelo Slab2** y explica su banda de incertidumbre.
3. Abrir **Elegir zona 3D**. Marcar dos extremos del rectángulo en el mapa 2D,
   o usar coordenadas. La escena muestra el volumen elegido, reglas de profundidad,
   coordenadas y un mapa de ubicación con el rectángulo marcado. Los filtros siguen
   aplicándose. **Volver al mapa completo** recupera el universo con esos filtros.
4. Usar **Dibujar corte A–B** para una franja geodésica distinta del volumen.
   El corte acepta extremos a 20–2.000 km, con 50 km a cada lado, e indica que es
   exploratorio. A y B conservan su orientación, incluso en cortes invertidos.
5. Consultar **Memoria histórica** y **Metodología**. Son rutas del mismo sitio,
   sin subdominios ni descarga del catálogo para leer las fichas históricas.

## Qué está verificado

| Área | Evidencia |
|---|---|
| Producción actual | GeoJSON público: 80.470 registros, fecha máxima 14/09/2026; 41.059.768 bytes; mismo SHA-256 que el snapshot local. HTTPS devolvió 200 con validación TLS normal. |
| Controles 3D | Gestos reales en Brave: pan conserva distancia y orientación; zoom conserva objetivo; giro con vertical fija mantiene `up=(0,1,0)`; giro libre permite inclinación de esa vertical. Reset probado. |
| Información | Hover 3D de un sismo muestra M, profundidad, posición y fecha; el clic fija la misma ficha. Hover de Slab2 muestra profundidad e incertidumbre del modelo. Toque emulado también selecciona en el perfil. |
| Perfiles comparables | 31°S: 24.688 habilitados; 35°S: 201. Con M≥3,1: 4.348 y 102. Rango común 0–700 km y mismos píxeles por kilómetro en ambos ejes y paradas. Exportación PNG probada. |
| Datos regionales | Selección inclusiva por rectángulo; conteos cotejados con los registros. GEBCO conserva centros de celdas, valores y nodata. Slab2 conserva nodos, DEP, UNC y huecos; no se remuestrea. Zona vacía y sin cobertura Slab2 probada. |
| Corte libre | Diagonal e inversión verificadas con WGS84; pruebas a 49,9 y 50,1 km del eje comprueban el corredor. Navegador coteja conteos con la selección reproducible. |
| Responsive | Recorrido completo en Brave a 1920×1080, 1366×768, 390×844 y 320×740. Movimiento reducido en las tres resoluciones menores. No se probó un teléfono físico ni Safari. |
| Código | Build estático y TypeScript, lint, `git diff --check` y 27 pruebas de datos/geodesia. |

Pruebas y capturas locales conservadas fuera del repositorio, en
`../competition-evidence/regional-2026-10-14/`: `qa-local.json`,
`qa-gestures.json`, `qa-selection.json`, `qa-compass.json`,
`conicet-review.json`, `audit-update.json` y capturas PNG.
No se publican esas herramientas de prueba ni sus rutas personales.

## Representación y rendimiento

No hay cupo de registros ni muestreo para dibujar los puntos. Los filtros y la
región definen la selección; el tamaño y la transparencia de los símbolos se
adaptan a su cantidad. El rango acotado del perfil informa cuántos registros
quedan fuera de él. La representación de profundidad es 1×; la exageración del
relieve se indica separadamente. La escena equirectangular no mide ángulos exactos.

El perfil oculta la nube general. La zona 3D reutiliza la nube filtrada y sustituye
la superficie general por un recorte; también mantiene oculto el Slab2 general.
En una prueba a 1440×900, los buffers WebGL reservados pasaron de 121.008.520 a
2.237.848 bytes, y se recuperaron al volver. Es una medición de buffers GPU,
no de toda la VRAM, memoria del proceso ni FPS. Los datos y grillas originales
se conservan en CPU para recuperar la vista; ocultar no equivale a liberar esa memoria.

Los 158 lugares de Natural Earth agregan 23.255 bytes de JSON curado. Se muestran
según escala y se evitan rótulos solapados. Son referencias cartográficas de una
colección fijada, no un nomenclátor oficial completo. Se preserva IGN para Argentina.

## Comparación con el visor CONICET–UNSJ

Se revisaron mapas Esri/IGN/satelitales, límites provinciales, bordes de placas,
fallas SEGEMAR y Slab2 en 2D; reproducción temporal; vista 3D y sus cuatro modos
de cámara. La navegación y la referencia territorial guiaron esta revisión.
No se incorporó Leaflet/Esri ni se copiaron sus datos o código.

La consulta de **01–14/09/2026, M≥3** volvió a responder HTTP 502. El sitio
conservó eventos recientes y mostró un error. No hay una comparación numérica
válida con esa muestra residual. Una comparación debe usar las mismas fechas,
magnitudes, profundidades y región: provincia, rectángulo y corredor no son equivalentes.

## Catálogo: actualización comprobada y paso pendiente

El proveedor publicó `a87088128f5e87566979e4c9bc186dcdff85b47a` el 14/10/2026:
80.850 registros, fecha máxima 14/10, exports generados 15:10:58 UTC. Las últimas
seis ejecuciones diarias consultadas terminaron con éxito. La ejecución de hoy y
los archivos publicados, no solo su estado verde, respaldan la actualización.

El producto sigue fijado a `81e230c782972a2996a32f1ef21d56a2ef22e2e7`.
Un deploy no importa automáticamente el nuevo export. El próximo paso de datos
es refrescar de forma controlada el snapshot, revisar discrepancias, regenerar
conteos/presets/manifiestos y repetir las comprobaciones antes de publicarlo.
No se modificó `inpres-sismos` en esta revisión. Su workflow permite continuar si
falla un export: endurecer esa detección queda como mejora separada del proveedor.

## Recortes para el envío

Recomiendo publicar la navegación, hover, inspector, perfil, mapa 2D, zona 3D y
corte libre tras la revisión local del autor. La pregunta guiada y el perfil
comparado siguen siendo el recorrido principal; las herramientas nuevas son opcionales.

Postergar nuevas capas de fallas/placas/volcanes, actualización en vivo, nuevos
catálogos, servicios de mapas, subdominios y optimizaciones sin medición.
Las fotos se consultan mediante enlaces a INPRES: su publicación por un organismo
público no se presenta como licencia. Las notas históricas describen efectos del
caso, sin deducir intensidad o daños a partir de la magnitud instrumental.

La declaración visible de asistencia de IA se mantiene. El autor debe revisar
el texto de inscripción y completar otras herramientas o etapas utilizadas.
Esta revisión local no sustituye la aprobación de publicación, el video ni el
envío del formulario por la persona participante.
