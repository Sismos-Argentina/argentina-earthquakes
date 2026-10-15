import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import geographiclib from "geographiclib-geodesic";
import { createGeodesicProfile, profileKey, positionAtProfile, projectToProfile, projectEventToProfile, sampleGebco, sampleSlab } from "../src/lib/profile/cuyo.ts";
import { cropGebco, cropSlab, insideRegion, regionBounds } from "../src/lib/geo/region.ts";

test("corte libre: diagonal, inverso, orientación, longitud y corredor WGS84",()=>{
  const a={longitude:-73,latitude:-29},b={longitude:-65,latitude:-34};
  const forward=createGeodesicProfile(a,b),reverse=createGeodesicProfile(b,a);
  assert.notEqual(profileKey(forward),profileKey(reverse));
  assert.notEqual(profileKey(forward),profileKey(createGeodesicProfile(a,{...b,latitude:-32})));
  assert.equal(forward.lengthKm,reverse.lengthKm);
  for(const t of [0,.2,.5,.8,1]){
    const p=positionAtProfile(forward,forward.lengthKm*t),q=positionAtProfile(reverse,reverse.lengthKm*(1-t));
    assert.ok(geographiclib.Geodesic.WGS84.Inverse(p.latitude,p.longitude,q.latitude,q.longitude).s12<.001);
    const projected=projectToProfile(forward,p.longitude,p.latitude);
    assert.ok(Math.abs(projected.alongKm-forward.lengthKm*t)<.001);assert.ok(projected.crossKm<.001);
  }
  const mid=positionAtProfile(forward,forward.lengthKm/2);
  for(const side of [-1,1])for(const km of [49.9,50.1]){
    const edge=geographiclib.Geodesic.WGS84.Direct(mid.latitude,mid.longitude,mid.azimuth+side*90,km*1000);
    const event={geometry:{coordinates:[edge.lon2,edge.lat2]},properties:{id:"test",profundidad:150}};
    assert.equal(Boolean(projectEventToProfile(event,forward)),km<50);
    assert.equal(Boolean(projectEventToProfile(event,reverse)),km<50);
  }
  for(const pair of [[a,a],[a,{longitude:-20,latitude:-10}],[a,{longitude:NaN,latitude:-31}],[{longitude:-73,latitude:-73},b]])assert.throws(()=>createGeodesicProfile(...pair));
});

test("selección rectangular normalizada e inclusiva; cero eventos válido",()=>{
  for(const [a,b] of [[[-73,-29],[-61,-33]],[[-61,-33],[-73,-29]],[[-61,-29],[-73,-33]],[[-73,-33],[-61,-29]]])assert.deepEqual(regionBounds(a,b),[-73,-33,-61,-29]);
  const bounds=regionBounds([-61,-33],[-73,-29]);assert.deepEqual(bounds,[-73,-33,-61,-29]);
  assert.equal(insideRegion(-73,-33,bounds),true);assert.equal(insideRegion(-61,-29,bounds),true);
  assert.equal(insideRegion(-73.001,-31,bounds),false);assert.throws(()=>regionBounds([-70,-31],[-70.01,-31.01]));
});

test("recorte GEBCO conserva centros, valores, nodata e interpolación",async()=>{
  const original=JSON.parse(await readFile(new URL("../public/data/generated/gebco-2026-scientific.json",import.meta.url),"utf8"));
  const bounds=[-73,-33,-61,-29],cropped=cropGebco(original,bounds),g=cropped.grid,old=original.grid;
  const dx=(old.bbox[2]-old.bbox[0])/old.width,dy=(old.bbox[3]-old.bbox[1])/old.height;
  assert.equal(g.elevationMeters.length,g.width*g.height);
  assert.equal(g.registration,"cell-center");assert.deepEqual(g.cellSizeDegrees,old.cellSizeDegrees);
  assert.equal(cropped.statistics.validCells+cropped.statistics.nodataCells,g.width*g.height);
  for(let row=0;row<g.height;row+=11)for(let col=0;col<g.width;col+=13){
    const lon=g.bbox[0]+(col+.5)*dx,lat=g.bbox[3]-(row+.5)*dy;
    assert.ok(Math.abs(sampleGebco(original,lon,lat)-sampleGebco(cropped,lon,lat))<.000001);
  }
  const fixture={grid:{width:6,height:6,bbox:[0,0,6,6],elevationMeters:Array.from({length:36},(_,i)=>i===14?null:i)},statistics:{}};
  assert.ok(cropGebco(fixture,[2,2,4,4]).grid.elevationMeters.includes(null));
  assert.equal(original.grid.width,1300);assert.equal(original.grid.height,1440);
});

test("recorte Slab2 conserva DEP, UNC, huecos y nodos originales; fuera de CLP no inventa superficie",async()=>{
  const original=JSON.parse(await readFile(new URL("../public/data/generated/slab2-sam-2018-scientific.json",import.meta.url),"utf8"));
  const cropped=cropSlab(original,[-73,-33,-61,-29]),g=cropped.grid;
  assert.equal(g.depthKm.length,g.width*g.height);assert.equal(g.uncertaintyKm.length,g.depthKm.length);
  let holes=0,valid=0;
  for(let lat=-32.95;lat<-29;lat+=.13)for(let lon=-72.95;lon<-61;lon+=.17){
    const a=sampleSlab(original,lon,lat),b=sampleSlab(cropped,lon,lat);
    if(a===null){assert.equal(b,null);holes++;}else{assert.ok(Math.abs(a.depthKm-b.depthKm)<1e-8);assert.ok(Math.abs(a.uncertaintyKm-b.uncertaintyKm)<1e-8);valid++;}
  }
  assert.ok(holes>0&&valid>0);
  const outside=cropSlab(original,[-40,-65,-30,-60]);assert.equal(outside.summary.validNodes,0);assert.equal(outside.grid.depthKm.length,0);
});

test("lugares: colección fija y rótulos argentinos con coordenadas válidas",async()=>{
  const data=JSON.parse(await readFile(new URL("../src/data/place-labels.json",import.meta.url),"utf8"));
  assert.equal(data.places.length,158);assert.equal(new Set(data.places.map(p=>p.id)).size,158);
  assert.ok(data.places.some(p=>p.name==="San Juan"));assert.ok(data.places.some(p=>p.name==="Mendoza"));
  for(const p of data.places){assert.ok(Number.isFinite(p.longitude)&&Number.isFinite(p.latitude));assert.ok(p.longitude>=-74&&p.longitude<=-52);assert.ok(p.latitude>=-56&&p.latitude<=-20);}
});
