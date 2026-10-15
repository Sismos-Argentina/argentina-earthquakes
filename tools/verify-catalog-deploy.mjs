import { readFile } from 'node:fs/promises';
import { sha256 } from './lib/catalog-refresh.mjs';
const root = new URL('../', import.meta.url);
const snapshot = JSON.parse(await readFile(new URL('src/data/catalog-snapshot.json', root), 'utf8'));
const policy = JSON.parse(await readFile(new URL('src/data/catalog-update-policy.json', root), 'utf8'));
const wait = process.argv.includes('--wait'), attempts = wait ? 40 : 1;
if (policy.siteUrl !== 'https://bajonuestrospies.online' || !/^\/data\/generated\/inpres-[a-z0-9-]+\.geojson$/.test(snapshot.url)) throw new Error('URL de publicación no permitida');
let lastError;
for (let attempt = 0; attempt < attempts; attempt++) {
  try {
    const response = await fetch(`${policy.siteUrl}/metodologia/?catalog=${snapshot.webSha256}`, { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
    if (!response.ok || !(await response.text()).includes(snapshot.webSha256)) throw new Error('El sitio todavía no muestra la identidad esperada');
    const catalog = await fetch(`${policy.siteUrl}${snapshot.url}`, { cache: 'no-store', signal: AbortSignal.timeout(120_000) });
    if (!catalog.ok) throw new Error(`Artefacto público: HTTP ${catalog.status}`);
    const bytes = Buffer.from(await catalog.arrayBuffer());
    if (sha256(bytes) !== snapshot.webSha256) throw new Error('El hash del catálogo publicado no coincide');
    console.log(`Publicación verificada: ${snapshot.events} eventos, ${snapshot.date}; SHA-256 correcto.`);
    process.exit(0);
  } catch (error) { lastError = error; }
  if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 15_000));
}
throw new Error(`No se pudo confirmar la publicación: ${lastError.message}. Revisar Netlify; no se afirma éxito de deploy.`);
