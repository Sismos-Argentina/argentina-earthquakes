# Revisión responsive y mapa 2D — 19/10/2026

Rama local: `fix/visor-responsive-rendimiento-2d`, desde `main` (`d04b125`).
El documento comenzó con la revisión responsive y se amplió en la misma rama
con lista de eventos, selección múltiple y CSV. El usuario autorizó publicar el
estado actual después de la revisión local. Los ajustes detectados en su última
prueba quedan en `PENDIENTES_VISOR_2026-10-19.md`; no se consideran resueltos.

## Decisión y alcance

La pregunta científica y el catálogo no cambian: se facilita inspeccionar los
hipocentros y compararlos con modelos sin que los controles oculten la evidencia.
Son correcciones del núcleo existente, sin nuevas fuentes, inferencias, agregados
ni cambios de valores. Se mantiene la escala común de kilómetros en ambos ejes
del corte y la distinción entre INPRES, GEBCO y Slab2.

## Cambios

- Ficha contextual del evento: magnitud, lugar, fecha y profundidad primero;
  coordenadas, campos completos y explicación de calidad desplegables. Se conserva
  visible la marca de revisión del registro extremo y su profundidad original.
- En cortes, la ficha ocupa una columna propia cuando hay espacio. En teléfonos
  aparece abajo; una selección nueva coloca el gráfico sobre ella sin desplazar
  una sesión que se está restaurando. No se estiran los ejes para llenar huecos.
- El minimapa vuelve a medir su anclaje cuando una explicación cambia de tamaño.
- Un único selector comparable junto al gráfico; modelo de Nazca y rango vertical
  próximos a la leyenda. Se eliminan acciones equivalentes repetidas en el contexto.
- La referencia regional se oculta mientras se inspecciona un evento; la brújula
  conserva un lugar independiente del cierre de la ficha.
- La acción profundidad/superficie se deriva de la cámara efectiva, incluida la
  pose de destino de una transición. Mover la cámara conserva el evento elegido.
- La guía conserva también el desplazamiento del visor/corte y de la ficha,
  además de cámara, muestra, capas, selección, encuadre 2D y borradores de filtros.
- En 2D, el punto elegido tiene un anillo persistente; los estados vacíos ofrecen
  restablecer filtros; conteos singulares y zonas activas quedan identificados.
- Herramientas móviles arriba, separadas de instrucciones y atribución. El pie
  mantiene visible la escala de profundidad y la exageración del relieve en 3D;
  en 2D indica ubicación superficial, sin atribuir relieve a ese mapa plano.
- Acceso a Memoria mediante su icono también en teléfonos; al dibujar una zona
  se retira el menú lateral para no cubrir las coordenadas.
- Cámara con transiciones de 650 ms. Ayuda ofrece «Animar cámara y modelos»
  como preferencia de sesión: por defecto sigue el movimiento reducido del
  sistema. La guía puede habilitarlo sólo temporalmente; sus burbujas respetan
  esa elección incluso cuando la regla global de CSS reduce animaciones.
- Slab2 en 3D se revela de oeste a este al mostrarlo y puede repetirse desde
  Capas. Dura 1,8 s, sin bucle ni deformación de la geometría. Es una ayuda visual,
  no una simulación tectónica. Ocultar la capa, cambiar de vista o restaurar la
  exploración cancela el revelado y recupera el modelo completo. Con movimiento
  reducido se presenta completo desde el inicio. Los perfiles siguen estáticos
  para evitar repintar todos los hipocentros en cada cuadro de esa animación.

## Optimización acotada

`usePlanPointLayer` conserva la última capa completa durante pan/zoom y produce
su reemplazo fuera de pantalla en tandas con presupuesto de 5 ms. Una generación
cancelada no publica datos parciales. Al cambiar filtros o paleta no se muestra
la capa anterior; el cálculo incluye todos los registros de la muestra.

