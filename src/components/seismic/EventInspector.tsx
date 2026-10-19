import type { InpresFeature } from "@/lib/data/inpres";
import { eventQuality, qualityReviewDate } from "@/lib/data/catalog-quality";

export default function EventInspector({
  event,
  compact = false,
  onClose,
  preview = false,
}: {
  event: InpresFeature | null;
  compact?: boolean;
  onClose?: () => void;
  preview?: boolean;
}) {
  const properties = event?.properties;
  const annotation = properties ? eventQuality(properties.id) : undefined;
  return (
    <aside className={compact ? "inspector inspector--section" : "inspector"} aria-live="polite">
      <div className="inspectorHeader">
        <h2>{preview ? "Evento bajo el cursor" : "Evento seleccionado"}</h2>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Cerrar inspector de evento">×</button>
        ) : null}
      </div>
      {properties ? (
        <>
          <div className="eventSummary"><span className="eventMagnitude">M {properties.magnitud.toFixed(1)}</span><div><strong>{properties.ubicacion_original || "Hipocentro INPRES"}</strong><small>{properties.fecha} · {properties.hora}</small></div></div>
          <p className="eventDepth"><strong>{properties.profundidad.toFixed(1)} km</strong><span>Profundidad catalogada</span></p>
          {annotation ? <details className="qualityWarning"><summary>{annotation.label}</summary><p>{annotation.reason}</p><small>Revisión: {qualityReviewDate}. Campos originales conservados.</small><ul>{annotation.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></details> : null}
          <details className="eventDetails"><summary>Coordenadas y datos del registro</summary>
          <dl>
            <dt>Fecha</dt><dd>{properties.fecha}</dd>
            <dt>Hora del catálogo</dt><dd>{properties.hora}</dd>
            <dt>Latitud</dt><dd>{properties.latitud.toFixed(3)}°</dd>
            <dt>Longitud</dt><dd>{properties.longitud.toFixed(3)}°</dd>
            <dt>Profundidad</dt><dd>{properties.profundidad.toFixed(1)} km</dd>
            <dt>Magnitud reportada</dt><dd>{properties.magnitud.toFixed(1)}</dd>
            <dt>Intensidad</dt><dd>No disponible</dd>
            <dt>Ubicación original</dt><dd>{properties.ubicacion_original || "No disponible"}</dd>
            <dt>Sentido</dt><dd>{properties.sentido === "Si" ? "Marcado como sentido" : properties.sentido === "No" ? "Sin marca de sentido" : "No disponible"}</dd>
          </dl>
          <details className="caveat"><summary>Sobre este registro</summary><p>
            Hora local argentina (UTC−3) cuando corresponde a la fuente. Los segundos de eventos recientes pueden ser sintéticos. Tipo de magnitud, revisión e incertidumbres no disponibles.
          </p></details>
          </details>
        </>
      ) : (
        <p>Pasá el mouse por un sismo para consultar sus datos. Hacé clic para fijar la selección; en el teléfono, tocá el punto.</p>
      )}
      <p className="source">
        Fuente: <a href="https://www.inpres.gob.ar/" target="_blank" rel="noreferrer">INPRES</a> · <a href="/metodologia/">Datos y método</a>. Profundidades catalogadas.
      </p>
    </aside>
  );
}
