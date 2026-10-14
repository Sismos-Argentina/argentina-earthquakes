# Presentación de Bajo nuestros pies en Contar con Datos 2026

Presentar una obra en **Exploración Interactiva**: un mapa 3D para explorar sismos y dos cortes comparables que explican la diferencia entre la sismicidad y el volcanismo de los Andes. Mantener Three.js para esta entrega. El cierre oficial es el **15 de octubre**; conviene completar la presentación el 14 y reservar el 15 para contingencias. Las [bases oficiales](https://images.udesa.edu.ar/sites/default/files/2026-07/Bases-y-Condiciones-Contar-con-Datos-2026.pdf) no especifican una hora de cierre.

## Preguntas que responde la obra

| Pregunta del visitante | Respuesta y evidencia disponible | Límite que acompaña la respuesta |
|---|---|---|
| ¿Qué hay debajo de los Andes? | El mapa conserva profundidad hipocentral; el corte muestra los puntos INPRES junto a la geometría modelada por Slab2 y la superficie GEBCO. | Los puntos son registros del catálogo. Las superficies son modelos. |
| ¿Qué cambia entre San Juan y el sur de Mendoza? | A 31°S el modelo presenta un tramo de menor pendiente; a 35°S desciende más marcadamente. Los cortes comparten período, corredor ±50 km, píxeles por km y rango 0–700 km. | Los extremos definen la latitud; A–B es una geodésica. La comparación vertical es nominal. |
| ¿Por qué hay sismos en San Juan mientras se interrumpe el arco volcánico? | La respuesta visible y la interpretación citan [Gao et al. 2021](https://doi.org/10.1029/2021GL095509): la subducción subhorizontal modifica la cuña del manto y el magmatismo. | La explicación proviene de bibliografía. La obra no contiene temperaturas, magma ni un inventario de volcanes. |
| ¿Cuántos eventos veo y a qué profundidad? | Por defecto, 24.688 eventos habilitados en la franja de 31°S y 201 en la de 35°S. Filtros, conteos por profundidad, eventos fuera del rango e inspector permiten comprobar la muestra. | Completitud y cobertura varían. Los conteos no miden riesgo ni permiten comparar tasas de actividad. |

La explicación debe poder entenderse en un minuto: pregunta inicial → 31°S → 35°S → interpretación y fuentes. La exploración libre sigue accesible sin recorrido obligatorio.

## Decisiones sobre mapa y controles

El [visor CONICET UNSJ](https://observatoriosismologico.com.ar/) facilita la consulta territorial mediante Leaflet y ofrece movimientos separados en Plotly. El 14/10 se probaron arrastres de 120 × 50 px en Pan, Turntable, Orbital y Zoom. Pan desplaza el centro y mantiene la orientación; Turntable conserva la vertical; Orbital puede inclinarla. Nuestro modo Rotar conserva la vertical y Mover traslada la vista. Ambas acciones son explícitas y tienen ayuda para mouse y tacto.

Para este concurso, mantener el mapa actual con vistas desde arriba, lateral y contexto territorial. La vista superior sirve para ubicar regiones y el corte resuelve la lectura de profundidad. Una incorporación de Leaflet exigiría verificar sincronización, selección, límites, leyendas y móvil en un segundo mapa. Ese trabajo queda para después del concurso; no aporta tanto como cerrar la explicación y la navegación ya verificadas.

Se incorporaron fondo claro por defecto y opción oscura en el gráfico, paletas correspondientes, leyenda visible antes del corte, título «Corte del subsuelo», respuesta bibliográfica abierta y exportación PNG del gráfico completo con filtros, conteos, escala y fuentes. El mini mapa muestra la geodésica real y su arrastre mueve la latitud mediante la proyección de la escena, conservando WGS84 para las mediciones.

La comparación de catálogos con CONICET sigue limitada: la consulta **01–14/09/2026, M≥3**, coincidente con nuestro snapshot, respondió **HTTP 502**. Su interfaz conservó datos recientes y mostró el error. No usar esos eventos para afirmar diferencias de cobertura, precisión o rendimiento. Una comparación numérica futura debe filtrar ambas muestras por la misma fecha, magnitud, profundidad y región geográfica; provincia, rectángulo y corredor geodésico tienen soportes distintos.

## Qué aportan los proyectos premiados

Los [premios anteriores de UdeSA](https://www.udesa.edu.ar/trabajos-premiados) muestran enfoques diversos. En las aplicaciones públicas de [649 Héroes](https://jsantarelli.github.io/649/public/) y [Milla 201](https://milla201.com/) se verificaron pregunta inicial, datos cargados, filtros o escenas y fuentes. El primero conecta la exploración espacial con identidad y contexto humano; el segundo conecta mapas y gráficos con una tesis, explicando límites de AIS y detecciones satelitales. La enseñanza aplicable es dar sentido a la interacción y acompañar la evidencia con contexto.

«Cuando los datos hablan, el mundo escucha», de 2024, combina historia natural, invasión e impacto según la ficha oficial; su página Shiny devolvió una pantalla de carga en la lectura web, por lo que esa referencia tiene menor profundidad de inspección. Estos antecedentes orientan decisiones de presentación, no permiten anticipar la puntuación del jurado.

## Cierre del 14 de octubre

| Paso | Responsable | Dependencia | Aceptación | Tiempo reservado |
|---|---|---|---|---|
| Revisar obra y explicación | Luis | Versión local disponible en localhost:4173 y este plan | Entender pregunta y respuesta; revisar Gao y límites; aprobar el recorte y la declaración de IA. | 30–45 min |
| Comprobar un teléfono real | Luis | URL local accesible o publicación aprobada | Carga completa, rotación y movimiento táctil, ambos cortes, scroll del gráfico, reset e inspector utilizables. | 15–20 min |
| Guardar y publicar la versión | Codex, tras autorización de Luis | Revisión anterior; permisos GitHub y Netlify existentes | Commit y push en Sismos-Argentina; build remoto correcto; URL pública muestra esta versión; probar /metodologia/, ambos cortes y ausencia de fotos sin permisos. | 45–90 min |
| Preparar material de inscripción | Luis con apoyo de Codex | URL pública verificada y obra congelada | Seudónimo; título y descripción; metodología ≤200 palabras; fuentes; declaración completa de IA; video ≤60 s accesible sin login. | 60–120 min |
| Enviar inscripción | Luis | Todos los materiales accesibles y revisión personal de las bases | Formulario completo y constancia de recepción conservada. La aceptación legal la realiza el participante. | 20–30 min |

El [paquete de entrega](CONCURSO_2026_ENTREGA.md) contiene metodología, fuentes, declaración de IA y guion. El video debe grabarse de la versión publicada y mostrar pregunta, corte 31°S, comparación 35°S, explicación, un filtro y metodología. Mantener una captura PNG de respaldo; el límite de video es un minuto y se carga un enlace al servidor de reproducción.

Antes de afirmar cumplimiento del anexo A, Luis debe revisar y asumir personalmente las decisiones creativas y científicas. El anexo permite asistencia de código supervisada y exige declarar herramientas, etapas y finalidad. No se utilizaron datos sísmicos inventados ni imágenes generativas. El PDF fue descargado de nuevo el 14/10 y conserva el checksum del leído el 13/10.

## Reserva del 15 de octubre

Comprobar desde otro navegador la URL de la obra, metodología y video; verificar la constancia de inscripción. Reservar margen para resolver un enlace privado, un error de deploy o un problema del formulario. Si surge un problema móvil, reducir presentación y movimiento antes de tocar datos o agregar dependencias.

## Recortes de esta entrega

Quedan fuera una segunda candidatura de Historia Visual, las 20 fotografías sin permisos demostrados, la incorporación de volcanes o tomografía, nuevos snapshots, paridad completa con CONICET, animación temporal, contornos nuevos y cambio de motor cartográfico. Las cuatro fichas históricas permanecen como complemento separado del catálogo instrumental.

La versión está preparada localmente. Commit, push, deploy, video alojado e inscripción son estados posteriores que deben comprobarse por separado. El proveedor `inpres-sismos` conserva su independencia y no cambia con esta entrega.
