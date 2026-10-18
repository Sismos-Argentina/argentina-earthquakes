"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import geographiclib from "geographiclib-geodesic";
import type { InpresFeature } from "@/lib/data/inpres";
import type { CartographyArtifact } from "@/lib/data/cartography";
import { geographicToScene, sceneToGeographic } from "@/lib/geo/scene-coordinates";
import { regionBounds, type RegionBounds } from "@/lib/geo/region";
import places from "@/data/place-labels.json";
import EventHover from "./EventHover";
import { eventColorCss, type EventColorMode } from "@/lib/geo/event-colors";
import { constrainPlanView } from "@/lib/geo/navigation-limits";

type View = { x: number; z: number; span: number };
export type PlanViewSession = { view: View; preview: [[number,number],[number,number]] | null; previewReady: boolean; drawing: boolean; coordinatesOpen: boolean; coordinates: number[]; message: string };
export default function PlanView({ events, cartography, selection, region, onRegion, onProfile, onPick, onCancel, colorMode = "depth", initialState, onStateChange, demonstration }: {
  events: InpresFeature[]; cartography: CartographyArtifact; selection: "region" | "profile" | null;
  region: RegionBounds | null; colorMode?:EventColorMode;
  onRegion: (bounds: RegionBounds) => void; onProfile: (a: [number,number], b: [number,number]) => void;
  onPick: (event: InpresFeature) => void; onClose: () => void; onCancel: () => void;
  initialState?: PlanViewSession; onStateChange?: (state: PlanViewSession) => void;
  demonstration?: { bounds: RegionBounds; context: RegionBounds; progress: number; select: boolean };
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const coordinateBox = useRef<HTMLDivElement>(null);
  const coordinateTrigger = useRef<HTMLButtonElement>(null);
  const [size,setSize] = useState({width:0,height:0});
  const [view,setView] = useState<View>(initialState?.view ?? {x:0,z:0,span:7000});
  const [preview,setPreview]=useState<[[number,number],[number,number]]|null>(initialState?.preview ?? null);
  const [previewReady,setPreviewReady]=useState(initialState?.previewReady ?? false);
  const [drawing,setDrawing]=useState(initialState?.drawing ?? Boolean(selection));
  const [coordinatesOpen,setCoordinatesOpen]=useState(initialState?.coordinatesOpen ?? false);
  const pointers=useRef(new Map<number,{x:number;y:number}>());
  const gesture=useRef<{kind:"pan"|"draw"|"pinch";id:number;x:number;y:number;view:View;a:[number,number];distance?:number}|null>(null);
  const [hover,setHover] = useState<{event:InpresFeature;x:number;y:number}|null>(null);
  const [message,setMessage] = useState(initialState?.message ?? "");
  const [coordinates,setCoordinates] = useState(initialState?.coordinates ?? (selection==="region"?[-73,-29,-61,-33]:[-73,-31,-61,-31]));
  const hoverTime = useRef(0);
  const initialized = useRef(Boolean(initialState));
  const updateView = useCallback((next: React.SetStateAction<View>) => setView(previous => constrainPlanView(typeof next === "function" ? next(previous) : next, Math.max(1,size.width)/Math.max(1,size.height))), [size.width,size.height]);
  const session = useMemo(() => ({view,preview,previewReady,drawing,coordinatesOpen,coordinates,message}),[view,preview,previewReady,drawing,coordinatesOpen,coordinates,message]);
  useLayoutEffect(() => { onStateChange?.(session); }, [session,onStateChange]);
  const displayedPreview = useMemo<[[number,number],[number,number]] | null>(() => {
    if (!demonstration?.select) return preview;
    const b=demonstration.bounds,p=demonstration.progress;
    return [[b[0],b[3]],[b[0]+(b[2]-b[0])*p,b[3]+(b[1]-b[3])*p]];
  },[demonstration,preview]);
  const displayedReady = demonstration?.select ? demonstration.progress >= 1 : previewReady;
  const closeCoordinates=()=>{setCoordinatesOpen(false);coordinateTrigger.current?.focus();};
  useEffect(()=>{if(coordinatesOpen)coordinateBox.current?.focus();},[coordinatesOpen]);
  // La proyección y la paleta no dependen de la cámara: reutilizarlas al mover el mapa.
  const points=useMemo(()=>{
    const colors=new Map<number,string>();
    return events.map(event=>{
      const [x,,z]=geographicToScene(...event.geometry.coordinates,0);
      const value=colorMode==="depth"?event.properties.profundidad:event.properties.magnitud;
      let color=colors.get(value);
      if(!color){color=eventColorCss(value,colorMode);colors.set(value,color);}
      return {event,x,z,color};
    });
  },[events,colorMode]);
  const pointLayer=useRef<{canvas:HTMLCanvasElement;points:typeof points;view:View;width:number;height:number;dpr:number}|null>(null);
  const mapLines=useMemo(()=>[
    {color:"#738e99",features:cartography.layers.naturalEarthCountries},
    {color:"#b8cdda",features:cartography.layers.ignProvinces},
  ].map(layer=>({color:layer.color,lines:layer.features.flatMap(feature=>feature.lines.map(line=>line.map(p=>{const[x,,z]=geographicToScene(...p,0);return[x,z];})))})),[cartography]);
  const scale = Math.max(1,size.width) / view.span;
  const fit = (bounds:RegionBounds) => {
    const [x0,,z0]=geographicToScene(bounds[0],bounds[3],0),[x1,,z1]=geographicToScene(bounds[2],bounds[1],0);
    updateView({x:(x0+x1)/2,z:(z0+z1)/2,span:Math.max(x1-x0,(z1-z0)*size.width/size.height)*1.08});
  };
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const observer=new ResizeObserver(()=>setSize({width:el.clientWidth,height:el.clientHeight}));
    observer.observe(el);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{if(!initialized.current&&size.width>100){initialized.current=true;
    const [x0,,z0]=geographicToScene(-78,-20,0),[x1,,z1]=geographicToScene(-53,-57,0);
    updateView({x:(x0+x1)/2,z:(z0+z1)/2,span:Math.max(x1-x0,(z1-z0)*size.width/size.height)*1.08});
  }},[size,updateView]);
  const demoContext=demonstration?.context;
  useEffect(()=>{
    if(!demoContext || !size.width || !size.height)return;
    const [x0,,z0]=geographicToScene(demoContext[0],demoContext[3],0),[x1,,z1]=geographicToScene(demoContext[2],demoContext[1],0);
    const frame=requestAnimationFrame(()=>updateView({x:(x0+x1)/2,z:(z0+z1)/2,span:Math.max(x1-x0,(z1-z0)*size.width/size.height)*1.08}));
    return()=>cancelAnimationFrame(frame);
  },[demoContext,size.width,size.height,updateView]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const wheel=(event:WheelEvent)=>{event.preventDefault();updateView(v=>({...v,span:v.span*Math.exp(Math.max(-2,Math.min(2,event.deltaY*.002)))}));};
    el.addEventListener("wheel",wheel,{passive:false});return()=>el.removeEventListener("wheel",wheel);
  },[updateView]);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
    const el=canvas.current;if(!el)return;const dpr=Math.min(window.devicePixelRatio||1,2);
    const width=Math.round(size.width*dpr),height=Math.round(size.height*dpr);
    if(el.width!==width)el.width=width;if(el.height!==height)el.height=height;
    const ink="#ffffff";
    const ctx=el.getContext("2d")!;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#081820";ctx.fillRect(0,0,size.width,size.height);
    const xy=(longitude:number,latitude:number)=>{const[x,,z]=geographicToScene(longitude,latitude,0);return[(x-view.x)*scale+size.width/2,(z-view.z)*scale+size.height/2];};
    for(const layer of mapLines){ctx.strokeStyle=layer.color;ctx.lineWidth=1;
      for(const line of layer.lines){ctx.beginPath();line.forEach(([px,pz],i)=>{const x=(px-view.x)*scale+size.width/2,y=(pz-view.z)*scale+size.height/2;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();}
    }
    const center=sceneToGeographic(view.x,view.z),step=view.span>6000?10:view.span>2000?5:view.span>500?1:.25;
    ctx.strokeStyle="rgba(207,226,238,.16)";ctx.fillStyle=ink;ctx.font="12px Arial";
    for(let lon=-100;lon<=8;lon+=step){const[x]=xy(lon,center[1]);if(x<0||x>size.width)continue;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,size.height);ctx.stroke();ctx.fillText(`${lon.toFixed(step<1?2:0)}°`,x+3,size.height-18);}
    for(let lat=-90;lat<=0;lat+=step){const[,y]=xy(center[0],lat);if(y<0||y>size.height)continue;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size.width,y);ctx.stroke();ctx.fillText(`${lat.toFixed(step<1?2:0)}°`,6,y-4);}
    // Reutilizar el dibujo de TODOS los eventos al panear o dibujar una selección.
    // El margen se vuelve a dibujar antes de salir de él; el zoom siempre recompone a su escala.
    const margin=Math.min(256,Math.max(96,size.width/4)),layerWidth=size.width+margin*2,layerHeight=size.height+margin*2;
    let layer=pointLayer.current;
    if(!layer||layer.points!==points||layer.width!==size.width||layer.height!==size.height||layer.dpr!==dpr||layer.view.span!==view.span||Math.abs(layer.view.x-view.x)*scale>margin||Math.abs(layer.view.z-view.z)*scale>margin){
      const buffer=layer?.canvas??document.createElement("canvas");
      if(buffer.width!==Math.round(layerWidth*dpr))buffer.width=Math.round(layerWidth*dpr);
      if(buffer.height!==Math.round(layerHeight*dpr))buffer.height=Math.round(layerHeight*dpr);
      const paint=buffer.getContext("2d")!;paint.setTransform(dpr,0,0,dpr,0,0);paint.clearRect(0,0,layerWidth,layerHeight);paint.globalAlpha=events.length<=500?.9:.48;
      const pointSize=events.length<=500?6:events.length<=5000?3.5:1.6;
      for(const point of points){const x=(point.x-view.x)*scale+layerWidth/2,y=(point.z-view.z)*scale+layerHeight/2;if(x<0||x>layerWidth||y<0||y>layerHeight)continue;
        paint.fillStyle=point.color;
        if(pointSize>=3){paint.beginPath();paint.arc(x,y,pointSize/2,0,Math.PI*2);paint.fill();}else paint.fillRect(x-.8,y-.8,1.6,1.6);
      }
      layer={canvas:buffer,points,view,width:size.width,height:size.height,dpr};pointLayer.current=layer;
    }
    ctx.drawImage(layer.canvas,(layer.view.x-view.x)*scale-margin,(layer.view.z-view.z)*scale-margin,layerWidth,layerHeight);
    ctx.font="600 12px Arial";
    const boxes:number[][]=[];
    for(const place of places.places){if(view.span>5500?place.rank>3:view.span>2500?place.rank>5:view.span>1000?place.rank>7:false)continue;
      const[x,y]=xy(place.longitude,place.latitude);if(x<40||x>size.width-100||y<55||y>size.height-80)continue;
      const width=ctx.measureText(place.name).width+10,box=[x+5,y-18,width,17];
      if(boxes.some(b=>box[0]<b[0]+b[2]&&box[0]+box[2]>b[0]&&box[1]<b[1]+b[3]&&box[1]+box[3]>b[1]))continue;
      boxes.push(box);ctx.fillStyle="#d5e0dc";ctx.fillRect(x-1,y-1,2,2);ctx.fillStyle="rgba(4,12,18,.86)";ctx.fillRect(...box as [number,number,number,number]);ctx.fillStyle=ink;ctx.fillText(place.name,x+10,y-5);
    }
    for(const[name,lon,lat]of[["Islas Malvinas",-59,-51.7],["Tierra del Fuego",-67.6,-54.5],["Antártida Argentina",-49.5,-82]]as const){const[x,y]=xy(lon,lat);ctx.fillStyle=ink;ctx.fillText(name,x,y);}
    if(region){const[x,y]=xy(region[0],region[3]),[xe,ys]=xy(region[2],region[1]);ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.strokeRect(x,y,xe-x,ys-y);ctx.fillStyle=ink;ctx.fillText("Zona 3D",x+6,y+18);}
    if(displayedPreview){
      const [x,y]=xy(...displayedPreview[0]),[xe,ye]=xy(...displayedPreview[1]);ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.setLineDash([7,4]);
      if(selection==="region"){ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(Math.min(x,xe),Math.min(y,ye),Math.abs(xe-x),Math.abs(ye-y));ctx.strokeRect(Math.min(x,xe),Math.min(y,ye),Math.abs(xe-x),Math.abs(ye-y));}
      else{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xe,ye);ctx.stroke();ctx.fillStyle=ink;ctx.fillText("A",x+8,y-8);ctx.fillText("B",xe+8,ye-8);}
      ctx.setLineDash([]);for(const[px,py]of[[x,y],[xe,ye]]){ctx.fillStyle=ink;ctx.fillRect(px-4,py-4,8,8);}
      if(demonstration?.select){ctx.beginPath();ctx.arc(xe,ye,13,0,Math.PI*2);ctx.fillStyle="rgba(197,236,246,.28)";ctx.fill();ctx.strokeStyle=ink;ctx.stroke();}
    }
    const a=sceneToGeographic(view.x,view.z),b=sceneToGeographic(view.x+100/scale,view.z);
    const km=geographiclib.Geodesic.WGS84.Inverse(a[1],a[0],b[1],b[0]).s12!/1000;
    ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(22,size.height-58);ctx.lineTo(122,size.height-58);ctx.stroke();ctx.fillStyle=ink;ctx.fillText(`≈${km.toFixed(km<10?1:0)} km · latitud central`,22,size.height-67);
    });
    return()=>cancelAnimationFrame(frame);
  },[events,points,mapLines,size,view,scale,displayedPreview,region,selection,demonstration]);
  const pointAt=(e:React.PointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect();return sceneToGeographic(view.x+(e.clientX-r.left-size.width/2)/scale,view.z+(e.clientY-r.top-size.height/2)/scale);};
  const closest=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    const r=e.currentTarget.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;let best:InpresFeature|null=null,distance=64;
    for(const point of points){const dx=(point.x-view.x)*scale+size.width/2-px,dy=(point.z-view.z)*scale+size.height/2-py,d=dx*dx+dy*dy;if(d<distance){distance=d;best=point.event;}}
    return best;
  };
  const start=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});e.currentTarget.setPointerCapture(e.pointerId);setHover(null);
    if(drawing&&selection){
      if(pointers.current.size>1){gesture.current=null;setPreview(null);setPreviewReady(false);setMessage("Para dibujar usá un dedo. Para acercar con dos dedos, elegí Mover mapa.");return;}
      const a=pointAt(e);gesture.current={kind:"draw",id:e.pointerId,x:e.clientX,y:e.clientY,view,a};setPreview([a,a]);setPreviewReady(false);setMessage("");return;
    }
    const points=[...pointers.current.values()];
    if(points.length===2){gesture.current={kind:"pinch",id:e.pointerId,x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2,distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),view,a:pointAt(e)};}
    else gesture.current={kind:"pan",id:e.pointerId,x:e.clientX,y:e.clientY,view,a:pointAt(e)};
  };
  const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    if(pointers.current.has(e.pointerId))pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const g=gesture.current;
    if(g?.kind==="draw"){if(g.id===e.pointerId)setPreview([g.a,pointAt(e)]);return;}
    if(g?.kind==="pinch"){
      const points=[...pointers.current.values()];if(points.length<2)return;
      const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),span=Math.max(35,Math.min(16000,g.view.span*(g.distance||1)/Math.max(1,distance))),factor=size.width/span;
      updateView({span,x:g.view.x-((points[0].x+points[1].x)/2-g.x)/factor,z:g.view.z-((points[0].y+points[1].y)/2-g.y)/factor});return;
    }
    if(g){updateView({...g.view,x:g.view.x-(e.clientX-g.x)/scale,z:g.view.z-(e.clientY-g.y)/scale});return;}
    if(e.pointerType!=="touch"&&!selection&&performance.now()-hoverTime.current>90){hoverTime.current=performance.now();const event=closest(e);setHover(event?{event,x:e.clientX,y:e.clientY}:null);}
  };
  const finish=(e:React.PointerEvent<HTMLCanvasElement>,cancel=false)=>{
    const g=gesture.current;pointers.current.delete(e.pointerId);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    if(g?.kind==="draw"&&g.id===e.pointerId){
      if(cancel||Math.hypot(e.clientX-g.x,e.clientY-g.y)<12){setPreview(null);setPreviewReady(false);setMessage(cancel?"Dibujo cancelado.":"Arrastrá para dibujar una zona más grande.");}
      else{
        const b=pointAt(e);
        try{
          if(selection==="region"){
            const bounds=regionBounds(g.a,b),a:[number,number]=[bounds[0],bounds[3]],end:[number,number]=[bounds[2],bounds[1]];
            setPreview([a,end]);setCoordinates([...a,...end]);
            const adjusted=bounds[0]!==Math.min(g.a[0],b[0])||bounds[1]!==Math.min(g.a[1],b[1])||bounds[2]!==Math.max(g.a[0],b[0])||bounds[3]!==Math.max(g.a[1],b[1]);
            setMessage(adjusted?"El recuadro se ajustó al área cubierta por el terreno. Revisalo antes de abrir.":"Revisá el rectángulo y confirmá. Podés dibujarlo de nuevo.");
          }else{setPreview([g.a,b]);setCoordinates([...g.a,...b]);setMessage("Revisá la línea A–B y confirmá.");}
          setPreviewReady(true);
        }catch(error){setPreviewReady(false);setMessage(error instanceof Error?error.message:"Revisá la selección.");}
      }
    }else if(!cancel&&g?.kind==="pan"&&!selection&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<6){const event=closest(e);if(event)onPick(event);}
    gesture.current=null;
    if(pointers.current.size&&(!selection||!drawing)){const[id,point]=[...pointers.current.entries()][0];gesture.current={kind:"pan",id,x:point.x,y:point.y,view,a:pointAt(e)};}
  };
  const confirm=()=>{
    if(demonstration?.select){onRegion(demonstration.bounds);return;}
    if(!preview)return;
    try{if(selection==="region")onRegion(regionBounds(preview[0],preview[1]));else onProfile(preview[0],preview[1]);}
    catch(error){setMessage(error instanceof Error?error.message:"Revisá la selección.");}
  };
  return <section className={`planView ${drawing&&selection?"planView--drawing":""}`} aria-label="Mapa 2D para ubicar sismos y elegir una zona o un corte" data-plan-viewport={JSON.stringify(view)}>
    <div className="planToolbar">
      <button title="Encuadrar la Argentina continental" onClick={()=>fit([-78,-57,-53,-20])}>Argentina</button>
      <button aria-label="Acercar mapa 2D" onClick={()=>updateView(v=>({...v,span:v.span*.7}))}>＋</button><button aria-label="Alejar mapa 2D" onClick={()=>updateView(v=>({...v,span:v.span/.7}))}>−</button>
      {selection?<div className="planGestureModes" role="group" aria-label="Qué hace el arrastre"><button aria-pressed={!drawing} onClick={()=>{setDrawing(false);gesture.current=null;pointers.current.clear();setMessage("");}}>Mover mapa</button><button data-tour-target="draw-mode" aria-pressed={drawing} onClick={()=>{setDrawing(true);gesture.current=null;pointers.current.clear();setMessage("");}}>Dibujar {selection==="region"?"zona":"corte"}</button></div>:<button onClick={()=>fit([-100,-90,8,0])}>Todo el territorio</button>}
    </div>
    <canvas data-tour-target="draw-region" ref={canvas} role="img" aria-label={selection==="region"?"Arrastrá en cualquier dirección para dibujar un rectángulo":"Mapa de sismos, límites IGN y ciudades Natural Earth"}
      onPointerDown={start} onPointerMove={move} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onPointerLeave={()=>setHover(null)}/>
    <div className="planNotice">
      {selection?<><p role="status"><strong>{selection==="region"?"Zona rectangular para ver en 3D":"Corte A–B del subsuelo"}</strong><span>{message||(drawing?"Arrastrá con un dedo o el mouse. Soltá y confirmá.":"Mové o acercá el mapa; después elegí Dibujar.")}</span></p>
        <div className="planActions"><button onClick={onCancel}>Cancelar</button><button ref={coordinateTrigger} onClick={()=>setCoordinatesOpen(!coordinatesOpen)}>Coordenadas</button><button className="primaryAction" data-tour-target="confirm-region" disabled={!displayedReady} onClick={confirm}>{selection==="region"?"Abrir zona en 3D":"Ver corte A–B"}</button></div></>:
        <p><strong>Mapa 2D · {events.length.toLocaleString("es-AR")} sismos</strong><span>Ubicación en superficie · tocá un punto para leer su profundidad.</span><small>Límites IGN · ciudades Natural Earth · escala local WGS84.</small></p>}
    </div>
    {selection&&coordinatesOpen?<div ref={coordinateBox} tabIndex={-1} className="coordinateDialog" role="dialog" aria-modal="true" aria-label="Elegir mediante coordenadas" onKeyDown={e=>{
      if(e.key==="Escape"){e.preventDefault();e.stopPropagation();closeCoordinates();}
      if(e.key==="Tab"){
        const items=[...e.currentTarget.querySelectorAll<HTMLElement>("button,input")],first=items[0],last=items.at(-1);
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===e.currentTarget)){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    }}><div className="panelHeader"><div><span className="studioEyebrow">Selección precisa · grados</span><h2>Coordenadas</h2></div><button aria-label="Cerrar coordenadas" onClick={closeCoordinates}>×</button></div><form onSubmit={e=>{e.preventDefault();try{const a:[number,number]=[coordinates[0],coordinates[1]],b:[number,number]=[coordinates[2],coordinates[3]];if(selection==="region"){
      const bounds=regionBounds(a,b),ordered:[number,number,number,number]=[bounds[0],bounds[3],bounds[2],bounds[1]];
      if(ordered.some((v,i)=>v!==coordinates[i])){setCoordinates(ordered);setPreview([[ordered[0],ordered[1]],[ordered[2],ordered[3]]]);setPreviewReady(true);fit(bounds);setMessage("El recuadro se ordenó y ajustó al área cartográfica. Revisalo antes de abrirlo.");closeCoordinates();}
      else onRegion(bounds);
    }else onProfile(a,b);}catch(error){setMessage(error instanceof Error?error.message:"Coordenadas inválidas.");}}}>
      {(selection==="region"?["Oeste · longitud","Norte · latitud","Este · longitud","Sur · latitud"]:["Longitud A","Latitud A","Longitud B","Latitud B"]).map((label,i)=><label key={label}>{label}<input type="number" step="any" required value={coordinates[i]} onChange={e=>setCoordinates(coordinates.map((v,j)=>i===j?Number(e.currentTarget.value):v))}/></label>)}
      <button className="primaryAction">Mostrar {selection==="region"?"zona 3D":"corte A–B"}</button>
      {message?<p role="alert">{message}</p>:null}
    </form></div>:null}
    {hover?<EventHover {...hover}/>:null}
  </section>;
}
