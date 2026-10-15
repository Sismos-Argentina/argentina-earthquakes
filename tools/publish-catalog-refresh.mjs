import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertGeneratedChanges, sha256 } from './lib/catalog-refresh.mjs';
import { github } from './lib/github.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim();
const load = async file => JSON.parse(await readFile(new URL(file, new URL('../', import.meta.url)), 'utf8'));
const repository = 'Sismos-Argentina/argentina-earthquakes';
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== repository
  || !['schedule', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)
  || process.env.GITHUB_REF !== 'refs/heads/main'
  || process.env.GITHUB_WORKFLOW_REF !== `${repository}/.github/workflows/catalog-weekly.yml@refs/heads/main`) throw new Error('La publicación sólo se ejecuta desde el workflow confiable de main');
if (process.env.CATALOG_VALIDATED !== 'true') throw new Error('Faltan tests, lint y build del workflow');
if (git('remote', 'get-url', 'origin') !== `https://github.com/${repository}` && git('remote', 'get-url', 'origin') !== `https://github.com/${repository}.git`) throw new Error('Remoto de publicación inesperado');
if (git('diff', '--cached', '--name-only')) throw new Error('El índice ya contiene cambios ajenos a esta publicación');
const report = await load('.local-data/catalog-refresh-report.json');
if (!report.changed || !report.automatic || report.error) throw new Error('El reporte no autoriza una actualización automática');
const files = await load('.local-data/catalog-refresh-plan.json');
assertGeneratedChanges(Object.keys(files));
for (const [file, contents] of Object.entries(files)) if (await readFile(new URL(file, new URL('../', import.meta.url)), 'utf8') !== contents) throw new Error(`El archivo ${file} difiere del plan validado`);
const changed = git('diff', '--name-only').split('\n').filter(Boolean);
const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
assertGeneratedChanges([...changed, ...untracked]);
if (!isDeepStrictEqual([...new Set([...changed, ...untracked])].sort(), Object.keys(files).sort())) throw new Error('El conjunto de archivos cambió después de validar');
const base = git('rev-parse', 'HEAD'), branch = `data/catalog-weekly-${report.sourceCommit.slice(0, 16)}`;
const current = await github(`repos/${repository}/git/ref/heads/main`);
if (current.object.sha !== base) throw new Error('main avanzó durante la validación; repetir la actualización');
if (git('ls-remote', '--heads', 'origin', branch)) throw new Error('Ya existe una actualización para este export; revisar su PR sin sobrescribirla');
git('switch', '-c', branch);
git('config', 'user.name', 'github-actions[bot]');
git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
git('add', '--', ...Object.keys(files)); git('diff', '--cached', '--check');
if (!isDeepStrictEqual(git('diff', '--cached', '--name-only').split('\n').sort(), Object.keys(files).sort())) throw new Error('El índice incluye cambios no previstos');
for (const [file, contents] of Object.entries(files)) if (sha256(git('show', `:${file}`) + '\n') !== sha256(contents)) throw new Error('El índice no coincide con el plan');
git('commit', '-m', `data: actualizar catálogo al ${report.date}`);
const head = git('rev-parse', 'HEAD'); git('push', 'origin', `HEAD:refs/heads/${branch}`);
const run = `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const pr = await github(`repos/${repository}/pulls`, { method: 'POST', body: {
  base: 'main', head: branch, title: `data: catálogo INPRES al ${report.date} · ${report.addedIds.length} altas`,
  body: `Actualización semanal generada y validada por el workflow de main.\n\n- ${report.events} eventos; ${report.addedIds.length} altas, 0 bajas y 0 registros anteriores modificados.\n- Fuente inmutable: \`${report.sourceCommit}\`; GeoJSON SHA-256: \`${report.webSha256}\`.\n- Política de calidad, código y modelos conservados. Sólo metadata y derivados permitidos.\n- Tests, lint y build aprobados: [ejecución](${run}).\n- [Ejecución del proveedor](${report.providerRun}).\n\nLa integración automática verifica nuevamente archivos, base y commit exacto.`,
} });
await writeFile(new URL('.local-data/catalog-refresh-pr.json', new URL('../', import.meta.url)), JSON.stringify({ url: pr.html_url, number: pr.number, head }, null, 2));
console.log(`PR de datos: ${pr.html_url}`);
const remoteFiles = await github(`repos/${repository}/pulls/${pr.number}/files?per_page=100`);
assertGeneratedChanges(remoteFiles.map(file => file.filename));
if (!isDeepStrictEqual(remoteFiles.map(file => file.filename).sort(), Object.keys(files).sort()) || remoteFiles.some(file => !['modified', 'added'].includes(file.status))) throw new Error('La PR contiene cambios ajenos al plan');
await github(`repos/${repository}/statuses/${head}`, { method: 'POST', body: { state: 'success', context: 'catalog-update/validated',
  description: 'Datos append-only, archivos permitidos, tests, lint y build aprobados', target_url: run } });
let latestPr = await github(`repos/${repository}/pulls/${pr.number}`);
for (let attempt = 0; latestPr.mergeable === null && attempt < 5; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  latestPr = await github(`repos/${repository}/pulls/${pr.number}`);
}
const latestBase = await github(`repos/${repository}/git/ref/heads/main`);
if (latestBase.object.sha !== base || latestPr.head.sha !== head || latestPr.base.ref !== 'main' || latestPr.user.login !== 'github-actions[bot]') throw new Error('La PR o main cambió; se conserva para revisión');
if (!latestPr.mergeable) throw new Error('La PR no está lista para integrar; se conserva para revisión');
// API normal: no se usa bypass de protecciones ni aprobación administrativa.
const merged = await github(`repos/${repository}/pulls/${pr.number}/merge`, { method: 'PUT', body: { sha: head, merge_method: 'squash',
  commit_title: `data: actualizar catálogo al ${report.date}` } });
if (!merged.merged) throw new Error('GitHub no permitió integrar; la PR queda pendiente');
console.log(`Integración de datos confirmada: ${merged.sha}. Netlify debe construir la nueva versión.`);
