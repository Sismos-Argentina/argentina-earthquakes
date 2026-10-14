import type { Metadata } from "next";
import Link from "next/link";
import guide from "@/data/flat-slab-guide.json";
import snapshot from "@/data/catalog-snapshot.json";

export const metadata: Metadata = { title: "Metodología | Bajo nuestros pies" };

export default function MethodologyPage() {
  return <main className="methodologyPage">
    <Link href="/">← Volver a Bajo nuestros pies</Link>
    <p className="eyebrow">Fuentes, decisiones y límites · revisión 14/10/2026</p>
    <h1>Cómo mirar debajo de Argentina</h1>
    <p className="methodologyLead">{guide.question}</p>
    <h2>Qué representa cada capa</h2>
    <ul>
      <li><strong>Observaciones catalogadas:</strong> posiciones, magnitudes reportadas y profundidades de INPRES. Los puntos conservan sus valores originales.</li>
      <li><strong>Modelos externos:</strong> GEBCO 2026 describe elevación y batimetría; USGS Slab2 2018 representa la geometría de la placa con profundidad DEP, incertidumbre UNC y máscara CLP.</li>
      <li><strong>Cálculos derivados:</strong> selección y proyección geodésica de hipocentros sobre el corte; interpolación de las capas dentro de su dominio válido.</li>
      <li><strong>Interpretación:</strong> la relación entre subducción subhorizontal, cuña del manto y magmatismo se apoya en Gao et al. (2021). La visualización no demuestra por sí sola esa explicación.</li>
    </ul>
    <h2>Catálogo y revisión de calidad</h2>
    <p>Snapshot instrumental: {snapshot.events.toLocaleString("es-AR")} registros, 16/07/2011–14/09/2026, incluidos eventos fuera de Argentina. Procede de INPRES mediante el export normalizado de <a href="https://github.com/Sismos-Argentina/inpres-sismos" target="_blank" rel="noreferrer">inpres-sismos</a>. Identidad de la fuente: commit <code>{snapshot.sourceCommit}</code>; SHA-256 del GeoJSON web: <code>{guide.web.sha256}</code>.</p>
    <p>Se excluye provisionalmente de la visualización un registro que INPRES reporta como M8 el 29/01/2019, sin corroboración equivalente en USGS e ISC. El original no se corrige ni se borra: Filtros permite reincluirlo y el inspector explica la discrepancia. Quedan 80.469 eventos habilitados por defecto. Otras discrepancias de magnitud o profundidad permanecen visibles con anotaciones; las escalas no siempre están documentadas.</p>
    <p><a href="http://contenidos.inpres.gob.ar/epicentro3.php?s=20190129060236" target="_blank" rel="noreferrer">Ficha INPRES del registro en revisión</a> · <a href="https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2019-01-28&endtime=2019-01-31&latitude=-31.076&longitude=-68.439&maxradiuskm=300&minmagnitude=2" target="_blank" rel="noreferrer">Consulta USGS</a> · <a href="https://www.isc.ac.uk/fdsnws/event/1/query?eventid=617802051&includeallorigins=true&includeallmagnitudes=true&format=xml" target="_blank" rel="noreferrer">Candidato temporal ISC</a>. La coincidencia temporal del candidato ISC no demuestra identidad con el registro INPRES.</p>
    <h2>Cortes comparables</h2>
    <p>Las paradas a 31°S y 35°S usan el mismo período, los mismos extremos longitudinales (73°O–61°O) y una franja de 50 km a cada lado de la geodésica WGS84 A–B. Esa línea curva ligeramente hacia el sur entre extremos: el rótulo de latitud corresponde a los extremos. Los hipocentros de la franja se proyectan sobre ella; no ocurrieron todos sobre la línea. Los modelos se muestrean en la línea central, no en todo el corredor.</p>
    <p>Ambas paradas comparten píxeles por kilómetro y rango vertical 0–700 km, a escala 1×. El filtro de magnitud es opcional y conserva el mismo umbral entre paradas. No existe un cupo de 500 o 1.000 eventos. Los puntos pequeños y transparentes permiten ver la densidad sin modificar coordenadas. La línea discontinua y su banda representan DEP ± UNC; se interrumpen en nodata o fuera de CLP, sin extrapolar. El fondo claro u oscuro cambia la paleta, sin modificar la muestra. La descarga PNG conserva el gráfico completo e identifica filtros, escala, snapshot y fuentes.</p>
    <h2>Límites de la lectura</h2>
    <ul>
      <li>La cobertura y completitud del catálogo cambian por región y período. Los conteos no equivalen a riesgo, peligrosidad ni tasas comparables de actividad.</li>
      <li>No se confirma la referencia vertical exacta de INPRES. La superposición con los modelos es nominal; no se interpreta como distancia física exacta.</li>
      <li>La proximidad a Slab2 no clasifica sismos como interplaca, intraplaca o de placa superior. La incertidumbre individual del catálogo no está disponible de forma homogénea.</li>
      <li>El mapa 3D usa una aproximación equirectangular centrada en 35°S. Hipocentros y Slab2 mantienen profundidad 1×; la exageración del relieve (1×, 5× o 10×) se indica en pantalla. Los ángulos exactos se evalúan fuera de esa escena.</li>
      <li>GEBCO integra fuentes e interpolaciones heterogéneas. El artefacto web de Slab2 usa malla de 0,1° derivada de la fuente de 0,05°. No se añadieron datos de volcanes ni tomografía a esta obra.</li>
    </ul>
    <h2>Fuentes y bibliografía</h2>
    <ul>
      <li><a href="https://www.inpres.gob.ar/" target="_blank" rel="noreferrer">INPRES</a>: catálogo instrumental y archivo histórico, atribuidos a la fuente oficial.</li>
      {guide.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>: {source.scope}</li>)}
      <li><a href="https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid" target="_blank" rel="noreferrer">GEBCO 2026</a>: superficie modelada.</li>
      <li><a href="https://www.ign.gob.ar/" target="_blank" rel="noreferrer">Instituto Geográfico Nacional</a> y <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth 5.1.1</a>: contexto cartográfico.</li>
    </ul>
    <h2>Archivo histórico y fotografías</h2>
    <p>Se conservan cuatro casos históricos de INPRES: San Juan 1894 y 1944, Caucete 1977 y El Galpón 2015. Se presentan separados del catálogo instrumental 2011–2026 y no se vinculan automáticamente evento por evento. Mercalli describe intensidad de efectos, no magnitud instrumental. Las 20 fotografías seleccionadas carecen de permisos de reutilización demostrados y no se reproducen ni se incluyen en el export público. Sus referencias y metadatos se preservan; se enlaza al archivo original.</p>
    <h2>Asistencia de IA</h2>
    <p>Se utilizó Codex de OpenAI para asistir en revisión de código y datos, búsqueda de fuentes, redacción técnica, implementación de controles y ejecución de pruebas. Las decisiones científicas, autoría editorial y aprobación de publicación corresponden al responsable humano. Antes de postular, debe completar la revisión final y la declaración exigida por el concurso.</p>
    <p>La visualización se renderiza de forma determinista a partir de datos y modelos existentes. No se generaron ni alteraron eventos con IA, ni se utilizaron imágenes generativas o manipulación generativa de fotografías.</p>
  </main>;
}
