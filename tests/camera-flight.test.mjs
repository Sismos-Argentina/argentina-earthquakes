import test from "node:test";
import assert from "node:assert/strict";
import {Vector3,Matrix4,Quaternion} from "three";
import {cameraFlight} from "../src/lib/geo/camera-flight.ts";

const rotation=p=>new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(p.position,p.target,p.up));
test("vuelo desde abajo e invertido: sin cruzar el objetivo ni salto final de orientación",()=>{
  const target=new Vector3(0,-150,0);
  const end={position:new Vector3(0,5000,1),target,up:new Vector3(0,1,0)};
  for(const start of [
    {position:new Vector3(0,-3000,-3000),target,up:new Vector3(0,-1,0)},
    {position:new Vector3(0,-5000,-1),target,up:new Vector3(0,1,0)},
    {position:new Vector3(3500,-200,0),target,up:new Vector3(-1,0,0)},
  ]){
    const flight=cameraFlight(start,end);let previous=rotation(start);
    for(let i=1;i<=120;i++){
      const pose=flight.sample(i/120),next=rotation(pose);
      assert.ok(pose.position.distanceTo(pose.target)>3000);
      assert.ok(next.angleTo(previous)<.06,`paso ${i}`);
      for(const value of [...pose.position.toArray(),...pose.up.toArray()])assert.ok(Number.isFinite(value));
      previous=next;
    }
    assert.deepEqual(flight.sample(1),end);
    assert.ok(rotation(flight.sample(.99999)).angleTo(rotation(end))<1e-5);
  }
});
