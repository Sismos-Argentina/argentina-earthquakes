// Scroll nativo: el recorrido está limitado al tramo en que el escenario se fija.
export function photoPosition(top: number, sectionHeight: number, viewportHeight: number, count: number): number {
  const travel = Math.max(1, sectionHeight - viewportHeight);
  return Math.min(count - 1, Math.max(0, -top / travel * (count - 1)));
}

export function photoOpacity(position: number, index: number, reducedMotion: boolean): number {
  if (reducedMotion) return Math.round(position) === index ? 1 : 0;
  return Math.max(0, 1 - Math.abs(position - index));
}
