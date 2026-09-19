# Contrato reproducible de la sección Cuyo 31°S

Referencia científica: [auditoría A–M](AUDITORIA_CIENTIFICA_2026-09-17.md), especialmente E, G, I y M. Fecha de implementación: 17/09/2026.

- A = (longitud −73°, latitud −31°); B = (−61°, −31°). Trayectoria geodésica WGS84, A→B, longitud 1.145,493791 km; no es un paralelo.
- Cada hipocentro se proyecta al pie geodésico mínimo sobre la **prolongación** de A–B. Se admite `0 ≤ s ≤ L` y `c ≤ 50 km`. Una preselección de grados conservadora reduce trabajo, pero nunca decide la inclusión. Búsqueda áurea hasta intervalo de 0,5 m; no implica precisión hipocentral. `s` y `c` se calculan en WGS84, no en Three.js.
- Snapshot INPRES fijado: 80.470 eventos, commit proveedor `81e230c782972a2996a32f1ef21d56a2ef22e2e7`, artefacto SHA-256 `685b6564a42ee3bac5744ec7c195af2ba2936725ea3578483925dac5326c5a82`.
- Selección: 24.689 eventos; 2.797 con `0 ≤ d < 70`, 21.888 con `70 ≤ d < 300`, 4 con `d ≥ 300`; 2 superan los 350 km del encuadre inicial. Hash SHA-256 de IDs derivados ordenados y unidos por LF: `b62e470155f18521589201870b90886346786a254ccfa869dec79e95a9db1238`, cotejado contra el CSV de auditoría. Sin filtros de fecha/magnitud en esta sección.
- Muestras de la línea cada ≈5 km, incluyendo extremos. GEBCO científico 2026: grilla de **centros de celda**, interpolación bilineal de elevación en metros, `y = −h/1000` km. Slab2 SAM 02.23.18: grilla de **nodos**, interpolación bilineal DEP/UNC en km sólo con cuatro esquinas finitas dentro del CLP codificado en nodos. `null` corta curva y banda; no se extrapola ni rellena.
- DEP ± UNC es incertidumbre reportada por el modelo, no incertidumbre del catálogo ni intervalo del 95 %. Eventos proyectados desde ±50 km no se sitúan necesariamente sobre la línea de modelos. Datum vertical INPRES no confirmado: se muestran profundidades fuente y comparación **nominal**, sin corregir con GEBCO ni calcular distancia física a una placa.
- Perfil inicial 0–350 km con superficie sobre nivel del mar; botón de rango completo conserva los eventos más profundos. Un mismo factor de píxeles/km se aplica a ambos ejes y el canvas tiene dimensiones CSS explícitas sin estiramiento; el contenedor estrecho desplaza el gráfico en lugar de deformarlo. La vista de sección fuerza relieve 1× en la escena 3D.

El archivo [numérico de auditoría](AUDITORIA_CALCULOS_2026-09-17.json) conserva método, sensibilidad y hashes de modelos. Los tests comprueban endpoints, corredor, inversión, interpolación, máscara, clasificación, checksum y pertenencia exacta de IDs. La lectura sobre subducción exige las reservas del informe original.

La interfaz puede trasladar este método por latitud como exploración controlada. Esa extensión no convierte las otras latitudes en secciones validadas ni modifica este contrato: Cuyo 31°S conserva sus endpoints, conteos y hash exactos. El alcance y las reservas de la interacción se documentan en [INTERACTIVE_LATITUDE_PROFILE.md](INTERACTIVE_LATITUDE_PROFILE.md).
