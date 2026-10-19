import test from "node:test";
import assert from "node:assert/strict";
import { resizePlanView, zoomPlanView, pointLayerPlacement } from "../src/lib/geo/plan-viewport.ts";

test("rotar o redimensionar conserva centro y extensión vertical, también al regresar", () => {
  const wide={width:1366,height:650},narrow={width:390,height:680},view={x:250,z:-120,span:8000};
  const portrait=resizePlanView(view,wide,narrow);
  assert.equal(portrait.x,view.x); assert.equal(portrait.z,view.z);
  assert.ok(Math.abs(portrait.span*narrow.height/narrow.width-view.span*wide.height/wide.width)<1e-8);
  assert.ok(Math.abs(resizePlanView(portrait,narrow,wide).span-view.span)<1e-8);
});

test("zoom conserva la coordenada bajo el puntero en todos los cuadrantes", () => {
  const size={width:1000,height:700},view={x:100,z:300,span:4000};
  for(const factor of [.3,1.8])for(const point of [{x:50,y:50},{x:900,y:650},{x:500,y:350}]){
    const next=zoomPlanView(view,size,factor,point);
    for(const [axis,pixel,center] of [["x",point.x,500],["z",point.y,350]]){
      const before=view[axis]+(pixel-center)*view.span/size.width;
      assert.ok(Math.abs(next[axis]+(pixel-center)*next.span/size.width-before)<1e-8);
    }
  }
});

test("el buffer reutilizado y el picking comparten proyección al hacer pan, zoom y resize", () => {
  const layer={view:{x:150,z:300,span:5000},width:1000,height:600,margin:200};
  for(const [view,size] of [[{x:-50,z:600,span:2500},{width:1000,height:600}],[{x:300,z:-150,span:8000},{width:390,height:700}]]){
    const box=pointLayerPlacement(layer,view,size),ratio=box.width/(layer.width+2*layer.margin);
    for(const p of [{x:150,z:300},{x:-1300,z:2000}]){
      const screenX=box.x+((p.x-layer.view.x)*layer.width/layer.view.span+layer.width/2+layer.margin)*ratio;
      const screenY=box.y+((p.z-layer.view.z)*layer.width/layer.view.span+layer.height/2+layer.margin)*ratio;
      assert.ok(Math.abs(screenX-((p.x-view.x)*size.width/view.span+size.width/2))<1e-8);
      assert.ok(Math.abs(screenY-((p.z-view.z)*size.width/view.span+size.height/2))<1e-8);
    }
  }
});
