# Benchmark inicial — decisión, no proyecto paralelo

Objetivo: decidir si el GeoJSON completo de INPRES y `THREE.Points` estándar son viables, y localizar el **primer** cuello de botella. No se crea `sismos.bin` ni otra optimización anticipada.

## Configuración bajo prueba

- Snapshot completo con commit, tamaño y SHA-256 registrados en `../manifests/DATASET_MANIFEST.md`.
- Fetch same-origin, `JSON.parse`, typed arrays, `BufferGeometry`, `PointsMaterial`, `OrbitControls` y `Raycaster`.
- Registrar commit de aplicación, navegador, equipo, viewport y estado de caché. Probar el build de producción, no sólo `next dev`.

## Medidas mínimas

| Medida | Cómo registrarla |
|---|---|
| Descarga | tiempo de `fetch` y bytes transferidos/decodificados cuando Resource Timing los exponga |
| Parseo y construcción | marcas `performance.now()` alrededor de `JSON.parse` y creación de la geometría |
| Primer render útil | navegación hasta el primer frame con catálogo completo |
| Memoria | estimación antes/después de carga; indicar si la API del navegador no la expone |
| Fluidez | tiempos de frame durante 10 s en reposo y 10 s orbitando |
| Selección | latencia desde puntero hasta inspector y aciertos en zonas densas y dispersas |
| Filtrado | latencia desde cambio de control hasta frame correcto para fecha, magnitud y profundidad |

## Protocolo acotado

Tres cargas desktop con caché fría; al menos veinte selecciones y veinte cambios de filtros distribuidos; una pasada mobile emulada a 390×844, rotulada como emulación. Registrar mediana y peor caso; p95 sólo cuando la muestra lo sustente. No construir un dashboard ni una suite de pruebas para medir esto.

## Decisión

Si la experiencia es aceptable en una computadora corriente, conservar GeoJSON y Three.js estándar. Si no, elegir **una** intervención para el cuello dominante: compresión/atributos para descarga, parser o Worker para parseo, menor pixel ratio para render, separación de metadata para memoria, índice/picking alternativo para selección. Volver a medir después. Un formato binario propio no se aprueba sin evidencia de que alternativas más simples fallaron.

Guardar resultados, limitaciones y decisión junto al commit y checksum evaluados. No prometer FPS ni tiempos universales a partir de una sola máquina.
