# Revisión final de navegación y presentación del concurso

La entrega conserva Three.js y prioriza una pregunta comprensible, cortes comparables y controles de movimiento explícitos. El trabajo del 14 de octubre se suma a la implementación del 13; el [plan de presentación](../PLAN_PRESENTACION_2026-10-14.md) define publicación, revisión humana y materiales de inscripción.

## Cambios locales

- Pregunta visible al abrir el mapa; respuesta bibliográfica visible en la comparación, con observación, modelo e interpretación abiertos.
- Título «Corte del subsuelo»; fondo claro por defecto y selector oscuro. La paleta, selección, leyenda y conteos conservan contraste en ambos temas.
- Descarga PNG del corte completo, con período efectivo, filtros de mapa y magnitud local, conteos, rango, escala, leyenda, checksum y fuentes. La descarga conserva todo el gráfico aunque haya scroll móvil.
- Modos Rotar y Mover para mouse y un dedo, con ayuda y vistas Desde arriba, Lateral y Contexto territorial. Mover conserva orientación y zoom; Vista inicial restablece cámara y modo Rotar.
- Mini mapa superior con geodésica y corredor reales. El arrastre traduce pantalla a latitud mediante la proyección visual; la selección de eventos y las medidas permanecen geodésicas WGS84. Se conserva la orientación al cambiar de latitud o perder el foco.
- Metodología pública y guion actualizados a la nueva pregunta, paleta y descarga.

El catálogo mantiene SHA256 `685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82`. El proveedor está limpio. No se agregaron datasets, dependencias ni imágenes. Las 20 fotografías siguen excluidas del export público mientras sus permisos permanezcan sin demostrar.

## Comparación

En [CONICET UNSJ](https://observatoriosismologico.com.ar/), arrastres de 120 × 50 px modificaron correctamente la cámara en Pan, Turntable, Orbital y Zoom. Orbital permite inclinar la vertical; Turntable la conserva. Nuestro modo Rotar mantiene la vertical y Mover permite recorrer el volumen conservando la orientación.

La consulta histórica **01–14/09/2026, M≥3** devolvió **HTTP 502**. El visor mantuvo eventos recientes con aviso de error. No hay una comparación válida de conteos o rendimiento entre catálogos para ese intervalo. El soporte geográfico de futuras muestras debe coincidir: rectángulo, provincia y corredor no son intercambiables.

Como contraparte reproducible se filtró nuestro catálogo por ese período, M≥3, todas las profundidades y rectángulo Cuyo `[−73, −33, −61, −29]`: **17 registros**. El cálculo está en `common-region-count.json`; no se enfrenta con los eventos recientes que CONICET retuvo después del error. Este rectángulo tiene un soporte distinto del corte de ±50 km.

Se revisaron las aplicaciones de [649 Héroes](https://jsantarelli.github.io/649/public/) y [Milla 201](https://milla201.com/), premiadas en 2025, y los [antecedentes oficiales](https://www.udesa.edu.ar/trabajos-premiados). La conclusión editorial es vincular pregunta, interacción y respuesta, con fuentes y límites accesibles. El antecedente de la hormiga argentina de 2024 se incorporó desde su ficha oficial; la lectura web de Shiny devolvió una pantalla de carga.

## Verificación

| Verificación | Resultado |
|---|---|
| Pruebas de datos y ciencia | 22 aprobadas: snapshot, exclusión reversible, geodesia, máscaras, UNC, comparación y derechos. |
| TypeScript, lint y build de producción | Aprobados. Verificación de publicación sin fotografías no autorizadas. |
| Navegador en 1440×900, 390×844, 768×1024 y 320×740 | 32 comprobaciones aprobadas; cero errores JavaScript, HTTP y solicitudes fallidas en la ejecución final. |
| Interacción adicional | 12 comprobaciones aprobadas: pregunta/respuesta, desplazamiento reversible, tres vistas, temas, PNG, período efectivo, mini mapa, pérdida de foco y un dedo en emulación táctil. |
| CONICET | 4 gestos 3D verificados, cero errores JavaScript; error del endpoint histórico registrado por separado. |

Los scripts y capturas están en `competition-evidence/final-2026-10-14` del workspace. La ejecución simultánea tuvo conexiones rechazadas por el servidor local; se conservó ese informe y la repetición en serie pasó las cuatro resoluciones. El reemplazo del servidor fue bloqueado por control automático y no se aplicó; las pruebas finales usaron el servidor existente. Ese incidente no mide rendimiento del alojamiento público.

Brave headless, contextos nuevos, DPR 1, red y CPU sin limitar. Mapa listo en 2,46–2,93 s; primer corte 31°S en 5,17–5,75 s; cambio a 35°S en 1,00–1,53 s en la ejecución final. Son mediciones locales; falta teléfono real y no permiten prometer tiempos universales.

## Estado de entrega

La QA inicial se ejecutó en `feat/competition-final-2026-10-13`, sobre la base `72fabf89e91eb935a67358a96fd59a43f08a9f87`. La URL pública consultada el 14/10 respondió 200 y conserva el título «Sismos Visuales»; `/metodologia/` devuelve 404. El usuario autorizó posteriormente commit, push y PR de esta versión. La integración y el despliegue de producción son pasos posteriores al PR.

Pendientes: revisión científica y autoral de Luis, teléfono real, integración, build remoto y URL comprobados, video de hasta un minuto, formulario y constancia de inscripción. Las bases descargadas el 14/10 mantienen SHA256 `3ba2a8c0c41e15d3e6e74c1d1ccea511f19cdd9bedaaba691acb2e266c910540`; el anexo A exige declarar asistencia de IA y supervisión humana.

## Verificación del handoff del 14/10

El bloque de fotografías de las cuatro fichas deja únicamente «Ver fotografías en INPRES ↗», por pedido del usuario. La comprobación en Brave del export final confirmó cuatro enlaces a sus galerías originales, cero imágenes en esos bloques y ausencia del texto de autor pendiente de verificación. La política y los metadatos de permisos se conservan.

Se construyó una copia del árbol preparado para commit sin el GeoJSON ignorado. `SISMOS_ALLOW_PINNED_DOWNLOAD=1` descargó exclusivamente la fuente fijada y regeneró los 80.470 registros con el checksum esperado. Con Node 24.11.1, el build estático y su postbuild pasaron; se generaron `/` y `/metodologia/` y se retiraron las 40 variantes bloqueadas del export. Las 22 pruebas pasaron en esa copia; lint y TypeScript pasaron sobre los mismos cambios de código.

Las dependencias instaladas se copiaron dentro de la carpeta de prueba; no se ejecutó `npm ci`. Los primeros intentos fallaron por el enlace temporal de dependencias de la prueba, primero fuera de la raíz de Turbopack y luego incluido bajo un nombre alternativo por TypeScript. El enlace se retiró de la carpeta, sin alterar el código del producto, y el build final pasó. Los logs se conservan en `competition-evidence/handoff-2026-10-14`. La documentación del contrato histórico se actualizó para reflejar las cuatro fichas ya integradas.
