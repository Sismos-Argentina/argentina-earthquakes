# EDA del catálogo sísmico

Este runner analiza el catálogo maestro de `inpres-sismos` sin modificarlo y
produce tablas, figuras y metadata reproducibles dentro del repositorio del
producto. Separa explícitamente:

- observaciones catalogadas por INPRES;
- modelos Slab2;
- cartografía IGN;
- cálculos derivados de este EDA.

No modifica el frontend. Tampoco incorpora datasets nuevos, extrapola Slab2,
clasifica eventos tectónicamente ni interpreta automáticamente picos temporales
como secuencias de réplicas.

## Ejecución

Desde `argentina-earthquakes`, con los repositorios hermanos y `data/slab2`
presentes en el workspace:

```powershell
python -m pip install -r tools/eda/requirements.txt
python tools/eda/catalog_eda.py
python tests/test_catalog_eda.py
```

Las rutas pueden cambiarse con `--catalog`, `--slab-dir`, `--provinces` y
`--output`. `--skip-figures` conserva únicamente resultados tabulares.

## Métodos que requieren cautela

- `Mc`: máximo de la distribución no acumulada de magnitud (MAXC, bin 0,1).
  Es un diagnóstico inicial, no una prueba definitiva de completitud.
- `b`: estimador Aki–Utsu por encima de `Mc`, reportado sin interpretación
  tectónica.
- barrido latitudinal: perfiles 73°O–61°O con corredor de ±50 km, calculado en
  una proyección azimutal equidistante local por latitud.
- `Δz = profundidad INPRES - profundidad Slab2 DEP`: positivo significa que el
  hipocentro queda nominalmente más profundo. No es distancia tridimensional,
  membresía tectónica ni validación independiente del modelo.
- provincias: point-in-polygon con IGN y área en EPSG:6933. Son unidades
  administrativas; la densidad depende de la geometría y de la completitud.
