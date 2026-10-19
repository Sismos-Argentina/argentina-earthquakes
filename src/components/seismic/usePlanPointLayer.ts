import { useEffect, useRef, useState } from "react";
import type { PlanView, PlanSize } from "@/lib/geo/plan-viewport";

type Point = { x: number; z: number; color: string };
type Layer<T> = PlanSize & { canvas: HTMLCanvasElement; points: T[]; view: PlanView; dpr: number; margin: number };

// Keep the last complete layer during navigation. Build its exact replacement
// offscreen in bounded batches; cancelled jobs never publish partial/stale data.
export default function usePlanPointLayer<T extends Point>(points: T[], view: PlanView, size: PlanSize) {
  const [layer, setLayer] = useState<Layer<T> | null>(null);
  const complete = useRef<Layer<T> | null>(null);
  useEffect(() => {
    if (!size.width || !size.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), previous = complete.current;
    const scale = size.width / view.span;
    if (previous && previous.points === points && previous.width === size.width && previous.height === size.height && previous.dpr === dpr && previous.view.span === view.span
      && Math.abs(previous.view.x - view.x) * scale < previous.margin * .7 && Math.abs(previous.view.z - view.z) * scale < previous.margin * .7) return;

    let cancelled = false, frame = 0, published = false, buffer: HTMLCanvasElement | null = null;
    const timer = window.setTimeout(() => {
      const margin = Math.min(256, Math.max(96, size.width / 4));
      const width = size.width + margin * 2, height = size.height + margin * 2;
      buffer = document.createElement("canvas");
      buffer.width = Math.round(width * dpr); buffer.height = Math.round(height * dpr);
      const paint = buffer.getContext("2d")!;
      paint.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint.globalAlpha = points.length <= 500 ? .9 : .48;
      const pointSize = points.length <= 500 ? 6 : points.length <= 5000 ? 3.5 : 1.6;
      let index = 0;
      const batch = () => {
        if (cancelled) return;
        const until = performance.now() + 5;
        do {
          const end = Math.min(points.length, index + 256);
          for (; index < end; index++) {
            const point = points[index], x = (point.x - view.x) * scale + width / 2, y = (point.z - view.z) * scale + height / 2;
            if (x < 0 || x > width || y < 0 || y > height) continue;
            paint.fillStyle = point.color;
            if (pointSize >= 3) { paint.beginPath(); paint.arc(x, y, pointSize / 2, 0, Math.PI * 2); paint.fill(); }
            else paint.fillRect(x - .8, y - .8, 1.6, 1.6);
          }
        } while (index < points.length && performance.now() < until);
        if (index < points.length) frame = requestAnimationFrame(batch);
        else {
          const next = { canvas: buffer!, points, view, ...size, dpr, margin };
          published = true;
          complete.current = next; setLayer(next);
        }
      };
      frame = requestAnimationFrame(batch);
    }, previous?.points === points ? 90 : 0);
    return () => { cancelled = true; clearTimeout(timer); cancelAnimationFrame(frame); if(buffer&&!published)buffer.width=0; };
  }, [points, view, size]);
  return layer;
}
