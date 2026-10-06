"use client";

import presets from "@/data/competition-presets.json";
import type { ProjectedEvent } from "@/lib/profile/cuyo";

export default function GuidedDiscovery({ index, events, status, onChange }: {
  index: number; events: ProjectedEvent[]; status: string; onChange: (index: number | null) => void;
}) {
  const stop = presets.stops[index];
  const depths = events.map((e) => e.feature.properties.profundidad).sort((a,b) => a-b);
  const middle = Math.floor(depths.length / 2);
  const median = depths.length ? (depths.length % 2 ? depths[middle] : (depths[middle-1] + depths[middle])/2) : null;
  if (!stop) return null;
  return <aside className="guidedDiscovery" aria-label="Recorrido guiado" aria-live="polite">
    <p className="storyKicker">{index + 1} / {presets.stops.length} · OBSERVACIÓN INPRES</p>
    <h3>{stop.title}</h3><p>{stop.observation}</p><p className="guidePrompt">{stop.prompt}</p>
    <p className="guideSample">{status ? "Recalculando muestra…" : `${events.length.toLocaleString("es-AR")} eventos · mediana ${median ?? "—"} km`}
      <span>Mapa 14/09/2026 · franja ±50 km · sin filtros durante el recorrido.</span></p>
    <details><summary>Evidencia y límites del recorrido</summary><p>Candidato EDA: {stop.eda.n.toLocaleString("es-AR")} eventos, mediana {stop.eda.medianKm} km; snapshot 18/09/2026, proyección azimutal equidistante. La muestra visible se recalcula con el snapshot 14/09 y distancia a geodésica WGS84; por eso los conteos pueden diferir.</p><p>Interpretación editorial: la profundidad cambia entre franjas. La cobertura y completitud varían por región; estos conteos no miden riesgo ni prueban causas tectónicas. Slab2 es un modelo secundario y no constituye validación independiente del catálogo.</p></details>
    <nav aria-label="Paradas del recorrido"><button disabled={index === 0 || Boolean(status)} onClick={() => onChange(index - 1)}>← Anterior</button>
      <button disabled={Boolean(status)} onClick={() => onChange(index + 1 < presets.stops.length ? index + 1 : null)}>{index + 1 === presets.stops.length ? "Explorá por tu cuenta →" : "Siguiente parada →"}</button>
      {index + 1 < presets.stops.length ? <button className="guideExit" onClick={() => onChange(null)}>Abandonar recorrido</button> : null}</nav>
  </aside>;
}
