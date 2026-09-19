# Perfil andino interactivo por latitud

Esta interacción extiende de forma controlada el método de la sección Cuyo 31°S. No permite dibujar una sección arbitraria: mantiene los extremos longitudinales en 73°O y 61°O, la franja de ±50 km, la trayectoria WGS84, el muestreo aproximado cada 5 km y la escala vertical 1×. El único parámetro móvil es la latitud, cuantizada cada 0,25° entre 45°S y 22°S.

El rango coincide con los dominios de los artefactos GEBCO científico y Slab2 cargados. Los huecos CLP/nodata siguen cortando la curva y la banda; no se extrapolan modelos. Los filtros activos del catálogo se aplican antes de seleccionar los hipocentros de la franja.

La posición inicial Cuyo 31°S conserva el contrato, los 24.689 eventos y el hash auditado de [CUYO_31S_PROFILE.md](CUYO_31S_PROFILE.md). Todas las demás latitudes se muestran explícitamente como **exploratorias**: reutilizan el cálculo validado, pero no cuentan todavía con un cotejo independiente de pertenencia. El acceso rápido Jujuy 23°S es una posición narrativa, no una nueva categoría tectónica ni una segunda sección científicamente validada.

La franja puede arrastrarse norte–sur en el mapa y tiene un `range` equivalente para teclado. Durante cada recálculo el gráfico anterior queda atenuado y rotulado como transitorio; sólo se actualizan el conteo, GEBCO, Slab2 y los eventos cuando termina la selección geodésica.
