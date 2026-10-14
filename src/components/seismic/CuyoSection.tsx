"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { InpresFeature } from "@/lib/data/inpres";
import {
  LATITUDE_PROFILE,
  CUYO_LENGTH_KM,
  type ProfileDefinition,
  type ProfileSample,
  type ProjectedEvent,
  summarizeProfile,
} from "@/lib/profile/cuyo";
import EventInspector from "./EventInspector";
import GuidedDiscovery from "@/components/story/GuidedDiscovery";
import guide from "@/data/flat-slab-guide.json";
import type { CatalogFilters } from "@/lib/filters/catalog";

const LEFT = 56;
const TOP = 21;
const ABOVE_SEA_KM = 9;
const PALETTES = {
  light: { background: "#fafbfc", grid: "#dbe2e8", sea: "#889ca4", text: "#253344", boundary: "#71808a", shallow: "#b84d08", intermediate: "#077789", deep: "#68389a", slab: "#3d4254", uncertainty: "rgba(61,66,84,.10)", gebco: "#376f40", selected: "#17212e" },
  dark: { background: "#0b1a20", grid: "#29434a", sea: "#649dad", text: "#b5c9c9", boundary: "#b3c6cc", shallow: "#f5a957", intermediate: "#52c7de", deep: "#b894ed", slab: "#ffe7a3", uncertainty: "rgba(244,217,127,.12)", gebco: "#90c48f", selected: "#ffffff" },
};

export function profilePixelsPerKm(availableWidth: number, lengthKm: number): number {
  // Ambos ejes comparten exactamente este factor; si falta espacio hay scroll.
  return Math.max(0.43, Math.min(1.2, (availableWidth - LEFT - 18) / lengthKm));
}

function formatLatitude(latitude: number) {
  return `${Math.abs(latitude).toFixed(latitude % 1 === 0 ? 0 : 2)}°S`;
}

function regionLabel(latitude: number) {
  if (latitude >= -24.5) return "Jujuy / NOA";
  if (latitude >= -29) return "NOA";
  if (latitude >= -34) return "Cuyo";
  if (latitude >= -40) return "Centro-oeste";
  return "Patagonia andina";
}

function drawSegmented(
  ctx: CanvasRenderingContext2D,
  samples: ProfileSample[],
  coordinate: (sample: ProfileSample) => number | null,
  x: (km: number) => number,
  y: (km: number) => number,
) {
  ctx.beginPath();
  let connected = false;
  for (const sample of samples) {
    const value = coordinate(sample);
    if (value === null || !Number.isFinite(value)) { connected = false; continue; }
    if (connected) ctx.lineTo(x(sample.alongKm), y(value));
    else ctx.moveTo(x(sample.alongKm), y(value));
    connected = true;
  }
  ctx.stroke();
}

