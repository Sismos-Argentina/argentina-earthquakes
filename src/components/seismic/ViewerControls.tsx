"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CatalogFilterBounds, CatalogFilters } from "@/lib/filters/catalog";
import type { EventColorMode } from "@/lib/geo/event-colors";
import snapshot from "@/data/catalog-snapshot.json";
import ColorLegend from "./ColorLegend";

export type ControlPanel = "filters" | "layers" | "information" | "navigation" | "camera";
type Mode = "turntable" | "orbital" | "pan" | "zoom";
type Actions = {
  showPlan: (v: boolean) => void; chooseArea: (v: "region" | "profile") => void; resetCamera: () => void;
  setRelief: (v: 1 | 5 | 10) => void; toggleSlab: () => void; setSlabOpacity: (v: number) => void;
  setNavigationMode: (v: Mode) => void; setCameraView: (v: "above" | "side" | "territory") => void;
};
type Props = {
  count: number; visible: number; status: string; filters: CatalogFilters | null; bounds: CatalogFilterBounds | null;
  onFilters: (v: CatalogFilters) => void; panel: ControlPanel | null; onPanel: (v: ControlPanel | null) => void;
  actions: Actions | null; map2d: boolean; ready: boolean; navigationMode: Mode; relief: 1 | 5 | 10;
  slabVisible: boolean; slabOpacity: number; colorMode: EventColorMode; onColorMode: (v: EventColorMode) => void;
  terrainOpacity: number; onTerrainOpacity: (v: number) => void; onGuide?: () => void; onLeaveGuide: () => void;
  surfaceReady: boolean; slabAvailable: boolean; analysisReady: boolean;
};
const date = (v: string) => v.split("-").reverse().join("/");
const wideQuery = "(min-width: 1150px) and (min-height: 720px)";
const subscribeWide = (notify: () => void) => { const query = window.matchMedia(wideQuery); query.addEventListener("change", notify); return () => query.removeEventListener("change", notify); };
const readWide = () => window.matchMedia(wideQuery).matches;
const subscribeShort = (notify: () => void) => { const query = window.matchMedia("(max-height: 650px)"); query.addEventListener("change", notify); return () => query.removeEventListener("change", notify); };
const readShort = () => window.matchMedia("(max-height: 650px)").matches;
const subscribeNavigation = (notify: () => void) => { const queries = [1100, 1600].map(width => window.matchMedia(`(min-width: ${width}px)`)); queries.forEach(q => q.addEventListener("change", notify)); return () => queries.forEach(q => q.removeEventListener("change", notify)); };
const readNavigation = () => window.matchMedia("(min-width: 1600px)").matches ? 2 : window.matchMedia("(min-width: 1100px)").matches ? 1 : 0;
function restoreTrigger(target: HTMLElement | null, tray: HTMLElement | null) {
  if (target?.getClientRects().length && !target.closest("[inert]")) target.focus();
  else {
    const root = tray?.closest(".viewer"), overflow = root?.querySelector<HTMLElement>(".exploreToggle");
    const fallback = overflow?.getClientRects().length ? overflow : root?.querySelector<HTMLElement>("button[aria-controls='catalog-filters']");
    fallback?.focus();
  }
}

