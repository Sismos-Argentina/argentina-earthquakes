# 03 — Visualización y herramientas científicas

Estado: principios vigentes; herramientas reducidas para el MVP.

## Coordenadas y profundidad

El sistema horizontal debe partir de EPSG:4326 y transformarse mediante una proyección documentada. La elección final queda pendiente de una decisión técnica que considere distorsión regional y cálculo de distancias.

La escena expresará todas las dimensiones en unidades compatibles. Elevación GEBCO en metros deberá convertirse explícitamente antes de combinarse con profundidad sísmica en kilómetros.

En escala vertical 1x se conserva la relación geométrica definida por la proyección. Todo valor mayor a 1x distorsiona pendientes y ángulos aparentes; el factor debe permanecer visible y aplicarse coherentemente a terreno, sismos, Slab2 y secciones.

## Representación de eventos

- Posición: hipocentro catalogado por INPRES.
- Profundidad: eje vertical bajo la referencia elegida.
- Magnitud: valor reportado sin tipo de escala conocido.
- Color: preferentemente profundidad con una paleta perceptualmente adecuada.
- Tamaño: puede codificar magnitud, evitando sugerir volumen físico literal.
- Selección: inspector con datos disponibles y limitaciones.

Las categorías descriptivas del proyecto serán superficial 0–70 km, intermedia 70–300 km y profunda >300 km, salvo justificación científica documentada. No equivalen automáticamente a categorías tectónicas.

## Slab2

Slab2 se mostrará como modelo, visualmente distinto de los eventos catalogados. Debe respetar su dominio, máscara e incertidumbre.

Puede mostrarse la diferencia geométrica entre profundidad del evento y profundidad modelada en la misma ubicación, siempre rotulada como cálculo derivado. No se usará ese valor para afirmar que un evento es de interfase, intraslab o placa superior.

## Terreno

El relieve será un artefacto derivado de GEBCO con atribución, resolución y exageración documentadas. No se lo describirá como medición uniforme ni se reemplazará silenciosamente por terreno inventado.

## Cartografía y alcance territorial

La vista científica principal puede usar un BBOX enfocado en los Andes y el territorio continental relevante. Esa decisión no debe hacer desaparecer el territorio argentino restante cuando la interfaz presente una vista nacional.

La solución del MVP combinará cartografía oficial argentina con contexto regional, y documentará cómo aparecen Tierra del Fuego, Malvinas, otras Islas del Atlántico Sur y la representación bicontinental/Antártica cuando corresponda.

## Secciones del MVP

Se implementará una sección predefinida y, sólo si está terminada, una segunda. Cada sección tendrá:

- línea y ancho de corredor explícitos;
- método de proyección de eventos;
- topografía derivada de GEBCO;
- curva/superficie Slab2 dentro de su validez;
- escala horizontal y vertical;
- factor de exageración;
- fuente científica que justifique su elección.

El dibujo arbitrario de secciones por el usuario pasa a post-concurso.

## Afirmaciones invalidadas

- La exageración 3x–5x no preserva ángulos reales.
- Una sección visual no identifica por sí sola el mecanismo tectónico de cada punto.
- Una distancia vertical a Slab2 no determina pertenencia a una placa.
- El catálogo actual no permite mostrar Mw, Ml o Md por evento.
- No se implementará clasificación tectónica automática en el MVP.

## Explicación contextual

Las cápsulas y lentes opcionales pueden señalar patrones visibles y explicar modelos publicados. Deben usar lenguaje de evidencia —“es consistente con”, “permite comparar”, “el modelo representa”— y evitar convertir correlación visual en causalidad demostrada.
