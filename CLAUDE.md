# CLAUDE.md — Constitución de Sismos Visuales

Este es el único `CLAUDE.md` canónico del repositorio. Define los principios que deben guiar contribuciones humanas y asistidas por IA. Ninguna implementación debe contradecirlos sin una justificación científica o técnica documentada.

## 1. Identidad y aislamiento

Sismos Visuales es un proyecto personal e independiente. No tiene relación con Fardo, TuPlaza ni otros proyectos. No se deben mezclar repositorios, credenciales, documentación, decisiones ni contexto de esos proyectos.

La aplicación es una herramienta científica interactiva para explorar la sismicidad de Argentina en tres dimensiones. No es un dashboard corporativo, una demo de Three.js, un videojuego ni un scrollytelling obligatorio.

Pregunta rectora:

> ¿Qué nos revelan miles de terremotos sobre la estructura invisible que existe debajo de Argentina?

Si una funcionalidad no ayuda a responder esta pregunta, probablemente no pertenezca al MVP.

## 2. Repositorio canónico

Este repositorio, `argentina-earthquakes`, contiene el frontend, documentación, planes, herramientas de preparación, investigación y manifiestos de datasets.

El repositorio `inpres-sismos` es un proveedor externo de datos. Su scraping y normalización no se duplican aquí. Los datasets científicos raw pesados permanecen fuera del control de versiones salvo decisión explícita y documentada.

## 3. Principios científicos

- La exactitud científica tiene prioridad sobre la espectacularidad.
- Nunca se alteran datos reales para mejorar la estética.
- Se distingue siempre entre datos catalogados, modelos externos, cálculos derivados e interpretaciones.
- No se presenta clustering u otra inferencia exploratoria como estructura tectónica observada.
- Slab2 representa un modelo geométrico, no una observación directa ni un volumen exacto de la placa.
- GEBCO es un modelo continuo derivado de fuentes heterogéneas e interpolación, no terreno medido uniformemente.
- Una distancia calculada entre un hipocentro y Slab2 no clasifica por sí sola un evento como interplaca, intraplaca o de placa superior.
- La exageración vertical mayor que 1x distorsiona pendientes y ángulos aparentes y debe indicarse permanentemente.
- Las limitaciones, unidades, CRS, transformaciones, versiones y procedencia deben ser visibles o accesibles.

El contrato de datos obligatorio está en [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md).

## 4. Experiencia y diseño

El usuario debe poder rotar, mover, acercar, filtrar e inspeccionar sin seguir una narración lineal. Las ayudas explicativas son opcionales y contextuales.

La interfaz debe sentirse científica, moderna, minimalista, seria y confiable. El mapa y los datos son protagonistas. Los colores intensos se reservan para codificar información. No usar efectos, animaciones o controles sin función informativa.

Las reglas visuales detalladas están en [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

## 5. Alcance y fecha

La fecha objetivo del MVP es el 15 de octubre de 2026. Un MVP excelente y terminado tiene prioridad sobre funcionalidades incompletas.

La clasificación MUST/SHOULD/POST-CONTEST de [`docs/MVP_SCOPE.md`](docs/MVP_SCOPE.md) es vinculante. Las ideas de los planes históricos no ingresan automáticamente al MVP.

## 6. Arquitectura y rendimiento

- Stack previsto: Next.js, React, TypeScript y Three.js directo.
- El primer vertical slice debe ser pequeño: datos reales, visualización, selección e inspector.
- El catálogo completo es el universo de datos y debe poder explorarse, pero no tiene que ser la representación nacional inicial. La estrategia por escala está en [`docs/REPRESENTATION_STRATEGY.md`](docs/REPRESENTATION_STRATEGY.md).
- No introducir shaders personalizados, formato binario propio, IndexedDB, Web Workers, picking por color-buffer ni un `LayerManager` sofisticado antes de medir.
- No prometer 60 FPS, tamaños de descarga ni tiempos de CPU sin evidencia reproducible.
- Optimizar el primer cuello de botella demostrado por el benchmark, no uno supuesto.
- Mantener módulos simples, descartables y con responsabilidades claras.

El benchmark inicial está definido en [`docs/BENCHMARK_PLAN.md`](docs/BENCHMARK_PLAN.md).

## 7. Datos y reproducibilidad

- Cada dataset conserva identidad, fuente, versión y licencia.
- Los archivos raw pesados no se versionan.
- Los artefactos web generados se evalúan individualmente; `public/data/generated/` no se ignora de forma global.
- Toda transformación debe poder reproducirse con herramientas documentadas.
- Los checksums y archivos esperados se registran en [`manifests/DATASET_MANIFEST.md`](manifests/DATASET_MANIFEST.md) y `manifests/checksums.sha256`.
- No incorporar secretos ni rutas absolutas personales.

## 8. Antes de implementar

Responder:

1. ¿Qué pregunta científica responde?
2. ¿El dato es catalogado, modelado, derivado o interpretado?
3. ¿Existe una alternativa más simple?
4. ¿Está dentro del MVP vigente?
5. ¿La decisión requiere medición o validación científica?
6. ¿Se preservan atribución, reproducibilidad y accesibilidad?

Si alguna respuesta es insuficiente, documentar la decisión antes de continuar.