function FiltersPanel({ filters, bounds, wide, onApply }: { filters: CatalogFilters; bounds: CatalogFilterBounds; wide: boolean; onApply: (v: CatalogFilters) => void }) {
  const [draft, setDraft] = useState({ ...filters });
  const [tab, setTab] = useState("date");
  const change = (values: Partial<CatalogFilters>) => setDraft(v => ({ ...v, ...values }));
  const valid = draft.dateFrom >= bounds.dateFrom && draft.dateTo <= bounds.dateTo && draft.dateFrom <= draft.dateTo
    && [draft.magnitudeMin, draft.magnitudeMax, draft.depthMin, draft.depthMax].every(Number.isFinite)
    && draft.magnitudeMin >= bounds.magnitudeMin && draft.magnitudeMax <= bounds.magnitudeMax && draft.magnitudeMin <= draft.magnitudeMax
    && draft.depthMin >= bounds.depthMin && draft.depthMax <= bounds.depthMax && draft.depthMin <= draft.depthMax;
  const period = (days: number | null) => {
    const start = new Date(`${bounds.dateTo}T12:00:00Z`); if (days !== null) start.setUTCDate(start.getUTCDate() - days);
    change({ dateFrom: days === null ? bounds.dateFrom : [bounds.dateFrom, start.toISOString().slice(0, 10)].sort().at(-1)!, dateTo: bounds.dateTo });
  };
  return <form className="compactFilters" onSubmit={e => { e.preventDefault(); if (valid) onApply(draft); }}>
    {!wide ? <div className="controlTabs" role="tablist" aria-label="Qué querés filtrar">{[["date", "Fecha"], ["magnitude", "Magnitud"], ["depth", "Profundidad"]].map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} aria-controls={`filter-${id}`} id={`tab-${id}`} key={id} onClick={() => setTab(id)}>{label}</button>)}</div> : null}
    <div className="filterSections">
      {wide || tab === "date" ? <section className="filterGroup panelStep" id="filter-date" aria-label="Fecha" role={wide ? "group" : "tabpanel"}>
        <h3>Fecha</h3><div className="quickPeriods">{[["Todo", null], ["30 días", 29], ["Un año", 364]].map(([label, days]) => <button type="button" key={label} onClick={() => period(days === null ? null : Number(days))}>{label}</button>)}</div>
        <div className="filterValues"><label>Desde<input type="date" required min={bounds.dateFrom} max={draft.dateTo} value={draft.dateFrom} onChange={e => change({ dateFrom: e.target.value })} /></label><label>Hasta<input type="date" required min={draft.dateFrom} max={bounds.dateTo} value={draft.dateTo} onChange={e => change({ dateTo: e.target.value })} /></label></div>
        <small>Catálogo guardado hasta {date(bounds.dateTo)}; no es información en vivo.</small>
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
    <div className="filterApply"><p className="filterSummary">{date(draft.dateFrom)}–{date(draft.dateTo)} · M {draft.magnitudeMin}–{draft.magnitudeMax} · {draft.depthMin}–{draft.depthMax} km</p><div className="panelActions"><button type="button" onClick={() => setDraft({ ...bounds })}>Restablecer</button><button className="primaryAction" disabled={!valid} type="submit">Ver resultados</button></div></div>
  </form>;
}

