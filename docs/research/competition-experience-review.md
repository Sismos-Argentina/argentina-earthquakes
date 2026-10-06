# Auditoría crítica del prototipo de competencia

6 de octubre de 2026. Revisión posterior a la implementación y al recorrido real
en navegador. Rama local `feat/competition-cinematic-story`, base `8c7a88a`.
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

La ampliación solicitada a tres fotos por caso tiene un costo: cinco capítulos
editoriales equivalen a aproximadamente 7,4 ventanas de scroll en 1280×900. En
390×844, el contenido varía por escena y supera una ventana; la sección mínima
es 145svh, pero una escena larga puede crecer. Esto excede el objetivo inicial
de 3–5 pantallas. La barra cronológica, los botones y el salto mitigan la longitud,
pero no la eliminan. El tono conserva respeto: no hay audio, sacudidas ni flashes.

## 3. ¿La interacción añade comprensión?

El recorrido cambia realmente la franja y recalcula la muestra; el gráfico
mantiene escala 1× y distingue puntos INPRES de Slab2 DEP ± UNC. Mover el perfil
y aplicar filtros cambia los eventos, no sólo la cámara. Las bandas con etiquetas,
límites de 70/300 km y conteos enseñan qué comparar sin depender exclusivamente
del color. El inspector muestra atributos del registro seleccionado.

Los fundidos fotográficos añaden continuidad visual, pero no evidencia científica.
El scroll es nativo: no hay interceptación de la rueda ni autoavance temporizado.
El escenario fijo mezcla fotos contiguas; con movimiento reducido sólo una foto
tiene opacidad 1 y no hay transición. Los controles manuales mantienen acceso a
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
lo declara. La densidad y el relieve claro debilitan la separación de colores.
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
`prefers-reduced-motion: reduce` real: se comprobó el modo predeterminado y luego
la activación explícita de fundidos. No se cambió la preferencia del sistema.

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
  Movimiento reducido: transición 0 s, opacidades discretas. Fundidos: mezcla
  observada 0,185/0,815 con escenario en top=0. No se alteró URL de navegación;
  la base no tenía persistencia de filtros/perfil en query/hash.
- Capturas locales fuera del repositorio: `../competition-evidence/`;
  `01-historical-desktop.jpg`, `02-central-question.jpg`, `03-guided-north.jpg`,
  `04-free-map.jpg`, `06-historical-mobile.jpg`. Hay evidencia adicional de
  fundido, perfil/inspector y movimiento reducido. Son pruebas de esta sesión.
- Producto/proveedor separados; `.artifacts/` ajeno excluido. No hubo push, PR,
  deploy, Discord, dataset científico nuevo ni modificación de producción.

La tarea local cumple su alcance. La presentación pública y las mejoras de esta
tabla siguen pendientes de decisiones distintas; no se las declara terminadas.
