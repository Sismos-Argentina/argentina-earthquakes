# Slab2 South America 2018

Fuente: [USGS Slab2, DOI 10.5066/F7PV6JNV](https://doi.org/10.5066/F7PV6JNV). Es un **modelo geofísico**, no observación directa. La documentación USGS identifica `dep` como grilla de profundidad, `unc` como incertidumbre de profundidad (km) y `clp` como polígono fuera del cual el modelo no debe usarse.

El artefacto se regenera sin modificar ni copiar los raw:

```powershell
$env:SISMOS_DATA_DIR = 'C:\ruta\a\Sismos-argentina\data'
python -m pip install -r tools/slab2/requirements.txt
python tools/slab2/process_slab2.py
npm run slab2:validate
```

`--data-dir` acepta alternativamente la carpeta que contiene `slab2/` o la carpeta `slab2/` misma. El frontend sólo lee `public/data/generated/slab2-sam-2018-scientific.json`.

El recorte actual es 82°O–58°O y 49°S–18°S, intersección de interés con el terreno científico. Se toma cada segundo nodo de la grilla regular original de 0,05°, sin interpolación: resolución web 0,1°. CLP y `NaN` se conservan como `null`; la malla sólo genera caras cuando sus cuatro esquinas son válidas. Longitud fuente `0–360` pasa a `−180–180` restando 360. DEP negativo en el raw se convierte a profundidad positiva en km hacia abajo; `geographicToScene` lo sitúa en `−Y` a 1×. UNC queda en km, sin usar para mover la superficie. La exageración GEBCO no modifica Slab2.

La metadata local no explicita el datum vertical exacto de DEP; en la escena se muestra respecto del cero nominal del nivel del mar. La referencia vertical exacta de las profundidades INPRES tampoco consta en el export actual; por tanto la superposición permite comparación visual, **no medición vertical exacta ni clasificación tectónica**. El modelo se representa como una superficie, no como el espesor o volumen de la placa. No se usaron dip, strike, thickness ni contornos.
