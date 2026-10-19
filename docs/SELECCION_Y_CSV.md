# Selección y exportación local

Revisión posterior del usuario: hay cuatro ajustes de interacción pendientes en
[`PENDIENTES_VISOR_2026-10-19.md`](PENDIENTES_VISOR_2026-10-19.md), incluida una
superposición residual de la ficha al hacer scroll. Publicar el estado actual
no implica dar esos problemas por resueltos.

Decisión autorizada el 19/10/2026 para la rama de revisión del visor. Amplía la
inspección del catálogo existente: permite responder qué eventos forman una
zona o un rango de profundidad y contrastarlos con el corte. No agrega fuentes,
valores ni clasificación tectónica. Es una mejora del núcleo de exploración
solicitada por el usuario; no implica una afirmación sobre las reglas del concurso.

- Mapa 2D: rectángulo geográfico, arrastrable en cualquier dirección con un dedo
  o puntero; mientras se dibuja no se desplaza el mapa.
- 3D: zona geográfica y filtros actuales de profundidad, incluyendo hipocentros
  ocultos detrás del terreno. No se interpreta un rectángulo de pantalla como volumen.
- Corte: rectángulo en distancia desde A y profundidad catalogada; límites
  inclusivos. Sólo eventos del corredor y muestra habilitada del corte.
- La lista pagina la presentación, nunca limita el CSV. La búsqueda restringe
  los resultados listados; las marcas que no pertenecen a esos resultados no se
  exportan. Se distingue descargar resultados de descargar marcados.
- CSV UTF-8 con BOM, comas y CRLF: diez columnas con ID derivado, fecha/hora,
  longitud/latitud WGS84, profundidad, magnitud, ubicación, marca de sentido y
  fecha del snapshot. A pedido del usuario no repite fuente, hashes, commits,
  selección, notas de revisión ni distancias calculadas. Fuente, alcance y
  limitaciones quedan junto a la descarga y en metodología; los manifiestos
  existentes conservan la identidad reproducible del dataset. No contiene
  valores GEBCO/Slab2 inferidos como catálogo.
  Se escapan celdas y se neutralizan fórmulas en campos textuales para hojas de cálculo.
- La generación se divide en tandas cancelables. Cerrar, cambiar la muestra o
  desmontar la lista cancela el trabajo pendiente y libera la URL temporal.
- La guía oculta temporalmente estas herramientas y restaura selección y lista
  junto con la exploración previa. No se publica ni se cambia el snapshot.

Distribución del corte: gráfico y contexto/ficha forman dos columnas cercanas.
En escritorio el gráfico aprovecha el ancho disponible y puede requerir scroll
vertical para conservar una única escala de kilómetros en ambos ejes. La
explicación y la lista comparten el ancho del gráfico. En móvil la
lista es parte del flujo y la ficha del evento sigue siendo una bandeja accesible.
La fila completa abre la ficha; el checkbox sólo marca. Los marcados se resaltan
individualmente hasta 500 puntos para evitar una capa de miles de anillos; el
recuadro, conteo, lista y CSV mantienen todos los seleccionados sin ese límite.
El recuadro comparte el sistema de coordenadas y el contenedor del canvas, y
terminar el arrastre no desplaza automáticamente el gráfico en escritorio.
La ficha usa un fondo sólido; el minimapa WebGL se recorta cuando coincide con
la ficha fija al desplazar la página. La barra de comparación mantiene una
altura común, estados hover/foco y un indicador desplegable en Más.

Verificar selección inversa, vacíos, cambios de muestra, búsqueda, marcas entre
páginas, CSV completo, cancelación y restauración de guía en escritorio y móvil.
