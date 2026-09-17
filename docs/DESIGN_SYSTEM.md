# Sistema de diseño — MVP

La interfaz debe sentirse científica, sobria y confiable. El mapa y los datos ocupan la mayor parte de la pantalla; los controles aparecen sólo si ayudan a explorar. Este documento guía decisiones visuales, no impone componentes aún inexistentes.

## Jerarquía

1. Escena, hipocentros y profundidad.
2. Controles esenciales: cámara y filtros.
3. Inspector del evento seleccionado.
4. Fuente, unidades, modelo, transformación y limitaciones accesibles sin tapar la exploración.

Desktop es prioritario. En mobile se simplifican paneles y controles, pero no se ocultan unidades ni advertencias científicas.

## Lenguaje visual

- Superficies neutras y contraste legible; los colores intensos codifican datos, no decoración.
- Una paleta de profundidad con leyenda y alternativa textual. No depender sólo del color.
- El tamaño puede codificar magnitud reportada, pero no debe sugerir tamaño físico del sismo. Evitar escalas o rangos sin explicación.
- Catálogo INPRES y modelos GEBCO/Slab2 deben distinguirse visualmente y por etiqueta. No colorear supuestas categorías tectónicas que el catálogo no contiene.
- Tipografía legible y pocos niveles jerárquicos. Botones con foco visible; filtros e inspector utilizables con teclado cuando corresponda.

## Movimiento y cámara

Permitir orbitar, desplazar y acercar sin perder la orientación. Transiciones breves sólo para comunicar cambios de estado. Ninguna animación permanente, neón, glassmorphism dominante ni efecto que simule información geológica.

## Reglas científicas visibles

Mostrar km de profundidad y factor de exageración vertical; rotular la hora local argentina cuando aplique. Las capas derivadas deben indicar fuente, versión y transformación. Slab2 es un modelo; GEBCO no tiene precisión uniforme. El inspector no rellena tipo de magnitud, revisión o clasificación tectónica ausentes.

## Criterio de aprobación

Una persona puede encontrar un evento, leer su profundidad y procedencia, comparar datos y modelo sin confundirlos y volver a orientarse en la escena. La estética no justifica ocultar incertidumbre, territorio o límites del dato.
