# Planes de Sismos Visuales

Estado: revisados contra la auditoría del 15 de septiembre de 2026.

La hoja de ruta activa es `04-hoja-de-ruta-y-fases.md`. Los planes `00` a `03` se conservan en `../archive/2026-09-pre-mvp/plans/` sólo como antecedentes. La constitución canónica es `../CLAUDE.md`; el alcance vinculante es `../docs/MVP_SCOPE.md` y el contrato de datos es `../docs/DATA_CONTRACT.md`.

## Estado real

| Área | Estado |
|---|---|
| Visión científica | definida |
| Alcance del MVP | consolidado |
| Contratos de datos | documentados con pendientes explícitos |
| Frontend Next.js | base mínima inicializada; aún sin catálogo ni visualización |
| Vertical slice | no implementado |
| Benchmark | diseñado, no ejecutado |
| Preprocesamiento INPRES | no implementado en este repositorio; scraper externo operativo |
| Terreno GEBCO | raw disponible fuera de Git; no procesado |
| Slab2 | raw disponible fuera de Git; no procesado |
| Cartografía | fuentes candidatas disponibles; selección/validación pendientes |
| Deploy | no configurado |

## Plan activo y antecedentes

- `04-hoja-de-ruta-y-fases.md`: secuencia hasta el 15 de octubre.
- `../archive/2026-09-pre-mvp/plans/`: planes históricos `00` a `03`; no reemplazan el alcance vigente.

## Decisiones invalidadas por la auditoría

- Vite dejó de ser el stack previsto; la base será Next.js + TypeScript.
- `sismos.bin` no está aprobado antes del benchmark.
- No se prometen 60 FPS, 0 ms de CPU ni tamaños comprimidos sin medición.
- No se usarán shaders personalizados, Web Workers, IndexedDB, picking GPU ni `LayerManager` sofisticado en el vertical slice.
- El cross-section arbitrario y la clasificación tectónica automática pasan a post-concurso.
- La distancia a Slab2 no determina una clase tectónica.
- Los artefactos web se decidirán individualmente; `public/data/generated/` no se ignora globalmente.
