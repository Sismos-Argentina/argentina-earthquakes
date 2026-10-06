// El 40% del recorrido permite mirar fotos completas; el 60% restante las funde.
// stageHeight es la altura real del elemento sticky, también cuando supera el viewport.
export function photoPosition(top: number, sectionHeight: number, stageHeight: number, count: number): number {
  if (count <= 1) return 0;
  const travel = Math.max(1, sectionHeight - stageHeight);
  const progress = Math.min(1, Math.max(0, -top / travel));
  const transitions = count - 1;
  const cycle = Math.max(0, (progress - 0.2 / transitions) * transitions);
  const index = Math.min(transitions - 1, Math.floor(cycle));
  const blend = Math.min(1, Math.max(0, (cycle - index) / 0.6));
  return index + blend * blend * (3 - 2 * blend);
}

export function photoOpacity(position: number, index: number, reducedMotion: boolean): number {
  if (reducedMotion) return Math.round(position) === index ? 1 : 0;
  // Las imágenes se apilan en orden: conservar la base opaca evita un fundido a negro.
  return index === 0 ? 1 : Math.min(1, Math.max(0, position - index + 1));
}
