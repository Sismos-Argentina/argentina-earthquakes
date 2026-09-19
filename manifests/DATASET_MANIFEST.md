# Manifiesto de datasets

Estado: inventario inicial consolidado el 15 de septiembre de 2026; artefactos web actualizados el 19 de septiembre de 2026.

Los paths raw son externos al repositorio. Se expresan respecto del directorio de trabajo que actualmente contiene `argentina-earthquakes`, `inpres-sismos` y `data`. Una herramienta futura deberá aceptar un directorio configurable y no depender de esa disposición.

## Resumen

| Dataset | Categoría | Versión | Estado para MVP |
|---|---|---|---|
| INPRES vía `inpres-sismos` | catálogo sísmico | commit `81e230c`, 14/09/2026 | disponible; contrato incompleto pero no bloqueante |
| Slab2 South America | modelo tectónico | 02.23.18 / publicación 2018 | artefacto web disponible; modelo diferenciado de observaciones |
| GEBCO | modelo de elevación/batimetría | GEBCO_2026 | dos recortes web disponibles; extensión y detalle separados |
| IGN | cartografía oficial | versión no registrada | geometría web incluida; origen/versión exactos por completar |
| Natural Earth | contexto regional | 5.1.1 | geometría web incluida como contexto no oficial argentino |

Los cuatro artefactos web versionados son derivados livianos; los archivos raw permanecen fuera del repositorio:

| Artefacto | Bytes | SHA-256 |
|---|---:|---|
| `public/data/generated/gebco-2026-scientific.json` | 9.892.637 | `d45db211399244cd3fb0f7d54ac12ede14af3bb06690254a8d75d4d4b7882f17` |
| `public/data/generated/gebco-2026-context.json` | 583.677 | `4afa163dfe36cbcf41f770fcb217b458a954f6df6e80c276942569ad3f9bc0b0` |
| `public/data/generated/cartography-argentina-context.json` | 378.954 | `c37fceb67aea1bbe29698595885e3e95d9a60aee9092f1e27a666472fb801fa8` |
| `public/data/generated/slab2-sam-2018-scientific.json` | 814.194 | `a3856e102bdc7272df3093996aea2c1c4e1120750438af67e5d1edb5faaccc09` |

## INPRES vía `inpres-sismos`

| Propiedad | Valor |
|---|---|
| Fuente | Instituto Nacional de Prevención Sísmica; obtención y exportación mediante `inpres-sismos` |
| Origen | `https://github.com/Sismos-Argentina/inpres-sismos` (el remoto local histórico usa `LuisOVaras/inpres-sismos`) |
| Versión auditada | commit `81e230c782972a2996a32f1ef21d56a2ef22e2e7` |
| Fecha del export | 2026-09-14T16:23:13Z |
| Formato baseline | GeoJSON FeatureCollection, 80.470 puntos |
| CRS | EPSG:4326 / coordenadas `[longitud, latitud]` |
| Tamaño | 41.059.737 bytes |
| Cobertura declarada por metadata | longitud -78,661 a 174,99; latitud -64,982 a 47,81; incluye eventos fuera del área científica principal |
| Período | 16/07/2011 a 14/09/2026 |
| Licencia | datos públicos de INPRES; el repositorio no contiene archivo `LICENSE`. Condiciones precisas de redistribución/atribución pendientes de verificación |
| Raw local | `../inpres-sismos/data/exports/sismos.geojson` |
| Artefacto web actual | GeoJSON completo servido same-origin, preparado por `tools/prepare-inpres.mjs`; 41.059.768 bytes, SHA-256 `685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82` |
| Formato posterior | GeoJSON se conserva por ahora; no se presupone formato binario |
| Transformaciones necesarias | validación de esquema; parseo; separación de atributos de render/inspector si las mediciones lo requieren; proyección documentada; filtro espacial explícito |

Checksum SHA-256: `ae37584d4e5b45ad9225a10f74d5a44609bf202bee8fdca2f295af2025344a44`.

## Slab2 South America

