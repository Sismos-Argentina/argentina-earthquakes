# Herramientas de datos

Este directorio alojará herramientas reproducibles de descarga, validación y preparación de artefactos web.

No contiene scraping de INPRES. Ese proceso pertenece a `inpres-sismos`.

Reglas para herramientas futuras:

- recibir paths mediante argumentos o una variable específica como `SISMOS_DATA_DIR`;
- no depender de rutas absolutas personales;
- no modificar archivos raw;
- validar checksum y esquema antes de procesar;
- registrar parámetros, versión de entrada, filas/celdas descartadas y precisión perdida;
- escribir sólo en un directorio de salida explícito;
- no introducir formato binario, procesamiento de Slab2 o GEBCO hasta que la etapa correspondiente sea aprobada.
