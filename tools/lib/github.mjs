export async function github(path, { method = 'GET', body } = {}) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com/${path}`, {
    method, signal: AbortSignal.timeout(60_000),
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10',
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`GitHub ${method} ${path.split('?')[0]}: HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export async function downloadCatalog(repository, commit) {
  if (repository !== 'Sismos-Argentina/inpres-sismos' || !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Fuente no permitida');
  const response = await fetch(`https://raw.githubusercontent.com/${repository}/${commit}/data/exports/sismos.geojson`, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Descarga del catálogo: HTTP ${response.status}`);
  const reader = response.body.getReader(), chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.length;
      if (total > 96 * 1024 * 1024) throw new Error('El catálogo supera el límite de descarga');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}
