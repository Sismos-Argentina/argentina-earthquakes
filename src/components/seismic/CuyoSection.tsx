"use client";
import { eventColorCss, type EventColorMode } from "@/lib/geo/event-colors";
import ColorLegend from "./ColorLegend";
import EventList from "./EventList";
import {emptyEventList,inPlotBox,plotBox,type EventListState,type PlotBox} from "@/lib/selection/events";
import {fitProfilePlot} from "@/lib/profile/plot-layout";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { InpresFeature } from "@/lib/data/inpres";
import {
  LATITUDE_PROFILE,
  CUYO_LENGTH_KM,
  type ProfileDefinition,
  type ProfileSample,
  type ProjectedEvent,
  summarizeProfile,
  profileKey,
} from "@/lib/profile/cuyo";
import EventInspector from "./EventInspector";
import EventHover from "./EventHover";
import GuidedDiscovery from "@/components/story/GuidedDiscovery";
import guide from "@/data/flat-slab-guide.json";
import type { CatalogFilters } from "@/lib/filters/catalog";

const LEFT = 56;
const TOP = 21;
const ABOVE_SEA_KM = 9;
const PALETTES = {
  dark: { background: "#080f14", grid: "#344851", sea: "#c8e7eb", text: "#f0f6fa", boundary: "#c4d2dc", shallow: "#f5a957", intermediate: "#52c7de", deep: "#b894ed", slab: "#ffe7a3", uncertainty: "rgba(244,217,127,.12)", gebco: "#90c48f", selected: "#ffffff" },
};


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

