import type {EventRow} from "./events.ts";

export type CsvProvenance = {date:string};
export const CSV_HEADER=["id_derivado_no_oficial","fecha_catalogo","hora_catalogo_local","longitud_grados","latitud_grados","profundidad_km","magnitud_reportada_escala_desconocida","ubicacion_original","marca_sentido","snapshot_fecha"];

export function csvCell(value:unknown):string {
  if(value===null||value===undefined)return "";
  let text=String(value);
  if(typeof value==="string"&&/^[\s]*[=+@\-\t\r]/.test(text))text=`'${text}`;
  return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
}
export function csvRow(row:EventRow,meta:CsvProvenance):string {
  const p=row.feature.properties;
  return [p.id,p.fecha,p.hora,...row.feature.geometry.coordinates,p.profundidad,p.magnitud,p.ubicacion_original,p.sentido,meta.date].map(csvCell).join(",")+"\r\n";
}
export async function csvParts(rows:EventRow[],meta:CsvProvenance,signal:AbortSignal):Promise<string[]> {
  const parts=["\uFEFF"+CSV_HEADER.join(",")+"\r\n"];
  for(let index=0;index<rows.length;index+=500){
    signal.throwIfAborted();
    parts.push(rows.slice(index,index+500).map(row=>csvRow(row,meta)).join(""));
    await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  signal.throwIfAborted();return parts;
}
