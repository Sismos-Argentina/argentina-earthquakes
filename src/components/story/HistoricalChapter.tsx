"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import history from "@/data/competition-history.json";
import { PHOTO_FADE_MS, PHOTO_HOLD_MS } from "@/lib/story/photographs";

type Scene = typeof history.scenes[number];
type Photo = Scene["photos"][number];

function ArchiveImage({ photo, onReady }: { photo: Photo; onReady: (id: string) => void }) {
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
  const image = nearby ? <img className={`archiveImage${photo.width < photo.height ? " archiveImage--portrait" : ""}`} src={photo.src}
    srcSet={`${photo.thumbnail} 480w, ${photo.src} ${photo.width}w`} sizes="(max-width: 700px) 100vw, 68vw"
    width={photo.width} height={photo.height} loading="eager" decoding="async" alt={photo.alt}
    onLoad={() => onReady(photo.id)} onError={() => { setFailed(true); onReady(photo.id); }} /> : null;
  return <div className="archiveImageGate" ref={gate}>{failed
    ? <div className="archiveFallback">Archivo histórico · {photo.title}<span>La narración continúa en texto.</span></div> : image}</div>;
}

export default function HistoricalChapter({ scene, index, active, photosRunning, photosPaused, togglePhotos, register, go }: {
  scene: Scene; index: number; active: boolean; photosRunning: boolean; photosPaused: boolean; togglePhotos: () => void;
  register: (el: HTMLElement | null) => void; go: (index: number) => void;
}) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [fading, setFading] = useState(false);
  const [readyPhotos, setReadyPhotos] = useState<Set<string>>(() => new Set());
  const nextPhoto = (currentPhoto + 1) % scene.photos.length;
  const photo = scene.photos[currentPhoto];
  const running = active && photosRunning;
  const markReady = useCallback((id: string) => {
    setReadyPhotos((previous) => previous.has(id) ? previous : new Set(previous).add(id));
  }, []);
  useEffect(() => {
    // Sólo la escena activa avanza y únicamente cuando ambas imágenes están listas.
    if (!running || fading || scene.photos.length < 2 || !readyPhotos.has(photo.id) || !readyPhotos.has(scene.photos[nextPhoto].id)) return;
    const timer = window.setTimeout(() => setFading(true), PHOTO_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [running, fading, readyPhotos, photo.id, nextPhoto, scene.photos]);
  return <section id={`history-${index}`} data-scene={index} tabIndex={-1}
    ref={register} className={`archiveScene${active ? " archiveScene--active" : ""}`} aria-labelledby={`scene-title-${index}`}
    onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); go(index + 1); } else if ((e.key === "ArrowUp" || e.key === "ArrowLeft") && index > 0) { e.preventDefault(); go(index - 1); } }}>
    <div className="archiveStage">
      <figure className="archiveFigure" aria-label={`Archivo fotográfico de ${scene.place}, ${scene.date.slice(0,4)}`}>
        {[currentPhoto, ...(scene.photos.length > 1 ? [nextPhoto] : [])].map((i) => <div key={scene.photos[i].id}
          data-photo-id={scene.photos[i].id} className={`archiveFrame${i !== currentPhoto ? " archiveFrame--incoming" : ""}${i !== currentPhoto && fading ? " archiveFrame--fading" : ""}`}
          aria-hidden={currentPhoto !== i} style={{ "--photo-fade-duration": `${PHOTO_FADE_MS}ms`, animationPlayState: running ? "running" : "paused" } as React.CSSProperties}
          onAnimationEnd={(event) => {
            if (event.target !== event.currentTarget || event.animationName !== "archivePhotoFade" || i === currentPhoto) return;
            setCurrentPhoto(nextPhoto); setFading(false);
          }}>
          <ArchiveImage photo={scene.photos[i]} onReady={markReady} />
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
        <div className="photoNavigation"><button aria-pressed={photosPaused} onClick={togglePhotos}>
          <span aria-hidden="true">{photosPaused ? "▶" : "Ⅱ"}</span> {photosPaused ? "Reanudar fotos" : "Pausar fotos"}
        </button></div>
        {index === 0 ? <p className="storyInstruction">Las fotos cambian solas. Deslizá para pasar al siguiente caso.</p> : null}
        <div className="sceneNavigation"><button disabled={index === 0} onClick={() => go(index - 1)}>← Anterior</button><button onClick={() => go(index + 1)}>{index === history.scenes.length - 1 ? "Del archivo al catálogo →" : "Continuar →"}</button></div>
      </div>
      <span className="archiveYear" aria-hidden="true">{scene.date.slice(0,4)}</span>
    </div>
  </section>;
}
