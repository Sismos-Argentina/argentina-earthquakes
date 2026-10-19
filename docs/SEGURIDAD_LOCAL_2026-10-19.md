# Revisión de seguridad local — 19/10/2026

Alcance: frontend y export estático de esta rama. No es una auditoría de cuentas,
historial completo de Git, configuración de GitHub/CDN ni una prueba de penetración
del dominio público. No se modificaron permisos ni fuentes científicas.

## Cambios y evidencia

- Next y eslint-config-next: 16.3.5 → 16.3.8. Actualizaciones transitivas de sharp
  a 0.35.5 y source-map-js a 1.2.2, conservando las restricciones del proyecto.
- `npm audit --omit=dev`: cero vulnerabilidades conocidas en esta ejecución.
  El audit completo conserva cinco entradas de severidad alta de una misma cadena:
  eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces.
  braces 3.0.3 sigue siendo la versión publicada más reciente consultada. No se
  aplicó el downgrade mayor de ESLint/Next sugerido por `--force`. Estos paquetes
  procesan patrones del lint local/CI y no forman parte del export estático.
- La aplicación usa texto React para búsquedas, lugares y fichas. La búsqueda de
  una cadena con `<img ... onerror=...>` dio cero resultados y cero imágenes
  inyectadas. El único `dangerouslySetInnerHTML` encontrado corresponde al script
  constante de arranque visual, sin interpolación de entradas del usuario.
- El CSV escapa comillas, comas y saltos de línea y neutraliza fórmulas en campos
  textuales; los números negativos conservan su valor. Hay pruebas de regresión.
- Se escanearon 42 archivos de texto del export por patrones de claves privadas,
  tokens GitHub/OpenAI y claves de acceso AWS: cero coincidencias. No se encontraron
  archivos `.env`, `.git`, `.pem`, `.key`, `.p12` ni `.pfx` en el export.
  Es una comprobación por patrones, no una garantía universal de ausencia de secretos.
- No se añadieron servicios, formularios remotos, telemetría ni credenciales. Los
  catálogos públicos siguen siendo descargables; eso es independiente de datos
  personales o secretos del propietario.

Los avisos de dependencias no demuestran por sí solos una explotación de la web.
Por ejemplo, el aviso de ImageResponse requiere ese procesamiento con entradas
controladas por un atacante; esta aplicación no incorpora una ruta next/og.

Referencias primarias:

- [Next ImageResponse](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j).
- [Servidor de desarrollo Next](https://github.com/advisories/GHSA-39w2-rjm5-chcv).
- [sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
- [braces, pendiente en herramientas de desarrollo](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Los JSON de npm audit y del escaneo están en la carpeta de auditoría local del
workspace, fuera del export público. Debe revisarse nuevamente la cadena de
desarrollo cuando se publique una corrección compatible.
