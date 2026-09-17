# Preparación GEBCO 2026

Esta herramienta genera el artefacto web provisional de topografía/batimetría. El raw no se copia ni se modifica.

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
python tools/terrain/validate_gebco.py
```

También se acepta `--data-dir`. `--bbox oeste,sur,este,norte`, `--width` y `--height` permiten cambiar el prototipo sin modificar el script. La configuración inicial es 80°O–60°O, 46°S–18°S y 256 × 358 celdas.

El BBOX es un área científica **provisional** para esta prueba. No define la representación territorial argentina ni excluye Tierra del Fuego, Malvinas/Islas del Atlántico Sur o Antártida de la estrategia cartográfica final.

La salida es JSON plano para mantener el primer contrato deliberadamente simple. Con 256 × 358 celdas ocupa menos de 1 MiB sin compresión y se versiona para que el frontend no requiera el raw ni Python. El archivo es determinista para una misma entrada y parámetros.
