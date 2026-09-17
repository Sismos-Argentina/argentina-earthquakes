# Contrato de datos

Estado: línea base aprobada el 15 de septiembre de 2026.

Este documento describe lo que los datos significan hoy. No describe un esquema ideal. Toda incorporación al frontend debe respetar la separación entre datos catalogados, modelos externos, cálculos derivados e interpretaciones.

## 1. Categorías epistemológicas

| Categoría | Definición | Ejemplos |
|---|---|---|
| Catalogado | Determinación publicada por una fuente sismológica. No implica exactitud absoluta. | Hipocentro, profundidad y magnitud reportados por INPRES. |
| Modelo externo | Representación científica construida mediante datos y metodología externa. | Slab2, GEBCO. |
| Derivado | Valor calculado por nuestros procesos con una regla reproducible. | ID hash, coordenadas proyectadas, offset geométrico respecto de Slab2. |
| Interpretación | Explicación o clasificación que requiere supuestos científicos. | Asociación tectónica de un evento. |

La interfaz debe identificar la categoría cuando exista riesgo de confusión.

## 2. INPRES: contrato original disponible

Fuente inmediata: `inpres-sismos/data/sismos.csv`. Snapshot auditado: 80.470 registros, del 16/07/2011 al 14/09/2026. El repositorio proveedor puede continuar actualizándose sin modificar este contrato documentado.

| Campo | Tipo raw | Tipo de consumo esperado | Unidad/formato | Origen | Calidad y limitaciones |
|---|---|---|---|---|---|
| `fecha` | string | fecha validada | `DD/MM/YYYY` | INPRES, con transformación en registros recientes | La página reciente puede entregar sólo día y mes; el scraper agrega el año en curso. Existe riesgo de cambio de año. |
| `hora` | string | hora local validada | `HH:MM:SS` | INPRES, con transformación en registros recientes | Corresponde a hora local argentina UTC-3 cuando así lo indica la fuente. En registros recientes el scraper agrega segundos `:00`; esos segundos son sintéticos y no deben presentarse como precisión observada. |
| `latitud` | string numérico | número | grados decimales, sur negativo | INPRES | Coordenada hipocentral catalogada. No se publica incertidumbre en el export actual. |
| `longitud` | string numérico | número | grados decimales, oeste negativo | INPRES | Coordenada hipocentral catalogada. No se publica incertidumbre en el export actual. |
| `profundidad` | string | número | kilómetros bajo la referencia usada por INPRES | INPRES | El raw puede incluir `Km` o `Km.`. Se remueve el sufijo y se convierte a número. No hay incertidumbre disponible. |
| `magnitud` | string numérico | número | magnitud reportada, escala no preservada | INPRES | No debe etiquetarse automáticamente como Mw, Ml, Md ni tratarse como una escala homogénea conocida. |
| `provincia` | string o vacío | string | texto libre | INPRES | Es una descripción de lugar, provincia, límite, país, océano o región. No es una clasificación espacial autoritativa. Puede contener abreviaturas, errores y mojibake. |
| `sentido` | `Si`/`No` | booleano con procedencia | sin unidad | INPRES / scraper | Para la página reciente se infiere del color del registro. La ausencia de marca no demuestra que nadie haya percibido el evento. |

### Tiempo

- El valor actual se interpreta como hora local argentina UTC-3 cuando corresponde a las páginas de origen auditadas.
- El frontend no debe rotular el valor raw como UTC.
- Una conversión futura a UTC será derivada y debe conservar el valor local original.
- Los segundos `:00` agregados por el scraper representan precisión desconocida a nivel de segundos.

### Estado de revisión

INPRES distingue visualmente eventos automáticos sujetos a revisión de eventos revisados por un sismólogo. El export actual no conserva ese estado. Por lo tanto:

- no afirmar que todos los eventos están revisados;
- mostrar una advertencia general de calidad;
- no inventar un estado por antigüedad, magnitud u otro campo.

Verificar si INPRES ofrece metadata individual adicional —ID oficial, tipo de magnitud, estado de revisión e incertidumbres— es investigación futura. No bloquea el frontend ni forma parte del MVP inmediato.

## 3. INPRES: campos derivados actuales

Los exports de `inpres-sismos` agregan los siguientes campos. Son transformaciones del proveedor, no observaciones de INPRES.

| Campo | Tipo | Derivación | Limitaciones |
|---|---|---|---|
| `id` | string hexadecimal de 16 caracteres | SHA-256 truncado de fecha, hora, latitud y longitud redondeadas a 4 decimales, profundidad y magnitud redondeadas a 1 decimal | No es ID oficial. Puede cambiar si se corrige cualquiera de los campos de entrada. No debe usarse como enlace oficial sin verificación. |
| `ubicacion_original` | string | copia de `provincia` | Conserva errores del origen. |
| `ubicacion_normalizada` | string | reglas textuales | Útil para presentación, no para jurisdicción oficial. |
| `provincia` normalizada | string o null | reglas textuales | Puede elegir una provincia principal en eventos de límite. |
| `provincias` | lista de strings | búsqueda de nombres dentro del texto | No equivale a point-in-polygon. |
| `pais` | string | reglas textuales | Puede representar océanos o límites, no sólo países. |
| `tipo_ubicacion` | string | reglas textuales | Categoría heurística. |
| `es_argentina` | booleano | reglas textuales | No es determinación geográfica ni jurídica autoritativa. |
| `es_limite` | booleano | reglas textuales | Depende de palabras y abreviaturas del texto raw. |

