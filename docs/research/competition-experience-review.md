> Estado vigente después de la tercera revisión: cinco fotos por caso, avance
> automático (5 s + 1,2 s), pausa persistente, sin sólo texto ni botones de fotos.
> Scroll nativo entre casos de al menos 100svh. La sección final documenta esta
> versión; las anteriores conservan la evidencia de las iteraciones previas.

## Tercera revisión: fotos automáticas y pausa (versión vigente)

- Cinco fotos por caso, 20 fotos y 40 variantes WebP existentes del proveedor;
  4.244.722 bytes, fuentes, créditos y SHA-256 por archivo. Se inspeccionaron las
  ocho fotos añadidas antes de redactar sus textos alternativos.
- Se retiran «Sólo texto», contador y botones numerados. Un único control de
  pausa/reanudación por caso conserva el estado entre casos y al volver del mapa.
- Imagen completa durante 5 s y fundido CSS de 1,2 s. Actual y siguiente se
  precargan cerca de la ventana; el timer espera su carga. La base opaca evita
  el fundido a negro. Los fallos conservan un fallback interno.
- Scroll nativo entre casos de al menos 100svh, sin sticky prolongado. En
  1280×900 cada caso midió 900 px; El Galpón en 390×844 midió 909,23 px por su
  texto. No hubo overflow horizontal y sus botones midieron al menos 44 px.
- Prueba real de un ciclo completo de 1944: Calle céntrica → Tribuna → Catedral
  → Casa de Sarmiento → Cúpula → Calle céntrica. Todas las fotos estaban cargadas
  y completas en cada muestra. Los otros tres casos permanecieron sin avanzar.
- Pausa en medio de un fundido: opacidad 0,740361 y estado `paused`, idénticos
  después de 7 s. Cambiar a 1944 conservó la pausa; reanudar permitió el ciclo.
  El CSS mantuvo 1,2 s de fundido con movimiento reducido del sistema.
- Se comprueba scroll entre casos, salto al mapa de 80.470 eventos y regreso a
  historia conservando el filtro profundo de 278 eventos. Sin errores de consola
  observados. La suspensión por pestaña oculta está implementada mediante
  `visibilitychange`; no se ensayó el cambio de pestaña en un dispositivo físico.
- Suite 17/17, lint, TypeScript y build estático exitosos. Se retiró la prueba
  del algoritmo de scroll eliminado; la secuencia automática se verificó en
  el navegador. El catálogo instrumental y los presets mantienen sus hashes.
- Evidencia fuera del repositorio: `19-automatic-photos-desktop.jpg`,
  `20-paused-fade-desktop.jpg`, `21-automatic-1944-desktop.jpg`,
  `22-automatic-photos-mobile.jpg` y `automatic-photo-cycle.json`.
- La nueva [revisión de calidad y controles](catalog-quality-and-map-controls-review.md)
  rastrea el registro M8 del 29/01/2019 hasta la ficha oficial. Sus propuestas de
  anotación y ergonomía no alteran datos ni controles actuales. Proveedor limpio,
  sin push, PR ni deploy. Los derechos de las fotografías siguen pendientes.

# Auditoría crítica del prototipo de competencia

6 de octubre de 2026. Revisión posterior a la implementación y al recorrido real
en navegador, actualizada tras la corrección de fundidos solicitada por el usuario.
Rama local `feat/competition-cinematic-story`, base `8c7a88a`.
Esta auditoría recomienda trabajo posterior; sus recomendaciones no se implementan
automáticamente. El prototipo funciona localmente, pero no está aprobado para
publicación pública de fotografías ni certificado para hardware móvil.

## 1. ¿Contesta una pregunta clara?

Sí, en un sentido descriptivo y limitado. La pregunta visible es «¿Qué revelan
más de 80.000 sismos sobre cómo cambia la profundidad bajo Argentina?». Los cortes
revelan distribuciones diferentes: a 24,5°S, 4.649 eventos y mediana de 190 km;
a 27°S, 1.880 y 40 km; a 30,5°S, 3.490 y 91 km. No hay un cambio monótono de
norte a sur. Las medianas no representan por sí solas las poblaciones múltiples.
Falta una comparación conjunta al terminar para que el visitante no deba recordar
los tres valores. El recorrido muestra tres franjas seleccionadas, no caracteriza
uniformemente toda Argentina ni estima peligrosidad.

## 2. ¿El prólogo conduce al mapa o parece otra aplicación?