export default function CuyoSection({
  profile, events, samples, selected, status, onLatitudeChange, onPick, onClose, guidedIndex = null, onGuideChange,
  inheritedFilters = false, includeProvisional = false, catalogFilters, onResetFilters,
}: {
  profile: ProfileDefinition;
  events: ProjectedEvent[];
  samples: ProfileSample[];
  selected: InpresFeature | null;
  status: string;
  onLatitudeChange: (latitude: number) => void;
  onPick: (event: InpresFeature) => void;
  onClose: () => void;
  guidedIndex?: number | null;
  onGuideChange?: (index: number | null) => void;
  inheritedFilters?: boolean;
  includeProvisional?: boolean;
  catalogFilters: CatalogFilters | null;
  onResetFilters: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [availableWidth, setAvailableWidth] = useState(1100);
  const [showSlab, setShowSlab] = useState(true);
  const [fullDepth, setFullDepth] = useState(true);
  const [minimumMagnitude, setMinimumMagnitude] = useState<number | null>(null);
  const [theme, setTheme] = useState<keyof typeof PALETTES>("light");
  const palette = PALETTES[theme];
  const period = catalogFilters ? `${catalogFilters.dateFrom.split("-").reverse().join("/")}–${catalogFilters.dateTo.split("-").reverse().join("/")}` : guide.web.period;
  const sampleDescription = `${period} · corredor ±${profile.halfWidthKm} km · ${catalogFilters ? `M del mapa ${catalogFilters.magnitudeMin}–${catalogFilters.magnitudeMax}; profundidad catalogada ${catalogFilters.depthMin}–${catalogFilters.depthMax} km` : "todas las magnitudes habilitadas"}${minimumMagnitude === null ? "" : `; corte M ≥ ${minimumMagnitude}`} · ${includeProvisional ? "registro en revisión incluido" : "exclusión provisional de calidad"}`;
  const visibleEvents = useMemo(() => minimumMagnitude === null ? events
    : events.filter(({ feature }) => feature.properties.magnitud >= minimumMagnitude), [events, minimumMagnitude]);
  const summary = useMemo(() => summarizeProfile(visibleEvents, profile), [visibleEvents, profile]);
  const modelDepth = samples.reduce((deepest, sample) => Math.max(deepest,
    sample.slab ? Math.ceil((sample.slab.depthKm + sample.slab.uncertaintyKm) / 50) * 50 : 0), 0);
  // La comparación usa el mismo rango y los mismos píxeles por km en ambas paradas.
  const maxDepth = guidedIndex !== null ? guide.comparison.depthKm : fullDepth ? Math.max(summary.fullDepthKm, modelDepth) : profile.initialDepthKm;
  const drawnCount = visibleEvents.filter(({ feature }) => feature.properties.profundidad <= maxDepth).length;
  const scale = profilePixelsPerKm(availableWidth, guidedIndex !== null ? CUYO_LENGTH_KM : profile.lengthKm);
  const width = Math.ceil(LEFT + profile.lengthKm * scale + 18);
  const height = Math.ceil(TOP + (ABOVE_SEA_KM + maxDepth) * scale + 38);
  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);

  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(() => {
      if (frame.current) setAvailableWidth(frame.current.clientWidth);
    });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const x = (km: number) => LEFT + km * scale;
    const y = (depthKm: number) => TOP + (ABOVE_SEA_KM + depthKm) * scale;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = palette.background;
    context.fillRect(0, 0, width, height);
    context.font = "11px Arial";
    context.lineWidth = 1;

    // Bandas descriptivas; no representan superficies ni límites geológicos.
    for (const [from, to, color] of [[0, 70, "rgba(245,169,87,.055)"], [70, 300, "rgba(82,199,222,.055)"], [300, maxDepth, "rgba(184,148,237,.06)"]] as const) {
      if (from >= maxDepth) continue;
      context.fillStyle = color;
      context.fillRect(LEFT, y(from), profile.lengthKm * scale, (Math.min(to, maxDepth) - from) * scale);
    }

    for (let depth = 0; depth <= maxDepth; depth += 50) {
      context.strokeStyle = depth === 0 ? palette.sea : palette.grid;
      context.beginPath(); context.moveTo(LEFT, y(depth)); context.lineTo(x(profile.lengthKm), y(depth)); context.stroke();
      context.fillStyle = palette.text; context.textAlign = "right";
      context.fillText(`${depth}`, LEFT - 8, y(depth) + 4);
    }
    for (let distance = 0; distance <= profile.lengthKm; distance += 200) {
      context.strokeStyle = palette.grid;
      context.beginPath(); context.moveTo(x(distance), y(0)); context.lineTo(x(distance), y(maxDepth)); context.stroke();
      context.fillStyle = palette.text; context.textAlign = "center";
      context.fillText(`${distance}`, x(distance), height - 9);
    }
    for (const boundary of [70, 300]) {
      if (boundary > maxDepth) continue;
      context.strokeStyle = palette.boundary; context.setLineDash([5, 5]);
      context.beginPath(); context.moveTo(LEFT, y(boundary)); context.lineTo(x(profile.lengthKm), y(boundary)); context.stroke();
      context.setLineDash([]); context.fillStyle = palette.text; context.textAlign = "right";
      context.fillText(`${boundary} km`, x(profile.lengthKm) - 5, y(boundary) - 5);
    }
    context.fillStyle = palette.text;
    context.textAlign = "left";
    context.fillText("A · Chile", LEFT, TOP + 5);
    context.textAlign = "right";
    context.fillText("B · Argentina", x(profile.lengthKm), TOP + 5);

    context.save();
    context.beginPath();
    context.rect(LEFT, y(-ABOVE_SEA_KM), x(profile.lengthKm) - LEFT, y(maxDepth) - y(-ABOVE_SEA_KM));
    context.clip();

    // Todos los registros habilitados, sin cupo: la transparencia muestra densidad.
    context.globalAlpha = 0.32;
    for (const event of visibleEvents) {
      const depth = event.feature.properties.profundidad;
      if (depth > maxDepth) continue;
      context.fillStyle = depth < 70 ? palette.shallow : depth < 300 ? palette.intermediate : palette.deep;
      context.fillRect(x(event.alongKm) - 0.7, y(depth) - 0.7, 1.4, 1.4);
    }
    context.globalAlpha = 1;

    if (showSlab) {
      // Cada par adyacente válido es independiente: CLP/nodata corta la banda.
      context.fillStyle = palette.uncertainty;
      for (let index = 1; index < samples.length; index++) {
        const a = samples[index - 1], b = samples[index];
        if (!a.slab || !b.slab) continue;
        context.beginPath();
        context.moveTo(x(a.alongKm), y(a.slab.depthKm - a.slab.uncertaintyKm));
        context.lineTo(x(b.alongKm), y(b.slab.depthKm - b.slab.uncertaintyKm));
        context.lineTo(x(b.alongKm), y(b.slab.depthKm + b.slab.uncertaintyKm));
        context.lineTo(x(a.alongKm), y(a.slab.depthKm + a.slab.uncertaintyKm));
        context.fill();
      }
      context.strokeStyle = palette.slab; context.lineWidth = 1.6; context.setLineDash([7, 4]);
      drawSegmented(context, samples, (sample) => sample.slab?.depthKm ?? null, x, y);
      context.setLineDash([]);
    }

    // Superficie modelada GEBCO: elevación positiva hacia arriba respecto de 0.
    context.strokeStyle = palette.gebco; context.lineWidth = 1.5;
    drawSegmented(context, samples, (sample) => sample.elevationMeters === null ? null : -sample.elevationMeters / 1000, x, y);
    const selectedPoint = selected ? visibleEvents.find((event) => event.feature.properties.id === selected.properties.id) : null;
    if (selectedPoint && selectedPoint.feature.properties.profundidad <= maxDepth) {
      const px = x(selectedPoint.alongKm), py = y(selectedPoint.feature.properties.profundidad);
      context.strokeStyle = palette.selected;
      context.lineWidth = 2;
      context.beginPath(); context.arc(px, py, 7, 0, Math.PI * 2); context.stroke();
      context.fillStyle = palette.selected;
      context.beginPath(); context.arc(px, py, 2, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }, [visibleEvents, samples, selected, showSlab, fullDepth, maxDepth, width, height, scale, dpr, profile.lengthKm, palette]);

  const exportPng = () => {
    if (!canvas.current || status) return;
    const output = document.createElement("canvas");
    const exportWidth = Math.max(width, 800);
    const header = 110, footer = 170;
    output.width = Math.round(exportWidth * dpr); output.height = Math.round((header + height + footer) * dpr);
    const ctx = output.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.fillStyle = palette.background; ctx.fillRect(0, 0, exportWidth, header + height + footer);
    ctx.fillStyle = palette.text; ctx.font = "bold 19px Arial";
    ctx.fillText(`Bajo nuestros pies · Corte del subsuelo · ${formatLatitude(profile.latitude)}`, 20, 32);
    ctx.font = "12px Arial";
    const wrapped = (text: string, top: number) => {
      let line = "", y = top;
      for (const word of text.split(" ")) {
        if (ctx.measureText(`${line} ${word}`).width > exportWidth - 40) { ctx.fillText(line, 20, y); y += 18; line = word; }
        else line += `${line ? " " : ""}${word}`;
      }
      ctx.fillText(line, 20, y);
    };
    wrapped(sampleDescription, 57);
    ctx.fillText(`${drawnCount.toLocaleString("es-AR")} visibles / ${events.length.toLocaleString("es-AR")} en la franja · ${visibleEvents.length - drawnCount} fuera del rango vertical · escala 1× · 0–${maxDepth} km`, 20, 99);
    ctx.drawImage(canvas.current, 0, header, width, height);
    const y = header + height + 20;
    ctx.fillText("Ejes en km · distancia desde A → / profundidad ↓ · A–B geodésica WGS84; proyección del corredor ±50 km", 20, y);
    const legend = [[palette.shallow, "<70 km"], [palette.intermediate, "70–<300 km"], [palette.deep, "≥300 km"], [palette.gebco, "GEBCO"], [palette.slab, showSlab ? "Slab2 DEP ± UNC" : "Slab2 oculto"]];
    legend.forEach(([color, label], i) => { const x = 20 + i * 150; ctx.fillStyle = color; ctx.fillRect(x, y + 14, 9, 9); ctx.fillStyle = palette.text; ctx.fillText(label, x + 14, y + 23); });
    wrapped("INPRES: profundidades catalogadas. GEBCO 2026 y USGS Slab2 2018: modelos. Bandas de profundidad descriptivas; comparación vertical nominal, sin clasificación tectónica de eventos.", y + 49);
    ctx.fillText(`Snapshot 14/09/2026 · SHA256 ${guide.web.sha256}`, 20, y + 96);
    ctx.fillText("Fuentes y método: /metodologia/ · Slab2 doi:10.5066/F7PV6JNV · GEBCO gebco.net · INPRES inpres.gob.ar", 20, y + 116);
    output.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = `bajo-nuestros-pies-corte-${Math.abs(profile.latitude)}S-${theme}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  const handlePick = (mouse: React.MouseEvent<HTMLCanvasElement>) => {
    const x = (km: number) => LEFT + km * scale;
    const y = (depthKm: number) => TOP + (ABOVE_SEA_KM + depthKm) * scale;
    const rect = mouse.currentTarget.getBoundingClientRect();
    const px = mouse.clientX - rect.left;
    const py = mouse.clientY - rect.top;
    let nearest: ProjectedEvent | null = null;
    let distanceSq = 64;
    if (status) return;
    for (const event of visibleEvents) {
      const depth = event.feature.properties.profundidad;
      if (depth > maxDepth) continue;
      const dx = x(event.alongKm) - px, dy = y(depth) - py;
      const candidate = dx * dx + dy * dy;
      if (candidate < distanceSq) { distanceSq = candidate; nearest = event; }
    }
    if (nearest) onPick(nearest.feature);
  };

  return (
    <section className="sectionMode" aria-label={`Explorar el subsuelo en un perfil andino a ${formatLatitude(profile.latitude)}`}>
      <header className="sectionModeHeader">
        <button className="sectionBack" onClick={onClose}>← Volver al mapa</button>
        <div>
          <p className="eyebrow">Explorar el subsuelo · perfil andino</p>
          <h2>Corte del subsuelo · {formatLatitude(profile.latitude)}</h2>
        </div>
        <span className="sectionModeTag">INPRES + GEBCO + USGS Slab2</span>
      </header>

      <div className="sectionContext">
        <div className="sectionContextCopy">
          {guidedIndex !== null && onGuideChange ? <div className="guideOverview">
            <h3>{guide.stops[guidedIndex]?.title}</h3>
            <p>{guide.question}</p>
            <p className="guideAnswer"><strong>Respuesta desde la bibliografía.</strong> {guide.answer} <a href={guide.sources[0].url} target="_blank" rel="noreferrer">Gao et al. (2021)</a></p>
            <nav aria-label="Cambiar corte comparable">
              <button disabled={Boolean(status)} aria-pressed={guidedIndex === 0} onClick={() => onGuideChange(0)}>Ver 31°S</button>
              <button disabled={Boolean(status)} aria-pressed={guidedIndex === 1} onClick={() => onGuideChange(1)}>Ver 35°S</button>
            </nav>
            <small>La explicación distingue catálogo, modelo e interpretación bibliográfica debajo del gráfico.</small>
          </div> : null}
          <div className="sectionRoute"><b>A · Chile</b><span>→ Andes → {regionLabel(profile.latitude)} →</span><b>B · interior continental</b></div>
          {guidedIndex === null ? <p><strong>{status ? "Recalculando hipocentros" : `${summary.total.toLocaleString("es-AR")} hipocentros`}</strong> del catálogo dentro de una franja de <strong>±{profile.halfWidthKm} km</strong>. Se proyectan sobre A–B; no ocurrieron todos sobre esa línea.</p> : <p className="guideProjectionNote">Los eventos de la franja se proyectan sobre A–B; no ocurrieron todos en esa línea.</p>}
          <small>A (−73°, {formatLatitude(profile.latitude)}) → B (−61°, {formatLatitude(profile.latitude)}) · {profile.lengthKm.toFixed(1)} km sobre WGS84</small>
          <div className="profileLatitudeControl" hidden={guidedIndex !== null}>
            <label htmlFor="profile-latitude">Mover perfil norte–sur</label>
            <input
              id="profile-latitude"
              type="range"
              min={LATITUDE_PROFILE.minLatitude}
              max={LATITUDE_PROFILE.maxLatitude}
              step={LATITUDE_PROFILE.stepDegrees}
              value={profile.latitude}
              onChange={(event) => onLatitudeChange(Number(event.currentTarget.value))}
              aria-valuetext={formatLatitude(profile.latitude)}
            />
            <div><span>45°S</span><output htmlFor="profile-latitude">{formatLatitude(profile.latitude)}</output><span>22°S · Jujuy</span></div>
            <div className="profilePresets" aria-label="Posiciones rápidas del perfil">
              <button type="button" aria-pressed={profile.latitude === -31} onClick={() => onLatitudeChange(-31)}>Cuyo · 31°S</button>
              <button type="button" aria-pressed={profile.latitude === -35} onClick={() => onLatitudeChange(-35)}>Mendoza · 35°S</button>
              <button type="button" aria-pressed={profile.latitude === -23} onClick={() => onLatitudeChange(-23)}>Jujuy · 23°S</button>
            </div>
          </div>
          <p className={profile.latitude === -31 ? "profileValidation profileValidation--audited" : "profileValidation"}>
            {profile.latitude === -31 || profile.latitude === -35
              ? "Selección geodésica reproducible; interpretación regional respaldada por bibliografía."
              : "Perfil exploratorio: conserva el método validado, pero esta latitud no tiene todavía cotejo independiente."}
          </p>
        </div>
        <div className="sectionMapSlot" aria-label="Contexto espacial: Chile, Argentina, perfil A–B y corredor de 100 km">
          <div className="sectionMiniDiagram">A · Chile ━━━ Andes ━━━ {regionLabel(profile.latitude)} ━━━ B<br />Franja seleccionada: 50 km a cada lado de A–B</div>
          <span>Norte ↑ · {guidedIndex === null ? "Arrastrá el mini mapa para mover la franja" : "El corte y su muestra cambian con cada parada"}</span>
          <small>{guidedIndex === null ? "También podés usar el control de latitud." : "31°S ↔ 35°S · misma escala 1× y rango 0–700 km."}</small>
        </div>
      </div>

      <div className={`sectionPrimary sectionPrimary--${theme}${status ? " sectionPrimary--updating" : ""}`}>
        <div className="sectionPrimaryHeading">
          <strong>De la superficie al subsuelo</strong>
          <span>Profundidad positiva hacia abajo · comparación vertical nominal</span>
        </div>
        <div className="sectionFilterBar">
          <label htmlFor="section-magnitude">Magnitud mínima
            <select id="section-magnitude" value={minimumMagnitude ?? "all"} onChange={(event) => setMinimumMagnitude(event.currentTarget.value === "all" ? null : Number(event.currentTarget.value))}>
              <option value="all">Todas las magnitudes</option>
              {[3.1, 3.5, 4, 5].map((value) => <option key={value} value={value}>≥ {value}</option>)}
            </select>
          </label>
          <label htmlFor="section-theme">Fondo del gráfico<select id="section-theme" value={theme} onChange={(event) => setTheme(event.currentTarget.value as keyof typeof PALETTES)}><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
          <button disabled={Boolean(status)} onClick={exportPng}>Descargar corte PNG</button>
          <button onClick={() => { setMinimumMagnitude(null); setFullDepth(true); setShowSlab(true); onResetFilters(); frame.current?.scrollTo({ left: 0, top: 0 }); }}>Restablecer corte y filtros</button>
          <p role="status">{status ? "Recalculando conteos…" : `${drawnCount.toLocaleString("es-AR")} visibles · ${(events.length - visibleEvents.length).toLocaleString("es-AR")} filtrados por magnitud · ${(visibleEvents.length - drawnCount).toLocaleString("es-AR")} fuera del rango vertical`}</p>
          <small>{inheritedFilters ? "También se aplican los filtros del mapa. " : "Período completo del catálogo. "}{includeProvisional ? "Registro en revisión incluido." : "Se aplica la exclusión provisional de calidad; no hay límite de cantidad."}</small>
        </div>
        <div className="sectionLegend sectionPlotLegend" aria-label="Leyenda del corte">
          <span><i style={{ background: palette.shallow }} />INPRES 0–&lt;70 km</span>
          <span><i style={{ background: palette.intermediate }} />70–&lt;300 km</span>
          <span><i style={{ background: palette.deep }} />≥300 km</span>
          <span><i className="sectionLegendGebco" style={{ background: palette.gebco }} />GEBCO · superficie</span>
          <span><i className="sectionLegendSlab" style={{ background: `repeating-linear-gradient(90deg, ${palette.slab} 0 6px, transparent 6px 9px)` }} />Slab2 · DEP ± UNC {showSlab ? "" : "(oculto)"}</span>
        </div>
        <div className="sectionPlot" ref={frame}>
          {status ? <div className="sectionPlotStatus" role="status">{status}</div> : null}
          {!status && !visibleEvents.length ? <p className="sectionEmpty" role="status">No hay hipocentros en esta franja con los filtros actuales. Mové el perfil o restablecé los filtros.</p> : null}
          <canvas ref={canvas} width={Math.round(width * dpr)} height={Math.round(height * dpr)} style={{ width, height }} onClick={handlePick} role="img" aria-label={`Perfil de ${drawnCount} eventos visibles, superficie GEBCO y curva Slab2; distancia horizontal y profundidad en kilómetros a escala 1 a 1; rango 0 a ${maxDepth} km`} />
        </div>
        <div className="sectionAxis"><span>Profundidad catalogada / modelada (km) ↓</span><span>Distancia desde A (km) → · escala efectiva 1×</span></div>
        <div className="depthBandSummary" aria-label="Conteos por clasificación descriptiva de profundidad">
          <span>Superficial · &lt;70 km <b>{status ? "…" : summary.superficial.toLocaleString("es-AR")}</b></span>
          <span>Intermedia · 70–&lt;300 km <b>{status ? "…" : summary.intermedio.toLocaleString("es-AR")}</b></span>
          <span>Profunda · ≥300 km <b>{status ? "…" : summary.profundo.toLocaleString("es-AR")}</b></span>
          <small>Bandas descriptivas; no son límites de corteza y manto. En móvil, desplazá horizontalmente el gráfico para recorrer A–B.</small>
        </div>
      </div>

      {guidedIndex !== null && onGuideChange ? <GuidedDiscovery index={guidedIndex} events={visibleEvents} status={status} sampleDescription={sampleDescription} onChange={onGuideChange} /> : null}

      <div className="sectionBottom">
        <div className="sectionReference">
          <div className="sectionActions">
            <button aria-pressed={showSlab} onClick={() => setShowSlab(!showSlab)}>DEP ± UNC {showSlab ? "visible" : "oculto"}</button>
            {guidedIndex === null ? <button aria-pressed={fullDepth} onClick={() => setFullDepth(!fullDepth)}>{fullDepth ? `Acotar a 0–${profile.initialDepthKm} km` : `Rango completo · ${summary.outsideInitialDepth} fuera de ${profile.initialDepthKm} km`}</button> : <span>Comparación: 0–700 km en ambos cortes</span>}
            <button disabled={!drawnCount || Boolean(status)} onClick={() => onPick(visibleEvents.filter(({ feature }) => feature.properties.profundidad <= maxDepth)[Math.floor(drawnCount / 2)].feature)}>Inspeccionar un evento de la franja</button>
          </div>
          <div className="sectionDetails">
            <details>
              <summary>¿Qué estoy viendo?</summary>
              <p>Esta vista lateral reúne sismos catalogados hasta 50 km a cada lado de A–B y los proyecta sobre el perfil. La posición inicial Cuyo 31°S permite comparar la sismicidad intermedia con la geometría general representada por Slab2. Al moverla, la comparación es exploratoria y no clasifica cada sismo.</p>
            </details>
            <details>
              <summary>Metodología y fuentes</summary>
              <p>El perfil se calcula sobre la geodésica WGS84. Los puntos son profundidades reportadas por INPRES; la línea discontinua es DEP del modelo geofísico USGS Slab2 2018 y su banda es UNC, incertidumbre reportada del modelo. CLP/nodata dejan huecos sin rellenar. La línea verde es elevación y batimetría modelada GEBCO 2026. La referencia vertical de INPRES no está confirmada: la comparación vertical es nominal, no una distancia física exacta.</p>
              <p>Fuentes: <a href="https://doi.org/10.5066/F7PV6JNV" target="_blank" rel="noreferrer">USGS Slab2 2018</a> · <a href="https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid" target="_blank" rel="noreferrer">GEBCO 2026</a> · <a href="/metodologia/">Metodología y límites de esta obra</a>.</p>
            </details>
          </div>
        </div>
        <EventInspector event={selected && visibleEvents.some(({ feature }) => feature.properties.id === selected.properties.id && feature.properties.profundidad <= maxDepth) ? selected : null} compact />
      </div>
    </section>
  );
}
