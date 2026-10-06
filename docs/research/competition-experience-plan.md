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
Tras la revisión del usuario, cada escena fotográfica ocupa al menos `420svh`:
el 40% del recorrido sticky deja fotos completas y el 60% hace dos fundidos con
aceleración/desaceleración suave. La foto anterior permanece opaca debajo de la
que entra para evitar descubrir el fondo oscuro. Los botones recorren el mismo
scroll y la elección de movimiento se conserva al recargar esta pestaña.
Los cuatro casos más la pregunta equivalen a unas 17,8 alturas de ventana.
Esto supera el objetivo inicial de 3–5 pantallas y la primera iteración de
7,4 en escritorio / 6,8 en móvil. El aumento responde a la solicitud explícita
de más espacio para ver las transiciones; el salto y la navegación directa
permanecen visibles. La auditoría registra el costo sin recortar lo solicitado.

Validación: suite existente como línea base (11 pruebas pasan), muestras web
recalculadas, integridad de assets, pruebas de navegación, lint, TypeScript,
build estático y EDA; recorrido real desktop, mobile y movimiento reducido.

Estado inicial: producto en `research/deep-catalog-eda`, HEAD y remoto `8c7a88a`;
único contenido ajeno sin seguimiento: `.artifacts/`, que se preserva y excluye.
Proveedor limpio en `feat/historical-earthquakes-media`, `c5634ca`; sólo lectura.
Rama de trabajo creada desde `origin/research/deep-catalog-eda` tras fetch:
`feat/competition-cinematic-story`. Sin push, PR, deploy ni Discord.
