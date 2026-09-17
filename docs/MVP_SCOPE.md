# Alcance del MVP — 15 de octubre de 2026

Este documento decide qué se entrega en el plazo restante. Prevalece sobre los planes archivados. La pregunta rectora está en `../CLAUDE.md`: comprender la distribución espacial y en profundidad de los sismos de Argentina sin confundir catálogo, modelos e interpretación.

La auditoría científica aprobada está en [`research/AUDITORIA_CIENTIFICA_2026-09-17.md`](research/AUDITORIA_CIENTIFICA_2026-09-17.md). La sección fija Cuyo 31°S es la primera comparación científica a implementar; la sección NOA sigue siendo SHOULD, no parte de esta entrega.

## MUST HAVE — núcleo publicable

1. Catálogo INPRES real y completo para un snapshot identificado por commit y checksum. Debe existir una opción explícita **“Mostrar catálogo completo”** para explorar sus eventos individuales en 3D con rotación, desplazamiento y zoom. La vista nacional inicial puede priorizar una representación derivada o filtrada, definida según `REPRESENTATION_STRATEGY.md`; no se inventan ni alteran eventos.
2. Profundidad legible en km: eje, orientación y factor de exageración vertical siempre visibles cuando corresponda. Ningún punto se presenta como si estuviera en superficie.
3. Filtros utilizables por fecha, magnitud reportada y profundidad. La magnitud no se etiqueta como Mw, Ml o Md sin evidencia.
4. Selección e inspector con fecha/hora local, coordenadas, profundidad, magnitud y descripción disponibles; fuente, ausencias y limitaciones visibles. ID derivado y segundos sintéticos no se presentan como observaciones oficiales.
5. Contexto territorial que no omita Tierra del Fuego, Malvinas e Islas del Atlántico Sur. La vista científica puede enfocarse en los Andes; una vista o referencia territorial complementaria preserva el alcance argentino. Sólo rotular como oficial la cartografía IGN cuya procedencia se haya validado.
6. Experiencia desktop estable, mobile simplificado pero funcional, controles básicos accesibles, atribuciones y estados de carga/error.
7. Build y deploy estáticos reproducibles. Medición del dataset completo antes de optimizar.

## Objetivo científico del MVP, sujeto a validación

- Un relieve liviano del área científica principal derivado de GEBCO, con resolución, recorte, referencia vertical y transformación documentados.
- Slab2 diferenciado como **modelo**, no observación: geometría válida y una sección predefinida que permita comparar hipocentros, relieve y slab con escalas explícitas. No se requiere una superficie 3D extensa ni una segunda sección.

GEBCO, cartografía y Slab2 ya disponen de artefactos web y una superposición 3D inicial. La puerta de calidad del 5 de octubre sigue vigente para la comparación científica en sección: fuente, unidades, máscara/dominio, selección geodésica, artefacto reproducible y lectura comprensible. Si no se verifica, no se presentan afirmaciones tectónicas aparentes. La referencia vertical INPRES sigue sin confirmarse.

## SHOULD HAVE — sólo después del núcleo y de la validación científica

- Una segunda sección predefinida, vistas de cámara útiles o persistencia de filtros en URL.
- Explorar un alcance **pequeño y curado** para una futura subpágina de terremotos históricos con narrativa scrollytelling, únicamente si el núcleo científico principal ya está terminado. Su catálogo y fotografías tendrían schema y pipeline separados; ver [`HISTORICAL_EARTHQUAKES_PLAN.md`](HISTORICAL_EARTHQUAKES_PLAN.md). No implica scraping ni UI histórica en la iteración Cuyo.
- Mejoras de animación y codificación visual que aclaren, no adornen.
- Mejoras de rendimiento específicas cuando el benchmark identifique un cuello de botella.

## POST-CONTEST

Sección arbitraria dibujada por el usuario; clasificación interplaca/intraplaca/intraslab; clustering como interpretación tectónica; inferencias basadas sólo en distancia a Slab2; paridad mobile completa; reproducción temporal compleja; experiencia histórica completa si no supera la puerta SHOULD; shaders propios, formato binario, IndexedDB, Workers, picking GPU o gestor sofisticado de capas sin necesidad medida; investigación de metadata individual adicional de INPRES.

## Primer vertical slice y aceptación

`GeoJSON INPRES real -> fetch/parseo -> THREE.Points -> navegación -> selección -> inspector` (completado).

El primer vertical slice ya está cerrado y fue seguido por GEBCO, cartografía y Slab2. Estas capas y la nueva sección se verifican por separado; el antecedente no debe leerse como una descripción del estado actual. No se inicia trabajo SHOULD mientras falle el flujo principal.
