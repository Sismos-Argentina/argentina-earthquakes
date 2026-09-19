"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { InpresFeature } from "@/lib/data/inpres";
import {
  LATITUDE_PROFILE,
  type ProfileDefinition,
  type ProfileSample,
  type ProjectedEvent,
  summarizeProfile,
} from "@/lib/profile/cuyo";
import EventInspector from "./EventInspector";

const LEFT = 56;
const TOP = 21;
const ABOVE_SEA_KM = 9;

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
  profile, events, samples, selected, status, onLatitudeChange, onPick, onClose,
}: {
  profile: ProfileDefinition;
  events: ProjectedEvent[];
  samples: ProfileSample[];
  selected: InpresFeature | null;
  status: string;
  onLatitudeChange: (latitude: number) => void;
  onPick: (event: InpresFeature) => void;
  onClose: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [availableWidth, setAvailableWidth] = useState(1100);
  const [showSlab, setShowSlab] = useState(true);
  const [fullDepth, setFullDepth] = useState(false);
  const summary = useMemo(() => summarizeProfile(events, profile), [events, profile]);
  const maxDepth = fullDepth ? summary.fullDepthKm : profile.initialDepthKm;
  const scale = profilePixelsPerKm(availableWidth, profile.lengthKm);
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
    context.fillStyle = "#0b1a20";
    context.fillRect(0, 0, width, height);
    context.font = "11px Arial";
    context.lineWidth = 1;

    for (let depth = 0; depth <= maxDepth; depth += 50) {
      context.strokeStyle = depth === 0 ? "#649dad" : "#29434a";
      context.beginPath(); context.moveTo(LEFT, y(depth)); context.lineTo(x(profile.lengthKm), y(depth)); context.stroke();
      context.fillStyle = "#b5c9c9"; context.textAlign = "right";
      context.fillText(`${depth}`, LEFT - 8, y(depth) + 4);
    }
    for (let distance = 0; distance <= profile.lengthKm; distance += 200) {
      context.strokeStyle = "#29434a";
      context.beginPath(); context.moveTo(x(distance), y(0)); context.lineTo(x(distance), y(maxDepth)); context.stroke();
      context.fillStyle = "#b5c9c9"; context.textAlign = "center";
      context.fillText(`${distance}`, x(distance), height - 9);
    }
    context.fillStyle = "#d6e5e0";
    context.textAlign = "left";
    context.fillText("A · Chile", LEFT, TOP + 5);
    context.textAlign = "right";
    context.fillText("B · Argentina", x(profile.lengthKm), TOP + 5);

    context.save();
    context.beginPath();
    context.rect(LEFT, y(-ABOVE_SEA_KM), x(profile.lengthKm) - LEFT, y(maxDepth) - y(-ABOVE_SEA_KM));
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
  }, [events, samples, selected, showSlab, fullDepth, maxDepth, width, height, scale, dpr, profile.lengthKm]);

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
    <section className="sectionMode" aria-label={`Explorar el subsuelo en un perfil andino a ${formatLatitude(profile.latitude)}`}>
      <header className="sectionModeHeader">
        <button className="sectionBack" onClick={onClose}>← Volver al mapa</button>
        <div>
          <p className="eyebrow">Explorar el subsuelo · perfil andino</p>
          <h2>Sección científica · {formatLatitude(profile.latitude)}</h2>
        </div>
        <span className="sectionModeTag">INPRES + GEBCO + USGS Slab2</span>
      </header>

      <div className="sectionContext">
        <div className="sectionContextCopy">
          <div className="sectionRoute"><b>A · Chile</b><span>→ Andes → {regionLabel(profile.latitude)} →</span><b>B · interior continental</b></div>
          <p><strong>{status ? "Recalculando hipocentros" : `${summary.total.toLocaleString("es-AR")} hipocentros`}</strong> del catálogo dentro de una franja de <strong>±{profile.halfWidthKm} km</strong>. Se proyectan sobre A–B; no ocurrieron todos sobre esa línea.</p>
          <small>A (−73°, {formatLatitude(profile.latitude)}) → B (−61°, {formatLatitude(profile.latitude)}) · {profile.lengthKm.toFixed(1)} km sobre WGS84</small>
          <div className="profileLatitudeControl">
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
              <button type="button" aria-pressed={profile.latitude === -23} onClick={() => onLatitudeChange(-23)}>Jujuy · 23°S</button>
            </div>
          </div>
          <p className={profile.latitude === -31 ? "profileValidation profileValidation--audited" : "profileValidation"}>
            {profile.latitude === -31
              ? "Perfil Cuyo 31°S: selección auditada y reproducible."
              : "Perfil exploratorio: conserva el método validado, pero esta latitud no tiene todavía cotejo independiente."}
          </p>
        </div>
        <div className="sectionMapSlot" aria-label="Contexto espacial: Chile, Argentina, perfil A–B y corredor de 100 km">
          <div className="sectionMiniDiagram">A · Chile ━━━ Andes ━━━ {regionLabel(profile.latitude)} ━━━ B<br />Franja seleccionada: 50 km a cada lado de A–B</div>
          <span>Arrastrá la franja hacia el norte o el sur</span>
          <small>El gráfico se recalcula al soltar. También podés usar el control de latitud.</small>
        </div>
      </div>

      <div className={`sectionPrimary${status ? " sectionPrimary--updating" : ""}`}>
        <div className="sectionPrimaryHeading">
          <strong>De la superficie al subsuelo</strong>
          <span>Profundidad positiva hacia abajo · comparación vertical nominal</span>
        </div>
        <div className="sectionPlot" ref={frame}>
          {status ? <div className="sectionPlotStatus" role="status">{status}</div> : null}
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
            <button aria-pressed={fullDepth} onClick={() => setFullDepth(!fullDepth)}>{fullDepth ? `Volver a 0–${profile.initialDepthKm} km` : `Rango completo · ${summary.outsideInitialDepth} fuera de ${profile.initialDepthKm} km`}</button>
          </div>
          <div className="sectionDetails">
            <details>
              <summary>¿Qué estoy viendo?</summary>
              <p>Esta vista lateral reúne sismos catalogados hasta 50 km a cada lado de A–B y los proyecta sobre el perfil. La posición inicial Cuyo 31°S permite comparar la sismicidad intermedia con la geometría general representada por Slab2. Al moverla, la comparación es exploratoria y no clasifica cada sismo.</p>
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
