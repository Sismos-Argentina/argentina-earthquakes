# 02 — Arquitectura técnica y rendimiento

Estado: arquitectura mínima propuesta; frontend no inicializado.

## Stack inicial

- Next.js con App Router.
- React y TypeScript.
- Three.js directo.
- CSS del proyecto, sin framework visual obligatorio.
- Deploy estático si las necesidades reales lo permiten.

No se incorpora React Three Fiber, gestor global de estado, MapLibre, shader personalizado ni sistema sofisticado de capas en el vertical slice.

## Vertical slice

```text
GeoJSON completo
  -> fetch + JSON.parse
  -> typed arrays
  -> THREE.BufferGeometry
  -> THREE.Points + PointsMaterial
  -> OrbitControls
  -> Raycaster
  -> inspector React
```

Estructura prevista, no creada todavía:

```text
src/app/
src/components/seismic/
src/lib/data/
src/lib/geo/
src/lib/benchmark/
```

El estado local de cámara, selección y filtros comenzará con React y módulos simples. Sólo se introducirá otra solución si aparece una necesidad concreta.

## Afirmaciones invalidadas

- No existe todavía una implementación de un solo draw call, filtrado GPU o picking avanzado.
- 60 FPS es un objetivo de experiencia, no una garantía.
- Filtrar en GPU no implica literalmente 0 ms de CPU.
- Timestamps Unix crudos en `Float32` pierden precisión y no son un contrato aprobado.
- Web Workers, color-buffer picking, KD-tree, IndexedDB y binario quedan sujetos a medición.
- `LayerManager` puede ser útil después, pero no pertenece al vertical slice.

## Benchmark como puerta

El protocolo acotado de `../docs/BENCHMARK_PLAN.md` determina el primer cuello de botella. La arquitectura sólo escala en respuesta a esa evidencia.

Orden de decisión:

1. comprobar viabilidad del GeoJSON completo;
2. medir parseo y construcción;
3. medir `THREE.Points` estándar;
4. medir Raycaster y filtrado simple;
5. elegir una sola optimización si se incumplen los umbrales.

## Reglas de ciclo de vida

Aunque no exista `LayerManager`, cada módulo Three.js debe exponer una limpieza explícita de geometrías, materiales, texturas, listeners y animation frames. El montaje/desmontaje de React no debe duplicar escenas ni recursos GPU.

## Performance del MVP

Se reportarán tiempos y frame times, no sólo una impresión subjetiva. Desktop es prioritario; mobile puede reducir pixel ratio, densidad visual o controles, pero debe conservar información científica esencial.
