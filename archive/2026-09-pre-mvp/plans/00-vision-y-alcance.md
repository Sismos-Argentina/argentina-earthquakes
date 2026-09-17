# 00 — Visión, objetivos científicos y alcance

Estado: visión vigente; alcance reducido por la auditoría del 15 de septiembre de 2026.

## Misión

Sismos Visuales es una herramienta científica interactiva para explorar qué revela la distribución tridimensional de los terremotos sobre la estructura bajo Argentina.

No es un visor plano de puntos, un dashboard empresarial ni un recorrido lineal obligatorio. Debe permitir mover, rotar, acercar, filtrar, seleccionar y comparar capas mientras ofrece contexto explicativo opcional.

## Preguntas del MVP

1. ¿Dónde se localizan los eventos catalogados y a qué profundidad?
2. ¿Cómo cambia su distribución espacial al filtrar tiempo, magnitud y profundidad?
3. ¿Cómo se relaciona visualmente esa distribución con el relieve andino y oceánico?
4. ¿Cómo se compara la nube de hipocentros con la geometría modelada por Slab2 en una o dos secciones predefinidas?

La cuarta pregunta se formula como comparación, no como clasificación automática.

## Principios vigentes

- Exploración libre con acompañamiento explicativo opcional.
- Separación entre catálogo INPRES, modelos GEBCO/Slab2, derivados e interpretaciones.
- Escalas, unidades, CRS, fuentes y exageración vertical documentados.
- Área científica principal diferenciada de la representación territorial nacional.
- Rendimiento medido antes de optimizar.
- Hosting estático reproducible cuando sea viable.

## Alcance temporal

`../docs/MVP_SCOPE.md` define MUST, SHOULD y POST-CONTEST. Esa clasificación reemplaza la expectativa anterior de implementar todas las herramientas imaginadas antes del concurso.

Pasan expresamente a post-concurso:

- sección arbitraria dibujada por el usuario;
- clasificación automática interplaca/intraplaca;
- clustering tectónico;
- paridad mobile completa;
- infraestructura experimental sin función directa en las preguntas del MVP.

## Usuarios

El producto debe ser comprensible para público general, estudiantes, docentes y periodistas, sin impedir una lectura rigurosa por personas con formación científica. No se asumen conocimientos geológicos previos.

## Definición de éxito

Al 15 de octubre, una persona debe poder explorar fluidamente el catálogo completo, comprender la profundidad, inspeccionar eventos, distinguir observaciones de modelos y comparar la sismicidad con terreno y Slab2 sin recibir afirmaciones engañosas.

La calidad y cierre del flujo principal tienen prioridad sobre la cantidad de funcionalidades.
