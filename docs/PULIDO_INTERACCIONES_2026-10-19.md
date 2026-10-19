# Seguimiento del visor — 19/10/2026

Rama: `fix/pulido-interacciones-visor`, creada desde `main` después del
merge de la PR #13 (`3debe77`). El usuario aprobó la revisión local y autorizó
su entrega mediante PR a `main`; el merge queda a su cargo.

## Cambios

- **Animaciones activadas al entrar.** Cámara permite desactivarlas para la
  sesión. La decisión responde al pedido explícito del usuario, incluso cuando
  el sistema indica movimiento reducido. El panel informa esa preferencia y
  ofrece el control. Al desactivar, termina el vuelo/revelado activo y las vistas
  siguientes son directas. No se guarda una preferencia permanente ni se ejecuta
  un benchmark que tome esa decisión por la persona.
- **Lista estable.** Se elimina el desplazamiento forzado al principio al abrir
  una ficha. Los resultados conservan su contenedor; la ficha ocupa un espacio
  propio al pie del panel, con scroll independiente. En móvil el panel se amplía
  y la ficha es compacta para dejar filas disponibles. Elegir desde la lista del
  corte tampoco vuelve a centrar el gráfico. La guía conserva ahora los scrolls
  del nuevo contenedor y de su inspector.
- **Ficha del corte en flujo normal en escritorio/tablet.** Desaparece al
  continuar bajando, como pidió el usuario. No pasa por encima del contexto,
  controles o minimapa. En móvil se mantiene la ficha inferior consultable.
- **Regla de profundidad más estable.** Se elimina el redondeo de su posición a
  una cuadrícula que cambiaba con la distancia de cámara; la traslación es
  continua. El intervalo de rótulos usa histéresis y su tamaño en pantalla se
  calcula con profundidad de cámara, evitando variación artificial fuera del
  centro. Los valores siguen en km y la escala vertical sigue siendo 1×.

Estos cambios ayudan a consultar hipocentros y su profundidad sin perder el
contexto ni confundirlo con los modelos. Son ajustes de interacción sobre datos
existentes; no requieren nuevas fuentes, inferencias o validación geológica.
No se modifican catálogos, CSV, GEBCO, Slab2, workflows ni el proveedor.

## Revisión posterior: pestañas del corte

El gráfico y sus registros ahora se alternan mediante **Gráfico / Lista de
sismos**, tanto en la comparación San Juan–Mendoza como en A–B. No se apilan
uno debajo del otro. La pestaña activa usa el estado de la colección que ya
guardaba la guía; los paneles permanecen montados para conservar la búsqueda,
las marcas, la página, el scroll de tabla y las descargas preparadas.

La ficha se alinea con el panel activo. En la lista de escritorio, todo el
bloque lateral puede acompañar el scroll como una sola unidad, limitada por el
contenedor, sin elementos sticky independientes que se superpongan. El contexto
de Slab2 y el minimapa se muestran en Gráfico; la lista conserva sus fuentes y
límites de catálogo. En móvil, la ficha inferior se presenta más compacta.

Se elimina el centrado del contenedor según el ancho calculado del canvas:
el espacio de trabajo ocupa el ancho disponible y el marco del gráfico arranca
alineado con el encabezado. El canvas sigue ajustándose a escala 1× sin estirar
un eje. En el A–B comprobado a 1599 px, el margen del marco pasó al mismo margen
de 18 px del encabezado; no queda una columna vacía a la izquierda.

Las pestañas tienen roles y asociaciones ARIA, foco visible, flechas, Home y
End. Una selección rectangular abre directamente sus resultados; **Seleccionar
en gráfico** devuelve al gráfico para cambiar el recuadro. Durante el recálculo
de un perfil no se muestran los resultados del perfil anterior con etiquetas
nuevas. El tutorial conserva su presentación independiente de las pestañas.

Comprobaciones de esta revisión: 74 pruebas aprobadas, lint y build; alternancia
con búsqueda y una marca conservadas, scroll de tabla a 475 px conservado,
teclado y retorno desde la guía al A–B en la lista, página 2 y el mismo evento.
Cambiar a Mendoza mantuvo la pestaña y ocultó los registros anteriores mientras
calculaba. En 320×568, 390×844, 768×1024 y 1920×1080 se verificaron pestañas y
ficha dentro del ancho disponible, sin desbordamiento horizontal y con la
profundidad visible. El gráfico del tutorial quedó completamente dentro de su
marco después de incorporar el contenedor de pestañas.

También se comprobó que un CSV preparado de una marca siguiera disponible al
alternar las vistas; dibujar un recuadro abrió directamente su lista y el gráfico
permitió elegir un punto al primer clic al regresar. Capturas y el JSON de QA se
guardaron fuera del repositorio en `audits/2026-10-19-pestanas-cortes/` del
workspace. La revisión local fue aprobada por el usuario antes de la entrega.

## Verificación

- 74 pruebas aprobadas, incluidas tres nuevas sobre intervalos de profundidad:
  oscilación alrededor del umbral, adaptación al zoom y proyección degenerada.
- Lint y build de producción con TypeScript aprobados.
- Escritorio/tablet: 1920, 1440, 1024 y 768 px. La ficha usa `position: static`
  y conserva 14 px de separación con el contexto; se probaron detalles abiertos
  y scroll largo. Sin desbordamiento horizontal en esos casos.
- Clics nativos sobre filas 3D: primera selección y selección sucesiva conservaron
  ambos scrolls. En una comprobación: exterior 105 px y tabla 664 px antes/después.
  Los clics de Playwright pueden desplazar elementos antes de pulsarlos; por eso
  se verificó también con entrada nativa, sin ese ajuste del automatizador.
- Sesión móvil nueva: animaciones activas con la preferencia del sistema en
  reducido; al desactivar, `cameraActive: false` y `reduced: true`. Una transición
  activada produjo 70 cuadros de diagnóstico. No es una promesa de FPS.

- Móvil: 320×568, 390×844 y 844×390 horizontal. Ficha dentro de la pantalla,
  magnitud/profundidad visibles y separación entre la ficha y los resultados.
  El panel ampliado deja libre la fila de controles móviles. Los datos largos
  de la ficha conservan su propio scroll.
- Entrada/salida de la guía desde la lista 3D: igualdad exacta de los valores
  capturados antes/después para cámara, movimiento, búsqueda «San Juan», página 2,
  una marca, evento seleccionado, detalles abiertos y los scrolls exterior,
  de tabla y del inspector (este último a 170 px). Se guardaron JSON y capturas
  como evidencia local fuera del repositorio.

La revisión móvil es emulada en Chromium; no se afirma validación en teléfono
físico o Safari. La regla sigue respondiendo a la perspectiva y al zoom reales:
estabilizar su presentación no implica fijarla como una escala plana.

## Limpieza de ramas

Se eliminaron siete ramas remotas ya integradas y cinco locales. La rama del
catálogo semanal se había integrado por squash; se verificaron su PR y la
igualdad de los artefactos con ese commit integrado. `main` local se adelantó
sin reescritura hasta `origin/main`.

Se preservaron cuatro ramas locales con trabajo sin commit: alternativas de
diseño, guía, planificación de actualización semanal y GEBCO móvil. No se
descartaron sus archivos ni se borraron worktrees. El worktree limpio del zoom
quedó en detached HEAD. La lista exacta de limpieza se guardó fuera del repositorio
en el registro de auditoría local de esta fecha.
