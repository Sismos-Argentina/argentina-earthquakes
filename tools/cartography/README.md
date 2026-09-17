# Preparación de cartografía

Genera una capa web simplificada a partir de dos fuentes locales:

- `provincia.json`: Provincias de la República Argentina, con agencia `IGN` declarada en cada registro.
- `ne_10m_admin_0_countries.zip`: Natural Earth 5.1.1 para contexto internacional.

El raw no se copia al repositorio. La salida conserva fuentes, checksums, CRS y transformaciones.

```powershell
$env:SISMOS_DATA_DIR = 'C:\ruta\a\Sismos-argentina\data'
$env:SISMOS_IGN_SOURCE = 'C:\ruta\a\provincia.json' # opcional en este workspace
uv pip install --python .\.local-data\venv-py313\Scripts\python.exe -r tools/cartography/requirements.txt
.\.local-data\venv-py313\Scripts\python.exe tools/cartography/process_cartography.py
python tools/cartography/validate_cartography.py
```

Natural Earth aporta sólo el contexto regional. La representación territorial argentina usa IGN. El límite cartográfico IGN alcanza 90°S; la superficie GEBCO local alcanza 77°S, por lo que el tramo restante se muestra como contexto cartográfico sin inventar elevación.
