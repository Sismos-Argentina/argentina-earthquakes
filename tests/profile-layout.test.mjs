import test from "node:test";
import assert from "node:assert/strict";
import {fitProfilePlot} from "../src/lib/profile/plot-layout.ts";
test("los cortes completos caben en el marco en móvil, escritorio y tutorial sin deformar kilómetros",()=>{
 for(const [w,h] of [[296,250],[364,380],[750,400],[1500,780]])for(const [length,depth] of [[1145.5,700],[1100,700],[600,450],[2000,750],[20,100]]){
  const p=fitProfilePlot(w,h,length,depth);
  assert.ok(p.width<=w+1&&p.height<=h+1,JSON.stringify({w,h,length,depth,p}));
  assert.ok(p.scale>0&&Number.isFinite(p.scale));
  assert.ok(Math.abs((p.width-74)/length-(p.height-59)/(depth+9))<=1/length+1/(depth+9));
 }
});
test("el mismo marco y rango de comparación conservan idénticos píxeles por kilómetro",()=>{
 const sanJuan=fitProfilePlot(920,500,1145.5,700),mendoza=fitProfilePlot(920,500,1145.5,700);
 assert.deepEqual(sanJuan,mendoza);
 assert.ok(fitProfilePlot(1400,780,600,450).width>900);
});
