"use client";
import { useEffect, useState } from "react";
import { catalogReviewLabel } from "@/lib/data/catalog-schedule";

export default function CatalogUpdateNote({ date }: { date: string }) {
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setNext(catalogReviewLabel(new Date()));
    update(); const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);
  return <small className="catalogUpdateNote">Catálogo hasta {date.split("-").reverse().join("/")}. Actualización semanal.
    <span>Próxima revisión prevista: {next ?? "viernes, 08:43"} (Argentina).</span>
  </small>;
}
