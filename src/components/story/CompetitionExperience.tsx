"use client";

import dynamic from "next/dynamic";
import HistoricalChapter from "./HistoricalChapter";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import history from "@/data/competition-history.json";
import presets from "@/data/flat-slab-guide.json";
import snapshot from "@/data/catalog-snapshot.json";
import { navigateStory, storyScrollBehavior, type StoryAction, type StoryState } from "@/lib/story/navigation";

const SeismicViewer = dynamic(() => import("@/components/seismic/SeismicViewer"), { ssr: false,
  loading: () => <p className="mapPreparation" role="status">Preparando el mapa del catálogo…</p> });

const subscribeMotion = (notify: () => void) => {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", notify);
  return () => preference.removeEventListener("change", notify);
};
const readMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
};
const readVisibility = () => document.visibilityState === "visible";

export default function CompetitionExperience() {
  const [state, setState] = useState<StoryState>({ mode: "explore", guideIndex: null });
  const [mapStarted, setMapStarted] = useState(true);
  const [activeScene, setActiveScene] = useState(0);
  const [photosPaused, setPhotosPaused] = useState(false);
  const pageVisible = useSyncExternalStore(subscribeVisibility, readVisibility, () => false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, readMotion, () => false);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const shell = useRef<HTMLDivElement>(null);
  const historyVisible = state.mode === "history";

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = Number((entry.target as HTMLElement).dataset.scene);
        setActiveScene(index);
        // Preparar el catálogo durante el último capítulo, antes de revelarlo.
        if (index >= history.scenes.length - 1) setMapStarted(true);
      }
    }, { rootMargin: "-30% 0px -30% 0px", threshold: 0 });
    for (const section of sections.current) if (section) observer.observe(section);
    return () => observer.disconnect();
  }, [historyVisible]);

  const go = (index: number) => {
    const target = sections.current[index];
    target?.scrollIntoView({ behavior: storyScrollBehavior(reducedMotion), block: "start" });
    target?.focus({ preventScroll: true });
  };
  const dispatch = (action: StoryAction) => {
    const next = navigateStory(state, action, presets.stops.length);
    setState(next);
    setMapStarted(true);
    requestAnimationFrame(() => {
      if (next.mode === "history") go(0);
      else {
        window.scrollTo({ top: 0, behavior: "instant" });
        shell.current?.focus({ preventScroll: true });
      }
    });
  };
  return (
    <div data-reduced-motion={reducedMotion} className={`competitionExperience${historyVisible ? " competitionExperience--history" : " competitionExperience--explore"}`}>
      {mapStarted ? <div ref={shell} tabIndex={-1} inert={historyVisible}
        className={`experienceShell${historyVisible ? " experienceShell--preview" : ""}${historyVisible && activeScene < history.scenes.length ? " experienceShell--hidden" : ""}`}>
        <SeismicViewer guidedIndex={state.guideIndex} onGuideChange={(index) => setState({ mode: "explore", guideIndex: index })}
          reducedMotion={reducedMotion}
          onHistory={() => dispatch("history")} onStartGuide={() => dispatch("guide")} />
      </div> : null}
      {historyVisible ? <main className="archiveStory" aria-label="Memoria histórica de Bajo nuestros pies">
        <header className="storyHeader">
          <a className="storyBrand" href="#history-0" onClick={(e) => { e.preventDefault(); go(0); }}>BAJO NUESTROS PIES<span>Memoria / profundidad</span></a>
          <div className="storyHeaderActions">
            <button className="storySkip" onClick={() => dispatch("skip")}>Volver al mapa <span aria-hidden="true">↗</span></button>
          </div>
        </header>
        {history.scenes.map((scene, index) => <HistoricalChapter key={scene.id} scene={scene} index={index}
          active={activeScene === index} photosRunning={!photosPaused && pageVisible} photosPaused={photosPaused}
          togglePhotos={() => setPhotosPaused((paused) => !paused)}
          register={(el) => { sections.current[index] = el; }} go={go} />)}
        <section id="central-question" data-scene={history.scenes.length} ref={(el) => { sections.current[history.scenes.length] = el; }}
          tabIndex={-1} className="questionScene" aria-labelledby="central-question-title">
          <div className="questionCopy"><p className="storyKicker">DEL RECUERDO A LA OBSERVACIÓN</p>
            <p className="questionLead">Estos son los terremotos que recordamos.<br />Debajo de ellos existe un catálogo de más de 80.000 eventos.</p>
            <h1 id="central-question-title">{presets.question}</h1>
            <p>Cada punto del mapa es un hipocentro catalogado por INPRES: una posición y una profundidad reportadas. Un corte permite mirar de lado y comparar su distribución de norte a sur.</p>
            <div className="questionActions"><button className="storyPrimary" onClick={() => dispatch("guide")}>Comparar 31°S y 35°S →</button><button className="textButton" onClick={() => dispatch("free")}>Explorá por tu cuenta ↗</button></div>
            <p className="snapshotNote"><strong>Mapa: {snapshot.events.toLocaleString("es-AR")} eventos · snapshot {snapshot.date.split("-").reverse().join("/")}.</strong><br />INPRES, export normalizado por inpres-sismos · {snapshot.startDate.split("-").reverse().join("/")}–{snapshot.date.split("-").reverse().join("/")}. Incluye registros fuera de Argentina.</p>
            <details className="storyProvenance"><summary>Dos catálogos, fuentes y límites</summary><p>El archivo histórico y el catálogo instrumental 2011–2026 son conjuntos diferentes, relacionados por la memoria sísmica; no se vinculan evento por evento. Mercalli describe efectos, no magnitud instrumental.</p>
              <p>La comparación 31°S–35°S usa el mismo snapshot instrumental y corredor geodésico. Distingue hipocentros INPRES, geometría Slab2 e interpretación bibliográfica. Los conteos no miden riesgo.</p>
              <p>Fotografías: enlaces al archivo original de INPRES. Las imágenes sin permisos de reutilización demostrados no se reproducen ni se incluyen en el export público.</p>
              <p>Proveedor histórico: {history.provenance.providerCommit.slice(0,7)} · export {history.provenance.catalogGeneratedAt}. Snapshot del mapa: {snapshot.sourceCommit.slice(0,7)}. Manifiestos y checksums documentados en el repositorio.</p></details>
          </div>
        </section>
        <nav className="storyTimeline" aria-label="Escenas del prólogo">
          {history.scenes.map((s,i) => <button key={s.id} aria-label={`Ir a ${s.place}, ${s.date.slice(0,4)}`} aria-current={activeScene === i ? "step" : undefined} onClick={() => go(i)}>{s.date.slice(0,4)}</button>)}
          <button aria-label="Ir a la pregunta central" aria-current={activeScene === history.scenes.length ? "step" : undefined} onClick={() => go(history.scenes.length)}>El catálogo</button>
        </nav>
      </main> : null}
    </div>
  );
}
