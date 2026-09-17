# Hoja de ruta — entrega hasta el 15 de octubre de 2026

Documento operativo. El alcance vinculante es `../docs/MVP_SCOPE.md`; este calendario no convierte funciones SHOULD en compromisos. El estado inicial aquí descrito era del 16 de septiembre. Al 17 de septiembre ya funcionan catálogo, GEBCO, cartografía, Slab2 y sección Cuyo; el deploy sigue pendiente.

## 16–22 de septiembre: datos reales y vertical slice

- Fijar snapshot INPRES y checksum sin modificar `inpres-sismos`.
- Cargar el GeoJSON completo, renderizar `THREE.Points`, navegar, seleccionar e inspeccionar.
- Medir descarga, parseo, memoria, primer render, fluidez y picking según `../docs/BENCHMARK_PLAN.md`.
- Puerta: recorrido datos reales → visualización → selección → inspector funcionando. Si falla, resolver el primer cuello de botella antes de nuevas capas.

## 23–29 de septiembre: interacción y contexto

- Filtros de fecha, magnitud y profundidad; unidades y exageración vertical inequívocas.
- Contexto territorial validado, incluida representación de Tierra del Fuego, Malvinas e Islas del Atlántico Sur.
- Manejo de carga/error y primera pasada mobile simplificada.
- Puerta: núcleo publicable utilizable y fuente cartográfica identificada. No atribuir oficialidad sin procedencia.

## 30 de septiembre–5 de octubre: comparación científica mínima

- Preparar un recorte liviano de GEBCO y la geometría válida de Slab2 mediante herramientas reproducibles.
- Validar unidades, dominio, máscara, referencias y una sección predefinida antes de integrarlos.
- Puerta del 5 de octubre: incorporar sólo lo que esté científicamente verificado y sea legible. Lo no validado se pospone y se declara; nunca se sustituye por geometría inventada.

## 6–9 de octubre: producto

Pulir desktop, accesibilidad, mobile, atribuciones y rendimiento del flujo principal. Segunda sección, transiciones y vistas adicionales sólo si el núcleo está cerrado.

La [experiencia histórica separada](../docs/HISTORICAL_EARTHQUAKES_PLAN.md) es SHOULD únicamente si el núcleo principal está terminado; no desplaza filtros, validación ni deploy. El scraping propuesto pertenece a un trabajo futuro e independiente en `inpres-sismos`.

## 10–15 de octubre: congelamiento y entrega

Sin nuevas funcionalidades salvo corrección de bloqueantes. Ejecutar build estático reproducible, pruebas en hardware/navegadores disponibles, revisión científica de textos y visuales, créditos, metodología y deploy. Conservar una versión publicable aunque alguna capa condicional no supere su puerta.

## Después del concurso

Sección arbitraria, clasificación tectónica automática, clustering, paridad mobile completa, arquitectura avanzada y búsqueda de metadata individual adicional de INPRES.