| Propiedad | Valor |
|---|---|
| Fuente | U.S. Geological Survey, Slab2 |
| Origen | DOI `10.5066/F7PV6JNV`; publicación Hayes et al. 2018, DOI `10.1126/science.aat4723` |
| Versión | archivos `sam_slab2_*_02.23.18` |
| Formatos | NetCDF/GMT `.grd`, texto `.xyz`, CSV de máscara, contornos y shapefiles |
| CRS horizontal | coordenadas geográficas; longitudes raw 0–360 |
| Convención vertical | profundidad raw negativa en km para `dep` |
| Tamaño de `dep.xyz` | 14.339.837 bytes |
| Cobertura metadata | 88°O a 58°O, 50°S a 12°N; celdas válidas observadas aprox. 82°O a 60,1°O y 45,6°S a 11,3°N |
| Grilla observada | 744.261 filas; 206.451 valores válidos de profundidad; paso aparente de 0,05° |
| Licencia | datos USGS sin restricciones de acceso indicadas en metadata; revisar aviso y atribución final antes de publicar |
| Raw local | `../data/slab2/` |
| Artefacto web actual | `public/data/generated/slab2-sam-2018-scientific.json`, 814.194 bytes, SHA-256 `a3856e102bdc7272df3093996aea2c1c4e1120750438af67e5d1edb5faaccc09` |
| Cobertura/resolución web | 82°O–58°O, 49°S–18°S; grilla de nodos de 0,1° (cada segundo nodo original); 27.118 nodos válidos |
| Transformaciones aplicadas | DEP/UNC `.grd` + CLP; convertir longitud restando 360; DEP negativo a profundidad positiva en km; CLP y `NaN` a `null`; sin interpolación; caras sólo con cuatro nodos válidos. UNC preservada en km. Herramienta: `tools/slab2/process_slab2.py` |

Archivos auditados y checksums:

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `Slab2_sam.xml` | 6.593 | `a1fa49dabca0b92c9933af18cf60430c1d07997aece75e736abfd9d90c650b3b` |
| `sam_slab2_dep_02.23.18.xyz` | 14.339.837 | `0522c999fcd3f80422407e0f6bdb4cb1ce09bd2cf1f13d68c2b169c26762bbca` |
| `sam_slab2_dip_02.23.18.xyz` | 14.134.592 | `dcdd1c10ceaf5423a9f4ffbd7a238525f24112d66a83e2e62ce9ae7576c6411c` |
| `sam_slab2_str_02.23.18.xyz` | 14.136.413 | `c138d970788e9c1d4efa95a25ce0b62472cc6c3f53457adfb48db5a3536d7422` |
| `sam_slab2_thk_02.23.18.xyz` | 14.134.504 | `0d46977fb483ddc8553eac14db67f9dca51a4cb7e262f2b4e7fad6d73809f604` |
| `sam_slab2_unc_02.23.18.xyz` | 14.133.924 | `e21d3d7b65f7da0be5cb6952ec901d359da514d20e02428495c579d798a971dc` |
| `sam_slab2_clp_02.23.18.csv` | 17.458 | `b85e7211e0842d21026de6d9f5fae4544a18f6291d74fac0023784f13bce45c8` |
| `sam_slab2_dep_02.23.18.grd` | 581.426 | `0e09dc45baaf402204bdecbe3254b637e3a8f4818ff23903bf61254de3525257` |
| `sam_slab2_dip_02.23.18.grd` | 614.531 | `697c4d6d1f1cf7d97cff64a024b7e29bbf2a6aedfe48b33884de452dbbff0e51` |
| `sam_slab2_str_02.23.18.grd` | 599.666 | `95ac14f2c26d25400ab71a65d620642a056590f83ed8c50a46936e20257a1b19` |
| `sam_slab2_thk_02.23.18.grd` | 450.629 | `73c81cb98d773d71d945007fb8bc8cc5966bebbf49f8c2b18a39625ad7100d0d` |
| `sam_slab2_unc_02.23.18.grd` | 604.649 | `38b27b519c368631e52598708b24012cb0911cecbe0144b593003fb0d45c1dc0` |
| `sam_slab2_dep_02.23.18_contours.in` | 1.151.412 | `8dbf6ce9c4cf074258d5a88da9c5e4680fa04616316381e0ab80b4374e4efb84` |
| `sam_shapefiles.zip` | 676.623 | `50fec669ef07a5108cfa53e3977e0f14343482c4deaedec1b9b1221d09946322` |

## GEBCO 2026

