import test from "node:test";
import assert from "node:assert/strict";
import {createSlab2Geometry} from "../src/lib/slab2/create-slab2-geometry.ts";
import {geographicToScene} from "../src/lib/geo/scene-coordinates.ts";

test("el revelado cubre todas las caras de Slab2 y no empieza sobre nodata",()=>{
  const artifact={grid:{west:-76,north:-30,stepDegrees:1,width:5,height:2,
    depthKm:[null,20,100,200,null,null,30,110,210,null]},summary:{validNodes:6}};
  const built=createSlab2Geometry(artifact);
  assert.equal(built.triangles,4);
  const expected=[-75,-73].map(lon=>geographicToScene(lon,-30,0)[0]);
  built.revealRange.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<1e-6));
  const xs=Array.from(built.geometry.index.array,id=>built.geometry.getAttribute("position").getX(id));
  assert.ok(xs.every(x=>x>=built.revealRange[0]-.001&&x<=built.revealRange[1]+.001));
  built.geometry.dispose();
});

test("una malla sin caras válidas no genera un recorrido ficticio",()=>{
  const built=createSlab2Geometry({grid:{west:-76,north:-30,stepDegrees:1,width:2,height:2,
    depthKm:[20,null,30,50]},summary:{validNodes:3}});
  assert.equal(built.triangles,0);assert.deepEqual(built.revealRange,[0,0]);
  built.geometry.dispose();
});
