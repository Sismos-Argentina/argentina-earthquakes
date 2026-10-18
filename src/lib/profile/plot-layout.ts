// One pixel scale for both kilometre axes. The frame, not the canvas, sets its size.
export function fitProfilePlot(availableWidth: number, availableHeight: number, lengthKm: number, depthKm: number) {
  const scale = Math.max(.001, Math.min(
    Math.max(1, availableWidth - 74) / Math.max(1, lengthKm),
    Math.max(1, availableHeight - 59) / Math.max(1, depthKm + 9),
  ));
  return { scale, width: Math.ceil(74 + lengthKm * scale), height: Math.ceil(59 + (depthKm + 9) * scale) };
}
