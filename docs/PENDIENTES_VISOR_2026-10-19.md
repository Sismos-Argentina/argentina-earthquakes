# Pendientes de interacción del visor — 19/10/2026

El usuario autorizó publicar el estado actual de la rama y revisar después los
siguientes detalles detectados en su revisión local. Este archivo registra
problemas conocidos; no afirma que estén resueltos por esta entrega.

1. **La lista 3D cambia de scroll al abrir una ficha.** Consultar un evento
   desplaza el panel al principio y dificulta elegir el siguiente. Conservar la
   posición de la lista y presentar la ficha sin mover la fila elegida; comprobar
   también marcas, búsqueda, paginación y cierre de ficha en desktop y móvil.
2. **La escala de profundidad tiembla durante el movimiento.** Revisar cambios
   de paso, posición y rótulos de los ejes durante las transiciones y la órbita.
   Estabilizar la presentación sin alterar distancias, profundidad ni escala 1×;
   verificar vistas regionales, nacionales, invertidas y redimensionamiento.
3. **Preferencia inicial de animaciones.** El usuario quiere animaciones activas
   al entrar y un control en Cámara para desactivarlas. La versión actual toma
   la preferencia de movimiento reducido del sistema y permite habilitarlas para
   la sesión. Revisar la decisión y su persistencia de manera explícita,
   preservando la posibilidad de reducir movimiento y de interrumpir la guía.
4. **La ficha del corte todavía se superpone al contexto al bajar.** El fondo
   sólido y el recorte del minimapa no resolvieron todas las situaciones. Revisar
   el `sticky` de la ficha: se acepta que fluya normalmente y salga de pantalla,
   o que se mueva junto al bloque lateral completo con un límite al final del
   gráfico. Priorizar un único flujo sin cajas superpuestas. Comprobar detalles
   abiertos/cerrados, lista visible y distintos tamaños de pantalla.

La verificación previa cubrió casos concretos, no todos los recorridos posibles.
Estos hallazgos posteriores del usuario tienen prioridad sobre cualquier lectura
de la documentación anterior como una garantía de ausencia de superposiciones.
Continuar en una rama de seguimiento y con revisión local antes de publicar otra
iteración. CSV/GeoJSON, modelos y catálogos no requieren cambios para estos ajustes.
