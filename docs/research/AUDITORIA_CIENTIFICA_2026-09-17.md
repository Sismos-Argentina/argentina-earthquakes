# Sismos Visuales: auditoría científica y decisión de MVP

Fecha: 17 de septiembre de 2026. Informe para revisión; no modifica ni aprueba por sí mismo el alcance vigente.

Estado posterior: aprobado por el responsable del proyecto como referencia científica del MVP. El texto del informe se conserva como evidencia de la auditoría; el alcance de la implementación vigente se decide en `../MVP_SCOPE.md`. Los anexos CSV y la figura diagnóstica siguen en las rutas originales de la tarea de auditoría, fuera del repositorio; los resultados numéricos pequeños se incorporaron aquí.

**Recomendación:** centrar el MVP en cómo cambia la distribución de los hipocentros con la profundidad y cómo se compara con la geometría publicada de la subducción. Entregar una sección fija de Cuyo, aproximadamente a 31°S. Incorporar una segunda, alrededor de 24°S en el NOA, sólo después de cerrar la primera y el núcleo del producto. La segunda aporta un contraste real y también muestra los límites de la coincidencia entre catálogo y modelo.

La historia defendible es: **los hipocentros catalogados forman patrones tridimensionales que podemos comparar con modelos de la placa subducida; esa comparación tiene coincidencias, diferencias e incertidumbres.** No equivale a reconstruir la placa a partir de nuestros puntos ni a identificar la pertenencia tectónica de cada evento.

## Alcance y evidencia de esta auditoría

Se inspeccionaron la constitución, todos los documentos activos de `docs/`, `plans/`, `research/`, manifiestos, antecedentes archivados, fuentes de la aplicación, transformaciones geográficas, preparación y validadores de los tres productos geoespaciales. En el proveedor independiente se revisaron las piezas necesarias para rastrear el export y la clasificación histórica. No se modificaron código, datos ni documentación de ninguno de los dos repositorios.

Estado auditado: árbol local de `argentina-earthquakes`, rama `feat/nextjs-foundation`, HEAD `ac3c71623179146ec4b28addb7f3489be0524b74`, **con cambios locales preexistentes**. El informe describe esos archivos, no un despliegue ni solamente ese commit. Se ejecutaron los validadores existentes de GEBCO, cartografía y Slab2: pasaron. No se hizo un nuevo benchmark de navegador ni se certifica aquí la interacción en pantalla. La evaluación visual propia usa las figuras diagnósticas adjuntas, calculadas desde los artefactos reales.

Se recalcularon los conteos del catálogo, cuatro corredores candidatos, sensibilidad de ancho y períodos, diferencias nominales de profundidad y fidelidad numérica del Slab2 web frente al raw. Los resultados y CSV se guardaron fuera de los repositorios, junto a este informe.

El artefacto INPRES examinado contiene 80.470 registros, del 16/07/2011 al 14/09/2026; SHA-256 `685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82`. Es el export fijado por el producto, con la transformación documentada de 31 valores `NaN` de ubicación a `null`. Las coordenadas de geometría coinciden con sus propiedades; no encontré coordenadas no finitas, profundidades negativas ni IDs derivados repetidos. Esto verifica integridad interna, **no calidad de localización ni ausencia de duplicados sismológicos corregidos**.

## A. Qué podemos afirmar científicamente hoy

### A.1. Separación entre fuentes

| Categoría | Qué hay realmente | Qué puede comunicar |
|---|---|---|
| Observaciones catalogadas | Localizaciones y magnitudes publicadas por INPRES, exportadas por `inpres-sismos` | Dónde y a qué profundidad fueron localizados los eventos. Un hipocentro catalogado es una estimación obtenida de registros sísmicos; no es una posición exacta medida directamente. |
| Modelos externos | Slab2 SAM 2018 y GEBCO 2026 | Una geometría geofísica publicada y un modelo de elevación/batimetría, respectivamente. |
| Cartografía | IGN y Natural Earth | Ubicación y contexto territorial. Los límites administrativos no delimitan estructuras tectónicas. |
| Derivaciones propias | Proyecciones, selección por corredor, conteos, curvas remuestreadas y diferencias nominales | Resultados reproducibles de operaciones sobre las fuentes anteriores. |
| Interpretaciones | Lectura regional en términos de subducción, flat slab o Wadati–Benioff | Explicaciones contrastadas con literatura; no atributos observados del export. |

### A.2. Distribución verificable del snapshot

Con intervalos mutuamente excluyentes:

| Profundidad catalogada | Registros |
|---|---:|
| 0 ≤ d < 70 km | 16.682 |
| 70 ≤ d < 300 km | 63.510 |
| 300 ≤ d < 500 km | 147 |
| 500 ≤ d < 700 km | 129 |
| d ≥ 700 km | 2 |
| Total | 80.470 |

La categoría intermedia representa aproximadamente **78,9 % de este archivo**. No es el porcentaje de todos los terremotos que ocurren en Argentina. Además, 262 registros quedan fuera del BBOX actual del terreno científico —82°O–52°O, 58°S–18°S—: catálogo completo y territorio argentino no son conjuntos equivalentes.

### A.3. Interpretación de la banda observada

La formulación aceptable es: «En Cuyo, parte de la sismicidad intermedia catalogada forma una franja cuya geometría general es consistente con el segmento de subducción poco inclinado descrito por estudios regionales y representado por Slab2».

