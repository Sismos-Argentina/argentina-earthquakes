"use client";
import {useLayoutEffect, useState} from "react";
import type {CatalogFilterBounds, CatalogFilters} from "@/lib/filters/catalog";
import {initialFilterEditor, type FilterEditorState} from "@/lib/filters/editor";
import CatalogUpdateNote from "./CatalogUpdateNote";
const date = (v: string) => v.split("-").reverse().join("/");

export default function FiltersPanel({ filters, bounds, wide, onApply, initialState, onStateChange }: {
  filters: CatalogFilters; bounds: CatalogFilterBounds; wide: boolean; onApply: (v: CatalogFilters) => void;
  initialState: FilterEditorState | null; onStateChange: (state: FilterEditorState) => void;
}) {
  const [editor, setEditor] = useState(() => initialFilterEditor(filters, initialState));
  const {draft, tab} = editor;
  useLayoutEffect(() => onStateChange(editor), [editor, onStateChange]);
  const change = (values: Partial<CatalogFilters>) => setEditor(v => ({...v, draft: {...v.draft, ...values}}));
  const valid = draft.dateFrom >= bounds.dateFrom && draft.dateTo <= bounds.dateTo && draft.dateFrom <= draft.dateTo
    && [draft.magnitudeMin, draft.magnitudeMax, draft.depthMin, draft.depthMax].every(Number.isFinite)
    && draft.magnitudeMin >= bounds.magnitudeMin && draft.magnitudeMax <= bounds.magnitudeMax && draft.magnitudeMin <= draft.magnitudeMax
    && draft.depthMin >= bounds.depthMin && draft.depthMax <= bounds.depthMax && draft.depthMin <= draft.depthMax;
  const period = (days: number | null) => {
    const start = new Date(`${bounds.dateTo}T12:00:00Z`); if (days !== null) start.setUTCDate(start.getUTCDate() - days);
    change({ dateFrom: days === null ? bounds.dateFrom : [bounds.dateFrom, start.toISOString().slice(0, 10)].sort().at(-1)!, dateTo: bounds.dateTo });
  };
  return <form className="compactFilters" onSubmit={e => { e.preventDefault(); if (valid) onApply(draft); }}>
    {!wide ? <div className="controlTabs" role="tablist" aria-label="Qué querés filtrar">{[["date", "Fecha"], ["magnitude", "Magnitud"], ["depth", "Profundidad"]].map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} aria-controls={`filter-${id}`} id={`tab-${id}`} key={id} onClick={() => setEditor(v => ({...v, tab: id as FilterEditorState["tab"]}))}>{label}</button>)}</div> : null}
    <div className="filterSections">
      {wide || tab === "date" ? <section className="filterGroup panelStep" id="filter-date" aria-label="Fecha" role={wide ? "group" : "tabpanel"}>
        <h3>Fecha</h3><div className="quickPeriods">{[["Todo", null], ["30 días", 29], ["Un año", 364]].map(([label, days]) => <button type="button" key={label} onClick={() => period(days === null ? null : Number(days))}>{label}</button>)}</div>
        <div className="filterValues"><label>Desde<input type="date" required min={bounds.dateFrom} max={draft.dateTo} value={draft.dateFrom} onChange={e => change({ dateFrom: e.target.value })} /></label><label>Hasta<input type="date" required min={draft.dateFrom} max={bounds.dateTo} value={draft.dateTo} onChange={e => change({ dateTo: e.target.value })} /></label></div>
        <CatalogUpdateNote date={bounds.dateTo}/>
      </section> : null}
      {wide || tab === "magnitude" ? <section className="filterGroup panelStep" id="filter-magnitude" aria-label="Magnitud" role={wide ? "group" : "tabpanel"}>
        <h3>Magnitud reportada</h3><div className="filterValues"><label>Mínima<input type="number" required step="0.1" min={bounds.magnitudeMin} max={draft.magnitudeMax} value={draft.magnitudeMin} onChange={e => change({ magnitudeMin: Number(e.target.value) })} /></label><label>Máxima<input type="number" required step="0.1" min={draft.magnitudeMin} max={bounds.magnitudeMax} value={draft.magnitudeMax} onChange={e => change({ magnitudeMax: Number(e.target.value) })} /></label></div>
        <small>Valor publicado por INPRES. No equivale a daños ni a intensidad Mercalli.</small>
      </section> : null}
      {wide || tab === "depth" ? <section className="filterGroup panelStep" id="filter-depth" aria-label="Profundidad" role={wide ? "group" : "tabpanel"}>
        <h3>Profundidad · km</h3><div className="quickPeriods">{[["Todas", bounds.depthMin, bounds.depthMax], ["<70 km", 0, 69], ["70–299", 70, 299], ["≥300", 300, bounds.depthMax]].map(([label, min, max]) => <button type="button" key={label} onClick={() => change({ depthMin: Number(min), depthMax: Number(max) })}>{label}</button>)}</div>
        <div className="filterValues"><label>Desde · km<input type="number" required step="1" min={bounds.depthMin} max={draft.depthMax} value={draft.depthMin} onChange={e => change({ depthMin: Number(e.target.value) })} /></label><label>Hasta · km<input type="number" required step="1" min={draft.depthMin} max={bounds.depthMax} value={draft.depthMax} onChange={e => change({ depthMax: Number(e.target.value) })} /></label></div>
        <small>Desde la referencia superficial del catálogo, aumentando hacia abajo.</small>
      </section> : null}
    </div>
    <div className="filterApply"><p className="filterSummary">{date(draft.dateFrom)}–{date(draft.dateTo)} · M {draft.magnitudeMin}–{draft.magnitudeMax} · {draft.depthMin}–{draft.depthMax} km</p><div className="panelActions"><button type="button" onClick={() => setEditor(v => ({...v, draft: {...bounds}}))}>Restablecer</button><button className="primaryAction" disabled={!valid} type="submit">Ver resultados</button></div></div>
  </form>;
}