La continuidad de fondo, tipografía, archivo→pregunta→puntos y botones compartidos
produce un arco coherente. El mapa real se prepara durante el capítulo de 2015 y
permanece montado al volver a la historia. La pregunta explica que la memoria
histórica y el catálogo instrumental son conjuntos diferentes, no enlaces evento
por evento. Mercalli describe efectos y no magnitud instrumental.

La ampliación solicitada a tres fotos por caso y más recorrido tiene un costo:
cuatro escenas de `520svh` más la pregunta equivalen a aproximadamente 21,8
ventanas de scroll. La primera iteración ocupaba 7,4 en escritorio y dejaba
apenas 270 px por cambio a 1280×900. La revisión pidió más espacio para mirar
el fundido y luego un tramo propio para la última foto: ahora cada foto completa
y cada fundido dispone de una quinta parte del recorrido sticky (756 px en
1280×900 si el sticky mide una ventana). La altura real del sticky se mide
también en móvil. Esto excede el objetivo inicial de 3–5 pantallas. La barra cronológica,
los botones y el salto mitigan la longitud, pero no la eliminan. El tono conserva
respeto: no hay audio, sacudidas ni flashes.

## 3. ¿La interacción añade comprensión?

El recorrido cambia realmente la franja y recalcula la muestra; el gráfico
mantiene escala 1× y distingue puntos INPRES de Slab2 DEP ± UNC. Mover el perfil
y aplicar filtros cambia los eventos, no sólo la cámara. Las bandas con etiquetas,
límites de 70/300 km y conteos enseñan qué comparar sin depender exclusivamente
del color. El inspector muestra atributos del registro seleccionado.

Los fundidos fotográficos añaden continuidad visual, pero no evidencia científica.
El scroll es nativo: no hay interceptación de la rueda ni autoavance temporizado.
El escenario fijo mezcla fotos contiguas. Por solicitud posterior del usuario,
los fundidos permanecen activos sin selector; el movimiento reducido del sistema
elimina desplazamientos y zooms, y hace instantánea la navegación programada.
Los controles manuales mantienen acceso a
las tres fotos. La animación puede distraer si se prolonga antes de la pregunta.

## 4. ¿Qué afirmaciones tienen respaldo directo?

- Orden, fechas, intensidad y textos históricos: exports INPRES del proveedor
  `c5634ca`. La afirmación de mayor magnitud de 1894 está atribuida a INPRES y
  acompaña la ausencia de un valor instrumental numérico.
- Cantidad/fecha del mapa: 80.470 eventos hasta 14/09/2026, hash web
  `685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82`.
- Candidatos EDA: CSV `latitude_scan_0_5deg.csv` y metadata del EDA de 80.524
  eventos hasta 18/09. Se verificaron tamaño de muestra, mediana y cambio de
  distribución; no se eligieron sólo por el prompt.
- Conteos y medianas visibles: calculados con el snapshot web y la geodésica
  WGS84 del producto; una prueba reproduce los tres resultados.
- Fotografías: 12 seleccionadas, 24 WebP existentes, hash y bytes por variante.
  El crédito declara autor/licencia pendientes, sin atribución inventada.

El EDA usa selección azimutal equidistante y la web distancia a geodésica WGS84.
Las diferencias de muestra pueden deberse tanto al método como al snapshot;
no se explican exclusivamente por los 54 registros de diferencia global.

## 5. ¿Qué sigue siendo exploratorio?

La selección editorial de franjas y cualquier asociación con Slab2. Los tres
presets no tienen cotejo independiente por latitud; el método existente se
conserva y se rotula exploratorio. Slab2 incorpora observaciones relacionadas
y no es validación independiente. No se deducen placas, corteza, manto, Moho,
tipos tectónicos ni causas a partir de coincidencias visuales.

La referencia vertical exacta de INPRES, el tipo de magnitud, revisión,
incertidumbres por evento y completitud regional no están documentados en el
contrato actual. Los conteos no comparan riesgo entre provincias. GEBCO y Slab2
son modelos; la proyección y estadísticas son derivados; el relato es editorial.

## 6. ¿Qué puede confundir al no especialista?

«Profundo» no implica más destructivo. Los colores y umbrales son clasificación
descriptiva, no capas de la Tierra. Los puntos de ±50 km se proyectan a A–B y
no ocurrieron todos sobre la línea. La mediana de 40 km en la transición coexiste
con un grupo profundo; puede ocultarlo si se lee sola. «80.470 visibles» expresa
registros habilitados por filtros, no todos los puntos dentro del encuadre.