La zona de Wadati–Benioff describe una distribución de sismicidad asociada a la subducción, no una superficie infinitamente delgada que cada punto deba tocar. En el segmento pampeano, la literatura identifica un tramo aproximadamente horizontal cercano a 100 km y variaciones laterales importantes. [Anderson et al., 2007](https://doi.org/10.1111/j.1365-246X.2007.03483.x).

Un estudio regional reciente distingue explícitamente la superficie superior de Slab2 del techo de la sismicidad que utiliza para construir su modelo local. Por eso, que una nube quede por debajo de DEP no demuestra por sí mismo un error de alineación. [Linkimer et al., 2025](https://doi.org/10.1093/gji/ggaf408).

**No toda la sismicidad argentina cuenta esta misma historia.** Hay terremotos corticales importantes, como demuestra el análisis específico de San Juan 2021; la interpretación de esos eventos exige evidencia adicional a su posición en nuestra nube. [Ammirati et al., 2022](https://doi.org/10.1038/s41598-022-22752-6).

## B. Qué NO podemos afirmar

- «Estos 63.510 eventos pertenecen a Nazca» o «todos los puntos celestes son intraslab».
- «Los eventos que tocan Slab2 son interplaca» o «los que caen dentro de UNC pertenecen a la placa».
- «La nube valida independientemente Slab2». El modelo incorpora sismicidad y otras restricciones; falta auditar el solapamiento de sus fuentes con nuestro catálogo. [Guía técnica de USGS](https://ghsc.code-pages.usgs.gov/esi/usgs-slab-models/manual/s2_technical_guide.html).
- «La separación entre la nube y DEP mide el espesor de la placa», «UNC es el espesor» o «un hueco de puntos demuestra una rotura del slab».
- «Una provincia tiene más peligro porque contiene más puntos». No evaluamos completitud, capacidad de detección, exposición ni vulnerabilidad.
- «La actividad está aumentando» a partir de conteos anuales sin controlar cobertura, cambios del catálogo, secuencias y períodos parciales.
- «La magnitud acumulada equivale a energía». El tipo de magnitud no está preservado y las magnitudes no se suman como energía.
- «El visor mide distancias o buzamientos reales a escala 1×». Su proyección horizontal actual distorsiona las distancias; la perspectiva añade otro efecto visual.
- «Un hipocentro está exactamente X km debajo del terreno o del slab». No conocemos la referencia vertical exacta del export INPRES.
- «Todos los eventos están revisados», «No significa que nadie lo sintió» o «750 km es una profundidad confirmada». El export no conserva esas garantías.

La falta de puntos tampoco demuestra ausencia de placa ni ausencia de sismicidad. La literatura de la Puna muestra por qué un aparente vacío necesita análisis de cobertura y localización antes de interpretarse estructuralmente. [Mulcahy et al., 2014](https://doi.org/10.1002/2013TC003393).

## C. Hallazgos y patrones que vale la pena investigar

### C.1. Cuyo y NOA no ofrecen el mismo grado de coincidencia

Los siguientes cálculos son diagnósticos internos. Se define Δd = profundidad INPRES − DEP interpolado **en las coordenadas del evento**, no en el pie de su proyección sobre la sección. No es distancia normal al slab ni separación física certificada. DEP se muestrea con interpolación bilineal sólo donde existen cuatro nodos válidos.

| Diagnóstico | Cuyo, extremos a 31°S | NOA, extremos a 24°S |
|---|---:|---:|
| Corredor, ancho total | 100 km | 100 km |
| Todos los eventos seleccionados | 24.689 | 11.374 |
| Eventos 70 ≤ d < 300 km | 21.888 | 10.694 |
| Mediana de Δd nominal | +10,0 km | +56,2 km |
| Percentiles 10–90 de Δd | +3,4 a +18,5 km | +36,3 a +70,2 km |
| Mediana de UNC en las posiciones de esos eventos | 34,2 km | 39,8 km |

El primer perfil sostiene bien la observación original de una banda que acompaña al modelo en términos regionales. El segundo impide generalizar esa coincidencia a todo el país. Su concentración intermedia es más profunda que DEP; hay que conservar esa diferencia visible y explicarla como problema de comparación, sin desplazar ninguna capa para hacerla coincidir.

Las medianas de Δd son relativamente estables al variar el semiancho entre 25, 50 y 75 km: Cuyo, 10,0–10,2 km; NOA, 56,1–56,5 km. También persisten al separar 2011–2015, 2016–2020 y 2021–2026: Cuyo, 9,3–10,5 km; NOA, 54,4–59,2 km. Esta comprobación reduce la sospecha de que el resultado dependa exclusivamente de un ancho o período, pero no resuelve errores sistemáticos, completitud ni dependencia entre eventos.

La literatura sobre el nido sísmico de Jujuy es especialmente pertinente para contextualizar la concentración del NOA, alrededor de 150–250 km. La similitud espacial debe cotejarse; no convierte automáticamente nuestros puntos en integrantes del nido estudiado. [Valenzuela-Malebrán et al., 2022](https://doi.org/10.1016/j.jsames.2022.103887).

### C.2. Los eventos muy profundos tienen valor explicativo, pero necesitan curaduría

El catálogo contiene 129 registros entre 500 y menos de 700 km; varios se agrupan alrededor de 27–28°S y 63°O. Esa distribución merece una lente sobre profundidad bajo el interior continental. La síntesis regional de USGS documenta sismicidad de aproximadamente 500–650 km desde Bolivia hacia Argentina central. [Hayes et al., 2015](https://pubs.usgs.gov/of/2015/1031/e/pdf/of2015-1031-E.pdf).

Hay dos alertas concretas que deben conservarse y verificarse, no corregirse por intuición:

| Fecha local del registro | Coordenadas, longitud/latitud | Profundidad | Texto del catálogo |
|---|---|---:|---|
| 05/04/2018 | −69,130; −33,890 | 750 km | MENDOZA |
| 09/07/2013 | −64,848; −29,079 | 700 km | CATAMARCA |

Además, aparecen candidatos de Santiago del Estero con diferencias sustanciales frente a soluciones actuales de USGS. Por ejemplo, el registro INPRES del 20/01/2023 a las 19:09:31 locales informa 637 km; USGS lista un evento próximo a Campo Gallo a las 22:09:39 UTC y 596,8 km. Es un **emparejamiento candidato por tiempo y región**, todavía sin reconciliación oficial de identidades. Refuerza la necesidad de mostrar fuente y solución, no una profundidad universal única. [Listado USGS de 2023](https://earthquake.usgs.gov/earthquakes/browse/m6-world.php?year=2023).

No anunciar un «vacío absoluto de 300–500 km»: nuestro export tiene 147 registros en ese intervalo y la síntesis regional citada trabaja con otro universo y selección. Tampoco usar esta discrepancia como descubrimiento que refuta la literatura sin revisar las localizaciones.

### C.3. La transformación Slab2 no parece explicar las diferencias de decenas de kilómetros

Comprobaciones propias:

- DEP y UNC raw coinciden con los hashes fijados en el proyecto.
- Los nodos web seleccionados conservan el raw con error máximo de redondeo de aproximadamente 0,005 km.
- Las 26.643 celdas de cuatro nodos válidos que generan la malla quedaron dentro de CLP en la comprobación geométrica realizada.
- En 40.525 nodos válidos del área 73–61°O / 33–23°S, comparar DEP raw de 0,05° con interpolación bilineal del web de 0,1° dio error absoluto mediano 0,013 km, p95 0,071 km y máximo 0,180 km.

Esto respalda conservar la grilla web para el MVP. Es una prueba de fidelidad numérica en esa región; no una estimación de exactitud geofísica ni una certificación de todos los bordes del modelo. La malla 3D usa triángulos; la interpolación bilineal diagnóstica debe documentarse como una operación distinta y compararse también con la interpolación triangular antes de prometer identidad punto a punto.

### C.4. Límites de visualización que afectan la lectura científica

La función geográfica usa `111,32 × cos(35°)` km por grado de longitud para toda la escena. Respecto de la aproximación local a cada latitud, comprime aproximadamente 4,4 % las distancias este–oeste a 31°S y 10,3 % a 24°S. La distorsión crece mucho hacia el extremo austral. La superposición puede coincidir porque todas las capas usan la misma función, sin que sus pendientes sean métricamente correctas.

El terreno empieza en 5× mientras hipocentros y Slab2 quedan en 1×. La interfaz lo declara, lo cual es positivo, pero la escena conjunta no representa una geometría física a una sola escala. Recomiendo que cualquier vista de comparación científica use todo a 1×; el relieve exagerado puede conservarse como exploración expresamente ilustrativa.

El púrpura de Slab2 se parece al de eventos profundos. Conviene una línea/superficie neutra para el modelo y reservar la paleta de profundidad para puntos. La transparencia, el orden de dibujo y los símbolos de tamaño fijo pueden favorecer coincidencias aparentes y ocultar poblaciones. La sección 2D es la herramienta prioritaria para resolverlo.

## D. Literatura científica fundamental

La siguiente bibliografía vincula cada referencia con una decisión. Los trabajos regionales detallados no se sustituyen por el modelo global. Se consultaron fuentes editoriales, institucionales o de autores; no se usaron blogs como respaldo científico.

| Referencia | Aporte al proyecto |
|---|---|
| **Hayes et al. (2018), Science 362, 58–61.** [Slab2, a comprehensive subduction zone geometry model](https://doi.org/10.1126/science.aat4723). | Referencia del modelo. Complementar con su [distribución oficial de datos](https://doi.org/10.5066/F7PV6JNV), que define variables y máscara. |
| **Cahill & Isacks (1992), JGR 97, 17503–17529.** [Seismicity and shape of the subducted Nazca Plate](https://doi.org/10.1029/92JB00493). | Marco regional clásico para variación de geometría a lo largo de los Andes. No es una validación del snapshot actual. |
| **Anderson et al. (2007), GJI 171, 419–434.** [Geometry and brittle deformation…](https://doi.org/10.1111/j.1365-246X.2007.03483.x). | Justifica la sección pampeana y el contraste hacia la transición meridional. Sus perfiles este–oeste proyectan eventos hasta 50 km de la línea. |
| **Mulcahy et al. (2014), Tectonics 33, 1636–1658.** [Central Andean mantle and crustal seismicity…](https://doi.org/10.1002/2013TC003393). | Puna austral y transición septentrional; advierte contra interpretar vacíos de catálogo como ausencia de placa. |
| **Linkimer et al. (2025), GJI 243, ggaf408.** [Shape and deformation of the Pampean flat slab in Argentina](https://doi.org/10.1093/gji/ggaf408). | Actualización regional importante: geometría local y distinción entre techo de la sismicidad y superficie Slab2. Evita tratar la versión global 2018 como descripción definitiva. |
| **Valenzuela-Malebrán et al. (2022), JSAMES 117, 103887.** [Source mechanisms and rupture processes of the Jujuy seismic nest…](https://doi.org/10.1016/j.jsames.2022.103887). | Justificación del perfil NOA y de estudiar concentraciones localizadas. Sus mecanismos provienen de análisis que nuestro export no contiene. |
| **Ammirati et al. (2022), Scientific Reports 12, 17939.** [Stress transmission… San Juan earthquake](https://doi.org/10.1038/s41598-022-22752-6). | Evidencia específica de sismicidad cortical en San Juan y de la importancia de resolver discrepancias de profundidad. |
| **Blackwell et al. (2026), GJI 246, ggag083.** [Assessing the impact of automatically derived depth phases…](https://doi.org/10.1093/gji/ggag083). | Estudio revisado por pares sobre relocalización en Sudamérica. Fundamenta que la incertidumbre de profundidad debe investigarse, no deducirse de decimales. |
| **Hayes et al. (2015), USGS OFR 2015–1031-E.** [Seismotectonics of South America](https://doi.org/10.3133/ofr20151031E). | Síntesis institucional para el contexto regional y la población muy profunda; no reemplaza la verificación individual. |
| **Leite Neto, Julià & Prieto (2024), Earth and Space Science 11, e2024EA003617.** [Deep-focus earthquake mechanisms…](https://doi.org/10.1029/2024EA003617). | Límites de las explicaciones físicas de sismos profundos. Su estudio es Perú–Brasil: no trasladar automáticamente sus mecanismos a Santiago del Estero. |
| **Karney (2013), Journal of Geodesy 87, 43–55.** [Algorithms for geodesics](https://doi.org/10.1007/s00190-012-0578-z). | Base para distancia y proyección reproducibles sobre el elipsoide. |

Fuentes técnicas complementarias: [GEBCO 2026](https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid), [metadatos provinciales IGN](https://www.ign.gob.ar/capas-sig/metadata/provincia.pdf), [clasificación de profundidad USGS](https://www.usgs.gov/programs/earthquake-hazards/determining-depth-earthquake) y [formatos de USGS Slab Models](https://ghsc.code-pages.usgs.gov/esi/usgs-slab-models/manual/sg_output_formats.html).

No todas las descargas editoriales permitieron lectura íntegra. Las afirmaciones utilizadas se limitaron al texto accesible, resúmenes científicos, documentación oficial y resultados propios. No se extrapolaron conclusiones de figuras no examinadas.

## E. Sección transversal #1 recomendada: Cuyo / San Juan, aproximadamente 31°S

**Pregunta:** ¿cómo se distribuyen los hipocentros desde Chile hacia el interior argentino, y qué correspondencia tienen con el tramo poco inclinado representado por Slab2?

| Parámetro | Recomendación |
|---|---|
| A, longitud/latitud | −73,0°; −31,0° |
| B, longitud/latitud | −61,0°; −31,0° |
| Trayectoria | Geodésica WGS84 A–B, aproximadamente oeste–este; no un paralelo exacto. |
| Azimut inicial | 93,10° desde el norte, sentido horario; cambia a lo largo de la geodésica. |
| Longitud | Aproximadamente 1.145,5 km. |
| Selección | ±50 km a cada lado: ancho total 100 km. |
| Profundidad inicial visible | 0–350 km, con margen superior para topografía; acceso explícito al rango completo del corredor. |
| Datos | Snapshot INPRES; GEBCO científico; Slab2 DEP/UNC/CLP; IGN/Natural Earth para ubicar A–B y corredor. |
| Escalas | Distancia y profundidad en km; 1×, igual longitud gráfica por km en ambos ejes. |

Hay 24.689 eventos seleccionados: 2.797 superficiales, 21.888 intermedios y 4 de profundidad ≥300 km. Dos superan 350 km; el encuadre inicial debe informar esa exclusión visual y permitir verlos.

Esperamos observar sismicidad superficial separada de una franja abundante cercana a 100–130 km y su comparación con la geometría de DEP. La extensión oriental evita terminar el perfil justo donde el modelo empieza a profundizar. La elección se apoya en la geometría descrita por Anderson y en su actualización regional, no sólo en la abundancia de puntos. [Anderson et al., 2007](https://doi.org/10.1111/j.1365-246X.2007.03483.x), [Linkimer et al., 2025](https://doi.org/10.1093/gji/ggaf408).

No concluir: placa completamente plana, pertenencia de cada evento, espesor, mecanismo de ruptura, continuidad demostrada por nuestro catálogo o que todos los sismos superficiales se deban a una misma falla. Tampoco presentar este perfil como representativo de toda Mendoza: el sistema cambia hacia el sur.

El semiancho de 50 km tiene antecedente metodológico regional; no es una constante natural. La sensibilidad realizada selecciona 13.555, 24.689 y 34.428 eventos para ±25, ±50 y ±75 km. Debe conservarse el mapa del corredor para que el usuario entienda que está viendo una proyección de una franja, no sismos situados exactamente sobre una línea.

## F. Sección transversal #2: NOA / Jujuy-Salta, aproximadamente 24°S

**La recomiendo como SHOULD, no como requisito que ponga en riesgo la primera.** Aporta variación regional y una comparación menos complaciente con el modelo.

**Pregunta:** ¿cambia la distribución de profundidades al norte del segmento pampeano, y hasta dónde coincide la concentración sísmica con DEP?

| Parámetro | Recomendación |
|---|---|
| A, longitud/latitud | −73,0°; −24,0° |
| B, longitud/latitud | −61,0°; −24,0° |
| Orientación | Geodésica aproximadamente oeste–este; azimut inicial 92,45°. |
| Longitud | Aproximadamente 1.220,7 km. |
| Corredor | ±50 km; 100 km de ancho total. |
| Profundidad | 0–350 km al comparar con Cuyo; vista completa 0–700 km si se habilita expansión. |
| Fuentes | Las mismas de la primera sección, con idénticas reglas de selección y escala. |

Se seleccionan 11.374 eventos: 660 superficiales, 10.694 intermedios y 20 de profundidad ≥300 km. Once quedan por debajo del encuadre de 350 km; cinco tienen profundidad ≥500 km.

La figura muestra una concentración intermedia más localizada y más profunda que la línea DEP. Es coherente investigar su relación espacial con la región del nido de Jujuy descrita en la literatura. **No conviene prometer una banda continua que calque Slab2**: los datos de este corredor no muestran eso. [Valenzuela-Malebrán et al., 2022](https://doi.org/10.1016/j.jsames.2022.103887).

No concluir que la separación nominal de 56 km mide el espesor de Nazca, que Slab2 está desplazado exactamente esa cantidad ni que la concentración tenga una causa física demostrada por nuestra visualización.

Alternativas contrastadas con las mismas longitudes y ±50 km:

| Candidato | Total | Intermedios | ≥500 km | Decisión |
|---|---:|---:|---:|---|
| 31°S | 24.689 | 21.888 | 0 | Primera sección. |
| 24°S | 11.374 | 10.694 | 5 | Mejor segunda sección para contraste regional. |
| 27°S | 1.880 | 787 | 36 | Más útil para sismicidad muy profunda, pero mezcla la transición de Puna y poblaciones separadas; reservar como alternativa futura. |
| 34°S | 535 | 94 | 1 | Contraste meridional respaldado por literatura, pero mucho menos sostenido por este catálogo para el objetivo del MVP. |

El número de eventos no es el único criterio: importan pregunta, geometría publicada, cobertura y posibilidad de separar poblaciones. Evitar ensanchar arbitrariamente el corredor de 27°S para fabricar una continuidad entre sismicidad intermedia y profunda. Para octubre, Santiago del Estero puede explicarse con una vista 3D y eventos verificados; no necesita una tercera sección.

## G. Metodología matemática reproducible

### G.1. Línea y coordenadas

Sean A = (λA, φA), B = (λB, φB), con longitudes oeste y latitudes sur negativas. Usar el elipsoide WGS84: semieje mayor 6.378.137 m y aplanamiento 1/298,257223563. Resolver el problema geodésico inverso para obtener longitud L y azimut inicial α. Definir γ(s) como el punto alcanzado desde A a distancia geodésica s sobre esa trayectoria.

Emplear un algoritmo geodésico documentado, como el de [Karney](https://doi.org/10.1007/s00190-012-0578-z). No medir s ni el corredor en coordenadas de Three.js.

### G.2. Proyección de cada evento

Para la ubicación horizontal Pi = (λi, φi), buscar el pie perpendicular local sobre la prolongación de γ:

`si = argmin_s distancia_geodésica_WGS84(Pi, γ(s))`

`ci = distancia_geodésica_WGS84(Pi, γ(si))`

Seleccionar únicamente si `0 ≤ si ≤ L` y `ci ≤ w`, con `w = 50 km`. Usar la prolongación evita admitir por error puntos detrás de los extremos como si pertenecieran al tramo. Si se guarda distancia transversal firmada, declarar qué lado es positivo; la selección utiliza su valor absoluto.

En el análisis adjunto se minimizó sobre una prolongación de 150 km en cada extremo mediante búsqueda de sección áurea vectorizada, 50 iteraciones, para un recorte horizontal amplio alrededor de cada perfil. La implementación final debe verificar convergencia y suficiencia del recorte con casos de control. Tolerancia numérica propuesta: ≤1 m; no se interpreta como precisión de los datos.

El punto en el gráfico es `(xi, yi) = (si/1000, di)`, con profundidad positiva hacia abajo. Guardar ID derivado, coordenadas originales, s, c, profundidad y motivo de exclusión. No desplazar verticalmente un evento para acercarlo al modelo.

### G.3. Referencia vertical

Conservar inicialmente `di = profundidad reportada por INPRES`. Rotular el eje como «profundidad catalogada/modelada; comparación vertical nominal» y hacer accesible la referencia desconocida.

GEBCO tiene elevación h positiva hacia arriba respecto del nivel del mar nominal. En el gráfico de profundidad, la superficie se dibuja en `y = −h/1000`. **No restar GEBCO de las profundidades INPRES sin verificar qué representan.**

Si se confirmara que INPRES mide desde la superficie local, la conversión al cero nominal sería `d_mar = d_local − h_km`. Si ya mide respecto de ese cero, no corresponde esa corrección. Una referencia adicional requeriría su transformación específica. La diferencia no es un ruido aleatorio que pueda absorberse sin más en UNC.

### G.4. Muestreo de modelos

Muestrear γ cada aproximadamente 5 km, incluyendo A y B. Ese paso controla la continuidad del dibujo; **no mejora la resolución de los modelos**.

Para una grilla nodal Slab2, convertir la posición a índices fraccionarios `(c,r)`, localizar las cuatro esquinas y aplicar:

`f(c,r) = (1−a)(1−b) f00 + a(1−b) f10 + (1−a)b f01 + ab f11`

donde `a = c − floor(c)` y `b = r − floor(r)`. Si falta alguna esquina, el punto o la celda no cumple CLP, producir `null` y cortar la curva; nunca rellenar el hueco con una unión recta entre extremos.

GEBCO usa **centros de celda**, no los nodos de Slab2. Su primera coordenada es `(west + Δλ/2, north − Δφ/2)`. Incorporar ese medio píxel al interpolar. La salida científica actual tiene paso de 0,08333° —aproximadamente 9,3 km en dirección norte–sur—, frente a los 15 segundos de arco de la fuente. Las cotas enteras en metros no implican exactitud de un metro. GEBCO combina fuentes y datums con limitaciones explícitas. [Documentación GEBCO 2026](https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid).

Una curva GEBCO sobre A–B es contexto superficial de esa línea. No es el relieve situado encima de cada evento proyectado desde los bordes del corredor.

### G.5. Tres efectos que no deben confundirse

1. **UNC del modelo:** mostrar `DEP(s) ± UNC(s)` como banda de incertidumbre reportada. La distribución oficial relaciona UNC con desviaciones estándar de las PDF empleadas en el ajuste. No es un intervalo de confianza del 95 %, ni incertidumbre del hipocentro, ni probabilidad de pertenencia a una placa. [Distribución oficial Slab2](https://doi.org/10.5066/F7PV6JNV).
2. **Variación transversal:** los puntos vienen de ±50 km y el slab puede variar dentro de esa franja. Evaluar DEP sobre transectos perpendiculares y registrar su rango válido a cada s. Ese rango es una derivación geométrica separada, no debe sumarse a UNC ni llamarse error del modelo.
3. **Errores y referencia del catálogo:** no conocemos las incertidumbres horizontales/verticales individuales ni el datum. No dibujar barras cero ni asignar errores inventados.

Para el MVP, banda UNC y explicación del corredor son suficientes en pantalla; el análisis de variación transversal debe integrar la validación del perfil. Si produce una diferencia que altera su lectura, reducir el ancho de manera documentada o mostrar una envolvente distinta y claramente rotulada.

Interpolar UNC con los mismos pesos positivos como campo reportado. No dividirla por raíz del número de nodos ni eventos: no estamos promediando observaciones independientes. Tampoco generar un z-score o un «porcentaje compatible» sin un modelo de errores y dependencias defendible.

### G.6. Escalas y geometría

Mantener 1× por defecto: un km horizontal ocupa los mismos píxeles que un km vertical. Si el contenedor tiene escala horizontal `kx` y vertical `ky`, la exageración efectiva es `E = ky/kx`; debe valer 1, no sólo una constante del código. Evitar estirar el gráfico independientemente en CSS.

Si se permite E > 1, mostrarlo permanentemente y aplicarlo a todos los elementos de la sección. Para un tramo planar, `tan(ángulo_aparente) = E × tan(ángulo_en_el_perfil)`. Aun a E = 1, un perfil oblicuo a la dirección de máximo descenso no mide el DIP verdadero.

La propuesta es una **sección desplegada de distancia superficial y profundidad**, no un corte cartesiano exacto de una Tierra plana. Con profundidades de 600 km y perfiles extensos, la curvatura terrestre importa para distancias tridimensionales y ángulos físicos; no incorporar esas mediciones al MVP. Una geometría geocéntrica completa puede estudiarse posteriormente.

### G.7. Reproducibilidad y aceptación

Registrar en un manifiesto del perfil: A/B, elipsoide, semiancho, pasos, interpolación, profundidad visible y seleccionada, filtros temporales/de magnitud, versiones, hashes, nodata, conteos de exclusión y versión del método.

Verificar A→0, B→L, un punto sobre la línea→c≈0, puntos a ambos lados del corredor, inversión A–B→L−s, unidades y signo vertical, centros GEBCO, nodos Slab2 y corte en CLP. Comparar las soluciones numéricas con una biblioteca geodésica independiente o casos de referencia. Hacer pruebas con ±25/50/75 km y períodos separados. Se realizaron aquí estas dos últimas sensibilidades para los diagnósticos resumidos; no una validación completa de futura implementación.

## H. Uso recomendado de DEP / UNC / CLP / DIP / STR / THK

| Variable | Qué representa | Decisión para octubre |
|---|---|---|
| DEP | Profundidad modelada; el producto publicado representa la superficie superior estimada del slab. | **MUST para la comparación científica.** Curva de sección; superficie 3D opcional. Vincular inequívocamente el archivo local al paquete publicado. |
| UNC | Incertidumbre de profundidad reportada por el modelo, en km. | **MUST.** Banda local y explicación. El resumen global actual no permite juzgar una región. |
| CLP | Polígono del dominio de uso. | **MUST como máscara.** Fuera: «sin modelo disponible», no profundidad cero ni ausencia de placa. |
| Contornos DEP | Otra representación de la misma profundidad modelada. | **SHOULD.** Sólo si mejoran orientación; pocos niveles etiquetados. No son nueva evidencia ni necesarios para construir la sección. |
| DIP | Buzamiento local modelado, en grados. | **POST-CONTEST en interfaz.** Puede ayudar offline a comprobar la orientación; no hace falta cargarlo para las dos curvas. |
| STR | Rumbo local modelado, en grados. | **POST-CONTEST en interfaz.** Útil offline; requiere convención angular y tratamiento circular. |
| THK | Espesor estimado mediante supuestos del modelo. | **POST-CONTEST.** No extruir una placa sólida ni clasificar eventos por estar dentro de ella. |

La documentación actual de USGS confirma km para THK y UNC y grados para DIP/STR. La estimación de THK usa la edad de la litosfera y un modelo térmico; no es una medición local uniforme del volumen. [Formatos](https://ghsc.code-pages.usgs.gov/esi/usgs-slab-models/manual/sg_output_formats.html), [generación del modelo](https://ghsc.code-pages.usgs.gov/esi/usgs-slab-models/manual/ug_model_gen.html).

La literatura regional consultada trata Slab2 como superficie superior y la distingue del techo de la sismicidad. Sin embargo, los encabezados del raw local no declaran explícitamente top/center ni datum. Debe completarse la trazabilidad del paquete; el generador actual de USGS permite ambas opciones y no demuestra por sí solo qué se descargó en 2018. Mientras tanto, la etiqueta prudente sigue siendo «superficie modelada Slab2».

El recorte web tiene UNC de 2,72 a 58,64 km, mediana 19,88 km. Son estadísticas de sus 27.118 nodos válidos, no de Argentina entera ni incertidumbre típica de cualquier evento. En los corredores elegidos la incertidumbre local es mayor que esa mediana global.

## I. Categorías de profundidad

**Conservar 70 y 300 km** como convención descriptiva de esta visualización, respaldada por USGS. Definir exactamente:

- Superficiales: `0 ≤ d < 70 km`.
- Intermedios: `70 ≤ d < 300 km`.
- Profundos: `d ≥ 300 km`.
- Ausentes/no válidos: categoría aparte; nunca convertirlos a cero.

La literatura y organismos también utilizan 60 km como corte superficial/intermedio. El IGP lo emplea en trabajos regionales sudamericanos; no existe una frontera mineralógica universal en 60 o 70 km. Hay que elegir una convención, citarla y no equipararla con corteza/manto o interplaca/intraplaca. [USGS](https://www.usgs.gov/programs/earthquake-hazards/determining-depth-earthquake), [trabajo del repositorio IGP](https://repositorio.igp.gob.pe/bitstreams/36d0f185-74e6-4dd1-a73b-0450c132020f/download).

Hallazgos concretos:

- El código del visor ya ubica 70 km en intermedios y 300 km en profundos, pero la leyenda «más de 300 km» excluye verbalmente los **9 registros exactamente en 300 km**. Cambiar la etiqueta a «300 km o más»; también eliminar la superposición verbal entre los rangos de 70.
- El proveedor conserva `≤33`, `33–70` y `>70 km`, con nombres superficial/intermedio/profundo, en `stats_exporter.py`. El frontend actual carga GeoJSON, no esas estadísticas; la inconsistencia es real pero no significa que hoy esté usando esos conteos.
- Una eventual corrección del proveedor debe ser una tarea separada, con esquema/versionado y sin mezclar repositorios. El producto puede calcular su clasificación descriptiva con una definición única mientras no consuma aquel resumen.
- No recortar automáticamente profundidades a 700 km. Conservar los extremos, señalarlos para revisión y evitar convertirlos en mensajes destacados antes de verificarlos.

Para una lente de 500–700 km, usar ese rango numérico explícito: es un filtro exploratorio dentro de los profundos, no una cuarta clase tectónica. Mantener siempre la profundidad numérica en el inspector. El color por categoría no necesita convertirse en una leyenda tectónica.

## J. Pregunta rectora, experiencia y hasta tres descubrimientos

La pregunta actual es útil para orientar el proyecto, pero «revelan la estructura invisible» puede sugerir una reconstrucción propia que el producto no hace. Recomiendo:

> **¿Cómo se distribuyen los terremotos en profundidad bajo Argentina y qué relación tienen esos patrones con los modelos de la placa de Nazca?**

La pregunta permite contrastar datos y modelo incluso cuando difieren. No requiere sostener que toda Argentina responda a un único sistema tectónico ni que la nube localice exactamente una placa.

El flujo Argentina → región/provincia → eventos → profundidad → sección funciona como posibilidad de exploración, pero no como secuencia obligatoria. Permitir también Argentina → sección y región → distribución de profundidades sin seleccionar primero un evento. Usar regiones geográficas/tectónicas para elegir perfiles; una frontera provincial no debe recortar el slab ni ocultar la parte chilena necesaria para entenderlo.

Máximo tres lentes, todas opcionales y reversibles:

1. **«Bajo Cuyo aparecen poblaciones a distintas profundidades».** Cámara regional, puntos y sección #1, GEBCO a 1×; activar/desactivar DEP. Texto: «Una franja intermedia acompaña la forma general del tramo poco inclinado del modelo; los puntos son localizaciones catalogadas». No diagnosticar mecanismos.
2. **«El patrón cambia hacia el NOA».** Si se completa la sección #2, comparar con los mismos ejes, filtros y ancho. Hacer visible la separación respecto de DEP; explicar que catálogo y modelo representan objetos distintos y tienen incertidumbres. No puntuar cuál región «encaja mejor» como si fuera validación independiente.
3. **«Hay terremotos catalogados a más de 500 km bajo el interior».** Vista de norte/centro-norte con filtro explícito 500–700 km y uno o dos eventos cotejados. Mostrar fuente y profundidad del catálogo. Hasta cerrar esa verificación, dejarla como SHOULD. No presentarla como mecanismo físico explicado ni como demostración de un puente continuo hasta Cuyo.

Cada lente muestra período, filtro, cantidad seleccionada, cantidad fuera del encuadre y botón para volver a exploración libre. Una breve explicación y enlace de fuente bastan. No hace falta implementar una narrativa temporal, un sistema de capítulos ni una agregación nacional compleja.

## K. Priorización hasta el 15 de octubre

La propuesta conserva la puerta científica del 5 de octubre del alcance vigente. La sección se vuelve el objetivo científico prioritario, sin quitar tiempo al núcleo publicable.

| Prioridad | Entregable y criterio de cierre |
|---|---|
| **MUST** | Unificar clasificación 70/300, límites exactos y etiquetas; fijar snapshot/versión y mantener acceso al catálogo completo. |
| **MUST** | Filtros de fecha, magnitud reportada y profundidad; selección e inspector claros, estados de carga/error y orientación. Hoy los filtros no están implementados. |
| **MUST científico, sujeto a puerta** | Sección fija 31°S reproducible, A–B/corredor visibles, GEBCO/DEP/UNC/CLP, escala 1× y comparación nominal rotulada. Sin métricas públicas de distancia al slab mientras no se resuelva el datum. |
| **MUST** | Vistas de comparación a 1× y lenguaje visual que distinga puntos/modelos; ejes numéricos legibles y límites del encuadre. |
| **MUST** | Metodología y fuentes accesibles; depurar estados documentales obsoletos después de aprobar el informe. Curaduría de cualquier evento usado como ejemplo. |
| **MUST** | Desktop estable, mobile simplificado, accesibilidad básica, contexto territorial honesto, build/deploy y medición en hosting real con compresión del GeoJSON. |
| **SHOULD** | Segunda sección 24°S si comparte el mismo motor y supera las mismas verificaciones. |
| **SHOULD** | Lente de sismos >500 km con eventos cotejados; pocos contornos DEP si hacen falta; persistir filtros/vista en URL. |
| **POST-CONTEST** | Secciones libres, tercer perfil, clasificación tectónica, ajuste propio del slab, clustering interpretativo, THK volumétrico, mapas DIP/STR, modelos térmicos, mecanismos focales nuevos, análisis de riesgo/tasas/energía, relocalización e integración masiva de otros catálogos. |
| **POST-CONTEST salvo cuello demostrado** | Binario propio, shaders, Workers, picking GPU, caché compleja o nueva arquitectura de capas. |

Calendario propuesto, no estimación de esfuerzo garantizada:

- **18–22 de septiembre:** aprobar esta decisión, cerrar contrato del perfil y inconsistencias que afectan lectura; comprobar referencias del paquete Slab2 y política de datum.
- **23–29 de septiembre:** sección #1 y filtros esenciales en un flujo completo; validación numérica y de comprensión.
- **30 de septiembre–5 de octubre:** validación científica final y despliegue temprano. Segunda sección sólo si el núcleo está cerrado.
- **6–9 de octubre:** accesibilidad, mobile, rendimiento real, textos y atribuciones.
- **10–15 de octubre:** congelamiento funcional, correcciones bloqueantes y entrega.

Recortes explícitos: no heatmap nacional antes de demostrar que es necesario; no selector territorial complejo; no tercera sección; no nuevas capas de datos por disponibilidad. Si la comparación no supera la puerta científica, se entrega exploración sísmica con profundidad y sus límites, sin una explicación tectónica aparente construida para llenar el vacío.

## L. Riesgos científicos todavía abiertos

| Riesgo | Consecuencia y tratamiento |
|---|---|
| **Datum vertical INPRES desconocido** | Impide afirmar separaciones verticales exactas. Consultar documentación técnica verificable; mientras tanto conservar profundidades originales, comparación nominal y sin corrección topográfica automática. |
| **Errores hipocentrales ausentes** | No sabemos cuánto de una banda/dispersión es localización. No fabricar barras de error ni probabilidades. Documentar y cotejar ejemplos. |
| **Completitud espacial, temporal y por magnitud no evaluada** | Conteos no equivalen a tasa física ni riesgo. No inferir tendencias o comparar actividad de provincias. |
| **Estado revisado/automático y escala de magnitud perdidos** | Inspector y filtros deben describir lo que realmente hay. Evitar Mw o «revisado» genéricos. |
| **Dependencia catálogo–modelo** | No llamar validación independiente a una coincidencia. Auditar fuentes de Slab2 si se quisiera hacer un estudio formal. |
| **Geometría global frente a estudios locales** | No resolver discrepancias moviendo capas. La estimación local puede diferir por método, resolución y objeto representado. |
| **Gran diferencia nominal en NOA** | Mantenerla visible; comprobar fuentes, calidad del catálogo, posición dentro del slab y variación transversal. No elegir una causa única con estos datos. |
| **Extremos de 700/750 km y registros de 300–500 km** | Revisar individualmente antes de usarlos como descubrimientos o refutación de patrones publicados. |
| **Proyección de escena y mezcla 5×/1×** | Limitarla a exploración; usar cálculo geodésico y escala uniforme para comparación cuantitativa. La vista territorial austral es especialmente distorsionada. |
| **Cartografía derivada simplificada** | Atribuir «derivada de IGN». Simplificar por polígono con preservación topológica no garantiza fronteras compartidas idénticas. No usar esas líneas para asignación jurisdiccional precisa. |
| **Origen/edición exacta de IGN incompletos** | La URL de metadatos identifica el recurso, no prueba la fecha exacta del snapshot local. Conservar esa limitación; la licencia consultada pide citar IGN. |
| **Referencia superficial GEBCO** | Es contexto modelado y remuestreado, no medición uniforme. No derivar geología, espesores corticales o relaciones causales del relieve. |
| **Documentación desactualizada** | `plans/README.md`, la hoja de ruta y partes del manifiesto aún describen capas como no implementadas. No usar ese estado histórico para decidir trabajo pendiente. |
| **Metadatos locales Slab2 imperfectos** | `Slab2_sam.xml` contiene una referencia de proceso a otro artículo sobre rupturas. Ese campo no prueba la metodología; usar la publicación y distribución Slab2 correctas. |

Verificaciones técnicas adicionales acotadas: los validadores actuales comprueban mayormente estructura y controles guardados; no equivalen a contrastar cada celda con el raw. El control GEBCO `sample_nearest` de preparación no usa exactamente la misma fórmula de centros que el consumidor; armonizarlo antes de usar esos puntos como prueba subcelular. Las limitaciones del benchmark previo permanecen: no certifica red pública, filtros nuevos, hardware diverso ni tasa de aciertos del picking.

## M. Próxima tarea concreta para Codex, después de la aprobación

**Implementar y validar una única sección fija Cuyo–31°S, usando los parámetros de este informe, con catálogo y modelo distinguibles.**

Entregable: desde la escena, abrir el perfil, ver A–B y el corredor en el mapa, inspeccionar los mismos eventos en 2D, activar/desactivar DEP con su banda UNC, reconocer GEBCO a 1× y volver a explorar. Mantener identificadores y profundidades fuente. Etiquetar la comparación nominal si el datum continúa sin resolver.

Aceptación:

1. Misma selección de 24.689 eventos para snapshot y parámetros fijados, con diferencias numéricas de borde investigadas, no toleradas silenciosamente.
2. Conteos por profundidad coherentes; los dos eventos de profundidad >350 km se conservan y son accesibles mediante rango completo.
3. Distancias geodésicas, límites de corredor, signos, centros de celda, interpolación y CLP verificados con casos de referencia.
4. Gráfico 1× real, independientemente del tamaño de pantalla; ninguna distancia al slab presentada como pertenencia tectónica.
5. Una explicación breve y fuentes, sin exigir recorrido narrativo.
6. Build y flujo principal verificados; pruebas de selección y filtros proporcionales al cambio.

La tarea empieza actualizando el contrato específico de la sección y las etiquetas necesarias dentro del producto, y continúa hasta el flujo revisable. No incluye corregir el proveedor en el mismo cambio, incorporar una segunda sección ni recalcular un modelo geofísico.

## Anexos de esta auditoría

La figura compara dos perfiles con los mismos ejes. El ancho gráfico excede ligeramente B para mantener escala común. Las cifras de la cabecera incluyen todos los eventos del corredor, aunque el encuadre 0–350 km deje fuera 2 y 11, respectivamente. La banda es DEP ± UNC sobre la línea central; no engloba automáticamente todos los puntos proyectados desde el corredor.

![Secciones diagnósticas calculadas desde los datos locales](C:/Users/Usuario/.codex/visualizations/2026/09/17/01a0b0cd-3be4-77b1-9d2b-099c8d34a733/secciones-candidatas.png)

- [Resultados numéricos, método y hashes](AUDITORIA_CALCULOS_2026-09-17.json).
- [Selección Cuyo–31°S](C:/Users/Usuario/.codex/visualizations/2026/09/17/01a0b0cd-3be4-77b1-9d2b-099c8d34a733/perfil-31S.csv).
- [Selección NOA–24°S](C:/Users/Usuario/.codex/visualizations/2026/09/17/01a0b0cd-3be4-77b1-9d2b-099c8d34a733/perfil-24S.csv).
- [Candidato descartado 27°S](C:/Users/Usuario/.codex/visualizations/2026/09/17/01a0b0cd-3be4-77b1-9d2b-099c8d34a733/perfil-27S.csv).
- [Candidato descartado 34°S](C:/Users/Usuario/.codex/visualizations/2026/09/17/01a0b0cd-3be4-77b1-9d2b-099c8d34a733/perfil-34S.csv).

Puntos de evidencia local prioritarios:

- [Transformación de escena](C:/Users/Usuario/OneDrive/Escritorio/tlabajo/Otros/Proyectos/Sismos-argentina/argentina-earthquakes/src/lib/geo/scene-coordinates.ts:5).
- [Coloración por profundidad](C:/Users/Usuario/OneDrive/Escritorio/tlabajo/Otros/Proyectos/Sismos-argentina/argentina-earthquakes/src/components/seismic/SeismicViewer.tsx:104).
- [Leyenda y resumen UNC](C:/Users/Usuario/OneDrive/Escritorio/tlabajo/Otros/Proyectos/Sismos-argentina/argentina-earthquakes/src/components/seismic/SeismicViewer.tsx:803).
- [Clasificación distinta en el proveedor](C:/Users/Usuario/OneDrive/Escritorio/tlabajo/Otros/Proyectos/Sismos-argentina/inpres-sismos/exporters/stats_exporter.py:73).
- [Contrato de datos vigente](C:/Users/Usuario/OneDrive/Escritorio/tlabajo/Otros/Proyectos/Sismos-argentina/argentina-earthquakes/docs/DATA_CONTRACT.md).
- [Alcance vigente, que esta propuesta todavía no modifica](C:/Users/Usuario/OneDrive/Escritorio/tlabajo/Otros/Proyectos/Sismos-argentina/argentina-earthquakes/docs/MVP_SCOPE.md).
