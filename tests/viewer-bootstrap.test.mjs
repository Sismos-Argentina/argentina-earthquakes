import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {VIEWER_BOOTSTRAP} from "../src/lib/ui/viewer-bootstrap.ts";
function visit(url,stored,blocked=false){
 const dataset={},memory=new Map(stored?[["sismos.appearance",stored]]:[]),history={state:{scroll:8},replaceState(state,_,path){this.path=path;this.preserved=state;}};
 vm.runInNewContext(VIEWER_BOOTSTRAP,{URL,document:{documentElement:{dataset}},location:{href:url},history,localStorage:{removeItem:key=>{if(blocked)throw Error("Storage blocked");memory.delete(key);}}});
 return {dataset,memory,history};
}
test("toda preferencia o URL antigua abre el único diseño cartográfico oscuro",()=>{
 for(const design of ["actual","estudio","gis","desconocido"]){
  const r=visit(`https://example.test/?diseno=${design}&tema=light`,JSON.stringify({design,theme:"light"}));
  assert.deepEqual(r.dataset,{layout:"cartographic",theme:"dark"});assert.equal(r.memory.has("sismos.appearance"),false);
  assert.equal(r.history.path,"/");
 }
});
test("la migración conserva ruta, parámetros ajenos, fragmento y estado del historial",()=>{
 const r=visit("https://example.test/metodologia/?diseno=estudio&diagnostico=1&tema=light#fuentes");
 assert.equal(r.history.path,"/metodologia/?diagnostico=1#fuentes");assert.deepEqual(r.history.preserved,{scroll:8});
});
test("storage bloqueado o preferencia corrupta no impiden arrancar ni navegar",()=>{
 for(const blocked of [false,true]){
  const r=visit("https://example.test/memoria/","invalid-json",blocked);
  assert.deepEqual(r.dataset,{layout:"cartographic",theme:"dark"});assert.equal(r.history.path,undefined);
 }
});
test("visitar cualquier ruta sin preferencias conserva la misma apariencia",()=>{
 for(const path of ["/","/memoria/","/metodologia/"])
  assert.deepEqual(visit("https://example.test"+path).dataset,{layout:"cartographic",theme:"dark"});
});
