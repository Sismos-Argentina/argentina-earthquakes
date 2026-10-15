# Actualización semanal del catálogo instrumental

Implementación autorizada el 15/10/2026. Responde a la necesidad de consultar
sismos recientes conservando identidad, valores originales y reproducibilidad.
Los eventos siguen siendo observaciones del proveedor; la comparación y conteos
son derivados. Se mantiene separado `inpres-sismos`, sin duplicar su scraping.

## Calendario y texto público

El workflow `catalog-weekly.yml` revisa el proveedor los viernes a las **08:43 de
Argentina (11:43 UTC)**. La primera fecha prevista es el 16/10/2026, después de
integrar esta implementación en `main`. También tiene ejecución manual desde
Actions. GitHub puede demorar una ejecución; la fecha pública es una previsión,
no un compromiso de entrega ni información en tiempo real.

Filtros y metodología conservan la fecha real de cobertura y muestran frecuencia
semanal y próxima revisión prevista. La próxima fecha se calcula con el mismo
calendario, en la zona horaria argentina y actualizándose mientras la página
permanece abierta. Si no hay registros nuevos, no se cambia la identidad del
catálogo ni se crea un deploy vacío.

## Flujo y puerta de integración automática

1. Resolver el último commit que cambió `data/exports/sismos.geojson` en el
   proveedor canónico. Debe estar vinculado con una ejecución exitosa de su
   scraper y tener antigüedad de hasta nueve días. Descargar por SHA inmutable.
2. Validar el catálogo completo: fechas y horas, números finitos y rangos,
   coordenadas consistentes, IDs únicos y observaciones no duplicadas. Sólo se
   adapta `NaN` de ubicación a `null`, igual que en el preparador existente.
3. Comparar con el snapshot anterior verificado por hash. Se admiten hasta 2.000
   altas por revisión. Bajas, modificaciones de cualquier campo anterior o exceso
   del umbral detienen el proceso y conservan un reporte para revisión humana.
   No se reemplaza una magnitud ni se decide tectónica automáticamente.
4. Generar identidad, hashes, metadata del perfil, conteos y presets. Conservar
   política de calidad, anotaciones, textos científicos, modelos y archivo
   histórico. El GeoJSON pesado queda ignorado y se reconstruye por hash.
5. Ejecutar tests, lint y build antes de publicar. Las pruebas numéricas del
   14/10 usan una fixture inmutable separada: el bot no edita sus expectativas.
6. Crear una rama y PR de datos. Verificar bytes del índice, archivos remotos,
   autor bot, `main` sin cambios y SHA exacto de la PR. Registrar el check
   `catalog-update/validated` e integrar con la API normal, sin bypass de reglas.
7. Netlify recibe el cambio en `main`. El workflow espera su publicación y
   comprueba identidad en metodología y SHA-256 del GeoJSON público. Un merge
   correcto por sí solo no se presenta como deploy confirmado.

La lista cerrada de archivos que puede integrar el publicador es:

- `src/data/catalog-snapshot.json`
- `src/data/catalog-quality.json` (sólo cambia la identidad del snapshot)
- `src/data/flat-slab-guide.json` (sólo metadata web)
- `src/data/competition-presets.json` (sólo metadata y derivados web)
- `src/data/catalog-refresh.json` (reporte de comparación y procedencia)
- `manifests/checksums.sha256`

El código generador parte del `main` confiable, no del código de una PR ajena.
No modifica tests ni workflows. No sobrescribe ramas existentes ni fuerza un
push; si otro cambio mueve `main` durante la validación, se detiene para repetir.
Otras PRs conservan su revisión manual. Una falla deja la última publicación
válida; si falla Netlify después del merge, el workflow informa esa diferencia.

## Permisos y activación

El permiso general de Actions permanece en lectura. Únicamente este workflow
solicita escritura de contenidos, PRs y estados para realizar la actualización.
Usa el token efímero `GITHUB_TOKEN`, sin guardar un token personal. La opción del
repositorio que permite a Actions crear PRs debe estar habilitada; no se cambia
ninguna protección de `main`, ni se habilita una política general de auto-merge.
La integración de datos ocurre dentro del workflow que ya ejecutó las pruebas.
No depende de que un evento creado con `GITHUB_TOKEN` dispare otro workflow.

La primera PR, que instala código y permisos del mecanismo, requiere revisión
humana. La ejecución programada se activa cuando el archivo está en `main`.
La validación normal de código usa un workflow separado de sólo lectura.

Si la organización impide crear PRs, GitHub rechaza habilitarlo sólo en el
repositorio. Un propietario debe marcar **Allow GitHub Actions to create and
approve pull requests** en [Actions de la organización](https://github.com/organizations/Sismos-Argentina/settings/actions)
y después en [Actions del producto](https://github.com/Sismos-Argentina/argentina-earthquakes/settings/actions),
guardando ambos cambios. Se conserva **Read repository contents and packages
permissions** como permiso predeterminado. El mecanismo no emite reviews de
aprobación: valida e integra únicamente su propia PR de datos.

Al preparar esta implementación el 15/10/2026, GitHub confirmó que la política de
la organización bloqueaba crear PRs. El propietario eligió habilitar ese permiso
manualmente. Hasta completar esa configuración y el merge inicial, la revisión
semanal y su integración automática no se consideran activadas ni verificadas.

## Prueba, diagnóstico y reversión

```sh
npm run catalog:refresh -- --check
npm run catalog:refresh -- --write
npm test
npm run lint
npm run build
npm run catalog:verify
```

`--check` valida datos y prepara un plan en `.local-data/`, sin cambiar archivos
del producto. `--write` sólo prepara los archivos permitidos; ejecutarlo en local
no publica ni integra nada. El publicador rechaza ejecuciones fuera del workflow
confiable de `main`.

Actions conserva el reporte y la URL de la PR en artifacts durante 30 días,
incluso si una revisión falla. Ante una anomalía, revisar el reporte y el export
original; no relajar checks ni editar expectativas para convertirlo en verde.
Una rama existente se conserva para inspección, sin sobrescribirla en reintentos.

Para detener revisiones, deshabilitar únicamente el workflow semanal. Para volver
a un catálogo anterior, revertir su PR de datos y reconstruir: su commit proveedor
y hash permiten recuperar exactamente la versión previa. Los registros raw y el
proveedor permanecen sin cambios.
