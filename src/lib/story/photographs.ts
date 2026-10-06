// Cada foto completa y cada fundido tienen un tramo de scroll de igual duración.
// stageHeight es la altura real del elemento sticky, también cuando supera el viewport.
export function photoPosition(top: number, sectionHeight: number, stageHeight: number, count: number): number {
  if (count <= 1) return 0;
  const travel = Math.max(1, sectionHeight - stageHeight);
  const progress = Math.min(1, Math.max(0, -top / travel));
  const beat = progress * (count * 2 - 1);
  const index = Math.min(count - 1, Math.floor(beat / 2));
  const blend = Math.min(1, Math.max(0, beat - index * 2 - 1));
  return index + blend * blend * (3 - 2 * blend);
}

export function photoScrollProgress(index: number, count: number): number {
  return count <= 1 ? 0 : index * 2 / (count * 2 - 1);
}

export function photoOpacity(position: number, index: number): number {
  // Las imágenes se apilan en orden: conservar la base opaca evita un fundido a negro.
  return index === 0 ? 1 : Math.min(1, Math.max(0, position - index + 1));
}