type SectionCollection = {key:string;box:PlotBox|null;list:EventListState;selecting:boolean};
export type SectionOptions = { showSlab: boolean; fullDepth: boolean; minimumMagnitude: number | null; theme: "dark";collection?:SectionCollection };
export default function CuyoSection({
  colorMode="depth", onColorMode, profile, events, samples, selected, status, onLatitudeChange, onPick, onClose, guidedIndex = null, onGuideChange,
  inheritedFilters = false, includeProvisional = false, catalogFilters, onResetFilters, onClearSelection, onChooseProfile,
  initialOptions, onOptionsChange, onStartTutorial, demonstration = false, reducedMotion = false,
}: {
  colorMode?:EventColorMode;
  onColorMode?:(mode:EventColorMode)=>void;
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
  onClearSelection: () => void;
  onChooseProfile: () => void;
  initialOptions?: SectionOptions; onOptionsChange?: (options: SectionOptions) => void; onStartTutorial?: () => void;
  demonstration?: boolean;
  reducedMotion?: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const mainColumn = useRef<HTMLDivElement>(null);
  const mapSlot = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const listAnchor=useRef<HTMLDivElement>(null);
  const tabId=useId();
  const rangeClick=useRef(false);
  const drag=useRef<{id:number;start:[number,number];x:number;y:number}|null>(null);
  const [dragRange,setDragRange]=useState<PlotBox|null>(null);
  const revealFrame = useRef(0);
  useEffect(()=>()=>cancelAnimationFrame(revealFrame.current),[]);
  const [availableWidth, setAvailableWidth] = useState(1100);
  const [showSlab, setShowSlab] = useState(initialOptions?.showSlab ?? true);
  const [fullDepth, setFullDepth] = useState(initialOptions?.fullDepth ?? true);
  const [minimumMagnitude, setMinimumMagnitude] = useState<number | null>(initialOptions?.minimumMagnitude ?? null);
  const key=profileKey(profile);
  const blankCollection=useMemo<SectionCollection>(()=>({key,box:null,list:emptyEventList(),selecting:false}),[key]);
  const [storedCollection,setCollection]=useState<SectionCollection>(initialOptions?.collection??blankCollection);
  const collection=useMemo(()=>storedCollection.key===key?storedCollection:{...blankCollection,list:{...blankCollection.list,open:storedCollection.list.open}},[storedCollection,key,blankCollection]);
  const listActive=!demonstration&&collection.list.open;
  const theme="dark" as const;
  const options = useMemo(() => ({showSlab,fullDepth,minimumMagnitude,theme,collection}),[showSlab,fullDepth,minimumMagnitude,theme,collection]);
  useLayoutEffect(() => { onOptionsChange?.(options); },[options,onOptionsChange]);
  const [hovered, setHovered] = useState<{ event: InpresFeature; x: number; y: number } | null>(null);
  const [plotHeight,setPlotHeight] = useState(300);
  const [viewport,setViewport] = useState({width:1100,height:900});
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
  const collectionRows=useMemo(()=>visibleEvents.filter(row=>row.feature.properties.profundidad<=maxDepth&&(!collection.box||inPlotBox(row,collection.box))),[visibleEvents,maxDepth,collection.box]);
  const markedIds=useMemo(()=>new Set(collection.list.checked.length<=500?collection.list.checked:[]),[collection.list.checked]);
  const drawnCount = visibleEvents.filter(({ feature }) => feature.properties.profundidad <= maxDepth).length;
  const comparisonLength = guidedIndex !== null ? CUYO_LENGTH_KM : profile.lengthKm;
  const {scale,width,height}=fitProfilePlot(availableWidth,!demonstration?(viewport.width>=1000?1100:Math.max(200,viewport.height*.46)):plotHeight,comparisonLength,maxDepth);
  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);

  useLayoutEffect(()=>{
    const slot=mapSlot.current,root=slot?.closest<HTMLElement>(".viewer");
    if(!slot||!root||demonstration)return;
    const measure=()=>{
      const box=slot.getBoundingClientRect(),parent=root.getBoundingClientRect();
      if(!box.width||!box.height)return;
      root.style.setProperty("--section-map-left",`${box.left-parent.left+root.scrollLeft+12}px`);
      root.style.setProperty("--section-map-top",`${box.top-parent.top+root.scrollTop+12}px`);
      root.style.setProperty("--section-map-width",`${Math.max(1,box.width-24)}px`);
      root.style.setProperty("--section-map-height",`${Math.max(1,box.height-84)}px`);
      // The minimap is a sibling WebGL surface above the section stacking
      // context. Clip the part that would otherwise paint over its sticky card.
      const mapTop=box.top+12,mapHeight=Math.max(1,box.height-84);
      const inspector=root.querySelector<HTMLElement>(".sectionInspector")?.getBoundingClientRect();
      const covers=inspector&&inspector.left<box.right-12&&inspector.right>box.left+12&&inspector.top<mapTop+mapHeight;
      const clipTop=Math.min(mapHeight,Math.max(0,parent.top-mapTop,covers?inspector.bottom+8-mapTop:0));
      const clipBottom=Math.min(mapHeight,Math.max(0,mapTop+mapHeight-parent.bottom));
      root.style.setProperty("--section-map-clip-top",`${clipTop}px`);
      root.style.setProperty("--section-map-clip-bottom",`${clipBottom}px`);
    };
    // The slot can move without resizing when an earlier explanation opens.
    measure();const observer=new ResizeObserver(measure);observer.observe(slot);observer.observe(root);
    const context=slot.closest(".sectionContext");if(context)observer.observe(context);
    for(const selector of [".sectionMain",".sectionSidebar",".sectionInspector"]){const element=root.querySelector(selector);if(element)observer.observe(element);}
    const layoutFrame=requestAnimationFrame(measure);
    window.addEventListener("resize",measure);window.addEventListener("scroll",measure,true);
    return()=>{cancelAnimationFrame(layoutFrame);observer.disconnect();window.removeEventListener("resize",measure);window.removeEventListener("scroll",measure,true);for(const name of ["left","top","width","height","clip-top","clip-bottom"])root.style.removeProperty(`--section-map-${name}`);};
  },[demonstration,selected?.properties.id,width,height,collection.list.open]);

  useEffect(() => {
    const main=mainColumn.current,plot=frame.current;
    if (!main||!plot) return;
    const measure=() => {
      setAvailableWidth(Math.max(180,main.clientWidth-2));
      if (demonstration&&plot.clientHeight>0) setPlotHeight(plot.clientHeight);
      setViewport({width:window.innerWidth,height:window.innerHeight});
    };
    measure();const observer = new ResizeObserver(measure);
    observer.observe(main);
    if(demonstration)observer.observe(plot);
    window.addEventListener("resize",measure);
    return () => {observer.disconnect();window.removeEventListener("resize",measure);};
  }, [demonstration]);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const x = (km: number) => LEFT + km * scale;
    const y = (depthKm: number) => TOP + (ABOVE_SEA_KM + depthKm) * scale;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = palette.background;
    context.fillRect(0, 0, width, height);
    context.font = "12px Arial";
    context.lineWidth = 1;

    // Bandas descriptivas; no representan superficies ni límites geológicos.
    for (const [from, to, color] of [[0, 70, "rgba(245,169,87,.055)"], [70, 300, "rgba(82,199,222,.055)"], [300, maxDepth, "rgba(184,148,237,.06)"]] as const) {
      if (from >= maxDepth) continue;
      context.fillStyle = color;
      context.fillRect(LEFT, y(from), profile.lengthKm * scale, (Math.min(to, maxDepth) - from) * scale);
    }

    const depthStep=Math.max(50,Math.ceil(24/scale/50)*50);
    for (let depth = 0; depth <= maxDepth; depth += depthStep) {
      context.strokeStyle = depth === 0 ? palette.sea : palette.grid;
      context.beginPath(); context.moveTo(LEFT, y(depth)); context.lineTo(x(profile.lengthKm), y(depth)); context.stroke();
      context.fillStyle = palette.text; context.textAlign = "right";
      context.fillText(`${depth}`, LEFT - 8, y(depth) + 4);
    }
    for (let distance = 0; distance <= profile.lengthKm; distance += Math.max(100,Math.ceil(55/scale/100)*100)) {
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
    context.fillText(profile.custom ? "A · inicio" : "A · Chile", LEFT, TOP + 5);
    context.textAlign = "right";
    context.fillText(profile.custom ? "B · final" : "B · Argentina", x(profile.lengthKm), TOP + 5);

    context.save();
    context.beginPath();
    context.rect(LEFT, y(-ABOVE_SEA_KM), x(profile.lengthKm) - LEFT, y(maxDepth) - y(-ABOVE_SEA_KM));
    context.clip();

    // Todos los registros habilitados, sin cupo: la transparencia muestra densidad.
    const pointSize = visibleEvents.length <= 500 ? 4 : visibleEvents.length <= 5000 ? 2 : 1.4;
    context.globalAlpha = visibleEvents.length <= 500 ? 0.85 : 0.4;
    for (const event of visibleEvents) {
      const depth = event.feature.properties.profundidad;
      if (depth > maxDepth) continue;
      context.fillStyle = eventColorCss(colorMode==="depth"?depth:event.feature.properties.magnitud,colorMode);
      context.fillRect(x(event.alongKm) - pointSize / 2, y(depth) - pointSize / 2, pointSize, pointSize);
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
    if(markedIds.size){context.strokeStyle="#fff";context.lineWidth=1.2;for(const row of visibleEvents){if(markedIds.has(row.feature.properties.id)&&row.feature.properties.profundidad<=maxDepth){context.beginPath();context.arc(x(row.alongKm),y(row.feature.properties.profundidad),4,0,Math.PI*2);context.stroke();}}}
    if (selectedPoint && selectedPoint.feature.properties.profundidad <= maxDepth) {
      const px = x(selectedPoint.alongKm), py = y(selectedPoint.feature.properties.profundidad);
      context.strokeStyle = palette.selected;
      context.lineWidth = 2;
      context.beginPath(); context.arc(px, py, 7, 0, Math.PI * 2); context.stroke();
      context.fillStyle = palette.selected;
      context.beginPath(); context.arc(px, py, 2, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }, [visibleEvents, samples, selected, showSlab, fullDepth, maxDepth, width, height, scale, dpr, profile.lengthKm, profile.custom, palette, colorMode, demonstration, theme,markedIds]);

  const exportPng = () => {
    if (!canvas.current || status) return;
    const output = document.createElement("canvas");
    const exportWidth = Math.max(width, 800);
    const header = 110, footer = 190;
    output.width = Math.round(exportWidth * dpr); output.height = Math.round((header + height + footer) * dpr);
    const ctx = output.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.fillStyle = palette.background; ctx.fillRect(0, 0, exportWidth, header + height + footer);
    ctx.fillStyle = palette.text; ctx.font = "bold 19px Arial";
    ctx.fillText(`Bajo nuestros pies · Corte del subsuelo · ${profile.custom ? "A–B" : formatLatitude(profile.latitude)}`, 20, 32);
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
    const ramp=ctx.createLinearGradient(20,0,250,0);
    for(const value of colorMode==="depth"?[0,30,70,150,300,600,750]:[1,3,5,7,9])ramp.addColorStop(colorMode==="depth"?value/750:(value-1)/8,eventColorCss(value,colorMode));
    ctx.fillStyle=ramp;ctx.fillRect(20,y+10,230,10);ctx.fillStyle=palette.text;ctx.fillText(colorMode==="depth"?"Profundidad 0–750 km · color continuo":"Magnitud reportada M1–9 · color continuo",20,y+36);
    const legend = [[palette.gebco, "GEBCO"], [palette.slab, showSlab ? "Nazca · Slab2" : "Slab2 oculto"]];
    legend.forEach(([color, label], i) => { const x = 310 + i * 180; ctx.fillStyle = color; ctx.fillRect(x, y + 14, 9, 9); ctx.fillStyle = palette.text; ctx.fillText(label, x + 14, y + 23); });
    wrapped("INPRES: profundidades catalogadas. GEBCO 2026 y USGS Slab2 2018: modelos. Bandas de profundidad descriptivas; comparación vertical nominal, sin clasificación tectónica de eventos.", y + 49);
    ctx.fillText("Snapshot " + guide.web.date.split("-").reverse().join("/") + " · SHA256 " + guide.web.sha256, 20, y + 96);
    ctx.fillText("Fuentes y método: /metodologia/ · Slab2 doi:10.5066/F7PV6JNV · GEBCO gebco.net · INPRES inpres.gob.ar", 20, y + 116);
    ctx.fillText(`A (${profile.a.longitude.toFixed(3)}°, ${profile.a.latitude.toFixed(3)}°) → B (${profile.b.longitude.toFixed(3)}°, ${profile.b.latitude.toFixed(3)}°) · ${profile.lengthKm.toFixed(1)} km`,20,y+140);
    output.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = `bajo-nuestros-pies-corte-${profile.custom ? "AB" : `${Math.abs(profile.latitude)}S`}-${theme}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  const nearestEvent = (mouse: React.MouseEvent<HTMLCanvasElement>) => {
    const x = (km: number) => LEFT + km * scale;
    const y = (depthKm: number) => TOP + (ABOVE_SEA_KM + depthKm) * scale;
    const rect = mouse.currentTarget.getBoundingClientRect();
    const px = (mouse.clientX - rect.left)*width/rect.width;
    const py = (mouse.clientY - rect.top)*height/rect.height;
    let nearest: ProjectedEvent | null = null;
    let distanceSq = 64;
    if (status) return null;
    for (const event of visibleEvents) {
      const depth = event.feature.properties.profundidad;
      if (depth > maxDepth) continue;
      const dx = x(event.alongKm) - px, dy = y(depth) - py;
      const candidate = dx * dx + dy * dy;
      if (candidate < distanceSq) { distanceSq = candidate; nearest = event; }
    }
    return nearest?.feature ?? null;
  };
  const selectedInRange = selected && visibleEvents.some(({ feature }) => feature.properties.id === selected.properties.id && feature.properties.profundidad <= maxDepth) ? selected : null;
  const pickEvent = (event: InpresFeature | null, fromPlot = true) => {
    setHovered(null);if(!event)return;onPick(event);
    if(!fromPlot||!matchMedia("(max-width:699px)").matches)return;
    cancelAnimationFrame(revealFrame.current);
    // A new selection opens a bottom sheet. Keep its point and graph above it;
    // do this only for a user pick, never while restoring a tutorial session.
    revealFrame.current=requestAnimationFrame(()=>{
      const plot=frame.current,viewer=plot?.closest<HTMLElement>(".viewer"),inspector=viewer?.querySelector(".sectionInspector");
      if(!plot||!viewer||!inspector)return;
      const box=plot.getBoundingClientRect(),bottom=window.innerHeight-inspector.getBoundingClientRect().height-24;
      if(box.bottom>bottom||box.top<8)viewer.scrollBy({top:box.top-Math.max(8,(bottom-box.height)/2),behavior:reducedMotion?"instant":"smooth"});
    });
  };
  const showView=(list:boolean)=>{
    setHovered(null);drag.current=null;rangeClick.current=false;setDragRange(null);
    setCollection({...collection,selecting:false,list:{...collection.list,open:list}});
  };
  const selectEvents=(selecting:boolean)=>{
    if(selecting)onClearSelection();setHovered(null);drag.current=null;rangeClick.current=false;setDragRange(null);
    setCollection({...collection,selecting,list:{...collection.list,open:false}});
  };
  const tabKey=(event:React.KeyboardEvent<HTMLButtonElement>)=>{
    const target=event.key==="Home"?false:event.key==="End"?true:["ArrowLeft","ArrowRight"].includes(event.key)?!listActive:null;
    if(target===null)return;event.preventDefault();if(target&&status)return;showView(target);
    document.getElementById(`${tabId}-${target?"list":"graph"}-tab`)?.focus({preventScroll:true});
  };
  const rangePoint=(event:React.PointerEvent<HTMLCanvasElement>):[number,number]=>{
    const box=event.currentTarget.getBoundingClientRect();
    return [Math.max(0,Math.min(profile.lengthKm,((event.clientX-box.left)*width/box.width-LEFT)/scale)),Math.max(0,Math.min(maxDepth,((event.clientY-box.top)*height/box.height-TOP)/scale-ABOVE_SEA_KM))];
  };
  const beginRange=(event:React.PointerEvent<HTMLCanvasElement>)=>{
    rangeClick.current=false;if(!collection.selecting||status)return;rangeClick.current=true;
    if(drag.current){drag.current=null;setDragRange(null);return;}
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);setHovered(null);
    const start=rangePoint(event);drag.current={id:event.pointerId,start,x:event.clientX,y:event.clientY};setDragRange(plotBox(start,start));
  };
  const endRange=(event:React.PointerEvent<HTMLCanvasElement>,cancel=false)=>{
    const current=drag.current;if(!current||current.id!==event.pointerId)return;
    drag.current=null;setDragRange(null);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(cancel||Math.abs(event.clientX-current.x)<8||Math.abs(event.clientY-current.y)<8)return;
    setCollection({...collection,box:plotBox(current.start,rangePoint(event)),selecting:false,list:{...emptyEventList(),open:true}});
  };
  const range=dragRange??collection.box;

  return (
    <section className={`sectionMode${demonstration?" sectionMode--demonstration":""}`} data-reduced-motion={reducedMotion} aria-label={profile.custom ? "Explorar el subsuelo entre los extremos elegidos A y B" : `Explorar el subsuelo en un perfil andino a ${formatLatitude(profile.latitude)}`}>
      <header className="sectionModeHeader">
        <button className="sectionBrand" aria-label="Bajo nuestros pies · volver al mapa" onClick={onClose}><span>Sismos de Argentina</span><strong>Bajo nuestros pies</strong></button>
        {onStartTutorial ? <button className="sectionBack" aria-label="Ver cómo se usa" onClick={onStartTutorial}>▶ Guía</button> : null}
        <div>
          <p className="eyebrow">Explorar el subsuelo</p>
          <h2>Corte del subsuelo · {profile.custom ? "A–B" : formatLatitude(profile.latitude)}</h2>
        </div>
        {demonstration&&onGuideChange?<nav className="tourCompare" data-tour-target="compare-sections" aria-label="Cambiar corte comparable"><button disabled={Boolean(status)} aria-pressed={guidedIndex===0} onClick={()=>onGuideChange(0)}>San Juan · 31°S</button><button disabled={Boolean(status)} aria-pressed={guidedIndex===1} onClick={()=>onGuideChange(1)}>Mendoza · 35°S</button></nav>:null}
        <span className="sectionModeTag">INPRES + GEBCO + USGS Slab2</span>
      </header>
      {demonstration?<p className="tourSectionLocation">{guide.stops[guidedIndex??0]?.title} · Chile → Andes → Argentina · franja de 100 km · profundidad 1×</p>:null}

      {!demonstration?<nav className="sectionPlotTools" aria-label="Vistas y herramientas del corte">
        <div className="sectionTabs" role="tablist" aria-label="Vista del corte">
          <button type="button" role="tab" id={`${tabId}-graph-tab`} aria-controls={`${tabId}-graph-panel`} aria-selected={!listActive} tabIndex={listActive?-1:0} onKeyDown={tabKey} onClick={()=>showView(false)}>Gráfico</button>
          <button type="button" role="tab" disabled={Boolean(status)} id={`${tabId}-list-tab`} aria-controls={`${tabId}-list-panel`} aria-selected={listActive} tabIndex={listActive?0:-1} onKeyDown={tabKey} onClick={()=>showView(true)}>Lista de sismos <span>{status?"…":collectionRows.length.toLocaleString("es-AR")}</span></button>
        </div>
        {guidedIndex!==null&&onGuideChange?<div className="sectionCompareModes" role="group" aria-label="Cambiar corte comparable"><button disabled={Boolean(status)} aria-pressed={guidedIndex===0} onClick={()=>onGuideChange(0)}>San Juan · 31°S</button><button disabled={Boolean(status)} aria-pressed={guidedIndex===1} onClick={()=>onGuideChange(1)}>Mendoza · 35°S</button></div>:null}
        {!listActive?<button disabled={Boolean(status)} aria-pressed={collection.selecting} onClick={()=>selectEvents(!collection.selecting)}>{collection.selecting?"Cancelar selección":"Seleccionar sismos"}</button>:null}
        <details className="sectionMoreActions"><summary aria-label="Más opciones del corte">Más</summary><button onClick={onChooseProfile}>Otro corte A–B ↗</button><a href="#leer-corte" onClick={()=>showView(false)}>Cómo leer el corte ↓</a></details>
      </nav>:null}
      <div className="sectionWorkspace" data-section-view={listActive?"list":"graph"}><div ref={mainColumn} className="sectionMain" style={{"--section-card-width":`${width+2}px`,"--section-canvas-height":`${height}px`} as React.CSSProperties}>

      <div className="sectionTabPanel sectionGraphPanel" role={demonstration?undefined:"tabpanel"} id={`${tabId}-graph-panel`} aria-labelledby={demonstration?undefined:`${tabId}-graph-tab`} hidden={listActive}>
      <div className={`sectionPrimary sectionPrimary--${theme}${status ? " sectionPrimary--updating" : ""}`}>
        <div className="sectionPrimaryHeading">
          <strong>De la superficie al subsuelo</strong>
          <span>Profundidad positiva hacia abajo · comparación vertical nominal</span>
        </div>
        <div className="sectionLegend sectionPlotLegend" aria-label="Leyenda del corte">
          <ColorLegend mode={colorMode} onMode={onColorMode}/>
          <button className="sectionModelToggle" role="switch" aria-label="Modelo de Nazca visible" aria-checked={showSlab} onClick={()=>setShowSlab(!showSlab)}><i aria-hidden="true"/><em className="sectionLegendSlab" aria-hidden="true" style={{background:`repeating-linear-gradient(90deg, ${palette.slab} 0 6px, transparent 6px 9px)`}}/>Nazca · Slab2</button>
          {guidedIndex===null?<button className="sectionRangeToggle" aria-pressed={fullDepth} onClick={()=>setFullDepth(!fullDepth)}>{fullDepth?`Acotar a ${profile.initialDepthKm} km`:`Rango completo · ${summary.outsideInitialDepth} fuera de ${profile.initialDepthKm} km`}</button>:null}
          <span><i className="sectionLegendGebco" style={{ background: palette.gebco }} />Relieve · modelo GEBCO</span>
          <small>La banda muestra la incertidumbre del modelo.{guidedIndex!==null?" Ambos cortes: 0–700 km.":""}</small>
        </div>

        <div className={`sectionPlot${collection.selecting?" sectionPlot--selecting":""}`} ref={frame}>
          {status ? <div className="sectionPlotStatus" role="status">{status}</div> : null}
          {!status && !visibleEvents.length ? <p className="sectionEmpty" role="status">No hay hipocentros en esta franja con los filtros actuales. Mové el perfil o restablecé los filtros.</p> : null}
          <div className="profilePlotSurface" style={{width,height}}><canvas ref={canvas} width={Math.round(width * dpr)} height={Math.round(height * dpr)} style={{ width, height }} onPointerDown={beginRange} onPointerMove={event=>{if(drag.current?.id===event.pointerId)setDragRange(plotBox(drag.current.start,rangePoint(event)));}} onPointerUp={event=>endRange(event)} onPointerCancel={event=>endRange(event,true)} onClick={mouse => {if(rangeClick.current){rangeClick.current=false;return;}if(!collection.selecting)pickEvent(nearestEvent(mouse));}} onMouseMove={mouse => { if(collection.selecting)return;const event = nearestEvent(mouse); setHovered(event ? { event, x: mouse.clientX, y: mouse.clientY } : null); }} onMouseLeave={() => setHovered(null)} role="img" aria-label={`Perfil de ${drawnCount} eventos visibles, superficie GEBCO y curva Slab2; distancia horizontal y profundidad en kilómetros a escala 1 a 1; rango 0 a ${maxDepth} km`} />
          {range&&!demonstration?<div className="plotSelectionLayer" style={{width,height}} aria-hidden="true"><i style={{left:LEFT+range[0]*scale,top:TOP+(ABOVE_SEA_KM+range[1])*scale,width:(range[2]-range[0])*scale,height:(range[3]-range[1])*scale}}/></div>:null}</div>
        </div>
        <div className="sectionAxis"><span role={collection.selecting?"status":undefined}>{collection.selecting?"Arrastrá para seleccionar sismos · cualquier dirección":"Profundidad catalogada / modelada (km) ↓"}</span><span>Distancia desde A (km) → · escala efectiva 1×</span></div>
        <div className="depthBandSummary" aria-label="Conteos por clasificación descriptiva de profundidad">
          <span>Superficial · &lt;70 km <b>{status ? "…" : summary.superficial.toLocaleString("es-AR")}</b></span>
          <span>Intermedia · 70–&lt;300 km <b>{status ? "…" : summary.intermedio.toLocaleString("es-AR")}</b></span>
          <span>Profunda · ≥300 km <b>{status ? "…" : summary.profundo.toLocaleString("es-AR")}</b></span>
          <small>Bandas descriptivas; no son límites de corteza y manto. Ambos ejes conservan la misma escala al ajustar el gráfico a la pantalla.</small>
        </div>
      </div>


      <div className="sectionBottom">
        <div className="sectionReference">
          <div className="sectionDetails" id="leer-corte">
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
      </div>
      {guidedIndex !== null && onGuideChange ? <GuidedDiscovery index={guidedIndex} events={visibleEvents} status={status} sampleDescription={sampleDescription} /> : null}
      </div>
      {!demonstration?<div ref={listAnchor} className="sectionTabPanel sectionListPanel" role="tabpanel" id={`${tabId}-list-panel`} aria-labelledby={`${tabId}-list-tab`} hidden={!listActive}>
        {status?<p className="sectionListStatus" role="status">{status}</p>:null}
        <div className="sectionListResults" hidden={Boolean(status)}>
        <EventList rows={collectionRows} state={collection.list} onState={list=>setCollection({...collection,list})} onPick={event=>pickEvent(event,false)} selectedId={selectedInRange?.properties.id}
          onClose={()=>showView(false)} onDraw={()=>selectEvents(true)} drawLabel="Seleccionar en gráfico"
          onClearRange={collection.box?()=>setCollection({...collection,box:null,list:{...collection.list,page:0,checked:[]}}):undefined}
          context={sampleDescription} rangeLabel={collection.box?`${collection.box[0].toFixed(1)}–${collection.box[2].toFixed(1)} km desde A · ${collection.box[1].toFixed(1)}–${collection.box[3].toFixed(1)} km de profundidad`:`Corredor de ${profile.halfWidthKm*2} km · profundidad 0–${maxDepth} km`}/>
        </div>
      </div>:null}
      </div><aside className="sectionSidebar" aria-label="Contexto y controles del corte">
      {selectedInRange&&!demonstration?<div className="sectionInspector sectionInspector--active" role="region" aria-label="Sismo seleccionado en el corte"><EventInspector key={selectedInRange.properties.id} event={selectedInRange} compact onClose={onClearSelection}/></div>:null}
      {listActive&&!selectedInRange?<div className="sectionListHint"><h3>Ficha del sismo</h3><p>Elegí una fila para consultar sus datos. Las casillas marcan los sismos para descargar.</p></div>:null}

      <div className="sectionContext">
        <div className="sectionContextCopy">
          {guidedIndex !== null && onGuideChange ? <div className="guideOverview">
            <h3>{guide.stops[guidedIndex]?.title}</h3>
            <p>{guide.question}</p>
            <details className="guideAnswer"><summary>La sismicidad puede continuar aunque disminuya el volcanismo · por qué</summary><p>{guide.answer} <a href={guide.sources[0].url} target="_blank" rel="noreferrer">Gao et al. (2021)</a></p></details>
          </div> : null}
          <div className="sectionRoute"><b>A</b><span>{profile.custom ? "Corte elegido en el mapa · exploratorio" : `→ Andes → ${regionLabel(profile.latitude)} →`}</span><b>B</b></div>

          {guidedIndex === null ? <p><strong>{status ? "Calculando sismos…" : `${summary.total.toLocaleString("es-AR")} sismos en la franja`}</strong></p> : null}
          <details className="profileCoordinates"><summary>Franja de {profile.halfWidthKm*2} km · cómo leer el corte</summary><p>Los sismos cercanos a A–B se proyectan sobre la línea; no ocurrieron todos sobre ella.</p><small>A ({profile.a.longitude.toFixed(2)}°, {profile.a.latitude.toFixed(2)}°) → B ({profile.b.longitude.toFixed(2)}°, {profile.b.latitude.toFixed(2)}°) · {profile.lengthKm.toFixed(1)} km sobre WGS84. Los eventos a hasta {profile.halfWidthKm} km de cada lado se proyectan sobre A–B; no ocurrieron todos sobre la línea.</small></details>
          <div className="profileLatitudeControl" hidden={guidedIndex !== null || profile.custom}>
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
          {profile.custom || ![-31,-35].includes(profile.latitude) ? <p className="profileValidation">Corte exploratorio: permite comparar los datos y el modelo; no determina a qué placa pertenece cada sismo.</p> : null}
        </div>
        <div ref={mapSlot} className="sectionMapSlot" aria-label="Contexto espacial: Chile, Argentina, perfil A–B y corredor de 100 km">
          <div className="sectionMiniDiagram">A · Chile ━━━ Andes ━━━ {regionLabel(profile.latitude)} ━━━ B<br />Franja seleccionada: 50 km a cada lado de A–B</div>
          <span>Norte ↑ · {profile.custom ? "A–B: extremos elegidos en el mapa" : guidedIndex === null ? "Arrastrá el mini mapa para mover la franja" : "El corte y su muestra cambian con cada parada"}</span>
          <small>{profile.custom ? "La franja incluye 50 km a cada lado; se proyecta sobre la línea central." : guidedIndex === null ? "También podés usar el control de latitud." : "31°S ↔ 35°S · misma escala 1× y rango 0–700 km."}</small>
        </div>
      </div>

      {!demonstration?<div className="sectionFilterBar">
          <label htmlFor="section-magnitude">Magnitud mínima
            <select id="section-magnitude" value={minimumMagnitude ?? "all"} onChange={(event) => setMinimumMagnitude(event.currentTarget.value === "all" ? null : Number(event.currentTarget.value))}>
              <option value="all">Todas las magnitudes</option>
              {[3.1, 3.5, 4, 5].map((value) => <option key={value} value={value}>≥ {value}</option>)}
            </select>
          </label>

          <button className="sectionExportPng" disabled={Boolean(status)} onClick={exportPng}>Descargar corte PNG</button>
          <button onClick={() => { setMinimumMagnitude(null); setFullDepth(true); setShowSlab(true); onResetFilters(); frame.current?.scrollTo({ left: 0, top: 0 }); }}>Restablecer corte y filtros</button>
          <p role="status">{status ? "Recalculando conteos…" : `${drawnCount.toLocaleString("es-AR")} visibles · ${(events.length - visibleEvents.length).toLocaleString("es-AR")} filtrados por magnitud · ${(visibleEvents.length - drawnCount).toLocaleString("es-AR")} fuera del rango vertical`}</p>
          <small>{inheritedFilters ? "También se aplican los filtros del mapa. " : "Período completo del catálogo. "}{includeProvisional ? "Registro en revisión incluido." : "Se aplica la exclusión provisional de calidad; no hay límite de cantidad."}</small>
        </div>:null}
      </aside></div>
      {hovered && hovered.event.properties.id !== selectedInRange?.properties.id ? <EventHover {...hovered} /> : null}
    </section>
  );
}
