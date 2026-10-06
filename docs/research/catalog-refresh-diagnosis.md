# Por qué el catálogo de la web no sigue la actualización diaria

Auditoría de sólo lectura del 6 de octubre de 2026. No se descargó un nuevo
catálogo científico, no se modificó el proveedor y no se inició un workflow.

La causa comprobada está en el consumidor: el producto utiliza un snapshot
fijado al commit proveedor `81e230c782972a2996a32f1ef21d56a2ef22e2e7`, 80.470
eventos hasta 14/09/2026. `tools/prepare-inpres.mjs` verifica su hash y cantidad;
`src/data/catalog-snapshot.json` y `src/lib/data/inpres.ts` apuntan al artefacto
same-origin `inpres-2026-09-14.geojson`. No consultan el último `main`.

El proveedor programa scraping diario a las 10:20 UTC en
`.github/workflows/scraping_daily.yml`. Exporta y commitea en **su** repositorio;
el workflow no dispara una importación/build del producto. El producto no tiene
directorio `.github` ni workflow que sincronice ese export. Una aplicación
estática ya construida tampoco cambia al actualizarse otro repositorio.

La inspección pública de GitHub verificó ejecuciones exitosas los días 3, 4 y 5
de octubre. Además se leyó la metadata efectiva, porque el paso `run_exports.py`
captura errores y continúa: un workflow verde no garantiza por sí solo un
export reciente. El export de `main` consultado tiene 80.756 eventos hasta
05/10/2026, generación `2026-10-05T19:19:03`, commit
`f9155de357b38b66de8acdaabaff513ad64f828c`.

- [Metadata del export verificado](https://github.com/Sismos-Argentina/inpres-sismos/blob/f9155de357b38b66de8acdaabaff513ad64f828c/data/exports/metadata.json).
- [Ejecución consultada](https://github.com/Sismos-Argentina/inpres-sismos/actions/runs/37362338899).
- [Workflow proveedor](https://github.com/Sismos-Argentina/inpres-sismos/blob/main/.github/workflows/scraping_daily.yml).

Hay una diferencia de 286 registros entre ambos conteos; no es prueba de que
todos sean eventos posteriores, porque una exportación puede corregir registros.
El clon proveedor local permanece en la rama histórica `c5634ca`, distinta de
ese `main` remoto. El EDA existente también es otro snapshot: 80.524 hasta
18/09/2026. No se mezclaron ninguno de los tres silenciosamente.

En este prototipo se hizo explícita la fecha visible y se reutiliza el artefacto
local verificado. Si falta, la preparación falla de forma clara, salvo autorización
explícita para descargar el mismo snapshot fijado. No se implementó actualización
diaria: la solicitud prohibía incorporar datasets científicos nuevos sin justificarlo.

## Propuesta posterior, pendiente de decisión

Mantener scraping/normalización exclusivamente en el proveedor. Incorporar en el
producto una importación controlada que reciba commit, metadata y hash, valide
esquema, cobertura, fechas y cambios, regenere muestras narrativas y manifiestos,
y construya una versión estática identificable con rollback. Publicar ese build
es una operación adicional. La fuente debe mostrar «actualizado hasta…» y no
prometer tiempo real. No basta cambiar una URL a `main`: eso rompería la coherencia
entre snapshot, conteos, evidencia EDA y textos del recorrido.
