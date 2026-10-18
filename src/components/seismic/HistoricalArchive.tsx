"use client";
import { useState } from "react";
import archive from "@/data/historical-archive.json";

export default function HistoricalArchive() {
 const [all,setAll]=useState(false),[query,setQuery]=useState("");
 const normalize=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const selected=archive.events.filter(e=>(all||archive.featured.includes(e.id))&&normalize(`${e.place} ${e.date} ${e.description}`).includes(normalize(query)));
 return <>
   <nav className="archiveTools" aria-label="Explorar el archivo"><button aria-pressed={!all} onClick={()=>setAll(false)}>10 casos con galería</button><button aria-pressed={all} onClick={()=>setAll(true)}>Archivo completo · 80</button><label>Buscar lugar, año o relato<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Por ejemplo: San Juan, 1944"/></label></nav>
   <p aria-live="polite">{selected.length} {selected.length===1?"caso":"casos"} · orden cronológico. La selección destaca los que tienen galería; no clasifica su gravedad.</p>
   <div className="archiveCards">{selected.map(event=><article className="archiveCard" key={event.id}>
     <time dateTime={event.date}>{new Date(`${event.date}T12:00:00Z`).toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"})}</time>
     <h2>{event.place}</h2><p>{event.description}</p>
     <p className="mercalliLabel">Intensidad reportada · <strong>{event.intensity.grado_principal} Mercalli</strong>{event.intensity.es_estimada?" · estimada":null}</p>
     {event.galleries.map(gallery=><div key={gallery.url}><a href={gallery.url} target="_blank" rel="noreferrer">Ver fotografías en INPRES ↗</a>{gallery.date!==event.date?<small>La galería y el catálogo consignan fechas diferentes ({gallery.date.split("-").reverse().join("/")} en la galería).</small>:null}</div>)}
   </article>)}</div>
   {!selected.length?<p>No hay coincidencias. Probá con otro lugar o año, o elegí el archivo completo.</p>:null}
 </>;
}
