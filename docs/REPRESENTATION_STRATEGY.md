# Estrategia de representación de la sismicidad

Este documento define cómo puede representarse el catálogo INPRES según la escala de exploración. Es una decisión de producto y arquitectura; no obliga a implementar ahora un sistema complejo de agregación.

## Principio central

El catálogo completo, actualmente de aproximadamente 80.000 eventos, es el universo de datos disponible. No es obligatorio que todos los eventos individuales sean la representación visual inicial.

La aplicación debe preservar dos capacidades distintas:

1. una vista que priorice comprensión a la escala nacional;
2. una opción explícita **“Mostrar catálogo completo”** para explorar todos los hipocentros individuales.

El benchmark existente demuestra que renderizar el catálogo completo con `THREE.Points` es técnicamente viable. Esto no decide por sí solo cuál debe ser la representación predeterminada.

## Escala nacional

La vista general de Argentina puede utilizar una representación derivada y explícitamente rotulada, por ejemplo:

- cantidad o densidad espacial de eventos;
- otra agregación documentada;
- un subconjunto obtenido mediante filtros visibles.

La primera implementación debe ser la alternativa más simple que mejore la lectura nacional. No se introduce infraestructura compleja de agregación sin una necesidad demostrada.

Un mapa de calor no representa “actividad” de forma genérica. Cada variante debe declarar exactamente su métrica, unidad espacial, resolución, período temporal y filtros. La métrica inicial a evaluar es **cantidad o densidad de eventos INPRES por unidad espacial**.

Frecuencia temporal, magnitud acumulada, energía aproximada y profundidad son métricas diferentes. No se combinan en una sola capa sin una definición y leyenda explícitas.

Todo heatmap o agregado es un dato **derivado** del catálogo INPRES, no una observación adicional ni una interpretación tectónica.

## Escala provincial o regional

Al seleccionar una provincia o región, los eventos individuales relevantes pueden convertirse en la representación principal. En esta escala pueden adquirir mayor protagonismo:

- el terreno regional con más detalle cuando exista un artefacto validado;
- filtros de fecha, magnitud reportada y profundidad;
- selección e inspección de eventos;
- exploración de la distribución en profundidad;
- acceso posterior a una sección científica predefinida.

Flujo conceptual, no compromiso de interfaz:

`Argentina -> región o provincia -> eventos relevantes -> evento o distribución -> explorar subsuelo -> sección científica`

La selección territorial y los distintos niveles de detalle no forman parte automática de la iteración actual. La arquitectura debe permitirlos sin acoplar la escena a una única representación global.

## Identidad de las capas

Cada capa conserva procedencia, semántica y lenguaje visual propios:

| Capa | Naturaleza | Qué representa |
| --- | --- | --- |
| Hipocentros INPRES | Observaciones catalogadas | Eventos individuales con los campos disponibles en el catálogo. |
| Heatmap o agregación | Derivado calculado | Una métrica definida sobre eventos INPRES dentro de unidades espaciales y temporales explícitas. |
| GEBCO | Modelo externo | Elevación y batimetría de una grilla continua derivada de fuentes heterogéneas. |
| Slab2 | Modelo geofísico externo | Geometría modelada de la placa subducida dentro de su dominio y limitaciones. |

Estas capas no comparten colores, nombres ni leyendas que puedan hacerlas parecer equivalentes. Ninguna agregación sísmica se presenta como estructura tectónica observada.

## Restricciones arquitectónicas

- La carga y el contrato del catálogo no dependen de su representación visual activa.
- La transformación geográfica debe ser compartida por puntos, agregados y modelos externos.
- La selección de eventos continúa operando sobre registros reales, no sobre celdas agregadas, salvo que la interfaz indique explícitamente una selección de celda.
- Cambiar entre vista agregada, filtrada y catálogo completo no debe alterar los datos fuente.
- El nivel de detalle del terreno puede variar sin cambiar las coordenadas científicas de los hipocentros.
- Una representación derivada debe registrar método, parámetros y versión del catálogo de entrada.

## Decisiones aplazadas

Antes de implementar la vista nacional agregada se decidirán mediante una prueba pequeña:

- forma de la unidad espacial;
- resolución y normalización;
- cálculo previo o en cliente;
- tratamiento del tiempo y de filtros;
- codificación visual y accesible;
- umbral de transición entre escala nacional y regional.

No se asume todavía un algoritmo, librería o formato de almacenamiento.
