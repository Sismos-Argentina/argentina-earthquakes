"use client";
import {useEffect,useRef,useState} from "react";
import {TOUR_DURATION,TOUR_HINTS,tourCueAt,type TourPlayback} from "@/lib/story/viewer-tour";
import {placeCoachmark,type CoachmarkPlacement} from "@/lib/story/coachmark-placement";
export default function ViewerTour({playback,waiting,reducedMotion,error,detail,onPause,onReplay,onExit,onNext,onPrevious,onTry,onAnimate}:{
 playback:TourPlayback;waiting:boolean;reducedMotion:boolean;error:string;detail?:string;
 onPause:()=>void;onReplay:()=>void;onExit:()=>void;onNext:()=>void;onPrevious:()=>void;onTry:()=>void;onAnimate?:()=>void;
}) {
 const cue=tourCueAt(playback.elapsed),hint=TOUR_HINTS[cue.id],complete=playback.elapsed>=TOUR_DURATION;
 const card=useRef<HTMLElement>(null),[placement,setPlacement]=useState<CoachmarkPlacement|null>(null);
 useEffect(()=>{
  let focused:HTMLElement|null=null;
  const measure=()=>{const el=card.current;if(!el)return;const root=el.closest(".viewer")??document;
   const target=complete?null:[...root.querySelectorAll<HTMLElement>(hint.target)].find(item=>{const r=item.getBoundingClientRect();return r.width>0&&r.height>0&&!item.closest("[inert]");})??null;
   if(focused!==target){focused?.removeAttribute("data-tour-focus");focused=target;focused?.setAttribute("data-tour-focus","");}
   const avoid=[...root.querySelectorAll<HTMLElement>(".regionBanner,.coordinateDialog,.planNotice,.planToolbar,.viewerFooter,.viewerBar")].filter(item=>item!==target&&(!target||!item.contains(target))).map(item=>item.getBoundingClientRect());
   const next=placeCoachmark(target?.getBoundingClientRect()??null,{width:el.offsetWidth,height:el.offsetHeight},{width:innerWidth,height:innerHeight},avoid);
   setPlacement(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
  };
  const frame=requestAnimationFrame(measure),timer=setInterval(measure,120);
  window.addEventListener("resize",measure);window.addEventListener("scroll",measure,true);
  return()=>{cancelAnimationFrame(frame);clearInterval(timer);focused?.removeAttribute("data-tour-focus");window.removeEventListener("resize",measure);window.removeEventListener("scroll",measure,true);};
 },[hint.target,complete]);
 return <aside ref={card} className="tourBubble" aria-label="Demostración del visor" data-tour-card data-complete={complete} data-motion={!reducedMotion} data-side={placement?.side??"none"} style={{left:placement?.left??12,top:placement?.top??80,visibility:placement?"visible":"hidden","--tip":`${placement?.tip??24}px`} as React.CSSProperties}>
  <div className="bubbleTop"><span>{complete?"Tu turno":`${cue.chapter+1} / 5`}</span><div className="tourDots" aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i} data-active={i<=cue.chapter}/>)}</div><button onClick={onExit} aria-label="Salir del tutorial y recuperar mi configuración">×</button></div>
  <div className="bubbleCopy" key={complete?"complete":cue.id} aria-live="polite" aria-atomic="true"><h2>{complete?"Ahora elegí tu zona":hint.title}</h2><p>{complete?"Tus ajustes siguen guardados.":detail||hint.text}</p></div>
  <progress aria-label="Progreso del tutorial" max={TOUR_DURATION} value={playback.elapsed}/>
  {waiting||error?<p className="bubbleStatus" role="status">{error||"Preparando la vista…"}</p>:null}
  <nav aria-label="Controles del tutorial">{complete?<><button className="bubblePrimary" onClick={onTry}>Elegir zona</button><button onClick={onExit}>Volver</button><button onClick={onReplay} aria-label="Repetir tutorial">↻</button></>:<>
   <button onClick={onPrevious} disabled={cue.chapter===0} aria-label="Paso anterior del tutorial">←</button>
   {onAnimate?<button onClick={onAnimate} className="bubblePrimary" aria-label="Activar movimientos solo durante este tutorial">▶ Reproducir</button>:!reducedMotion?<button onClick={onPause} aria-label={playback.playing?"Pausar tutorial":"Continuar tutorial"}>{playback.playing?"Ⅱ":"▶"}</button>:null}
   <button className={!onAnimate?"bubblePrimary":""} onClick={onNext} aria-label="Paso siguiente del tutorial">Siguiente →</button><button className="bubbleExit" onClick={onExit}>Salir</button>
  </>}</nav>
  <span className="srOnly" role="status">{reducedMotion?"Movimiento reducido. Avance manual.":playback.playing?"Reproducción automática. Tocá el mapa para pausar.":"En pausa."} Al salir recuperás tu configuración.</span>
 </aside>;
}
