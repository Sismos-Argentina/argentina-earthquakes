"use client";

import {useEffect,useId,useMemo,useRef,useState} from "react";
import type {InpresFeature} from "@/lib/data/inpres";
import {eventQuality} from "@/lib/data/catalog-quality";
import {csvParts} from "@/lib/selection/csv";
import {rowsForExport,searchEvents,type EventRow,type EventListState} from "@/lib/selection/events";
import snapshot from "@/data/catalog-snapshot.json";

const PAGE_SIZE=20;
export default function EventList({rows,state,onState,onPick,onClose,onDraw,onClearRange,context,rangeLabel,selectedId}: {
  rows:EventRow[];state:EventListState;onState:(value:EventListState)=>void;
  onPick:(event:InpresFeature)=>void;onClose:()=>void;onDraw:()=>void;onClearRange?:()=>void;
  context:string;rangeLabel:string;selectedId?:string;
}) {
  const searchId=useId(),headingId=useId();
  const filtered=useMemo(()=>searchEvents(rows,state.query),[rows,state.query]);
  const checked=useMemo(()=>new Set(state.checked),[state.checked]);
  const marked=useMemo(()=>filtered.filter(row=>checked.has(row.feature.properties.id)),[filtered,checked]);
  const exportRows=useMemo(()=>rowsForExport(filtered,marked.map(row=>row.feature.properties.id)),[filtered,marked]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),page=Math.min(state.page,pageCount-1);
  const pageRows=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [readyFile,setReadyFile]=useState<{url:string;name:string;rows:EventRow[];query:string;checked:string[]}|null>(null);
  const task=useRef<AbortController|null>(null),download=useRef<string|null>(null);
  useEffect(()=>()=>{task.current?.abort();task.current=null;if(download.current)URL.revokeObjectURL(download.current);},[]);
  useEffect(()=>{task.current?.abort();},[rows,state.query,state.checked]);
  const patch=(value:Partial<EventListState>)=>{setError("");onState({...state,...value});};
  const toggle=(id:string)=>patch({checked:checked.has(id)?state.checked.filter(value=>value!==id):[...state.checked,id]});
  const exportCsv=async()=>{
    task.current?.abort();const controller=new AbortController();task.current=controller;setBusy(true);setError("");
    try{
      const parts=await csvParts(exportRows,snapshot,controller.signal);
      if(controller.signal.aborted)return;
      if(download.current)URL.revokeObjectURL(download.current);
      const url=URL.createObjectURL(new Blob(parts,{type:"text/csv;charset=utf-8"}));download.current=url;
      const anchor=document.createElement("a");anchor.href=url;anchor.download=`bajo-nuestros-pies-${snapshot.date}-${exportRows.length}-sismos.csv`;
      setReadyFile({url,name:anchor.download,rows,query:state.query,checked:state.checked});
      anchor.click();
    }catch(reason){if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"No se pudo generar el CSV.");}
    finally{if(task.current===controller){task.current=null;setBusy(false);}}
  };
  return <section className="eventList" aria-labelledby={headingId} data-result-count={filtered.length} data-export-count={exportRows.length} data-marked-count={marked.length}>
    <header className="eventListHeader"><div><span className="studioEyebrow">Catálogo INPRES</span><h3 id={headingId}>Sismos de la selección</h3><p>{rangeLabel}</p></div><button aria-label="Cerrar lista de sismos" onClick={onClose}>×</button></header>
    <div className="eventListTools"><button onClick={onDraw}>Seleccionar zona</button>{onClearRange?<button onClick={onClearRange}>Quitar recuadro</button>:null}<button className="eventListExport" disabled={busy||!exportRows.length} onClick={exportCsv}>{busy?"Preparando CSV…":`CSV · ${exportRows.length.toLocaleString("es-AR")} ${marked.length?"marcados":"resultados"}`}</button></div>
    <div className="eventListSearch"><label htmlFor={searchId}>Buscar lugar, fecha o ID</label><input id={searchId} type="search" value={state.query} onChange={event=>patch({query:event.target.value,page:0})} placeholder="Ej.: San Juan, 2025"/></div>
    <div className="eventListSelection"><p role="status"><strong>{filtered.length.toLocaleString("es-AR")}</strong> resultados · <strong>{marked.length.toLocaleString("es-AR")}</strong> marcados</p><div><button disabled={!filtered.length} onClick={()=>patch({checked:filtered.map(row=>row.feature.properties.id)})}>Marcar resultados</button><button disabled={!state.checked.length} onClick={()=>patch({checked:[]})}>Quitar marcas</button></div></div>
    <div className="eventListTable"><table><caption className="srOnly">Resultados del catálogo. Las marcas se conservan al cambiar de página.</caption><thead><tr><th><span className="srOnly">Marcar</span></th><th>Evento / lugar</th><th>M</th><th>Prof.</th></tr></thead><tbody>{pageRows.map(({feature})=>{const p=feature.properties;return <tr key={p.id} data-active={p.id===selectedId} data-checked={checked.has(p.id)} onClick={()=>onPick(feature)}><td><input type="checkbox" onClick={event=>event.stopPropagation()} aria-label={`Marcar sismo ${p.id}`} checked={checked.has(p.id)} onChange={()=>toggle(p.id)}/></td><td><button className="eventListRow" aria-label={`Ver sismo ${p.id}`}><strong>{p.ubicacion_original||"Sin descripción de lugar"}</strong><span>{p.fecha} · {p.hora}</span>{eventQuality(p.id)?<small>Con anotación de revisión</small>:null}</button></td><td>{p.magnitud.toFixed(1)}</td><td>{p.profundidad.toFixed(1)}<small>km</small></td></tr>;})}</tbody></table>{!filtered.length?<p className="eventListEmpty" role="status">No hay sismos con esta selección y búsqueda.{state.query?<button onClick={()=>patch({query:"",page:0})}>Limpiar búsqueda</button>:null}</p>:null}</div>
    <footer className="eventListFooter"><nav aria-label="Páginas de sismos"><button disabled={page===0} onClick={()=>patch({page:page-1})}>Anterior</button><span>{page+1} / {pageCount}</span><button disabled={page>=pageCount-1} onClick={()=>patch({page:page+1})}>Siguiente</button></nav>{readyFile&&readyFile.rows===rows&&readyFile.query===state.query&&readyFile.checked===state.checked?<p role="status">CSV preparado. <a href={readyFile.url} download={readyFile.name}>Guardar CSV si no se descargó</a></p>:null}<p>El CSV incluye {marked.length?"los marcados que coinciden con la búsqueda":"todos los resultados de la búsqueda"}, de todas las páginas. ID derivado, magnitud de escala desconocida y hora del catálogo; segundos originales no verificados. Snapshot {snapshot.date} · <a href="/metodologia/">fuentes y límites</a>.</p><details className="eventListProvenance"><summary>Fuente y alcance de la descarga</summary><p>Fuente: INPRES, normalizado por inpres-sismos. Coordenadas geográficas WGS84. {context}. Las anotaciones de revisión se consultan en la ficha de cada evento; no se agregan al CSV. No incluye valores del modelo Slab2 ni distancias calculadas.</p></details>{error?<p role="alert">{error}</p>:null}</footer>
  </section>;
}
