# Preparación GEBCO 2026

Esta herramienta genera dos artefactos web de topografía/batimetría. El raw no se copia ni se modifica.

## Requisitos

- Python 3.13.
- Dependencias de `requirements.txt`. Rasterio incluye GDAL en sus wheels oficiales de Windows.
- La carpeta indicada por `SISMOS_DATA_DIR` debe contener `GEBCO_07_Aug_2026_5422771e0b37.zip`.

Ejemplo en PowerShell para este workspace:

```powershell
$env:SISMOS_DATA_DIR = 'C:\ruta\a\Sismos-argentina\data'
python -m venv .local-data/terrain-venv
.\.local-data\terrain-venv\Scripts\python.exe -m pip install -r tools/terrain/requirements.txt
.\.local-data\terrain-venv\Scripts\python.exe tools/terrain/process_gebco.py
npm run terrain:validate
```

También se acepta `--data-dir`. `--profile scientific` o `--profile context` permiten regenerar un único perfil.

- `scientific`: 82°O–52°O, 58°S–18°S, 360 × 480 celdas. Incluye Andes, Argentina continental, Chile, Tierra del Fuego y Malvinas.
- `context`: 85°O–25°O, 77°S–10°S, 300 × 360 celdas. Prioriza extensión sobre detalle.

La fuente local termina en 77°S. La cartografía IGN puede continuar hasta 90°S, pero ese tramo no se rellena con elevación inventada. Las salidas son JSON deterministas y se versionan para que el frontend no requiera el raw ni Python.
