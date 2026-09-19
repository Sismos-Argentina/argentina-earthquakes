# Preparación GEBCO 2026

Esta herramienta genera dos artefactos web de topografía/batimetría. El raw no se copia ni se modifica.

## Requisitos

- Python 3.13.
- Dependencias de `requirements.txt`. Rasterio incluye GDAL en sus wheels oficiales de Windows.
- La carpeta indicada por `SISMOS_DATA_DIR` debe contener `GEBCO_18_Sep_2026_2b57c69752b6.zip`.

Ejemplo en PowerShell para este workspace:

```powershell
$env:SISMOS_DATA_DIR = 'C:\ruta\a\Sismos-argentina\data'
python -m venv .local-data/terrain-venv
.\.local-data\terrain-venv\Scripts\python.exe -m pip install -r tools/terrain/requirements.txt
.\.local-data\terrain-venv\Scripts\python.exe tools/terrain/process_gebco.py
npm run terrain:validate
```

También se acepta `--data-dir`. `--profile scientific` o `--profile context` permiten regenerar un único perfil.

- `scientific`: 85°O–20°O, 72°S–0°, 1300 × 1440 celdas de 0,05°. Incluye toda la porción de Sudamérica disponible en el GeoTIFF descargado, además de Tierra del Fuego, Malvinas, Georgia y Sandwich del Sur, y el norte de la Península Antártica. La densidad se eligió después de comparar cinco resoluciones en el navegador y ampliar el recorte sin acercarse al costo de la grilla nativa.
- `context`: 100°O–8°E, 90°S–0°, 360 × 300 celdas. Es la opción B aprobada: conserva el Pacífico, Sudamérica, el Atlántico Sur y la Antártida, y termina antes de África continental.

La fuente local cubre 100°O–10°E y 90°S–0°. El perfil de contexto descarta los dos grados orientales donde empieza a aparecer África; no inventa elevación fuera del recorte. Las salidas son JSON deterministas y se versionan para que el frontend no requiera el raw ni Python.

## Benchmark de resolución científica

Mediciones orientativas en `next dev`, catálogo completo y relieve 5×, tomadas el 19/09/2026 en el mismo navegador:

| Dimensiones | Primer frame | Construcción | Heap posterior | FPS en reposo |
|---:|---:|---:|---:|---:|
| 360 × 480 | 1,01 s | 257 ms | 166 MiB | 119 |
| 720 × 960 | 1,62 s | 605 ms | 225 MiB | 120 |
| 960 × 1280 | 1,90 s | 875 ms | 276 MiB | 121 |
| 1440 × 1920 | 2,96 s | 1,51 s | 333 MiB | 115 |
| 1800 × 2400 | 5,27 s | 2,93 s | 488 MiB | 120 |

La grilla nativa 7200 × 9600 y los niveles 3600 × 4800 y 1800 × 2400 se evaluaron primero por memoria. La nativa y la mitad se descartaron sin cargar por superar aproximadamente 4 GiB y 1 GiB sólo en buffers geométricos; 1800 × 2400 fue el mayor nivel abierto en el navegador. El recorte final usa 1300 × 1440 celdas de 0,05°: 1.872.000 vértices científicos y, combinado con el contexto, 1.980.000 vértices y 3.953.204 triángulos. En la medición orientativa obtuvo primer frame de 3,91 s, heap de 254 MiB y 119 FPS.
