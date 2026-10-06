# Calidad del catálogo y navegación — 06/10/2026

Revisión de sólo lectura solicitada durante el prototipo histórico. No se corrigió,
eliminó ni reemplazó ningún evento; no se modificó `inpres-sismos`. Las propuestas
de esta nota no están implementadas en la UI ni en el proveedor.

## Registro señalado

| Campo | Snapshot del producto | INPRES consultado el 06/10/2026 |
|---|---|---|
| ID | derivado `f69ff9337367a750` | ficha `20190129060236` |
| Fecha/hora local | 29/01/2019 03:02:39 | 29/01/2019 03:02:38.9 |
| Hora UTC | no es campo independiente | 29/01/2019 06:02:38 |
| Latitud / longitud | −31.076 / −68.439 | −31.076 / −68.439 |
| Profundidad | 10.0 km | 10 km |
| Magnitud reportada | 8.0, tipo desconocido | 8, tipo no indicado en la ficha |
| Ubicación | original ausente; normalizada desconocida | buscador sin provincia; ficha: 49 km al N de San Juan |

El buscador oficial y la [ficha de INPRES](http://contenidos.inpres.gob.ar/epicentro3.php?s=20190129060236)
publican el mismo valor 8. No es una transformación del visor ni evidencia de un
desplazamiento de columnas del export: se encuentra literalmente en
`inpres-sismos/data/sismos.csv`, línea 43784. `git blame` lo remonta al commit
`1c05cc94` del 15/11/2024; eso fecha la incorporación al CSV, no el origen del error.
El redondeo de 38.9 a 39 es compatible con la diferencia horaria observada; no se
establece el método exacto del scraper original a partir de esa coincidencia.

Contraste independiente con USGS, consultas HTTP 200 del 06/10/2026:

- [29/01/2019 UTC, radio 250 km alrededor del punto](https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2019-01-29T00:00:00&endtime=2019-01-30T00:00:00&latitude=-31.076&longitude=-68.439&maxradiuskm=250): 0 eventos.
- [29/01/2019 UTC, global, magnitud ≥7](https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2019-01-29T00:00:00&endtime=2019-01-30T00:00:00&minmagnitude=7): 0 eventos.

La [API FDSN de USGS](https://earthquake.usgs.gov/fdsnws/event/1/) recibe tiempos
UTC; 03:02 local corresponde aproximadamente a 06:02 UTC. La ausencia en USGS
refuerza la alerta sobre un valor tan grande, pero no demuestra que no existiera
un evento pequeño. **Conclusión: magnitud sospechosa, causa y valor correcto sin
confirmar.** No se la sustituye por 2.8, ni se afirma que todo el evento sea falso.
Para resolverlo hace falta un catálogo revisado, un boletín o aclaración de INPRES.
No se contactó a ninguna institución.

La consulta fue `POST http://contenidos.inpres.gob.ar/sismos_consultados` con
fecha inicial/final `2019-01-29`, horas `00`/`23`, `tilde1=on`; restantes filtros
desactivados. El buscador devolvió 12 filas. La fila 8 conserva la magnitud 8.00,
latitud, longitud, profundidad y enlace de la ficha indicada.

Evidencia local fuera del repositorio, en `../competition-evidence/`:

| Archivo | SHA-256 de la copia guardada |
|---|---|
| `inpres-2019-01-29.html` | `d57fdc3ef231ef57792a1d008feaf7e45318b2dc8331485bb0a6c7b30af255c4` |
| `inpres-event-20190129060236.html` | `c709180e34c2253fafe80d3c59613ff0682aa24c9d8ce23c20e57d630563e13b` |
| `usgs-2019-01-29-m7.json` | `27b9325345b19755e20922905255f4e20c60f924bdcc560749550056fdbbbbbb` |

Los hashes corresponden a archivos guardados como UTF-8, no a bytes originales
de transporte. No son nuevos datasets incorporados al producto.

## Qué normalizar y cómo corroborar

Ya existen normalización de ubicación, conversión numérica y generación de ID
en `inpres-sismos/exporters/csv_exporter.py`. Normalizar formatos no determina
si una medición es verdadera. Falta una capa de control de calidad trazable.

Propuesta acotada para el **proveedor**, en trabajo separado:

1. Conservar campos originales y procedencia, URL/ID oficial, fecha de extracción,
   zona horaria y precisión de los segundos. Incorporar tipo de magnitud y estado
   de revisión sólo si la fuente los proporciona. Una ubicación ausente debe
   permanecer desconocida; el `es_argentina: false` derivado aquí no demuestra
   una ubicación fuera del país.
2. Generar alertas de formato, coordenadas/profundidad inválidas, duplicados y
   magnitudes extremas o contexto incompleto. Un umbral produce una alerta,
   nunca una corrección ni eliminación automática. El snapshot web tiene 12
   registros con magnitud ≥7: varios son de Chile y del Atlántico Sur, por lo
   que no deben declararse erróneos por compartir ese umbral.
3. Revisar primero la ficha de INPRES. Contrastar candidatos por tiempo UTC,
   distancia, profundidad y tipo de magnitud con USGS u otro catálogo primario;
   conservar método, tolerancias, candidatos y resultado. Una coincidencia no
   habilita sobrescribir magnitudes de escalas diferentes. Ausencia de coincidencia
   significa «sin corroboración», no «falso».
4. Exportar anotaciones como `pendiente`, `corroborado`, `discrepante` o `corregido
   por la fuente`, con evidencia y fecha. El producto las muestra en el inspector;
   las exclusiones de análisis exigen política explícita, snapshot versionado,
   conteos de excluidos y resultados recalculados.

El ID derivado incluye profundidad y magnitud: si se revisan, cambia el hash.
Hace falta mantener vínculo con el ID original y preferir el identificador de
fuente, sin confundir una revisión con un evento nuevo.

Las noticias pueden sumar contexto de efectos e impacto. No son un filtro de
existencia: muchos sismos no llegan a la prensa y una noticia puede reproducir
un dato preliminar. No se recomienda añadir una API de noticias al runtime ni
eliminar eventos por ausencia de cobertura periodística.

El snapshot permanece en 80.470 eventos, SHA-256
`685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82`.
La actualización diaria sigue siendo una cuestión separada: véase
[diagnóstico de actualización](catalog-refresh-diagnosis.md).

## Controles del mapa

Código comprobado: Three.js 0.186.0, `OrbitControls`, paneo en pantalla y zoom al
cursor. El visor permite rotar con arrastre izquierdo, desplazar con derecho,
rueda para zoom, doble clic para recentrar, y ambos botones para traslado inverso
que puede incluir profundidad. La brújula es informativa; no ofrece reset.
Las flechas del teclado no están conectadas al control de cámara.

[OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) también admite
Shift/Ctrl + arrastre izquierdo para desplazar. Ese atajo heredado está disponible
en la versión instalada pero no figura en la ayuda del producto. En táctil su
configuración actual es un dedo para rotar y dos para paneo/zoom. Son capacidades
del código; esta revisión no certifica gestos en un teléfono físico.

| Alternativa | Ventaja | Costo para este visor |
|---|---|---|
| Mantener OrbitControls y mejorar accesos | Conserva el manejo del volumen; sin dependencia nueva | Añadir ayuda visible y recuperación de vista |
| [MapControls](https://threejs.org/docs/pages/MapControls.html) | Arrastre izquierdo/un dedo desplaza; derecho rota | Invierte hábitos existentes y su paneo predeterminado queda en el plano del mapa |
| Otra biblioteca de cámara | Puede aportar transiciones y límites avanzados | Dependencia y mayor superficie de integración sin necesidad demostrada |

**Recomendación para la siguiente implementación:** mantener OrbitControls,
mostrar el atajo Shift + arrastre, añadir «Vista inicial» y «Desde arriba» como
acciones directas, y flechas de paneo sólo cuando el canvas tiene foco (sin robar
teclas a filtros ni al perfil). Una brújula accionable podría restaurar norte
preservando centro y distancia. El gesto de ambos botones queda como atajo
avanzado, no como requisito de uso. Probar luego paneo, zoom, picking y retorno
de la historia con mouse, trackpad y dispositivo táctil real.

No se cambiaron los gestos en esta iteración: el pedido fue investigar su mejora.
