"use client";

import guide from "@/data/flat-slab-guide.json";
import type { ProjectedEvent } from "@/lib/profile/cuyo";

export default function GuidedDiscovery({ index, events, status, sampleDescription }: {
  index: number; events: ProjectedEvent[]; status: string;
  sampleDescription: string;
}) {
  const stop = guide.stops[index];
  if (!stop) return null;
  return <aside className="guidedDiscovery" aria-label="Comparación San Juan y subducción subhorizontal" aria-live="polite">
    <p className="storyKicker">{index + 1} / {guide.stops.length} · COMPARAR 31°S Y 35°S</p>
    <h3>Leer y comparar las evidencias</h3>
    <details open className="guideEvidence"><summary>Observación · catálogo INPRES</summary><p>{stop.observation}</p></details>
    <details open className="guideEvidence"><summary>Modelo · geometría Slab2</summary><p>{stop.model}</p></details>
    <details open className="guideEvidence"><summary>Interpretación bibliográfica · sismos y volcanismo</summary><p>{stop.interpretation}</p>
      <p>{guide.sources.map((source, i) => <span key={source.id}>{i ? " · " : ""}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>)}</p>
      <p>La tomografía estudiada por Gao et al. es evidencia bibliográfica; esta obra no incorpora ese dataset ni localizaciones de volcanes. El gráfico por sí solo no demuestra el mecanismo.</p>
    </details>
    <p className="guidePrompt">{stop.prompt}</p>
    <p className="guideSample">{status ? "Recalculando muestra…" : `${events.length.toLocaleString("es-AR")} hipocentros habilitados en la franja`}
      <span>{sampleDescription}</span></p>
  </aside>;
}
