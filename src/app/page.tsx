export default function Home() {
  return (
    <main className="shell">
      <section className="intro" aria-labelledby="project-title">
        <p className="eyebrow">Argentina · visualización científica</p>
        <h1 id="project-title">Sismos Visuales</h1>
        <p className="summary">
          Una experiencia interactiva para explorar la distribución espacial y
          la profundidad de los sismos registrados en Argentina.
        </p>
        <div className="status" role="status">
          <span className="statusMarker" aria-hidden="true" />
          <span>Base técnica en preparación</span>
        </div>
      </section>

      <aside className="principle" aria-label="Principio científico">
        <span>Principio del proyecto</span>
        <p>
          Los datos observados, los modelos científicos y las interpretaciones
          se presentarán como categorías distintas.
        </p>
      </aside>
    </main>
  );
}
