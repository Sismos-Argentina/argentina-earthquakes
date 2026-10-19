export type PlanView = { x: number; z: number; span: number };
export type PlanSize = { width: number; height: number };

// Preserve the vertical geographic extent on resize/orientation changes.
export function resizePlanView(view: PlanView, before: PlanSize, after: PlanSize): PlanView {
  if (!before.width || !before.height || !after.width || !after.height) return view;
  return { ...view, span: view.span * (after.width / after.height) / (before.width / before.height) };
}

// The geographic point under the pointer stays under it while zooming.
export function zoomPlanView(view: PlanView, size: PlanSize, factor: number, point = { x: size.width / 2, y: size.height / 2 }): PlanView {
  const span = view.span * factor;
  return {
    span,
    x: view.x + (point.x - size.width / 2) * (view.span - span) / size.width,
    z: view.z + (point.y - size.height / 2) * (view.span - span) / size.width,
  };
}

export function pointLayerPlacement(layer: { view: PlanView; width: number; height: number; margin: number }, view: PlanView, size: PlanSize) {
  const scale = size.width / view.span;
  const ratio = scale / (layer.width / layer.view.span);
  const width = (layer.width + 2 * layer.margin) * ratio;
  const height = (layer.height + 2 * layer.margin) * ratio;
  return { x: (layer.view.x - view.x) * scale + size.width / 2 - width / 2,
    y: (layer.view.z - view.z) * scale + size.height / 2 - height / 2, width, height };
}
