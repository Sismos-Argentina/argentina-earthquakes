"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { InpresFeature } from "@/lib/data/inpres";
import {
  CUYO,
  CUYO_LENGTH_KM,
  type ProfileSample,
  type ProjectedEvent,
  summarizeCuyoProfile,
} from "@/lib/profile/cuyo";
import EventInspector from "./EventInspector";

const LEFT = 56;
const TOP = 21;
const ABOVE_SEA_KM = 9;

export function profilePixelsPerKm(availableWidth: number): number {
  // Ambos ejes comparten exactamente este factor; si falta espacio hay scroll.
  return Math.max(0.43, Math.min(1.2, (availableWidth - LEFT - 18) / CUYO_LENGTH_KM));
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
  events, samples, selected, onPick, onClose,
}: {
  events: ProjectedEvent[];
  samples: ProfileSample[];
  selected: InpresFeature | null;
  onPick: (event: InpresFeature) => void;
  onClose: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [availableWidth, setAvailableWidth] = useState(1100);
  const [showSlab, setShowSlab] = useState(true);
  const [fullDepth, setFullDepth] = useState(false);
  const summary = useMemo(() => summarizeCuyoProfile(events), [events]);
  const maxDepth = fullDepth ? summary.fullDepthKm : CUYO.initialDepthKm;
  const scale = profilePixelsPerKm(availableWidth);
  const width = Math.ceil(LEFT + CUYO_LENGTH_KM * scale + 18);
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
    context.fillStyle = "#0b1a20";
    context.fillRect(0, 0, width, height);
    context.font = "11px Arial";
    context.lineWidth = 1;

    for (let depth = 0; depth <= maxDepth; depth += 50) {
      context.strokeStyle = depth === 0 ? "#649dad" : "#29434a";
      context.beginPath(); context.moveTo(LEFT, y(depth)); context.lineTo(x(CUYO_LENGTH_KM), y(depth)); context.stroke();
      context.fillStyle = "#b5c9c9"; context.textAlign = "right";
      context.fillText(`${depth}`, LEFT - 8, y(depth) + 4);
    }
    for (let distance = 0; distance <= CUYO_LENGTH_KM; distance += 200) {
      context.strokeStyle = "#29434a";
      context.beginPath(); context.moveTo(x(distance), y(0)); context.lineTo(x(distance), y(maxDepth)); context.stroke();
      context.fillStyle = "#b5c9c9"; context.textAlign = "center";
      context.fillText(`${distance}`, x(distance), height - 9);
    }
    context.fillStyle = "#d6e5e0";
    context.textAlign = "left";
    context.fillText("A · Chile", LEFT, TOP + 5);
    context.textAlign = "right";
    context.fillText("B · Argentina", x(CUYO_LENGTH_KM), TOP + 5);

    context.save();
    context.beginPath();
    context.rect(LEFT, y(-ABOVE_SEA_KM), x(CUYO_LENGTH_KM) - LEFT, y(maxDepth) - y(-ABOVE_SEA_KM));
    context.clip();

    if (showSlab) {
      // Cada par adyacente válido es independiente: CLP/nodata corta la banda.
      context.fillStyle = "rgba(222,215,196,.24)";
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
      context.strokeStyle = "#eee3ca"; context.lineWidth = 2;
      drawSegmented(context, samples, (sample) => sample.slab?.depthKm ?? null, x, y);
    }

    // Superficie modelada GEBCO: elevación positiva hacia arriba respecto de 0.
    context.strokeStyle = "#90c48f"; context.lineWidth = 1.5;
    drawSegmented(context, samples, (sample) => sample.elevationMeters === null ? null : -sample.elevationMeters / 1000, x, y);
    for (const event of events) {
      const depth = event.feature.properties.profundidad;
      if (depth > maxDepth) continue;
      context.fillStyle = depth < 70 ? "#f5a957" : depth < 300 ? "#52c7de" : "#b894ed";
      context.fillRect(x(event.alongKm) - 1, y(depth) - 1, 2, 2);
    }
    const selectedPoint = selected ? events.find((event) => event.feature.properties.id === selected.properties.id) : null;
    if (selectedPoint && selectedPoint.feature.properties.profundidad <= maxDepth) {
      const px = x(selectedPoint.alongKm), py = y(selectedPoint.feature.properties.profundidad);
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.beginPath(); context.arc(px, py, 7, 0, Math.PI * 2); context.stroke();
      context.fillStyle = "#ffffff";
      context.beginPath(); context.arc(px, py, 2, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }, [events, samples, selected, showSlab, fullDepth, maxDepth, width, height, scale, dpr]);

  const handlePick = (mouse: React.MouseEvent<HTMLCanvasElement>) => {
    const x = (km: number) => LEFT + km * scale;
    const y = (depthKm: number) => TOP + (ABOVE_SEA_KM + depthKm) * scale;
    const rect = mouse.currentTarget.getBoundingClientRect();
    const px = mouse.clientX - rect.left;
    const py = mouse.clientY - rect.top;
    let nearest: ProjectedEvent | null = null;
    let distanceSq = 64;
    for (const event of events) {
      const depth = event.feature.properties.profundidad;
      if (depth > maxDepth) continue;
      const dx = x(event.alongKm) - px, dy = y(depth) - py;
      const candidate = dx * dx + dy * dy;
      if (candidate < distanceSq) { distanceSq = candidate; nearest = event; }
    }
    if (nearest) onPick(nearest.feature);
  };

  return (
    <section className="sectionMode" aria-label="Explorar el subsuelo de Cuyo">
      <header className="sectionModeHeader">
        <button className="sectionBack" onClick={onClose}>← Volver al mapa</button>
        <div>
          <p className="eyebrow">Explorar el subsuelo · Cuyo</p>
          <h2>Sección científica · 31°S</h2>
        </div>
        <span className="sectionModeTag">INPRES + GEBCO + USGS Slab2</span>
      </header>

      <div className="sectionContext">
        <div className="sectionContextCopy">
          <div className="sectionRoute"><b>A · Chile</b><span>→ Andes → San Juan →</span><b>B · interior argentino</b></div>
          <p><strong>{summary.total.toLocaleString("es-AR")} hipocentros</strong> del catálogo dentro de una franja de <strong>±{CUYO.halfWidthKm} km</strong>. Se proyectan sobre A–B; no ocurrieron todos sobre esa línea.</p>
          <small>A (−73°, −31°) → B (−61°, −31°) · {CUYO_LENGTH_KM.toFixed(1)} km sobre WGS84</small>
        </div>
        <div className="sectionMapSlot" aria-label="Contexto espacial: Chile, Argentina, perfil A–B y corredor de 100 km">
          <div className="sectionMiniDiagram">A · Chile ━━━ Andes ━━━ San Juan ━━━ B · Argentina<br />Franja seleccionada: 50 km a cada lado de A–B</div>
          <span>Ubicación del corredor · 100 km de ancho</span>
          <small>La franja clara del mapa reúne los eventos proyectados.</small>
        </div>
      </div>

      <div className="sectionPrimary">
        <div className="sectionPrimaryHeading">
          <strong>De la superficie al subsuelo</strong>
          <span>Profundidad positiva hacia abajo · comparación vertical nominal</span>
        </div>
        <div className="sectionPlot" ref={frame}>
          <canvas ref={canvas} width={Math.round(width * dpr)} height={Math.round(height * dpr)} style={{ width, height }} onClick={handlePick} role="img" aria-label={`Perfil de ${summary.total} eventos, superficie GEBCO y curva Slab2; distancia horizontal y profundidad en kilómetros a escala 1 a 1`} />
        </div>
        <div className="sectionAxis"><span>Profundidad catalogada / modelada (km) ↓</span><span>Distancia desde A (km) → · escala efectiva 1×</span></div>
      </div>

      <div className="sectionBottom">
        <div className="sectionReference">
          <div className="sectionLegend" aria-label="Leyenda de la sección">
            <span><i className="legendShallow" />INPRES 0–&lt;70 km</span>
            <span><i className="legendIntermediate" />70–&lt;300 km</span>
            <span><i className="legendDeep" />≥300 km</span>
            <span><i className="sectionLegendGebco" />GEBCO · superficie</span>
            <span><i className="sectionLegendSlab" />Slab2 · DEP ± UNC</span>
          </div>
          <div className="sectionActions">
            <button aria-pressed={showSlab} onClick={() => setShowSlab(!showSlab)}>DEP ± UNC {showSlab ? "visible" : "oculto"}</button>
            <button aria-pressed={fullDepth} onClick={() => setFullDepth(!fullDepth)}>{fullDepth ? "Volver a 0–350 km" : `Rango completo · ${summary.outsideInitialDepth} fuera de 350 km`}</button>
          </div>
          <div className="sectionDetails">
            <details>
              <summary>¿Qué estoy viendo?</summary>
              <p>Esta vista lateral reúne sismos catalogados hasta 50 km a cada lado de A–B y los proyecta sobre el perfil. Parte de la sismicidad intermedia de Cuyo forma una franja que acompaña la geometría general del segmento poco inclinado representado por Slab2. Es una comparación regional, no una clasificación de cada sismo.</p>
            </details>
            <details>
              <summary>Metodología y fuentes</summary>
              <p>El perfil se calcula sobre la geodésica WGS84. Los puntos son profundidades reportadas por INPRES; la línea clara es DEP del modelo geofísico USGS Slab2 2018 y su banda es UNC, incertidumbre reportada del modelo. CLP/nodata dejan huecos sin rellenar. La línea verde es elevación y batimetría modelada GEBCO 2026. La referencia vertical de INPRES no está confirmada: la comparación vertical es nominal, no una distancia física exacta.</p>
              <p>Fuentes: <a href="https://doi.org/10.5066/F7PV6JNV" target="_blank" rel="noreferrer">USGS Slab2 2018</a> · <a href="https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid" target="_blank" rel="noreferrer">GEBCO 2026</a>. El contrato reproducible está en <code>docs/research/CUYO_31S_PROFILE.md</code>.</p>
            </details>
          </div>
        </div>
        <EventInspector event={selected} compact />
      </div>
    </section>
  );
}