En 3D los hipocentros se dibujan a través del relieve, preservando xyz; la leyenda
lo declara. Ahora se suavizan al mirar desde arriba para leer mejor el territorio
y recuperan presencia de costado. Las zonas densas todavía superponen eventos:
la opacidad no es una métrica de densidad y la perspectiva puede dificultar el color.
El perfil es más útil para leer profundidad que la vista general. Durante el
recálculo se conserva el gráfico anterior con un estado de carga: puede confundirse
brevemente con la nueva latitud si el visitante ignora el aviso. Iniciar el tour
restablece filtros explícitamente para que sus números tengan la muestra completa.
Volver historia→saltar conserva filtros/capas; iniciar tour sí los restablece.

## 7. ¿Qué funciona y qué no en móvil?

En viewport 390×844 se probaron fotografía manual, scroll, navegación, salto,
mapa, recorrido y cortes directos. Los créditos y texto están separados; se corrigió
un solapamiento detectado visualmente. No hay desbordamiento horizontal de toda
la página. El gráfico tiene un contenedor horizontal propio para conservar escala
1×; el texto indica cómo recorrerlo. En móvil se usa el control de latitud, porque
el minimapa 3D arrastrable existente se oculta en ese breakpoint.

El gráfico queda debajo de la explicación y exige scroll vertical más horizontal.
El conjunto puede costar a un visitante que quiera ver las tres distribuciones
de un vistazo. El mapa libre ocupa buena parte de la pantalla, pero sus puntos
siguen siendo pequeños/densos y la leyenda consume espacio. El caso de 1894,
con la aclaración científica más larga, no cabe entero en una sola ventana.

Se verificó el navegador de escritorio con viewport móvil; no un teléfono físico,
gestos táctiles de hardware, lector de pantalla ni GPU móvil. El navegador tenía
`prefers-reduced-motion: reduce` real: en la iteración anterior se probó el selector.
La solicitud posterior lo elimina y deja los fundidos activos; se conserva la
reducción de movimiento geométrico. No se cambió la preferencia del sistema.

## 8. ¿Qué falta para publicar las fotografías?

Confirmar titular/autor, condiciones o autorización de reutilización y crédito
exigido para cada una de las 12 imágenes; registrar evidencia y actualizar el
manifiesto. Un enlace público en INPRES y una copia optimizada no prueban licencia.
No se obtuvo autorización en esta tarea. Mantenerlas en el prototipo local o
usar la opción sólo texto mientras se decide. La autorización de publicación
es una decisión del responsable del proyecto, separada del funcionamiento técnico.

## 9. ¿Cuál es el cuello de botella real?

Para publicar con fotos: la autorización pendiente. Para una demostración técnica:
la transferencia y geometría del mapa existente, seguida de la claridad del perfil en móvil.
El build estático de esta sesión reportó:

| Medición del producto en localhost | Valor observado |
|---|---:|
| INPRES recibido | 39,2 MiB |
| Fetch / parse INPRES | 1491 / 277 ms |
| GEBCO + cartografía recibidos | 10,4 MiB |
| Construcción superficie | 1187 ms |
| Vértices / triángulos GEBCO | 1.980.000 / 3.953.204 |
| Slab2 recibido | 0,8 MiB |
| Primer frame completo | 1927 ms |
| Heap estimado antes / después | 17,8 / 282,2 MiB |

Son mediciones orientativas de una sesión local en este equipo, no un benchmark
controlado ni garantía de rendimiento móvil. Las fotos suman 2.333.244 bytes entre
ambas variantes. Al abrir sólo había tres imágenes montadas: el primer capítulo;
sus tres variantes grandes suman 564.366 bytes, las miniaturas 30.520 bytes.
La carga se limita a escenas próximas. No se agregó dependencia de animación ni
se cargó el catálogo al inicio del prólogo.

El catálogo no está actualizado diariamente en el producto: es un snapshot fijado.
El proveedor remoto consultado exportaba 80.756 hasta 05/10. No existe importación
y rebuild del consumidor. [Diagnóstico separado](catalog-refresh-diagnosis.md).
Mostrar la fecha permite evaluar esta limitación sin prometer datos actuales.

## 10. ¿Qué tres cambios posteriores tienen mayor impacto?

1. Resolver permisos/créditos por imagen, o decidir explícitamente una versión
   pública sólo texto. Es responsabilidad editorial; no se inventa una licencia.
2. Ensayar el build en el equipo de competencia y un teléfono real, con red/caché
   controladas; decidir desde esos resultados un presupuesto de relieve/datos.
   El código puede optimizar recursos existentes después de medir.
