import test from "node:test";
import assert from "node:assert/strict";
import {initialFilterEditor} from "../src/lib/filters/editor.ts";
const applied={dateFrom:"2011-07-16",dateTo:"2026-10-16",magnitudeMin:1.6,magnitudeMax:8.3,depthMin:0,depthMax:750};
test("salir del tutorial recupera el borrador sin aplicarlo a la muestra",()=>{
 const saved=initialFilterEditor(applied,null);saved.tab="magnitude";saved.draft.magnitudeMin=4;
 const restored=initialFilterEditor({...applied},structuredClone(saved));
 assert.equal(restored.tab,"magnitude");assert.equal(restored.draft.magnitudeMin,4);assert.equal(applied.magnitudeMin,1.6);
 restored.draft.magnitudeMin=5;assert.equal(saved.draft.magnitudeMin,4);
});
test("un cambio en filtros aplicados invalida el borrador anterior",()=>{
 const saved=initialFilterEditor(applied,null);saved.draft.depthMax=50;
 const changed={...applied,dateFrom:"2026-09-16"},result=initialFilterEditor(changed,saved);
 assert.deepEqual(result.draft,changed);assert.equal(result.tab,"date");
});
test("el orden de claves y la exclusión implícita no invalidan un borrador válido",()=>{
 const saved=initialFilterEditor(applied,null);saved.draft.depthMin=70;saved.tab="depth";
 const reordered={includeProvisional:false,...Object.fromEntries(Object.entries(applied).reverse())};
 assert.equal(initialFilterEditor(reordered,saved).draft.depthMin,70);
});
