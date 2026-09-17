# Plan futuro: terremotos históricos

Estado: **idea de producto; no implementada**. No forma parte de la iteración Cuyo ni modifica el proveedor de datos ahora. Sólo podría entrar como SHOULD del concurso **después** de cerrar y verificar el núcleo científico principal; en caso contrario queda para postconcurso.

## Dos experiencias, dos contratos

- **Explorar el subsuelo:** catálogo instrumental/actual INPRES con hipocentros y profundidades, GEBCO, Slab2 y secciones. Mantener exploración libre como experiencia principal.
- **Terremotos históricos:** catálogo histórico separado con fecha, lugar, epicentro publicado cuando exista, intensidad Mercalli y relato de consecuencias. Una futura subpágina podría usar scrollytelling para responder «¿Cómo se vivieron los grandes terremotos de la historia argentina?». Ese formato narrativo no se impone al hub principal.

El tipo/schema histórico debe ser independiente de `InpresFeature` y de la lógica de profundidad. No rellenar profundidad, magnitud instrumental, precisión geográfica ni incertidumbres ausentes con valores inferidos. Intensidad Mercalli y magnitud no son intercambiables. Conservar texto y fuente originales, y distinguir dato publicado de interpretación editorial.

## Fuentes y trabajo futuro del proveedor

El scraping, si se aprueba más adelante, corresponde a **`inpres-sismos` en una tarea/commit independiente**, no a este frontend:

1. Extraer y versionar el catálogo de [terremotos históricos de INPRES](http://contenidos.inpres.gob.ar/sismologia/historicos), que incluye descripciones y coordenadas para entradas desde 1692.
2. Investigar la página de [fotografías de terremotos de INPRES](http://contenidos.inpres.gob.ar/alumnos/fotos_terre). Crear una relación foto–evento sólo cuando fecha y lugar sean compatibles y la atribución pueda verificarse; conservar casos dudosos sin asignación automática.
3. Guardar URL de origen, fecha de extracción, identificador propio del export, campos faltantes, crédito/autor, licencia o permiso de reutilización y evidencia de cada emparejamiento. No asumir que una foto de daños generales retrata un evento específico.
4. Publicar exports separados para catálogo histórico y fotografías/enlaces; este producto los consumiría sólo en una futura subpágina, sin alterar el export instrumental.

La ficha del [archivo SEGEMAR](https://archivointemin.segemar.gov.ar/handle/308849217/5080?show=full) describe fotografías vinculadas al sitio de INPRES y atribuye, por ejemplo, imágenes de Mendoza 1861 al Archivo General de la Nación. Esto exige revisión de derechos y créditos por imagen antes de publicarlas. Las páginas directas de INPRES no respondieron durante esta planificación; su HTML, estabilidad y permisos deberán verificarse cuando se abra la tarea de scraping.

## Puerta de entrada al concurso

No iniciar esta línea mientras Cuyo, filtros esenciales, accesibilidad, mobile simplificado, metodología y deploy estén incompletos. Si hay capacidad real después, aprobar primero un alcance histórico pequeño y curado; no prometer toda la cronología ni una galería masiva. Si no, mantener la subpágina narrativa como postconcurso.
