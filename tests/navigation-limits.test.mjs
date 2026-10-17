import test from "node:test";
import assert from "node:assert/strict";
import { constrainCamera, constrainPlanView, navigationEnvelope, TERRITORY_BOUNDS } from "../src/lib/geo/navigation-limits.ts";

test("el límite territorial admite todo el territorio y se adapta a portrait y landscape",()=>{
  for(const aspect of [.38,.75,1.78,2.6]){
    const envelope=navigationEnvelope(TERRITORY_BOUNDS,aspect);
    assert.ok(envelope.maxDistance>envelope.minDistance);
    assert.ok(envelope.min[2]<envelope.max[2]);
    const width=envelope.max[0]-envelope.min[0],height=envelope.max[2]-envelope.min[2];
    const visibleHeight=2*envelope.maxDistance*Math.tan(44*Math.PI/360);
    assert.ok(visibleHeight>=height);
    assert.ok(visibleHeight*aspect>=width);
  }
});

test("pan y zoom extremos conservan el objetivo en el dominio y la cámara a distancia finita",()=>{
  const e=navigationEnvelope(TERRITORY_BOUNDS,1.78);
  for(const sign of [-1,1]){
    const target=[sign*1e12,sign*1e12,sign*1e12];
    const result=constrainCamera([target[0]+1e10,target[1]+1e10,target[2]+1e10],target,e);
    result.target.forEach((v,i)=>assert.ok(v>=e.min[i]&&v<=e.max[i]));
    const distance=Math.hypot(...result.position.map((v,i)=>v-result.target[i]));
    assert.ok(Math.abs(distance-e.maxDistance)<1e-7);
    assert.ok(result.position.every(Number.isFinite));
  }
  const invalid=constrainCamera([NaN,Infinity,NaN],[NaN,Infinity,NaN],e);
  assert.ok(invalid.position.every(Number.isFinite));
});

test("acercamiento regional, cámara coincidente y un encuadre válido no producen escapes",()=>{
  const e=navigationEnvelope([-70,-32,-68,-30],.5,200,true);
  const target=[(e.min[0]+e.max[0])/2,-100,(e.min[2]+e.max[2])/2];
  const coincident=constrainCamera(target,target,e);
  assert.ok(Math.abs(Math.hypot(...coincident.position.map((v,i)=>v-target[i]))-e.minDistance)<1e-8);
  const position=[target[0]+100,target[1]+100,target[2]+100];
  assert.deepEqual(constrainCamera(position,target,e),{position,target});
  assert.ok(e.maxDistance<navigationEnvelope(TERRITORY_BOUNDS,.5).maxDistance);
});

test("el mapa 2D frena pan y zoom sin impedir la referencia antártica",()=>{
  for(const aspect of [.4,1,2.5]){
    const e=navigationEnvelope(TERRITORY_BOUNDS,aspect);
    for(const span of [0,1e20,NaN]){
      const view=constrainPlanView({x:-1e20,z:1e20,span},aspect);
      assert.ok(view.span>=30&&Number.isFinite(view.span));
      assert.ok(view.x>=e.min[0]&&view.x<=e.max[0]);
      assert.ok(view.z>=e.min[2]&&view.z<=e.max[2]);
    }
    const antarctic=constrainPlanView({x:0,z:5200,span:2000},aspect);
    assert.equal(antarctic.z,5200);
  }
});