export default function ViewerControls(p: Props) {
  const [sideView, setSideView] = useState(false);
  const [informationTab, setInformationTab] = useState("about");
  const [layerTab, setLayerTab] = useState("terrain");
  const [shownPopover, setShownPopover] = useState<ControlPanel>("layers");
  const popoverOpen = p.panel === "layers" || p.panel === "camera" || p.panel === "information";
  if (popoverOpen && p.panel !== shownPopover) setShownPopover(p.panel!);
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false);
  const short = useSyncExternalStore(subscribeShort, readShort, () => false);
  const navigationLayout = useSyncExternalStore(subscribeNavigation, readNavigation, () => 0);
  const filterTray = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const closePanel = () => { p.onPanel(null); restoreTrigger(trigger.current, filterTray.current); };
  const toggle = (panel: ControlPanel, element: HTMLElement) => { trigger.current = element; p.onPanel(p.panel === panel ? null : panel); };
  const run = (fn: () => void) => { p.onPanel(null); fn(); };
  const { panel: activePanel, onPanel } = p;
  useEffect(() => {
    const tray = filterTray.current; if (!tray) return;
    const observer = new ResizeObserver(() => tray.closest<HTMLElement>(".viewer")?.style.setProperty("--filter-tray-height", `${tray.offsetHeight}px`));
    observer.observe(tray); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!activePanel) return;
    const selector = activePanel === "filters" ? "#catalog-filters" : activePanel === "navigation" ? "#exploration-menu" : "#viewer-popover";
    const root = filterTray.current?.closest(".viewer");
    const container = root?.querySelector<HTMLElement>(selector);
    const focusFrame = requestAnimationFrame(() => {
      if (activePanel === "navigation") {
        const menu = window.matchMedia("(min-width: 1100px)").matches ? container?.querySelector(".exploreSecondary") : container;
        menu?.querySelector<HTMLElement>("button,a")?.focus();
      } else container?.focus();
    });
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest(selector) && !event.target.closest("button[aria-controls]")) onPanel(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onPanel(null); restoreTrigger(trigger.current, filterTray.current); }
      if (event.key === "Tab" && (short || activePanel === "filters") && activePanel !== "camera" && activePanel !== "navigation" && container) {
        const items = [...container.querySelectorAll<HTMLElement>("button:not(:disabled),input,select,a[href]")].filter(e => e.getClientRects().length);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const focus = (event: FocusEvent) => { if(activePanel==="navigation" && event.target instanceof Node && !container?.contains(event.target) && event.target!==trigger.current)onPanel(null); };
    document.addEventListener("pointerdown", pointer); document.addEventListener("keydown", key); document.addEventListener("focusin",focus);
    return () => { cancelAnimationFrame(focusFrame); document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", key); document.removeEventListener("focusin",focus); };
  }, [activePanel, onPanel, short]);
  const title = shownPopover === "layers" ? "Capas" : shownPopover === "camera" ? "Cámara" : "Información y fuentes";
  return <>
    <header className="viewerBar" data-viewer-control>
      <div className="viewerBrand"><h1>Bajo nuestros pies</h1><span className="viewerStatus" aria-live="polite">{p.count ? `${p.visible.toLocaleString("es-AR")} de ${p.count.toLocaleString("es-AR")} sismos` : p.status}</span></div>
      <nav className="viewerExploration" id="exploration-menu" aria-label="Explorar el mapa" data-open={p.panel === "navigation"}>
        <div className="explorePrimary" inert={navigationLayout === 0 && p.panel !== "navigation"} aria-hidden={navigationLayout === 0 && p.panel !== "navigation"}><button disabled={!p.ready} onClick={() => run(() => p.actions?.showPlan(!p.map2d))}>{p.map2d ? "Mapa 3D" : "Mapa 2D"}</button><button disabled={!p.ready || !p.surfaceReady} onClick={() => run(() => p.actions?.chooseArea("region"))}>Elegir zona 3D</button><button disabled={!p.analysisReady} title={!p.analysisReady ? "El corte requiere catálogo, relieve y modelo de Nazca" : undefined} onClick={() => run(() => { p.onLeaveGuide(); p.actions?.chooseArea("profile"); })}>Corte A–B</button></div>
        <div className="exploreSecondary" inert={navigationLayout < 2 && p.panel !== "navigation"} aria-hidden={navigationLayout < 2 && p.panel !== "navigation"}><button disabled={!p.analysisReady} title={!p.analysisReady ? "La comparación requiere catálogo, relieve y modelo de Nazca" : undefined} onClick={() => run(() => p.onGuide?.())}>Comparar San Juan y Mendoza</button><a href="/memoria/">Memoria histórica ↗</a>{!p.map2d ? <button aria-expanded={p.panel === "camera"} aria-controls="viewer-popover" onClick={e => toggle("camera", e.currentTarget)}>Cámara</button> : null}</div>
      </nav>
      <nav className="viewerTools" aria-label="Herramientas del mapa"><button className="exploreToggle" aria-expanded={p.panel === "navigation"} aria-controls="exploration-menu" onClick={e => toggle("navigation", e.currentTarget)}><span className="exploreLabel">Explorar</span><span className="moreLabel">Más</span></button><button aria-expanded={p.panel === "filters"} aria-controls="catalog-filters" onClick={e => toggle("filters", e.currentTarget)}>Filtros</button><button onClick={() => run(() => { setSideView(false); p.onLeaveGuide(); p.actions?.resetCamera(); })}>Inicio</button></nav>
    </header>

    <aside ref={filterTray} tabIndex={-1} role="dialog" aria-modal="true" id="catalog-filters" className={`filterTray${wide ? " filterTray--wide" : ""}`} data-viewer-control data-open={p.panel === "filters"} aria-hidden={p.panel !== "filters"} inert={p.panel !== "filters"} aria-label="Filtros">
      <div className="panelHeader"><h2>Filtros</h2><button className="panelClose" aria-label="Cerrar panel" onClick={closePanel}>×</button></div>
      {p.filters && p.bounds ? <FiltersPanel key={JSON.stringify(p.filters)} wide={wide} filters={p.filters} bounds={p.bounds} onApply={v => { run(() => p.onFilters(v)); restoreTrigger(trigger.current, filterTray.current); }} /> : null}
    </aside>

    {!p.map2d ? <button data-viewer-control className="layersAnchor" aria-label="Capas" title="Capas" disabled={!p.surfaceReady} aria-expanded={p.panel === "layers"} aria-controls="viewer-popover" onClick={e => toggle("layers", e.currentTarget)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m3 8 9-5 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg><span>Capas</span></button> : null}
    <aside id="viewer-popover" tabIndex={-1} role="dialog" aria-modal={(short && shownPopover !== "camera") || undefined} className={`viewerPopover viewerPopover--${shownPopover}`} data-viewer-control data-open={popoverOpen} aria-hidden={!popoverOpen} inert={!popoverOpen} aria-label={title}>
      <div className="panelHeader"><h2>{title}</h2><button className="panelClose" aria-label="Cerrar panel" onClick={closePanel}>×</button></div>
      <div className="popoverContents panelStep" key={shownPopover}>
        {shownPopover === "layers" ? <><div className="controlTabs" role="tablist" aria-label="Capas del mapa">{[["terrain", "Superficie"], ["slab", "Placa de Nazca"]].map(([id, label]) => <button role="tab" aria-selected={layerTab === id} key={id} onClick={() => setLayerTab(id)}>{label}</button>)}</div><div className="layerGrid panelStep" key={layerTab}>{layerTab === "terrain" ? <div>
          <label>Superficie visible · {Math.round(p.terrainOpacity * 100)}%<input aria-label="Opacidad de la superficie" type="range" min="0.1" max="1" step="0.1" value={p.terrainOpacity} onChange={e => p.onTerrainOpacity(Number(e.target.value))} /></label>
          <label>Relieve<select aria-label="Exageración del relieve" value={p.relief} onChange={e => p.actions?.setRelief(Number(e.target.value) as 1 | 5 | 10)}>{[1, 5, 10].map(v => <option key={v} value={v}>{v}×</option>)}</select></label>
          <small>La transparencia permite mirar a través del terreno. La profundidad permanece a escala 1×.</small>
        </div> : <div>
          <label className="checkRow"><input type="checkbox" checked={p.slabVisible} disabled={!p.slabAvailable} onChange={() => p.actions?.toggleSlab()} />Placa de Nazca · modelo Slab2</label>
          {!p.slabAvailable ? <small>El modelo no está disponible en esta carga.</small> : null}
          <small>Superficie modelada de la parte superior de la placa.</small>
          {p.slabVisible ? <label>Opacidad de Nazca<input aria-label="Opacidad Slab2" type="range" min="0.1" max="0.8" step="0.05" value={p.slabOpacity} onChange={e => p.actions?.setSlabOpacity(Number(e.target.value))} /></label> : null}
        </div>}</div></> : null}
        {shownPopover === "camera" ? <div className="cameraOptions"><label>Al arrastrar<select aria-label="Al arrastrar" value={p.navigationMode} onChange={e => { run(() => p.actions?.setNavigationMode(e.target.value as Mode)); restoreTrigger(trigger.current, filterTray.current); }}><option value="turntable">Girar · vertical fija</option><option value="pan">Mover</option><option value="zoom">Acercar o alejar</option><option value="orbital">Girar libremente</option></select></label><small>Rueda o dos dedos: acercar. En el modo habitual, botón derecho o dos dedos: mover.</small><button onClick={() => run(() => { setSideView(false); p.actions?.setCameraView("territory"); })}>Ver todo el territorio</button></div> : null}
        {shownPopover === "information" ? <><div className="controlTabs" role="tablist" aria-label="Información del proyecto">{[["about", "Cómo usarlo"], ["catalog", "Catálogo y criterios"]].map(([id, label]) => <button role="tab" aria-selected={informationTab === id} key={id} onClick={() => setInformationTab(id)}>{label}</button>)}</div><div className="informationCopy panelStep" key={informationTab}>{informationTab === "about" ? <><h3>Explorá el subsuelo</h3><p>Cada punto es un sismo de INPRES. Compará San Juan y Mendoza o elegí tu propia zona.</p><p>Pasá el mouse para leer un dato; tocá o hacé clic para abrir su ficha. Girá de costado para ver la profundidad.</p><p>Profundidad 1×; relieve {p.relief}×. GEBCO y Slab2 son modelos externos.</p></> : <><h3>Datos y revisión</h3><p>Catálogo guardado al {date(snapshot.date)}. No es información de alerta ni una estimación de riesgo.</p><p>Un registro M8 del 29/01/2019 queda excluido provisionalmente por discrepancias entre fuentes. Se conserva el original.</p>{p.filters ? <label className="checkRow"><input type="checkbox" checked={Boolean(p.filters.includeProvisional)} onChange={e => p.onFilters({ ...p.filters!, includeProvisional: e.target.checked })} />Incluir el registro en revisión</label> : null}</>}<a href="/metodologia/">Metodología, fuentes y desarrollo ↗</a></div></> : null}
      </div>
    </aside>

    <footer className="viewerFooter" data-viewer-control><ColorLegend mode={p.colorMode} onMode={p.onColorMode} /><div className="footerActions"><button className="depthViewAction" onClick={() => run(() => { p.actions?.showPlan(false); p.actions?.setCameraView(sideView ? "above" : "side"); setSideView(!sideView); })}>{sideView ? "Ver superficie" : "Ver profundidad"}</button><button className="informationToggle" aria-label="Información y fuentes" title="Información y fuentes" aria-expanded={p.panel === "information"} aria-controls="viewer-popover" onClick={e => toggle("information", e.currentTarget)}>?</button></div><span className="catalogPeriod">{p.filters ? `${date(p.filters.dateFrom)}–${date(p.filters.dateTo)}` : `Hasta ${date(snapshot.date)}`}<small>INPRES · profundidad 1× · {p.surfaceReady ? `relieve ${p.relief}×` : "sin relieve"}</small></span></footer>
  </>;
}
