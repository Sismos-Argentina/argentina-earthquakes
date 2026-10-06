# Decisión de implementación — 6 de octubre de 2026

Pregunta: ¿qué revelan más de 80.000 sismos sobre cómo cambia la profundidad
bajo Argentina? La respuesta propuesta describe distribuciones distintas al
mover una franja norte–sur; no explica sus causas tectónicas.

La solicitud de esta iteración autoriza el SHOULD histórico como prototipo local.
Se conserva la exploración libre, el mapa Three.js y el perfil WGS84 existentes.
La alternativa simple elegida es scroll nativo, CSS y tres presets; sin librería
de animación, audio ni nuevas superficies geológicas.

- Observación: catálogo INPRES, histórico y de hipocentros en contratos distintos.
- Modelo: Slab2 DEP ± UNC y GEBCO, como referencias secundarias.
- Derivación: proyección WGS84, mediana y bandas descriptivas de profundidad.
- Interpretación editorial: archivo histórico como puerta de entrada al catálogo.

Se preserva el snapshot del frontend: 80.470 eventos, 14/09/2026, commit proveedor
`81e230c782972a2996a32f1ef21d56a2ef22e2e7`. El EDA usa 80.524 eventos hasta
18/09/2026, checksum CSV `839a061f9877df6ed596b1bb0c73f3471d352add046dbf56a20d7f47f84c32f6`.
No se actualiza el catálogo ni se descarga otro dataset. Los cortes del EDA usan
proyección azimutal equidistante; el perfil web usa distancia a una geodésica
WGS84. Sus muestras deben calcularse y presentarse por separado.

Selección histórica: 1894 (afirmación de mayor magnitud atribuida a INPRES, sin
valor instrumental), 1944 y 1977 (requeridos), 2015 (contraste del norte).
Tres imágenes por evento según la ampliación solicitada, con derivados 480/1600 WebP existentes, texto alternativo,
fuente, hash y fallback sólo texto. Los derechos no están confirmados: condición
pendiente antes de cualquier publicación pública de las fotografías.

La referencia visual aportada por el usuario es la sección de modelos de
[Motorola Signature Swarovski](https://www.motorola.com.ar/motorola-signature-swarovski/p).
Se adopta un escenario fijo mediante `position: sticky`, fundidos según el scroll
nativo y controles manuales accesibles; sin copiar contenido ni imágenes de Motorola.
Tras la segunda revisión del usuario, cada escena ocupa al menos `520svh`:
cinco tramos iguales alternan foto completa / fundido / foto completa / fundido /
foto completa. La última dispone del mismo tiempo propio que las demás. Cada
imagen y su fondo son opacos al completar el fundido, eliminando la mezcla
residual con la anterior. Los botones llevan al comienzo del tramo de su foto.
Los fundidos quedan siempre activos sin selector ni almacenamiento de preferencias
por solicitud expresa; `prefers-reduced-motion` conserva navegación instantánea
y elimina desplazamientos, zooms y damping, pero permite esta mezcla de opacidad.
Los cuatro casos más la pregunta equivalen a unas 21,8 alturas de ventana.
Esto supera el objetivo inicial de 3–5 pantallas y la primera iteración de
7,4 en escritorio / 6,8 en móvil. El aumento responde a la solicitud explícita
de más espacio para ver las transiciones; el salto y la navegación directa
permanecen visibles. La auditoría registra el costo sin recortar lo solicitado.

Lectura del mapa desde arriba: GEBCO ya era opaco. El catálogo se dibuja a través
del relieve con `depthTest: false`, por lo que 80.470 puntos opacos de 3 px tapaban
parte del territorio. Se modifica sólo la presentación de los puntos: tamaño
1,5–2,3 px y opacidad 0,32–0,70, interpolados suavemente con la inclinación de cámara.
La vista cenital prioriza relieve; la vista lateral recupera presencia del volumen.
Se conservan xyz hipocentrales, colores de profundidad, conteos, filtros e inspector.
Es una mejora de legibilidad dentro del MVP; no una transformación del catálogo
ni una inferencia científica. GEBCO, Slab2 y los presets permanecen intactos.

Validación: suite existente como línea base (11 pruebas pasan), muestras web
recalculadas, integridad de assets, pruebas de navegación, lint, TypeScript,
build estático y EDA; recorrido real desktop, mobile y movimiento reducido.

Estado inicial: producto en `research/deep-catalog-eda`, HEAD y remoto `8c7a88a`;
único contenido ajeno sin seguimiento: `.artifacts/`, que se preserva y excluye.
Proveedor limpio en `feat/historical-earthquakes-media`, `c5634ca`; sólo lectura.
Rama de trabajo creada desde `origin/research/deep-catalog-eda` tras fetch:
`feat/competition-cinematic-story`. Sin push, PR, deploy ni Discord.