| Propiedad | Valor |
|---|---|
| Fuente | GEBCO Bathymetric Compilation Group |
| Origen | descarga personalizada de GEBCO; nombre `GEBCO_18_Sep_2026_2b57c69752b6.zip` |
| Versión | GEBCO_2026 Grid, 15 arc-seconds |
| Formatos incluidos | GeoTIFF y documentación |
| CRS horizontal | coordenadas geográficas, asumidas WGS84 según GEBCO |
| Referencia vertical | elevación en metros respecto de nivel medio del mar nominal; consultar excepciones de GEBCO |
| Tamaño ZIP | 1.141.029.798 bytes |
| Cobertura raw | 100°O a 10°E; 90°S a 0° |
| Cobertura web contextual | 100°O a 8°E; 90°S a 0°; opción B aprobada, recortada antes de África continental |
| Cobertura web científica | 85°O a 20°O; 72°S a 0°; toda la Sudamérica disponible en el raw, Georgia y Sandwich del Sur y el norte de la Península Antártica |
| Resolución web científica | 1300 × 1440 celdas de 0,05°; seleccionada por benchmark visual y de rendimiento |
| Licencia | dominio público bajo términos GEBCO; requiere atribución, no sugerir respaldo oficial y no usar para navegación |
| Raw local | `../data/GEBCO_18_Sep_2026_2b57c69752b6.zip` |
| Artefactos web | perfiles `scientific` y `context` en JSON determinista, con metadata de fuente y transformación |
| Transformaciones aplicadas | GeoTIFF único; recorte por BBOX; remuestreo bilinear; enteros en metros; `null` para nodata; registro por centro de celda; científico 1300 × 1440 y contexto 360 × 300 |

Checksum SHA-256: `46c5bced98c9e01aec61cb8abef241deee10ce6ba29daa8be043f35d739d09d9`.

Procesar únicamente el GeoTIFF; los PDF del ZIP documentan la grilla y sus términos, pero no son entradas raster alternativas.

## IGN

| Propiedad | Valor |
|---|---|
| Fuente atribuida en propiedades | Instituto Geográfico Nacional (`sag: IGN`) |
| URL/origen exacto | pendiente de recuperar y registrar antes del artefacto final |
| Versión | no registrada en los archivos disponibles |
| Formato | GeoJSON FeatureCollection |
| CRS | CRS84 declarado en `provincia.json` y `pais.json` |
| Tamaños | provincias: 46.494.823 bytes; país: 27.500.019 bytes |
| Cobertura | Argentina continental y geometría multipartida bicontinental; requiere validación visual y topológica |
| Licencia | pendiente de verificar en la fuente IGN correspondiente |
| Raw local | `../inpres-sismos/data/provincia/provincia.json`; `../inpres-sismos/data/pais/pais.json` |
| Artefacto web esperado | límites nacionales/provinciales simplificados y una representación territorial complementaria |
| Transformaciones necesarias | corregir encoding de atributos; validar fuente/fecha; reparar geometrías si corresponde; simplificar topológicamente; preservar islas y sector antártico; documentar CRS |

Checksums SHA-256:

- `provincia.json`: `183dc06a6a66832022976162f5e2a5e207075cd6feaf6d875170520a50e304b6`
- `pais.json`: `8fd4a0df2c3616837fdcadac5a9534ebcb0821c1de80bdb415c2fe33855c7a17`

La variante `ProvinciasArgentina.geojson` no se selecciona todavía: omite la representación multipartida completa y también presenta problemas de encoding.

## Natural Earth

| Propiedad | Valor |
|---|---|
| Fuente | Natural Earth |
| Origen | archivo `ne_10m_admin_0_countries.zip`; URL exacta de descarga pendiente de registrar |
| Versión | 5.1.1, leída del archivo VERSION incluido en el ZIP |
| Formato | Shapefile 1:10m |
| CRS | coordenadas geográficas; validar `.prj` antes de transformar |
| Tamaño | 4.930.492 bytes |
| Cobertura | global |
| Licencia | dominio público según Natural Earth |
| Raw local | `../data/ne_10m_admin_0_countries.zip` |
| Artefacto web esperado | costas y países vecinos simplificados, sólo como contexto regional |
| Transformaciones necesarias | filtrar área/países; simplificar; transformar al CRS de escena; no sustituir cartografía oficial argentina |

Checksum SHA-256: `ce1ac7036499a0edd641fbc093cd209a98f96a49d2eca8480aaacad35138a7f6`.

## Política de artefactos web

Los artefactos finales se evaluarán individualmente. Este manifiesto no decide si deben versionarse o generarse durante build/deploy. `public/data/generated/` no está ignorado globalmente.