3. Acercar gráfico y explicación en móvil y ofrecer una comparación final de las
   tres distribuciones. Evaluar cuánto scroll fotográfico conservar sin quitar
   automáticamente las tres fotos pedidas.

## Clasificación pendiente de decisión

| Prioridad | Trabajo posterior | Responsable / condición |
|---|---|---|
| P0 antes de presentación pública con fotos | Verificar permiso y atribución por imagen o elegir sólo texto | Editorial / titular de derechos |
| P0 antes de comprometer rendimiento de la demo | Ensayo en hardware y red reales; elegir recursos que cumplan el presupuesto | Responsable de presentación + medición técnica |
| P1 | Gráfico antes del pliegue, comparación final, duración del prólogo | Producto/código; decidir diseño |
| P1 | Contraste/densidad del volumen 3D y gráfico anterior durante recálculo | Código; validar lectura científica |
| P1 | Importación controlada de snapshots y regeneración de presets | Producto/proveedor/infraestructura; flujo separado, sin scraping en frontend |
| P2 | Lector de pantalla, estudio de comprensión, más ensayos de dispositivos | Validación de accesibilidad/usabilidad |
| P2 | Ampliar casos históricos sólo con evidencia y permisos | Curación editorial |
| Descartado | Audio automático, sacudidas, flashes, scroll forzado, nuevas superficies geológicas, causa tectónica inferida y URLs vivas que cambien datos silenciosamente | Fuera de alcance o incompatibles con los principios |

## Evidencia y verificación

- Suite base: 11 pruebas. Suite final: 18/18; integridad de 24 archivos y las
  tres muestras geodésicas incluidas. Python EDA: 3/3. Lint y TypeScript sin errores.
  El hash de evidencia CSV usa texto UTF-8 con LF para tolerar CRLF de Git en
  Windows sin alterar el CSV ni sus valores. Los cuatro JSON nuevos con checksum
  tienen `eol=lf` explícito; los hashes de WebP son de bytes originales.
- Build estático exitoso. Una repetición encontró `out/` ocupado por el servidor
  Python usado para revisar el build; se detuvo ese servidor y se repitió el build.
  No se presenta ese bloqueo de Windows como un fallo preexistente de la aplicación.
- Recorrido real en dev y export estático: cuatro capítulos, fotos por scroll y
  botones, pregunta, salto, tres paradas, atrás/abandono, libre, regreso sin recarga.
- Filtro profundo: 278 de 80.470. Perfil 30,5°S con ese filtro: 5. Movimiento por
  teclado a 30,25°S: 5. Inspector: registro derivado `a5f80d3314777200`,
  17/11/2015, profundidad 435 km, magnitud reportada 3,4. Capas/relieve funcionan.
- Teclado: flechas de escena, navegación entre botones, control de latitud y
  acceso a un evento de la franja. Foco visible de 2 px. Contraste nominal de
  botón principal 12,17:1 y texto de nota sobre fondo sólido 11,16:1; no se
  certifica contraste de cada píxel sobre fotos ni de todos los puntos densos.
- Alternativa sólo texto: cero imágenes y 12 fallbacks; la narración continúa.
  En la primera corrección, movimiento reducido: transición 0 s, opacidades discretas.
  Esa alternativa fotográfica fue reemplazada por fundidos siempre activos a pedido
  del usuario; continúa la reducción de movimiento geométrico. En la primera corrección,
  fundido móvil observado con opacidades 1/0,496/0 y escenario en top=0:
  la capa base opaca evita el oscurecimiento de la mezcla anterior. No se alteró URL de navegación;
  la base no tenía persistencia de filtros/perfil en query/hash.
- Capturas locales fuera del repositorio: `../competition-evidence/`;
  `01-historical-desktop.jpg`, `02-central-question.jpg`, `03-guided-north.jpg`,
  `04-free-map.jpg`, `06-historical-mobile.jpg`. Hay evidencia adicional de
  fundido, perfil/inspector y movimiento reducido. Son pruebas de esta sesión.
- Producto/proveedor separados; `.artifacts/` ajeno excluido. No hubo push, PR,
  deploy, Discord, dataset científico nuevo ni modificación de producción.

## Primera corrección del recorrido fotográfico (`3cf7ffc`)

La primera iteración (`ba68ab1`) no tenía suficiente recorrido para apreciar
los cambios y los botones cambiaban de foto sin transición. Además, dos capas
con opacidades complementarias dejaban pasar parte del fondo oscuro durante
la mezcla. La corrección mantiene una base opaca y superpone la foto siguiente,
añade pausas completas y una curva suave, y lleva cada escena a `420svh`.
Se mide la altura real del sticky, que puede superar el viewport móvil, en lugar
de restar siempre la altura de ventana. Un `ResizeObserver` actualiza la medida
si el contenido cambia de altura. Los botones eligen posiciones del mismo scroll.

