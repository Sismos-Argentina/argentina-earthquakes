import { eventGradient, type EventColorMode } from "@/lib/geo/event-colors";
export default function ColorLegend({mode="depth",onMode}: {mode?:EventColorMode;onMode?:(mode:EventColorMode)=>void}) {
  const ticks=mode==="depth"?[0,70,150,300,600,750]:[1,3,5,7,9];
  return <div className="colorLegend" aria-label={mode==="depth"?"Color continuo por profundidad, de 0 a 750 kilómetros":"Color continuo por magnitud reportada, de 1 a 9"}>
    {onMode?<select aria-label="Colorear por" value={mode} onChange={e=>onMode(e.target.value as EventColorMode)}><option value="depth">Profundidad · km</option><option value="magnitude">Magnitud · M</option></select>:<strong>{mode==="depth"?"Profundidad · km":"Magnitud reportada · M"}</strong>}
    <div className="colorRamp" style={{background:eventGradient(mode)}}/>
    <div className="colorTicks">{ticks.map(t=><span key={t} style={{left:`${(t-ticks[0])/(ticks[ticks.length-1]-ticks[0])*100}%`}}>{t}</span>)}</div>
  </div>;
}
