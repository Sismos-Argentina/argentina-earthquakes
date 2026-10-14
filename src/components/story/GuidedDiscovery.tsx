"use client";

import guide from "@/data/flat-slab-guide.json";
import type { ProjectedEvent } from "@/lib/profile/cuyo";

export default function GuidedDiscovery({ index, events, status, sampleDescription, onChange }: {
  index: number; events: ProjectedEvent[]; status: string; onChange: (index: number | null) => void;
  sampleDescription: string;
}) {
  const stop = guide.stops[index];
  if (!stop) return null;
  return <aside className="guidedDiscovery" aria-label="Comparación San Juan y subducción subhorizontal" aria-live="polite">
    <p className="storyKicker">{index + 1} / {guide.stops.length} · COMPARAR 31°S Y 35°S</p>
    <h3>{stop.title}</h3><p className="guideQuestion">{guide.question}</p>
    <details open className="guideEvidence"><summary>Observación · catálogo INPRES</summary><p>{stop.observation}</p></details>
    <details open className="guideEvidence"><summary>Modelo · geometría Slab2</summary><p>{stop.model}</p></details>
    <details open className="guideEvidence"><summary>Interpretación bibliográfica · sismos y volcanismo</summary><p>{stop.interpretation}</p>
      <p>{guide.sources.map((source, i) => <span key={source.id}>{i ? " · " : ""}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>)}</p>
      <p>La tomografía estudiada por Gao et al. es evidencia bibliográfica; esta obra no incorpora ese dataset ni localizaciones de volcanes. El gráfico por sí solo no demuestra el mecanismo.</p>
    </details>
    <p className="guidePrompt">{stop.prompt}</p>
    <p className="guideSample">{status ? "Recalculando muestra…" : `${events.length.toLocaleString("es-AR")} hipocentros habilitados en la franja`}
      <span>{sampleDescription}</span></p>
    <nav aria-label="Paradas de la comparación"><button disabled={index === 0 || Boolean(status)} onClick={() => onChange(index - 1)}>← Volver a 31°S</button>
      <button disabled={Boolean(status)} onClick={() => onChange(index + 1 < guide.stops.length ? index + 1 : null)}>{index + 1 === guide.stops.length ? "Explorar el mapa →" : "Comparar con 35°S →"}</button>
      {index + 1 < guide.stops.length ? <button className="guideExit" onClick={() => onChange(null)}>Volver al mapa</button> : null}</nav>
  </aside>;
}