El zoom por rueda se agrupa por frame y conserva la coordenada bajo el puntero.
La capa reutilizada y el picking comparten la misma transformación. Los botones
de zoom/encuadre tienen una transición breve, interrumpible y sin movimiento bajo
la preferencia de movimiento reducido. El resize conserva centro y extensión
vertical, incluyendo el regreso de una guía a otra relación de aspecto.

## Medición local

Export de producción; Chromium en Windows, viewport 1366×768, DPR 1, sin limitar
CPU. Por muestra: seis arrastres de 100 px y diez cambios de zoom, cinco de entrada
y cinco de salida. Se excluyeron carga inicial y cambios de filtro.

| Muestra | Mediana CPU del cuadro de zoom, antes | Después | Máximo después |
|---|---:|---:|---:|
| 80.876 sismos | 51,4 ms | 2,1 ms | 3,8 ms |
| 375 sismos | 2,2 ms | 2,05 ms | 4,6 ms |

El trabajo de puntos no desaparece: ahora se mide por separado. En la muestra
completa se observaron 97 tandas, mediana 5,0 ms y máximo 5,2 ms; no hubo tareas
largas registradas durante esas interacciones. La instrumentación de las tandas
añade cierta sobrecarga respecto de la medición anterior. Son duraciones de CPU
de callbacks en una ejecución, no FPS, latencia completa ni garantía para móviles.
La imagen exacta se recompone al terminar el gesto; durante éste se transforma
la última imagen completa y se indica que se está ajustando la vista.

En el revelado 3D de Slab2 con el catálogo completo se midieron 205 callbacks:
mediana 1,1 ms, p95 1,6 ms y máximo 41,8 ms en el primer uso del material.
La ventana observada fue 1,75 s dentro de los 1,8 s programados; no se registraron
tareas largas en ella. Esto mide CPU, no espera de GPU ni fluidez en un teléfono.

## Verificación y criterios para continuar

Las pruebas de geometría cubren resize reversible, zoom anclado en distintos
cuadrantes y equivalencia entre buffer y coordenadas de selección. Se conservan
las pruebas de filtros, geodesia, límites, modelos y escala común de los cortes.
La revisión visual incluye selección y explicaciones abiertas, no sólo pantallas
vacías. Las dimensiones móviles son emuladas: falta contraste en teléfono físico
y Safari antes de afirmar paridad de dispositivos.

Resultado local: 66 pruebas aprobadas, lint y build de producción correctos.
Se revisaron 320×568, 360×800, 390×844, 768×1024, 844×390, 1024×768,
1366×768, 1536×864, 1920×1080 y 2560×1440. Se contrastaron por igualdad
las restauraciones de escena 3D, mapa 2D con filtros sin aplicar, corte con
desplazamiento de ficha/visor y encuadre tras cambiar orientación durante la guía.
La evidencia visual y mediciones de esta revisión están en la carpeta de auditoría
del workspace; no se incluyen sus capturas ni instrumentación en el export público.

Ampliación posterior de esta misma rama: selección rectangular, lista y CSV ya
implementados y verificados en `SELECCION_Y_CSV.md`; el conjunto alcanza 71 pruebas.
Reutiliza IDs y muestra actual, pagina la presentación y exporta todas las filas
elegidas. La selección 3D es una zona geográfica con filtros e incluye puntos
ocultos; no se ofrece un rectángulo de pantalla interpretado como volumen.
El usuario pidió un CSV simple de diez columnas: se retiraron distancias derivadas,
hashes, commits y anotaciones por fila. La atribución y límites se consultan junto
a la descarga y los manifiestos existentes conservan la identidad del snapshot.
Se corrigieron además el recorrido de cámara desde abajo/invertido, el fade al
ocultar Slab2 y las superposiciones del minimapa/ficha. La revisión acotada de
dependencias y export se detalla en `SEGURIDAD_LOCAL_2026-10-19.md`.

No se implementan clusters en esta corrección. Su evaluación permanece en
`REPRESENTATION_STRATEGY.md` y requiere comparar lectura y rendimiento con la misma
muestra y explicar la naturaleza derivada de los agregados.
