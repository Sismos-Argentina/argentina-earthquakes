import { readFile, writeFile, mkdir } from 'node:fs/promises';
import auditSnapshot from '../fixtures/inpres-audit-2026-10-14.json' with { type: 'json' };
import { decodeProvider, sha256 } from '../../tools/lib/catalog-refresh.mjs';
import { downloadCatalog } from '../../tools/lib/github.mjs';
export { auditSnapshot };
let cached;
export function auditCatalogBytes() {
  return cached ??= (async () => {
    const root = new URL('../../', import.meta.url), cache = new URL('.local-data/inpres-audit-2026-10-14.geojson', root);
    for (const file of [new URL('public' + auditSnapshot.url, root), cache]) {
      try { const bytes = await readFile(file); if (sha256(bytes) === auditSnapshot.webSha256) return bytes; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (process.env.SISMOS_ALLOW_PINNED_DOWNLOAD !== '1') throw new Error('Falta la fixture auditada; habilitar la descarga fijada con SISMOS_ALLOW_PINNED_DOWNLOAD=1');
    const bytes = Buffer.from(decodeProvider(await downloadCatalog('Sismos-Argentina/inpres-sismos', auditSnapshot.sourceCommit)).webText);
    if (sha256(bytes) !== auditSnapshot.webSha256) throw new Error('La fixture auditada cambió');
    await mkdir(new URL('.local-data/', root), { recursive: true }); await writeFile(cache, bytes); return bytes;
  })();
}
