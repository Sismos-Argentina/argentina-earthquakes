import type { RegionBounds } from "../geo/region";

// Encloses every San Juan boundary vertex in the bundled IGN cartography
// (bbox -70.56929,-32.62243,-66.66179,-28.39632), with context around it.
export const TOUR_REGION: RegionBounds = [-71.5, -33.2, -66.1, -27.8];
export const TOUR_CONTEXT: RegionBounds = [-74, -36, -64, -26];
export const TOUR_CHAPTERS = [
  { title: "Empezá por el mapa 2D", text: "Desde acá elegís qué parte explorar." },
  { title: "Dibujá tu zona", text: "Arrastrá con el mouse o un dedo." },
  { title: "Mirá debajo", text: "Cambiá a una vista de costado." },
  { title: "Sumá la placa de Nazca", text: "Slab2 muestra su superficie modelada." },
  { title: "Compará dos cortes", text: "San Juan y Mendoza, a la misma escala 1×." },
] as const;
export const TOUR_HINTS = {
  territory: { target: "[data-tour-target='map-2d']", title: "Empezá por el mapa 2D", text: "Desde acá elegís qué parte explorar." },
  map: { target: "[data-tour-target='draw-mode']", title: "Dibujá tu zona", text: "Arrastrá con el mouse o un dedo." },
  rectangle: { target: "[data-tour-target='confirm-region']", title: "Abrila en 3D", text: "Confirmá el rectángulo para mirar debajo." },
  region: { target: "[data-tour-target='depth-view']", title: "Mirá de costado", text: "Acá alternás superficie y profundidad." },
  event: { target: "[data-tour-target='depth-legend']", title: "Cada punto es un hipocentro", text: "El color indica su profundidad." },
  slab: { target: "[data-tour-target='nazca']", title: "Sumá la placa de Nazca", text: "Slab2 es un modelo, no clasifica los sismos." },
  section31: { target: "[data-tour-target='compare-sections']", title: "Compará San Juan…", text: "Los cortes miran el subsuelo de costado." },
  section35: { target: "[data-tour-target='compare-sections']", title: "…con Mendoza", text: "Misma escala 1×, distinta geometría." },
} as const;
export const TOUR_CUES = [
  { id: "territory", chapter: 0, start: 0, end: 6000 },
  { id: "map", chapter: 1, start: 6000, end: 10000 },
  { id: "rectangle", chapter: 1, start: 10000, end: 16000 },
  { id: "region", chapter: 2, start: 16000, end: 23000 },
  { id: "event", chapter: 2, start: 23000, end: 28000 },
  { id: "slab", chapter: 3, start: 28000, end: 38000 },
  { id: "section31", chapter: 4, start: 38000, end: 44000 },
  { id: "section35", chapter: 4, start: 44000, end: 50000 },
] as const;
export type TourCue = typeof TOUR_CUES[number];
export const TOUR_DURATION = 50000;
export type TourPlayback = { elapsed: number; playing: boolean };
export function tourCueAt(elapsed: number): TourCue {
  return TOUR_CUES.find(cue => elapsed < cue.end) ?? TOUR_CUES[TOUR_CUES.length - 1];
}
export function advanceTour(state: TourPlayback, delta: number, ready: boolean): TourPlayback {
  if (!state.playing || !ready || !Number.isFinite(delta) || delta <= 0) return state;
  // Never skip an unapplied action, even after a slow frame or a hidden tab.
  const elapsed = Math.min(tourCueAt(state.elapsed).end, state.elapsed + Math.min(delta, 250));
  return { elapsed, playing: elapsed < TOUR_DURATION };
}
export function nextTourChapter(elapsed: number): number {
  // En avance manual también mostrar la inspección y ambos cortes.
  const id = tourCueAt(elapsed).id;
  if (id === "map") return 10000;
  if (id === "region") return 23000;
  if (id === "section31") return 44000;
  const chapter = tourCueAt(elapsed).chapter;
  return TOUR_CUES.find(cue => cue.chapter > chapter)?.start ?? TOUR_DURATION;
}
export function previousTourChapter(elapsed: number): number {
  const chapter = tourCueAt(elapsed).chapter;
  return TOUR_CUES.find(cue => cue.chapter === Math.max(0, chapter - 1))!.start;
}
export function rectangleProgress(elapsed: number): number {
  return Math.max(0, Math.min(1, (elapsed - 11000) / 3000));
}
