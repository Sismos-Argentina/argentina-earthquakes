import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { decodeProvider, validateCatalog, compareCatalogs, sha256, jsonText } from './lib/catalog-refresh.mjs';
import { createRefreshPlan } from './lib/refresh-plan.mjs';
import { downloadCatalog, github } from './lib/github.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const policy = await load('src/data/catalog-update-policy.json');
const snapshot = await load('src/data/catalog-snapshot.json');
const reportFile = path.join(root, '.local-data/catalog-refresh-report.json');
const write = process.argv.includes('--write');
if (process.argv.slice(2).some(arg => !['--write', '--check'].includes(arg))) throw new Error('Usar --check o --write');
await mkdir(path.dirname(reportFile), { recursive: true });
const now = new Date(), today = new Intl.DateTimeFormat('en-CA', { timeZone: policy.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

async function refresh() {
  const commits = await github(`repos/${policy.provider}/commits?path=data/exports/sismos.geojson&per_page=1`);
  if (!commits[0]?.sha) throw new Error('El proveedor no publicó un export');
  const source = await github(`repos/${policy.provider}/commits/${commits[0].sha}`);
  const publishedAt = source.commit.committer.date, age = now.getTime() - Date.parse(publishedAt);
  if (!Number.isFinite(age) || age < -300_000 || age > policy.maximumSourceAgeDays * 86400_000) throw new Error('El export del proveedor no es reciente');
  const runs = await github(`repos/${policy.provider}/actions/workflows/${policy.workflow}/runs?status=success&per_page=20`);
  // El scraper empieza sobre el padre y publica el commit de export durante esa ejecución.
  const run = runs.workflow_runs.find(run => source.parents.some(parent => parent.sha === run.head_sha)
    && run.conclusion === 'success' && Date.parse(run.created_at) <= Date.parse(publishedAt) && Date.parse(run.updated_at) >= Date.parse(publishedAt));
  if (!run) throw new Error('El commit del export no está respaldado por una ejecución exitosa del proveedor');
  const raw = await downloadCatalog(policy.provider, source.sha), decoded = decodeProvider(raw);
  const stats = validateCatalog(decoded.catalog, today);
  let previousBytes;
  try { previousBytes = await readFile(path.join(root, 'public', snapshot.url)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; previousBytes = Buffer.from(decodeProvider(await downloadCatalog(policy.provider, snapshot.sourceCommit)).webText); }
  if (sha256(previousBytes) !== snapshot.webSha256) throw new Error('La copia anterior no coincide con el snapshot fijado');
  const previous = JSON.parse(previousBytes), previousStats = validateCatalog(previous, today);
  if (previousStats.events !== snapshot.events || previousStats.date !== snapshot.date || previousStats.startDate !== snapshot.startDate) throw new Error('Metadata anterior inconsistente');
  const comparison = compareCatalogs(previous, decoded.catalog, policy.maximumAddedEvents);
  const report = { schemaVersion: 1, sourceCommit: source.sha, publishedAt, providerRun: run.html_url,
    previousCommit: snapshot.sourceCommit, previousWebSha256: snapshot.webSha256,
    ...stats, ...comparison, changed: comparison.addedIds.length > 0 || comparison.changedIds.length > 0 || comparison.removedIds.length > 0,
    sourceSha256: sha256(raw), webSha256: sha256(decoded.webText), invalidLocations: decoded.invalidLocations };
  await writeFile(reportFile, jsonText(report));
  if (!comparison.automatic) throw new Error(`Requiere revisión: ${comparison.reviewReasons.join('; ')}`);
  if (!report.changed) { console.log('Sin sismos nuevos; no se crea commit, PR ni deploy.'); return; }
  const { files, nextSnapshot } = createRefreshPlan({ snapshot, catalog: decoded.catalog, report,
    quality: await load('src/data/catalog-quality.json'), guide: await load('src/data/flat-slab-guide.json'),
    presets: await load('src/data/competition-presets.json'), manifest: await readFile(path.join(root, 'manifests/checksums.sha256'), 'utf8') });
  // Este plan permite verificar el índice byte por byte antes de publicar.
  await writeFile(path.join(root, '.local-data/catalog-refresh-plan.json'), jsonText(files));
  if (write) {
    await writeFile(path.join(root, 'public', nextSnapshot.url), decoded.webText);
    for (const [file, contents] of Object.entries(files)) await writeFile(path.join(root, file), contents);
    console.log(`Snapshot preparado: ${stats.events} eventos, ${comparison.addedIds.length} altas. Falta validar y publicar.`);
  } else console.log(`Plan válido: ${comparison.addedIds.length} altas; no se modificaron archivos del producto.`);
}
try { await refresh(); }
catch (error) {
  let report = {};
  try { report = JSON.parse(await readFile(reportFile, 'utf8')); } catch { /* primera ejecución */ }
  await writeFile(reportFile, jsonText({ ...report, automatic: false, error: error.message }));
  throw error;
}
