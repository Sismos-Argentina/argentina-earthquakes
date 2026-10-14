# Bajo nuestros pies para el concurso Contar con Datos 2026

Obra propuesta para **Exploración Interactiva**. La entrega utiliza el catálogo instrumental fijado al 14/09/2026 y una comparación guiada de San Juan 31°S con 35°S. La publicación de esta versión requiere aprobación del responsable. El formulario y las declaraciones legales los completa la persona participante.

## Metodología para el formulario

Bajo nuestros pies permite explorar la sismicidad bajo Argentina y preguntar por qué hay sismos en San Juan mientras se interrumpe el arco volcánico andino. Utiliza 80.470 registros de INPRES del 16/07/2011 al 14/09/2026, normalizados por inpres-sismos. Un registro M8 de 2019 se excluye provisionalmente por discrepancias entre fuentes; el original se conserva y puede reincluirse.

Los hipocentros se muestran junto al relieve GEBCO 2026 y la geometría USGS Slab2 2018, distinguiendo observaciones y modelos. Dos cortes, con extremos a 31°S y 35°S, seleccionan eventos dentro de ±50 km de una geodésica WGS84. Comparten período, escala 1×, rango vertical 0–700 km y filtro opcional de magnitud; no se limita la cantidad de eventos. Slab2 conserva sus huecos e incertidumbre.

La interpretación sobre subducción subhorizontal y magmatismo se apoya en Gao et al. (2021). Los conteos no miden riesgo y la proximidad al modelo no clasifica sismos. Codex asistió en código, revisión y documentación. Las fotografías sin permisos demostrados no se reproducen. La autoría y aprobación final corresponden al responsable humano.

## Fuentes que deben acompañar el formulario

- [INPRES](https://www.inpres.gob.ar/) y [export normalizado del proveedor](https://github.com/Sismos-Argentina/inpres-sismos/tree/81e230c782972a2996a32f1ef21d56a2ef22e2e7/data/exports). La obra incluye eventos fuera de Argentina y conserva el snapshot identificado por commit y checksum.
- [USGS Slab2 2018](https://doi.org/10.5066/F7PV6JNV), modelo de geometría DEP, incertidumbre UNC y dominio CLP.
- [GEBCO 2026](https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid), relieve y batimetría modelados.
- [IGN](https://www.ign.gob.ar/) y [Natural Earth](https://www.naturalearthdata.com/), contexto cartográfico. Versiones y transformaciones en los manifiestos del repositorio.
- [Gao et al. 2021](https://doi.org/10.1029/2021GL095509), *Impact of the Juan Fernandez Ridge on the Pampean Flat Subduction Inferred From Full Waveform Inversion*. §§3.1, 4 y conclusiones respaldan la explicación de la cuña del manto y magmatismo; no asignan origen tectónico a los eventos de nuestra muestra.

## Declaración de asistencia de IA para revisión humana

Herramienta: **Codex de OpenAI**. Etapas: auditoría técnica y comparativa, contraste de registros con fuentes oficiales, búsqueda bibliográfica, implementación de interfaz y políticas de calidad/derechos, ejecución de pruebas y preparación de documentación. Propósito: asistir al responsable en desarrollar y verificar una visualización científica reproducible.

El código representa determinísticamente los datos existentes. No se generaron datos sísmicos ni volcanes, ni se utilizaron imágenes generadas con IA o manipulación generativa de fotografías. La supervisión editorial y científica, revisión de fuentes y autorización final corresponden al responsable humano. Antes de enviar, completar esta declaración con otras herramientas o etapas utilizadas por el autor: este texto cubre la asistencia registrada en esta implementación, no certifica toda la historia del proyecto.

## Guion propuesto para un video de hasta 60 segundos

| Tiempo | Pantalla | Idea |
|---|---|---|
| 0–8 s | Mapa inicial y nombre de la obra | «¿Por qué hay sismos en San Juan mientras se interrumpe el arco volcánico de los Andes?» |
| 8–22 s | Comparación 31°S, leyenda y puntos | «Los puntos son hipocentros INPRES. La línea discontinua es Slab2: un modelo, con incertidumbre.» |
| 22–37 s | Transición a 35°S | «El mismo período, corredor y escala permiten comparar un tramo de menor pendiente con otro más inclinado.» |
| 37–48 s | Interpretación bibliográfica | «La bibliografía relaciona la subducción subhorizontal con cambios en la cuña del manto y menor magmatismo.» |
| 48–60 s | Filtro opcional, reset y metodología | «Explorá todas las magnitudes. Los conteos no miden riesgo; las fuentes y límites están disponibles.» |

El video debe grabarse de la versión aprobada y publicada. No se generó ni subió un video en esta implementación.

## Requisitos pendientes de la persona participante

Completar seudónimo y datos del formulario; revisar la explicación geológica y declaración de IA; autorizar y comprobar publicación; grabar y alojar el video de la aplicación; verificar acceso público a la obra y metodología; aceptar personalmente las declaraciones legales. La fecha de cierre verificada es **15/10/2026**; no consta una hora límite específica.

La candidatura interactiva es una obra distinta de una eventual Historia Visual. No se presupone que una misma obra pueda inscribirse dos veces por compartir dominio. Las cuatro fichas históricas son material complementario, no una segunda candidatura preparada.

El [plan de presentación del 14 de octubre](PLAN_PRESENTACION_2026-10-14.md) ordena responsables, dependencias, criterios de aceptación y recortes. La [verificación final](research/FINAL_REVIEW_2026-10-14.md) registra las pruebas y comparaciones.

Reglas de referencia: [concurso UdeSA](https://www.udesa.edu.ar/contar-con-datos) y [bases oficiales 2026](https://images.udesa.edu.ar/sites/default/files/2026-07/Bases-y-Condiciones-Contar-con-Datos-2026.pdf), puntos 3, 4, 10–13 y anexos A/C. PDF vuelto a descargar el 14/10/2026: mismo SHA256 `3ba2a8c0c41e15d3e6e74c1d1ccea511f19cdd9bedaaba691acb2e266c910540` que el leído el 13/10.
