"use client";
import {useEffect,useRef,useState,useSyncExternalStore} from "react";
import FiltersPanel from "./FiltersPanel";
import type {ViewerControlProps as Props, ControlPanel} from "./controls-types";
import ColorLegend from "./ColorLegend";
import {VIEWER_UI_RESTORED} from "@/lib/ui/viewer-ui";
import snapshot from "@/data/catalog-snapshot.json";

const subscribeTall=(fn:()=>void)=>{const q=matchMedia("(min-width: 900px) and (min-height: 900px)");q.addEventListener("change",fn);return()=>q.removeEventListener("change",fn);};
const readTall=()=>matchMedia("(min-width: 900px) and (min-height: 900px)").matches;
const date=(s:string)=>s.split("-").reverse().join("/");
type IconName="list"|"zone"|"cut"|"compare"|"layers"|"camera"|"home"|"filter"|"book"|"info";
export function MapIcon({name}:{name:IconName}){
 const paths:Record<IconName,React.ReactNode>={
  list:<><path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/></>,
  zone:<><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 2"/><path d="m8 15 4 2 5-7"/></>,
  cut:<><path d="M3 5h18v14H3zM3 14l6-4 5 5 7-7M5 21 19 3"/></>,
  compare:<><path d="M3 5h7v14H3zM14 5h7v14h-7zM5 14l3-5m8 4 3 3"/></>,
  layers:<><path d="m3 8 9-5 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  camera:<><path d="M20 10a8 8 0 0 0-14-4L3 9m0-6v6h6M4 14a8 8 0 0 0 14 4l3-3m0 6v-6h-6"/></>,
  home:<><path d="m3 11 9-8 9 8M6 9v11h12V9M10 20v-6h4v6"/></>,
  filter:<><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/></>,
  book:<><path d="M12 5v15M3 4h5l4 2 4-2h5v14h-5l-4 2-4-2H3z"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v2"/></>,
 };
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function MovementOptions(p:Props){
 return <div className="movementOptions"><p className="studioNote">Rueda o dos dedos para acercar. El arrastre gira la vista.</p><div className="studioCameraGrid">{[["turntable","Girar"],["pan","Mover"],["zoom","Acercar"],["orbital","Giro libre"]].map(([id,label])=><button key={id} aria-pressed={p.navigationMode===id} onClick={()=>p.actions?.setNavigationMode(id as Props["navigationMode"])}>{label}</button>)}</div><p className="studioNote">Giro libre es opcional; Girar mantiene la vertical fija.</p></div>;
}
function MotionOptions(p:Props){ return <section className="studioMotion"><label><span>Animar cámara y modelos</span><input type="checkbox" role="switch" aria-label="Animar cámara y modelos" checked={!p.reducedMotion} onChange={e=>p.onReducedMotion(!e.target.checked)}/></label><p className="studioNote">{p.reducedMotion?"Movimiento reducido: vistas directas, sin recorridos automáticos.":"Transiciones suaves; podés interrumpirlas al mover el mapa."}{p.systemReducedMotion?" Tu sistema solicita movimiento reducido. Podés desactivar las animaciones con este control.":""}</p></section>; }
export default function MapControls(p:Props){
 const {onPanel,panel:currentPanel,tutorialCue}=p;
 const [dockPinned,setDockPinnedState]=useState(()=>typeof document!=="undefined"&&document.documentElement.dataset.toolsPinned==="true");
 const setDockPinned=(value:boolean)=>{document.documentElement.dataset.toolsPinned=String(value);setDockPinnedState(value);};
 useEffect(()=>{
  const sync=()=>setDockPinnedState(document.documentElement.dataset.toolsPinned==="true");
  window.addEventListener(VIEWER_UI_RESTORED,sync);return()=>window.removeEventListener(VIEWER_UI_RESTORED,sync);
 },[]);
 const tall=useSyncExternalStore(subscribeTall,readTall,()=>false),panel=useRef<HTMLElement>(null),trigger=useRef<HTMLElement|null>(null);
 const active=p.panel==="filters"||p.panel==="layers"||p.panel==="camera"||p.panel==="information";
 const [displayPanel,setDisplayPanel]=useState(currentPanel);
 useEffect(()=>{
  const timer=setTimeout(()=>setDisplayPanel(currentPanel),currentPanel?0:180);
  return()=>clearTimeout(timer);
 },[currentPanel]);
 const renderedPanel=active?currentPanel:displayPanel;
 const rendered=renderedPanel&&renderedPanel!=="navigation";
 const close=()=>{p.onPanel(null);requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));};
 const closeTouchTools=()=>{if(matchMedia("(max-width:799px)").matches)setDockPinned(false);};
 const run=(fn:()=>void)=>{closeTouchTools();p.onPanel(null);fn();};
 const toggle=(value:ControlPanel,el:HTMLElement)=>{closeTouchTools();trigger.current=el;p.onPanel(p.panel===value?null:value);};
 useEffect(()=>{
  if(!active||tutorialCue)return;
  const frame=requestAnimationFrame(()=>panel.current?.focus());
  const key=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();onPanel(null);trigger.current?.focus();}
   if(event.key==="Tab"&&matchMedia("(max-width:799px)").matches){
    const items=[...panel.current?.querySelectorAll<HTMLElement>("button:not(:disabled),input,select,a[href]")??[]].filter(e=>e.getClientRects().length),first=items[0],last=items.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  };
  document.addEventListener("keydown",key);return()=>{cancelAnimationFrame(frame);document.removeEventListener("keydown",key);};
 },[active,currentPanel,onPanel,tutorialCue]);
 const count=p.filters&&p.bounds?Number(p.filters.dateFrom!==p.bounds.dateFrom||p.filters.dateTo!==p.bounds.dateTo)+Number(p.filters.magnitudeMin!==p.bounds.magnitudeMin||p.filters.magnitudeMax!==p.bounds.magnitudeMax)+Number(p.filters.depthMin!==p.bounds.depthMin||p.filters.depthMax!==p.bounds.depthMax):0;
 const names={filters:"Elegí tu muestra",layers:"Capas del territorio",camera:"Mové la mirada",information:"Explorá con contexto",navigation:"Explorar"};
 const tools:{icon:IconName;label:string;title:string;disabled?:boolean;action:()=>void;panel?:ControlPanel}[]=[
  {icon:"zone",label:"Zona 3D",title:"Elegir una zona y abrirla en 3D",disabled:!p.ready||!p.surfaceReady,action:()=>run(()=>p.actions?.chooseArea("region"))},
  {icon:"cut",label:"Corte A–B",title:"Dibujar un corte del subsuelo",disabled:!p.analysisReady,action:()=>run(()=>{p.onLeaveGuide();p.actions?.chooseArea("profile");})},
  {icon:"compare",label:"Comparar",title:"Comparar San Juan y Mendoza",disabled:!p.analysisReady,action:()=>run(()=>p.onGuide?.())},
  {icon:"list",label:"Lista",title:"Lista de sismos y descarga CSV",disabled:!p.ready,action:()=>run(p.onList)},
  {icon:"layers",label:"Capas",title:"Capas del mapa",disabled:!p.surfaceReady||p.map2d,panel:"layers",action:()=>{}},
  {icon:"camera",label:"Cámara",title:"Cámara y animaciones",panel:"camera",action:()=>{}},
  {icon:"info",label:"Ayuda",title:"Información y fuentes",panel:"information",action:()=>{}},
 ];
 return <>
  <header className="viewerBar studioBar" data-viewer-control>
   <button className="studioBrand" aria-label="Bajo nuestros pies · ir al inicio" title="Volver al inicio" onClick={()=>run(()=>{p.onLeaveGuide();p.actions?.resetCamera();})}><span className="studioMark" aria-hidden="true"><i/><i/><i/></span><div><span className="studioEyebrow">Sismos de Argentina</span><h1>Bajo nuestros pies</h1><span className="studioStatus" role="status">{p.count?<><strong>{p.visible.toLocaleString("es-AR")}</strong> {p.visible===1?"sismo":"sismos"}</>:"Cargando catálogo…"}</span></div></button>
   <nav className="studioMode" aria-label="Vista del territorio"><button data-tour-target="map-2d" aria-pressed={p.map2d} disabled={!p.ready} onClick={()=>run(()=>p.actions?.showPlan(true))}>Mapa <b>2D</b></button><button aria-pressed={!p.map2d} disabled={!p.ready} onClick={()=>run(()=>p.actions?.showPlan(false))}>Subsuelo <b>3D</b></button></nav>
   <div className="studioHeaderActions">{p.onTutorial?<button className="studioTourLaunch" data-tour-target="launch" disabled={!p.analysisReady} onClick={p.onTutorial}>▶ Guía</button>:null}<a className="studioHistory" href="/memoria/" aria-label="Memoria histórica" title="Memoria histórica"><MapIcon name="book"/><span>Memoria</span></a><button className="studioFilterTrigger" aria-expanded={p.panel==="filters"} aria-controls="studio-panel" onClick={e=>toggle("filters",e.currentTarget)}><MapIcon name="filter"/><span>Filtros</span>{count?<b>{count}</b>:null}</button></div>
  </header>
  <nav className="studioDock" aria-label="Herramientas de exploración" data-pinned={dockPinned} data-viewer-control><button className="dockToggle" aria-label={dockPinned?"Contraer herramientas":"Expandir y fijar herramientas"} aria-expanded={dockPinned} onClick={()=>setDockPinned(!dockPinned)}><span aria-hidden="true">{dockPinned?"‹":"☰"}</span><span className="dockName">Explorar</span></button>{tools.map(t=><button data-tool={t.icon} key={t.icon} title={t.title} aria-label={t.title} aria-expanded={t.panel?p.panel===t.panel:undefined} aria-controls={t.panel?"studio-panel":undefined} disabled={t.disabled} onClick={e=>t.panel?toggle(t.panel,e.currentTarget):t.action()}><MapIcon name={t.icon}/><span>{t.label}</span></button>)}</nav>

  {rendered?<><button className="studioScrim" aria-label="Cerrar panel" onClick={close}/><aside ref={panel} className="studioPanel" data-closing={!active} data-viewer-control id="studio-panel" role="dialog" aria-label={names[renderedPanel!]} aria-modal={!tutorialCue&&typeof window!=="undefined"&&matchMedia("(max-width:799px)").matches} tabIndex={-1}>
   <header key={renderedPanel} className="studioPanelHeader"><div><span className="studioEyebrow">{renderedPanel==="filters"?"Tu catálogo":renderedPanel==="layers"?"Datos y modelos":"Exploración"}</span><h2>{names[renderedPanel!]}</h2></div><button aria-label="Cerrar panel" onClick={close}>×</button></header>
   {renderedPanel==="filters"&&p.filters&&p.bounds?<FiltersPanel key={JSON.stringify(p.filters)} filters={p.filters} bounds={p.bounds} wide={tall} initialState={p.filterEditor} onStateChange={p.onFilterEditor} onApply={v=>run(()=>p.onFilters(v))}/>:null}
   {renderedPanel==="layers"?<div className="studioPanelBody">
    <section className="studioLayer"><div className="studioLayerTitle"><span className="studioLayerSymbol terrainSymbol"/><div><h3>Superficie</h3><p>Relieve GEBCO · límites IGN</p></div><span className="studioTag">Modelo</span></div><label>Visibilidad <output>{Math.round(p.terrainOpacity*100)}%</output><input aria-label="Opacidad de la superficie" type="range" min=".1" max="1" step=".1" value={p.terrainOpacity} onChange={e=>p.onTerrainOpacity(Number(e.target.value))}/></label><label>Exageración del relieve<select aria-label="Exageración del relieve" value={p.relief} onChange={e=>p.actions?.setRelief(Number(e.target.value) as 1|5|10)}>{[1,5,10].map(n=><option key={n} value={n}>{n}×</option>)}</select></label></section>
    <section className="studioLayer"><div data-tour-target="nazca" className="studioLayerTitle"><span className="studioLayerSymbol slabSymbol"/><div><h3>Placa de Nazca</h3><p>Superficie superior · USGS Slab2</p></div><input aria-label="Mostrar placa de Nazca" type="checkbox" role="switch" checked={p.slabVisible} disabled={!p.slabAvailable} onChange={()=>p.actions?.toggleSlab()}/></div>{p.slabVisible?<label>Visibilidad <output>{Math.round(p.slabOpacity*100)}%</output><input aria-label="Opacidad Slab2" type="range" min=".1" max=".8" step=".05" value={p.slabOpacity} onChange={e=>p.actions?.setSlabOpacity(Number(e.target.value))}/></label>:null}<button className="studioRevealAction" disabled={!p.slabVisible||p.reducedMotion} onClick={()=>p.actions?.replaySlab()}>▷ Recorrer modelo</button><p className="studioNote">Revelado desde Chile hacia el interior; no simula el movimiento de la placa. La cercanía a un sismo no determina su origen tectónico.</p></section>

    <div className="studioFootnote">Profundidad a escala 1×.<br/>El relieve puede estar exagerado para facilitar su lectura.</div>
   </div>:null}
   {renderedPanel==="camera"?<div className="studioPanelBody"><MovementOptions {...p}/><MotionOptions {...p}/><button className="studioTextAction" onClick={()=>run(()=>p.actions?.setCameraView("territory"))}>Encuadrar todo el territorio ↗</button></div>:null}
   {renderedPanel==="information"?<div className="studioPanelBody"><h3>¿Qué hay bajo nuestros pies?</h3><p className="studioLead">Explorá dónde ocurren los sismos y cómo se distribuyen en profundidad.</p><div className="studioInfoRow"><b>01</b><p><strong>Elegí un territorio</strong><span>Entrá al mapa 2D y dibujá una zona para abrirla en 3D.</span></p></div><div className="studioInfoRow"><b>02</b><p><strong>Mirá de costado</strong><span>Consultá un hipocentro y comparalo con el modelo de Nazca.</span></p></div><div className="studioInfoRow"><b>03</b><p><strong>Hacé un corte</strong><span>Leé una sección A–B o compará San Juan y Mendoza.</span></p></div>{p.onTutorial?<button className="studioTextAction" data-tour-target="launch" disabled={!p.analysisReady} onClick={p.onTutorial}>▶ Ver cómo se usa · 50 segundos</button>:null}<a className="studioTextAction" href="/metodologia/">Datos, fuentes y metodología ↗</a><p className="studioNote">INPRES: catálogo de sismos.<br/>GEBCO y Slab2: modelos externos.<br/>No es una alerta ni una estimación de riesgo.</p>{p.filters?<details className="studioQuality"><summary>Criterio de revisión del catálogo</summary><p>Un registro M8 de 2019 se excluye provisionalmente por discrepancias entre fuentes; el original se conserva.</p><label><input type="checkbox" checked={Boolean(p.filters.includeProvisional)} onChange={e=>p.onFilters({...p.filters!,includeProvisional:e.target.checked})}/> Incluir el registro en revisión</label></details>:null}</div>:null}
  </aside></>:null}
  <footer className="studioFooter" data-viewer-control><div data-tour-target="depth-legend"><ColorLegend mode={p.colorMode} onMode={p.onColorMode}/></div>{!p.map2d?<div className="studioViewAction"><button data-tour-target="depth-view" onClick={()=>run(()=>{p.actions?.showPlan(false);p.actions?.setCameraView(p.depthView?"above":"side");})}><span aria-hidden="true">{p.depthView?"↥":"↦"}</span>{p.depthView?"Ver superficie":"Ver profundidad"}</button></div>:null}<div className="studioProvenance"><span>{p.filters?`${date(p.filters.dateFrom)} — ${date(p.filters.dateTo)}`:date(snapshot.date)}</span><small>INPRES{p.map2d?" · ubicación en superficie":` · profundidad 1× · relieve ${p.relief}×`}{p.reducedMotion?" · movimiento reducido":""}</small></div></footer>
 </>;
}
