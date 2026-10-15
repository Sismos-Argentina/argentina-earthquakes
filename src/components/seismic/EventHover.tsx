import type { InpresFeature } from "@/lib/data/inpres";

export default function EventHover({ event, x, y }: { event: InpresFeature; x: number; y: number }) {
  const p = event.properties;
  return <div className="eventHover" role="tooltip" style={{ left: Math.min(x + 16, window.innerWidth - 270), top: Math.max(8, Math.min(y + 14, window.innerHeight - 155)) }}>
    <strong>M {p.magnitud.toFixed(1)} · {p.ubicacion_original || "Ubicación no disponible"}</strong>
    <span>{p.fecha} · {p.hora} · hora argentina</span>
    <b>{p.profundidad.toFixed(1)} km de profundidad</b>
    <span>{p.latitud.toFixed(3)}° lat · {p.longitud.toFixed(3)}° lon</span>
    <small>Hipocentro INPRES · clic para fijar</small>
  </div>;
}