Verificación específica de esta corrección en el export estático servido en
`http://127.0.0.1:3001/`: ambos fundidos de 1944, selección de fotos, recorrido
inverso, escritorio 1280×900 y viewport móvil 390×844. En móvil no hubo overflow
horizontal; el sticky de 1944 midió 870,86 px en una ventana de 844 px.
La elección explícita de fundidos sobrevivió a la recarga; el modo reducido
mostró opacidades 0/1/0 y transición de 0 s. Se conserva la preferencia del sistema
como valor predeterminado. No es una prueba en un teléfono físico.

Suite 18/18, lint, TypeScript y build estático pasaron tras la corrección.
No se cambió el snapshot, los presets, medios ni el proveedor. Evidencia nueva
en `../competition-evidence/`: `09-scroll-fade-fixed-desktop.jpg`,
`10-scroll-second-fade-fixed-desktop.jpg` y `11-scroll-fade-fixed-mobile.jpg`.
Las demás recomendaciones de la auditoría siguen pendientes de decisión.

## Segunda corrección: mapa legible, fundidos activos y cierre de cada foto

El usuario pidió retirar el selector de fundidos, mejorar el mapa visto desde
arriba y dar más scroll propio a la última foto. Se eliminó el selector y su
almacenamiento; los fundidos están activos desde el inicio y después de recargar.
La preferencia de movimiento reducido del sistema continúa quitando desplazamientos,
zoom y damping; por la nueva decisión editorial permite los fundidos de opacidad.

La primera corrección mantenía las capas opacas, pero las imágenes interiores
tenían opacidad 0,9 incluso al terminar: todavía dejaban ver un 10% de la foto
anterior. Ahora imagen y fondo son opacos. Cinco tramos iguales en cada escena
de `520svh` dan el mismo recorrido a las tres fotos completas y a los dos fundidos.
Elegir la tercera foto lleva al comienzo de su tramo, en el 80% del recorrido,
en lugar de saltar directamente al final.

En el build estático servido en `3001`, a 827×884, se verificaron las últimas
fotos de 1894, 1944 y 1977: imagen cargada y opaca, con unos 743 px propios.
Tras avanzar otros 530 px en 1944 seguía siendo la tercera foto, limpia, con
212 px restantes y el sticky en top=0. En 390×844, 1944 conservó 704 px y
El Galpón 696 px propios; imagen y capa con opacidad 1, sin overflow horizontal.
El primer fundido funcionó sin selector con `data-reduced-motion=true`, mezcla
1/0,501/0 y transición de 180 ms. Son ensayos de viewport, no de teléfono físico.

GEBCO ya era opaco; eran los puntos del catálogo los que cubrían demasiado
territorio desde arriba. Se redujeron tamaño y opacidad con la inclinación,
conservando su presencia de costado. Comparación visual de la misma vista cenital
antes/después y revisión lateral. Continúan los 80.470 eventos, el filtro profundo
dio 278 y restablecer volvió a 80.470. Se seleccionó desde la escena el registro
`a246d7f132eb1d9c`, 25/11/2019, Mendoza, 110 km, magnitud reportada 2,6.
No se cambian coordenadas, fuente, snapshot, muestras ni datos del proveedor.
La superposición de zonas densas sigue existiendo; esto no introduce una agregación
ni una escala cuantitativa de densidad. La presentación no certifica rendimiento móvil.

Pruebas 18/18, lint y TypeScript pasaron. El build restringido compiló pero
falló dos veces con `spawn EPERM` al iniciar su verificador; repetir el comando
local con permiso para sus subprocesos completó TypeScript y el export estático.
No se omitió el verificador. Capturas nuevas en `../competition-evidence/`:
`13-map-from-above-before.jpg`, `14-fades-always-active.jpg`,
`15-last-photo-clean-desktop.jpg`, `16-last-photo-clean-mobile.jpg`,
`17-map-from-above-soft-points.jpg` y `18-map-lateral-soft-points.jpg`.
El mayor recorrido lleva el prólogo a unas 21,8 ventanas; los botones de avance,
la cronología y el salto permanecen disponibles. Derechos y las demás mejoras
de la auditoría siguen pendientes. Cambios locales, sin push, PR, deploy ni Discord.

La tarea local cumple su alcance. La presentación pública y las mejoras de esta
tabla siguen pendientes de decisiones distintas; no se las declara terminadas.