El GeoJSON usa geometrías `Point` con coordenadas `[longitud, latitud]` en EPSG:4326. Los datos fuera del área científica principal deben filtrarse con una regla explícita y documentada, nunca eliminados silenciosamente.

## 4. Campos ausentes que el inspector debe reconocer

Actualmente no están disponibles de forma confiable:

- identificador oficial INPRES;
- URL oficial individual verificable;
- tipo o escala de magnitud;
- estado automático/revisado;
- incertidumbre horizontal o vertical;
- método de localización;
- intensidad macrosísmica completa;
- mecanismo focal;
- clasificación tectónica.

El inspector puede mostrar únicamente campos existentes, su procedencia y advertencias. No debe rellenar ausencias con inferencias.

## 5. Slab2 South America

Categoría: modelo científico externo.

Versión raw disponible: `sam_slab2_*_02.23.18`, correspondiente al modelo publicado en 2018.

| Variable/archivo | Contenido esperado | Unidad/convención | Tratamiento requerido |
|---|---|---|---|
| `dep` | profundidad de la superficie modelada del slab | km, valores negativos en el raw | Conservar signo en ingestión y documentar cualquier conversión al eje vertical de la escena. |
| `dip` | buzamiento local del modelo | grados | Verificar convención antes de visualización. |
| `str` | rumbo local del modelo | grados, 0–360 | Verificar convención angular antes de uso analítico. |
| `thk` | espesor estimado asociado al modelo | km, según documentación USGS | No interpretar como volumen exacto de la placa; no se utiliza en la sección MVP. |
| `unc` | incertidumbre de profundidad reportada por el modelo | km, según documentación USGS | Banda DEP ± UNC; no es intervalo de confianza del 95 %, error hipocentral ni probabilidad de pertenencia. |
| `clp` | contorno/máscara de validez | coordenadas geográficas | Usar para limitar la superficie válida. |
| contours | isolíneas de profundidad existentes | km | Validar signo y etiquetas. |

Las longitudes raw usan el dominio 0–360. Para interoperar con EPSG:4326 se transforman mediante `lon_signed = lon > 180 ? lon - 360 : lon`. La grilla contiene `NaN` fuera de la superficie válida; esos huecos no deben rellenarse arbitrariamente.

Una diferencia de profundidad entre un evento y Slab2 es un valor derivado. No demuestra que el evento pertenezca a la interfase o al interior de una placa. Cualquier clasificación tectónica queda fuera del MVP.

La referencia vertical exacta de la profundidad INPRES no está confirmada. En la sección Cuyo los puntos conservan esa profundidad sin corrección topográfica; la comparación con GEBCO (elevación positiva hacia arriba respecto del cero nominal) y Slab2 (profundidad positiva hacia abajo tras transformar el raw) es **nominal**, no una distancia física certificada. El CLP se aplica en el artefacto Slab2 a nodos válidos; la interpolación exige las cuatro esquinas DEP/UNC y deja discontinuidades ante nodata. La selección de ±50 km se calcula sobre la geodésica WGS84, nunca sobre coordenadas de escena.

## 6. GEBCO 2026

Categoría: modelo científico externo de elevación y batimetría.

| Propiedad | Contrato esperado |
|---|---|
| Versión | GEBCO_2026 Grid. |
| CRS horizontal | Coordenadas geográficas; puede asumirse referido a WGS84 según GEBCO. |
| Referencia vertical | Valores de elevación en metros respecto de una referencia nominal de nivel medio del mar, con excepciones documentadas por GEBCO. |
| Convención | Positivo sobre el nivel del mar; negativo para batimetría. |
| Resolución fuente | 15 arc-seconds. |
| Naturaleza | Producto continuo que integra mediciones, fuentes heterogéneas e interpolación. |

Toda preparación web debe registrar BBOX, resolución de salida, método de remuestreo, cuantización, nodata, preservación de cota cero y exageración vertical. La interfaz debe atribuir el terreno a GEBCO y no sugerir precisión uniforme.

## 7. IGN y contexto territorial

Categoría: cartografía externa oficial para Argentina. Natural Earth, cuando se use, será contexto regional no oficial argentino.

Contrato esperado:

- preservar CRS y metadata de origen;
- utilizar coordenadas compatibles con CRS84/EPSG:4326 después de una transformación documentada;
- validar geometrías y encoding antes de generar artefactos web;
- representar territorio continental, Tierra del Fuego, Islas Malvinas y demás Islas del Atlántico Sur;
- incorporar representación bicontinental/Antártica cuando corresponda al alcance de la vista;
- distinguir área científica principal de representación territorial nacional;
- no resolver jurisdicción sísmica mediante nombres o límites simplificados sin una metodología explícita.

## 8. Reglas para transformaciones futuras

Cada transformación debe registrar:

1. dataset y versión de entrada;
2. checksum de entrada;
3. herramienta y versión;
4. parámetros y CRS;
5. filas o celdas descartadas y motivo;
6. precisión perdida por cuantización o simplificación;
7. checksum y esquema del artefacto de salida.

No se adoptará un formato binario propio hasta completar el benchmark inicial.

## 9. Catálogo histórico: contrato separado, todavía no implementado

El catálogo de terremotos históricos de INPRES y el material fotográfico potencial pertenecen a una experiencia futura distinta de la exploración instrumental en profundidad. No se debe extender `InpresFeature` con profundidad o magnitud ficticias para alojarlos. Fecha, lugar, intensidad Mercalli, descripción, coordenadas y fotografías tendrán un contrato propio sólo después de verificar el origen, campos y derechos de uso. Véase [`HISTORICAL_EARTHQUAKES_PLAN.md`](HISTORICAL_EARTHQUAKES_PLAN.md).
