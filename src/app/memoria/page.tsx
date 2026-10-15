import type { Metadata } from "next";
import HistoricalArchive from "@/components/seismic/HistoricalArchive";
import archive from "@/data/historical-archive.json";

export const metadata: Metadata = { title: "Memoria en superficie | Bajo nuestros pies" };

export default function MemoryPage() {
  return <main className="archivePage">
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Static hosting uses native document navigation; framework prefetch requested nonexistent segment files. */}
    <a href="/">← Volver al mapa</a>
    <p className="eyebrow">Archivo histórico de INPRES</p>
    <h1>Memoria en superficie</h1>
    <p>80 terremotos documentados por el Instituto Nacional de Prevención Sísmica, entre 1692 y 2021. Diez casos cuentan con galerías que se pueden consultar en el archivo oficial.</p>
    <p>La intensidad Mercalli describe los efectos reportados en superficie. Estos casos históricos se presentan por separado del catálogo instrumental del mapa y no se enlazan automáticamente con sus eventos.</p>
    <p><a href={archive.events[0].sourceUrl} target="_blank" rel="noreferrer">Consultar el catálogo histórico de INPRES ↗</a></p>
    <HistoricalArchive/>
    <p><a href="/metodologia/">Metodología y fuentes</a></p>
  </main>;
}
