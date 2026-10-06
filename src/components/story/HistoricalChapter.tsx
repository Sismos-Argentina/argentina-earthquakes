"use client";

import { useEffect, useRef, useState } from "react";
import history from "@/data/competition-history.json";
import { photoOpacity, photoPosition } from "@/lib/story/photographs";
import { storyScrollBehavior } from "@/lib/story/navigation";

type Scene = typeof history.scenes[number];
type Photo = Scene["photos"][number];

function ArchiveImage({ photo, enabled }: { photo: Photo; enabled: boolean }) {
  const [failed, setFailed] = useState(false);
  const [nearby, setNearby] = useState(false);
  const gate = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!gate.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNearby(true); observer.disconnect(); }
    }, { rootMargin: "250px" });
    observer.observe(gate.current);
    return () => observer.disconnect();
  }, []);
  // WebP preoptimizado, srcset local compatible con export estático.
  // eslint-disable-next-line @next/next/no-img-element
  const image = nearby && enabled ? <img className={`archiveImage${photo.width < photo.height ? " archiveImage--portrait" : ""}`} src={photo.src}
    srcSet={`${photo.thumbnail} 480w, ${photo.src} ${photo.width}w`} sizes="(max-width: 700px) 100vw, 68vw"
    width={photo.width} height={photo.height} loading="lazy" decoding="async" alt={photo.alt} onError={() => setFailed(true)} /> : null;
  return <div className="archiveImageGate" ref={gate}>{!enabled || failed
    ? <div className="archiveFallback">Archivo histórico · {photo.title}<span>La narración continúa en texto.</span></div> : image}</div>;
}

export default function HistoricalChapter({ scene, index, active, imagesEnabled, reducedMotion, register, go }: {
  scene: Scene; index: number; active: boolean; imagesEnabled: boolean; reducedMotion: boolean;
  register: (el: HTMLElement | null) => void; go: (index: number) => void;
}) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const currentPhoto = Math.round(position);
  const photo = scene.photos[currentPhoto];
  const choosePhoto = (photoIndex: number) => {
    if (!section.current || !stage.current) return;
    const bounds = section.current.getBoundingClientRect();
    const travel = Math.max(0, bounds.height - stage.current.getBoundingClientRect().height);
    window.scrollTo({ top: window.scrollY + bounds.top + travel * photoIndex / (scene.photos.length - 1),
      behavior: storyScrollBehavior(reducedMotion) });
  };
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = section.current?.getBoundingClientRect();
      if (bounds && stage.current) setPosition(photoPosition(bounds.top, bounds.height, stage.current.getBoundingClientRect().height, scene.photos.length));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const resize = new ResizeObserver(onScroll);
    if (stage.current) resize.observe(stage.current);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [scene.photos.length]);
  return <section id={`history-${index}`} data-scene={index} tabIndex={-1}
    ref={(el) => { section.current = el; register(el); }} className={`archiveScene${active ? " archiveScene--active" : ""}`} aria-labelledby={`scene-title-${index}`}
    onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); go(index + 1); } else if ((e.key === "ArrowUp" || e.key === "ArrowLeft") && index > 0) { e.preventDefault(); go(index - 1); } }}>
    <div className="archiveStage" ref={stage}>
      <figure className="archiveFigure" aria-label={`Archivo fotográfico de ${scene.place}, ${scene.date.slice(0,4)}`}>
        {scene.photos.map((p,i) => <div key={p.id} className="archiveFrame" aria-hidden={currentPhoto !== i}
          style={{ opacity: photoOpacity(position, i, reducedMotion), transform: reducedMotion ? "none" : `translateY(${(i - position) * 8}px)` }}>
          <ArchiveImage photo={p} enabled={imagesEnabled} />
        </div>)}
        <figcaption><span>{photo.title} · {photo.credit}</span><a href={scene.galleryUrl} target="_blank" rel="noreferrer">Ver archivo INPRES ↗</a></figcaption>
      </figure>
      <div className="archiveCopy">
        <p className="storyKicker">{String(index + 1).padStart(2, "0")} / MEMORIA EN SUPERFICIE</p>
        <time dateTime={scene.date}>{new Date(`${scene.date}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
        <h1 id={`scene-title-${index}`}>{scene.place}</h1><h2>{scene.title}</h2>
        <p className="sceneStatement">{scene.text}</p>
        <p className="mercalliLabel">Intensidad máxima reportada · <strong>{scene.mercalli.grado_principal} Mercalli</strong></p>
        <p className="sceneNote">{scene.note}</p>
        <a className="catalogSource" href={scene.sourceUrl} target="_blank" rel="noreferrer">Relato del catálogo histórico INPRES ↗</a>
        <nav className="photoNavigation" aria-label={`Fotografías de ${scene.place}, ${scene.date.slice(0,4)}`}>
          <span>Archivo · {currentPhoto + 1} / {scene.photos.length}</span>
          {scene.photos.map((p,i) => <button key={p.id} aria-label={`Ver fotografía ${i + 1}: ${p.title}`} aria-pressed={currentPhoto === i} onClick={() => choosePhoto(i)}>{String(i + 1).padStart(2,"0")}</button>)}
        </nav>
        {index === 0 ? <p className="storyInstruction">El scroll revela las fotografías y el siguiente capítulo. También podés elegir una foto o usar las flechas cuando la escena tiene foco.</p> : null}
        <div className="sceneNavigation"><button disabled={index === 0} onClick={() => go(index - 1)}>← Anterior</button><button onClick={() => go(index + 1)}>{index === history.scenes.length - 1 ? "Del archivo al catálogo →" : "Continuar →"}</button></div>
      </div>
      <span className="archiveYear" aria-hidden="true">{scene.date.slice(0,4)}</span>
    </div>
  </section>;
}
