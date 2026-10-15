import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {DEPTH_STOPS,eventColor} from "../src/lib/geo/event-colors.ts";

test("profundidad continua: no introduce saltos artificiales a 70 o 300 km",()=>{
  for(const depth of DEPTH_STOPS.slice(1,-1).map(([value])=>value)){
    const a=eventColor(depth-.001),b=eventColor(depth+.001);
    assert.ok(a.every((v,i)=>Math.abs(v-b[i])<.0001));
  }
  assert.deepEqual(eventColor(-1),eventColor(0));
  assert.deepEqual(eventColor(1000),eventColor(750));
});

test("archivo histórico completo, fuentes identificadas y sin magnitudes inventadas",async()=>{
  const archive=JSON.parse(await readFile(new URL("../src/data/historical-archive.json",import.meta.url)));
  assert.equal(archive.events.length,80);assert.equal(archive.featured.length,10);
  assert.equal(new Set(archive.events.map(e=>e.id)).size,80);
  assert.equal(archive.provenance.providerCommit,"c5634cac3bb3d3757ed79dfd897b58c128fb5798");
  for(const event of archive.events){
    assert.ok(event.description.length>10&&event.intensity.grado_principal);
    assert.match(event.date,/^\d{4}-\d{2}-\d{2}$/);
    assert.match(event.sourceUrl,/^https?:\/\/contenidos\.inpres\.gob\.ar\//);
    if(archive.featured.includes(event.id))assert.ok(event.galleries.length);
    assert.equal("magnitude" in event,false);
  }
});
