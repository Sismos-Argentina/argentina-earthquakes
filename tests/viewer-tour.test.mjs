import test from "node:test";
import assert from "node:assert/strict";
import { advanceTour, nextTourChapter, previousTourChapter, tourCueAt, rectangleProgress, TOUR_CUES, TOUR_DURATION, TOUR_CHAPTERS, TOUR_REGION } from "../src/lib/story/viewer-tour.ts";
import { constrainCamera, constrainPlanView, navigationEnvelope, TERRITORY_BOUNDS } from "../src/lib/geo/navigation-limits.ts";

test("la demostración recorre cinco capítulos sin saltar acciones por cargas o cuadros lentos",()=>{
  assert.equal(TOUR_CHAPTERS.length,5);
  let state={elapsed:0,playing:true};const visited=new Set();
  for(let i=0;i<1000&&state.playing;i++){
    visited.add(tourCueAt(state.elapsed).id);
    const frozen=advanceTour(state,10000,false);
    assert.equal(frozen,state);
    const before=tourCueAt(state.elapsed);
    state=advanceTour(state,10000,true);
    assert.ok(state.elapsed<=before.end);
  }
  assert.deepEqual([...visited],TOUR_CUES.map(c=>c.id));
  assert.equal(state.elapsed,TOUR_DURATION);
  assert.equal(state.playing,false);
});

test("pausa, avance manual y repetición conservan una línea temporal acotada",()=>{
  const paused={elapsed:12300,playing:false};
  assert.equal(advanceTour(paused,200,true),paused);
  assert.equal(advanceTour({...paused,playing:true},NaN,true).elapsed,12300);
  assert.equal(nextTourChapter(6100),10000);
  assert.equal(nextTourChapter(16000),23000);
  assert.equal(nextTourChapter(23000),28000);
  assert.equal(nextTourChapter(38000),44000);
  assert.equal(previousTourChapter(16500),6000);
  assert.equal(nextTourChapter(45000),50000);
  assert.equal(rectangleProgress(6000),0);
  assert.equal(rectangleProgress(12500),.5);
  assert.equal(rectangleProgress(15900),1);
  assert.equal(tourCueAt(0).chapter,0);
});

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

import {placeCoachmark} from "../src/lib/story/coachmark-placement.ts";
test("burbujas: permanecen dentro de pantallas chicas sin tapar el botón señalado",()=>{
 for(const [width,height] of [[320,568],[390,844],[844,390],[1920,1080]])for(const [left,top] of [[10,10],[width-50,10],[10,height-50],[width-50,height-50]]){
  const target={left,top,width:40,height:36},p=placeCoachmark(target,{width:290,height:170},{width,height});
  assert.ok(p.left>=10&&p.top>=10&&p.left+290<=width-10&&p.top+170<=height-10);
  const overlapX=Math.max(0,Math.min(p.left+290,left+40)-Math.max(p.left,left)),overlapY=Math.max(0,Math.min(p.top+170,top+36)-Math.max(p.top,top));
  assert.equal(overlapX*overlapY,0);
 }
});
test("burbujas: evitan la referencia regional y ofrecen una salida visible sin objetivo",()=>{
 const size={width:290,height:170},viewport={width:1366,height:768},target={left:900,top:80,width:100,height:40};
 const p=placeCoachmark(target,size,viewport,[{left:800,top:135,width:300,height:200}]);
 assert.ok(p.top+size.height<=135||p.left+size.width<=800||p.left>=1100);
 const fallback=placeCoachmark(null,size,{width:320,height:568});assert.equal(fallback.side,"none");assert.ok(fallback.top>=10&&fallback.top+170<=558);
});

import {readFileSync} from "node:fs";
test("la zona del tutorial incluye todo San Juan del IGN con margen cartográfico",()=>{
 const cartography=JSON.parse(readFileSync(new URL("../public/data/generated/cartography-argentina-context.json",import.meta.url),"utf8"));
 const province=cartography.layers.ignProvinces.find(p=>p.code==="70");
 assert.ok(province&&province.name.includes("San Juan"));
 for(const [lon,lat] of province.lines.flat()){
  assert.ok(lon>=TOUR_REGION[0]+.3&&lon<=TOUR_REGION[2]-.3);
  assert.ok(lat>=TOUR_REGION[1]+.3&&lat<=TOUR_REGION[3]-.3);
 }
});
