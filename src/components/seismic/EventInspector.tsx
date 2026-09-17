import { CATALOG_SOURCE_COMMIT, type InpresFeature } from "@/lib/data/inpres";

export default function EventInspector({
  event,
  compact = false,
}: {
  event: InpresFeature | null;
  compact?: boolean;
}) {
  const properties = event?.properties;
  return (
    <aside className={compact ? "inspector inspector--section" : "inspector"} aria-live="polite">
      <h2>{compact ? "Evento seleccionado" : "Evento"}</h2>
      {properties ? (
        <>
          <dl>
            <dt>Fecha</dt><dd>{properties.fecha}</dd>
            <dt>Hora del catálogo</dt><dd>{properties.hora}</dd>
            <dt>Latitud</dt><dd>{properties.latitud.toFixed(3)}°</dd>
            <dt>Longitud</dt><dd>{properties.longitud.toFixed(3)}°</dd>
            <dt>Profundidad</dt><dd>{properties.profundidad.toFixed(1)} km</dd>
            <dt>Magnitud reportada</dt><dd>{properties.magnitud.toFixed(1)}</dd>
            <dt>Ubicación original</dt><dd>{properties.ubicacion_original || "No disponible"}</dd>
            <dt>Sentido</dt><dd>{properties.sentido === "Si" ? "Marcado como sentido" : properties.sentido === "No" ? "Sin marca de sentido" : "No disponible"}</dd>
            <dt>ID derivado</dt><dd className="eventId">{properties.id}</dd>
          </dl>
          <p className="caveat">
            Hora local argentina (UTC−3) cuando corresponde a la fuente. Los segundos de eventos recientes pueden ser sintéticos. Tipo de magnitud, revisión e incertidumbres no disponibles.
          </p>
        </>
      ) : (
        <p>Hacé clic en un punto para inspeccionar el evento.</p>
      )}
      <p className="source">
        Fuente: INPRES vía inpres-sismos · commit {CATALOG_SOURCE_COMMIT.slice(0, 7)}. Los puntos son hipocentros catalogados.
      </p>
    </aside>
  );
}
