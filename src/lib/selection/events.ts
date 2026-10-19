import type {InpresFeature} from "../data/inpres.ts";

export type GeoBox = [west:number,south:number,east:number,north:number];
export type PlotBox = [fromKm:number,minDepthKm:number,toKm:number,maxDepthKm:number];
export type EventRow = {feature:InpresFeature;alongKm?:number;crossKm?:number};
export type EventListState = {open:boolean;query:string;page:number;checked:string[]};
export const emptyEventList = ():EventListState => ({open:false,query:"",page:0,checked:[]});

export function geoBox(a:[number,number],b:[number,number]):GeoBox {
  return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];
}
export function plotBox(a:[number,number],b:[number,number]):PlotBox {
  return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];
}
export function inGeoBox(feature:InpresFeature,box:GeoBox):boolean {
  const [lon,lat]=feature.geometry.coordinates;
  return lon>=box[0]&&lon<=box[2]&&lat>=box[1]&&lat<=box[3];
}
export function inPlotBox(row:EventRow,box:PlotBox):boolean {
  return row.alongKm!==undefined&&row.alongKm>=box[0]&&row.alongKm<=box[2]
    &&row.feature.properties.profundidad>=box[1]&&row.feature.properties.profundidad<=box[3];
}
const normalize=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es");
export function searchEvents(rows:EventRow[],query:string):EventRow[] {
  const words=normalize(query.trim()).split(/\s+/).filter(Boolean);
  if(!words.length)return rows;
  return rows.filter(({feature:{properties:p}})=>{
    const text=normalize(`${p.id} ${p.fecha} ${p.hora} ${p.ubicacion_original??""} ${p.magnitud} ${p.profundidad}`);
    return words.every(word=>text.includes(word));
  });
}
export function rowsForExport(rows:EventRow[],checked:readonly string[]):EventRow[] {
  const ids=new Set(checked);
  return ids.size?rows.filter(row=>ids.has(row.feature.properties.id)):rows;
}
