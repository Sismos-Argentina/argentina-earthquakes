import test from "node:test";
import assert from "node:assert/strict";
import {geoBox,plotBox,inGeoBox,inPlotBox,searchEvents,rowsForExport} from "../src/lib/selection/events.ts";
import {csvCell,csvRow,csvParts,CSV_HEADER} from "../src/lib/selection/csv.ts";

const row=(id,lon=-69,lat=-31,depth=100,along=10)=>({feature:{type:"Feature",id,geometry:{type:"Point",coordinates:[lon,lat]},properties:{id,fecha:"19/10/2026",hora:"01:02:00",latitud:lat,longitud:lon,profundidad:depth,magnitud:3.1,ubicacion_original:"San Juán",sentido:null}},alongKm:along,crossKm:-2});
const meta={date:"2026-10-16",sourceCommit:"provider",webSha256:"hash",context:"selección actual"};

test("selección geográfica y de perfil: ambos sentidos, bordes inclusivos y cero resultados",()=>{
  assert.deepEqual(geoBox([-70,-30],[-68,-32]),geoBox([-68,-32],[-70,-30]));
  const g=geoBox([-70,-30],[-68,-32]);
  assert.ok(inGeoBox(row("a",-70,-32).feature,g));assert.ok(!inGeoBox(row("b",-70.001,-32).feature,g));
  const p=plotBox([50,150],[10,0]);assert.deepEqual(p,[10,0,50,150]);
  assert.ok(inPlotBox(row("a",-69,-31,0,10),p));assert.ok(inPlotBox(row("a",-69,-31,150,50),p));
  assert.ok(!inPlotBox(row("b",-69,-31,150.001,50),p));assert.ok(!inPlotBox({feature:row("c").feature},p));
});
test("buscar tolera acentos y combina términos; marcas de otras páginas se exportan",()=>{
  const rows=Array.from({length:61},(_,i)=>row(String(i)));
  assert.equal(searchEvents(rows,"SAN JUAN 2026").length,61);assert.equal(searchEvents(rows,"Mendoza").length,0);
  assert.deepEqual(rowsForExport(rows,["0","25","60"]).map(r=>r.feature.properties.id),["0","25","60"]);
  assert.equal(rowsForExport(rows,[]).length,61);assert.equal(rowsForExport(rows,["ausente"]).length,0);
});
test("CSV: comillas, comas, saltos y fórmulas textuales sin alterar números negativos",()=>{
  assert.equal(csvCell('Lugar, "A"\nB'),'"Lugar, ""A""\nB"');
  for(const s of ['=1+1',' +SUM(A1)','@cmd','-texto','\t=1'])assert.ok(csvCell(s).startsWith("'"));
  assert.equal(csvCell(-69.3),"-69.3");assert.equal(csvCell(null),"");
  const output=csvRow(row("a"),meta);
  assert.ok(output.includes(",-69,-31,100,3.1,"));assert.equal(CSV_HEADER.length,10);
  assert.ok(output.endsWith(",2026-10-16\r\n"));
  for(const name of ["fuente","revision_local","seleccion","snapshot_commit_proveedor","snapshot_sha256_web","distancia_desde_A_km_derivada","distancia_transversal_km_derivada"])assert.ok(!CSV_HEADER.includes(name));
});
test("CSV completo en tandas: todas las filas, identidad y cancelación sin publicar parcial",async()=>{
  const rows=Array.from({length:1003},(_,i)=>row(String(i)));
  const parts=await csvParts(rows,meta,new AbortController().signal);
  assert.equal(parts.join("").split("\r\n").length,1005);assert.ok(parts[0].startsWith("\uFEFF"));
  assert.equal(parts[0].trim().replace(/^\uFEFF/,"").split(",").length,CSV_HEADER.length);
  assert.ok(parts.join("").includes("1002,19/10/2026"));
  const controller=new AbortController();const pending=csvParts(rows,meta,controller.signal);controller.abort();
  await assert.rejects(pending,{name:"AbortError"});
});
