# Diseño cartográfico único

Bajo nuestros pies usa una sola interfaz oscura en el mapa 2D, escena 3D, zonas
regionales, cortes A–B, comparador, Memoria y Metodología. No hay selector de
experimentos ni implementaciones Original/Estudio. Las URL y preferencias antiguas
se migran sin perder la ruta, otros parámetros o el fragmento.

## Organización

- `MapControls` contiene cabecera, herramientas, paneles y leyenda. `FiltersPanel`
  es independiente del diseño anterior; sus tipos están en `controls-types`.
- `viewer.css` reúne la apariencia común y responsive. `globals.css` conserva las
  bases de la escena y contenido científico; no activa diseños alternativos.
- El menú y su panel comparten espacio en escritorio. En móvil el menú se pliega
  al elegir una herramienta. Coordenadas usa una ventana compacta.
- El conteo vive en la cabecera. Los botones Profundidad/Magnitud muestran la
  codificación activa. La cámara avanzada es opcional dentro de Capas.
- El título vuelve al inicio. La brújula orienta al norte manteniendo centro y
  distancia; respeta movimiento reducido.

## Navegación y guía

Se incluyen [los límites de navegación y la sensibilidad de zoom](NAVIGATION_LIMITS.md).
La guía es opcional: mapa 2D, selección que incluye San Juan completo, zona 3D,
hipocentros/Nazca y comparación 31°S–35°S. Puede pausarse, repetirse o interrumpirse.
Al salir se restauran escena, filtros aplicados, borradores sin aplicar y pestaña
del formulario, capas, control de cámara, selección, encuadre 2D, corte, panel,
desplegables y posiciones de lectura. Los trabajos asíncronos viejos se cancelan.

El tutorial usa un ejemplo identificado del mismo catálogo. Slab2 y GEBCO siguen
siendo modelos externos; no se crean ni reclasifican observaciones. San Juan queda
dentro del recuadro según todos los vértices IGN incluidos, con margen.

## Cortes y documentos

El gráfico comparte un único factor de píxeles/km en ambos ejes y se encuadra
completo sin deformarlo. Los controles/contexto se sitúan junto al gráfico en
escritorio y se redistribuyen en móvil. La burbuja tiene espacio reservado para no
tapar el corte. Memoria y Metodología comparten navegación, tipografía y superficies.

## Alcance de la entrega

No cambia el snapshot, fuentes, modelos, incertidumbres, filtros científicos ni
reglas de publicación. No incluye dashboard EDA ni fuentes adicionales. Mejoras
editoriales o de compactación pueden continuar sobre esta única interfaz.

## Verificación de la entrega (18/10/2026)

- `npm test`: 61 pruebas, incluyendo navegación extrema, escala 1×, ubicación
  completa de San Juan, secuencia de la guía, migración de preferencias y
  conservación del borrador de filtros.
- `npm run lint` y `npm run build`: correctos; exportación estática del mapa,
  Memoria y Metodología, con la política de publicación de fotografías vigente.
- Navegador local: mapa 2D/3D, coordenadas regionales, Capas, filtros, guía
  completa, comparación 31°S/35°S, búsqueda histórica, índice de metodología y
  regreso al mapa. Se verificaron vistas de 1366×768, 1920×1080, 390×844 y
  320×568; filtros sin desbordamiento horizontal ni acciones cortadas.
- Tras reproducir toda la guía, la escena y el formulario recuperaron los mismos
  valores anteriores, incluido un filtro editado sin aplicar. Se guardó evidencia
  local de la comparación de estados y capturas.

La revisión móvil usa tamaños de viewport del navegador; no reemplaza la prueba
en un teléfono físico. El arrastre táctil y la rueda no se simularon con esta
herramienta: sus límites tienen pruebas unitarias y se conserva la interacción
existente. La validación local no implica despliegue ni aceptación en producción.

Pendiente de pulido futuro: compactación editorial de contenido científico en
pantallas pequeñas y revisión con teléfonos físicos. No quedan variantes de
diseño seleccionables para ese trabajo.
