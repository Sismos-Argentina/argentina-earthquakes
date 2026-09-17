# 01 — Fuentes de datos y preprocesamiento

Estado: fuentes inventariadas; procesamiento no iniciado.

El manifiesto canónico es `../manifests/DATASET_MANIFEST.md` y el significado de cada campo está en `../docs/DATA_CONTRACT.md`.

## Fuentes

| Dataset | Categoría | Función |
|---|---|---|
| INPRES vía `inpres-sismos` | catálogo sísmico | eventos, tiempo, coordenadas, profundidad y magnitud reportada |
| GEBCO 2026 | modelo de elevación/batimetría | relieve continental y oceánico |
| USGS Slab2 South America 2018 | modelo tectónico | geometría modelada de la superficie subducida |
| IGN | cartografía oficial | territorio y límites argentinos |
| Natural Earth | contexto regional | costas y países vecinos |

Los raw pesados permanecen fuera de Git. No se duplicará el scraper de INPRES.

## Correcciones a la estrategia anterior

### INPRES

El GeoJSON completo actual pesa 41.059.737 bytes para 80.470 eventos. La cifra histórica de ~20 MB quedó invalidada.

La creación inmediata de `sismos.bin` y la expectativa de 1,2 MB quedaron invalidadas como decisiones. Primero se probará el GeoJSON real con Three.js según `../docs/BENCHMARK_PLAN.md`.

El baseline será:

1. fijar commit y checksum;
2. servir el GeoJSON same-origin;
3. medir descarga, parseo, memoria, construcción, render, picking y filtrado;
4. optimizar únicamente el primer cuello de botella demostrado.

Si luego se diseña un formato compacto, deberá incluir o relacionar metadata suficiente para el inspector. No basta con atributos de render.

### GEBCO

El ZIP local no es el dataset global completo: es un recorte amplio de 85°O a 9°O y 77°S a 0°, distribuido en varios formatos redundantes.

Procesamiento futuro:

1. elegir NetCDF o GeoTIFF como única entrada;
2. definir el BBOX científico principal;
3. recortar y remuestrear conservando cota cero y nodata;
4. comparar heightmap y malla en un prototipo medido;
5. registrar resolución, cuantización, CRS y checksum de salida.

No se presupone WebP de 16 bits ni GLB comprimido antes de comprobar compatibilidad y rendimiento.

### Slab2

La grilla estructurada y su máscara tienen prioridad sobre una triangulación Delaunay indiscriminada.

Procesamiento futuro:

1. verificar variables, unidades y convención top/center;
2. convertir longitudes 0–360 a -180–180;
3. conservar `NaN`, máscara `clp` e incertidumbre;
4. recortar sin inventar superficie fuera del dominio válido;
5. triangular/simplificar de forma reproducible;
6. generar contornos sólo si mejoran la lectura.

### IGN y Natural Earth

Existe cartografía IGN candidata, pero su URL/versionado no está documentado y sus atributos muestran problemas de encoding. Debe validarse antes de simplificar.

Natural Earth se usará sólo como contexto. No reemplaza la representación oficial argentina.

## Salidas esperadas

Los formatos finales aún no están decididos. Los artefactos candidatos serán evaluados individualmente para versionado o generación durante build/deploy. `public/data/generated/` permanece disponible para esa decisión futura.

Toda salida deberá registrar input, checksum, comando, parámetros, pérdidas de precisión y checksum resultante.
