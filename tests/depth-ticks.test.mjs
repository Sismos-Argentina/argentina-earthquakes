import test from "node:test";
import assert from "node:assert/strict";
import {depthTickStep} from "../src/lib/geo/analysis-axes.ts";

test("las marcas de profundidad no alternan con pequeñas oscilaciones de cámara",()=>{
  let step=depthTickStep(.91);
  assert.equal(step,50);
  for(const density of [.89,.9,.91,.88,.92,.9]) {
    step=depthTickStep(density,step);
    assert.equal(step,50);
  }
  step=depthTickStep(.7,step);
  assert.equal(step,100);
  for(const density of [.89,.91,.9])assert.equal(depthTickStep(density,step),100);
});

test("el intervalo vuelve a adaptarse cuando el zoom cambia de forma significativa",()=>{
  assert.equal(depthTickStep(1.3,100),50);
  assert.equal(depthTickStep(.1,50),500);
  assert.equal(depthTickStep(50,500),1);
  for(const density of [.05,.2,.5,1,2,10]) {
    const step=depthTickStep(density);
    assert.ok(step*density>=45);
    assert.ok([1,2,5,10,20,50,100,200,500,1000].includes(step));
  }
});

test("una proyección degenerada conserva intervalos finitos y unidades en kilómetros",()=>{
  for(const density of [0,-1,NaN,Infinity,-Infinity])assert.equal(depthTickStep(density),1000);
  assert.equal(depthTickStep(1,7),50);
});
