import { eventGradient, type EventColorMode } from "@/lib/geo/event-colors";
export default function ColorLegend({mode="depth",onMode}: {mode?:EventColorMode;onMode?:(mode:EventColorMode)=>void}) {
  const ticks=mode==="depth"?[0,70,150,300,600,750]:[1,3,5,7,9];
  return <div className="colorLegend" aria-label={mode==="depth"?"Color continuo por profundidad, de 0 a 750 kilómetros":"Color continuo por magnitud reportada, de 1 a 9"}>
    {onMode?<div className="legendModes" role="group" aria-label="Colorear por"><button type="button" aria-pressed={mode==="depth"} onClick={()=>onMode("depth")}>Profundidad <small>km</small></button><button type="button" aria-pressed={mode==="magnitude"} onClick={()=>onMode("magnitude")}>Magnitud <small>M</small></button></div>:<strong>{mode==="depth"?"Profundidad · km":"Magnitud reportada · M"}</strong>}
    <div className="colorRamp" style={{background:eventGradient(mode)}}/>
    <div className="colorTicks">{ticks.map(t=><span key={t} style={{left:`${(t-ticks[0])/(ticks[ticks.length-1]-ticks[0])*100}%`}}>{t}</span>)}</div>
  </div>;
}
