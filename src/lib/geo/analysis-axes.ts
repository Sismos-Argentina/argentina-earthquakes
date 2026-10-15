import * as THREE from "three";
import { geographicToScene } from "./scene-coordinates";
import type { RegionBounds } from "./region";

export function disposeAnalysisGroup(group: THREE.Object3D) {
  group.traverse(object => {
    const drawable = object as THREE.Mesh;
    drawable.geometry?.dispose();
    const materials = drawable.material ? (Array.isArray(drawable.material) ? drawable.material : [drawable.material]) : [];
    for (const material of materials) { (material as THREE.SpriteMaterial).map?.dispose(); material.dispose(); }
  });
}

/** Kilometer ticks chosen from their projected screen spacing. */
export function depthTickStep(pixelsPerKm: number) {
  return [1,2,5,10,20,50,100,200,500,1000].find(v=>v>=45/Math.max(.001,pixelsPerKm))??1000;
}

export function createAnalysisAxes(bounds: RegionBounds, maxDepthKm: number, sparse=false, step=100, depthRange=[0,maxDepthKm], depthLabels=true) {
  const group=new THREE.Group(); group.userData.analysisAxes=true;
  const [x0,,z0]=geographicToScene(bounds[0],bounds[3],0),[x1,,z1]=geographicToScene(bounds[2],bounds[1],0);
  const vertices:number[]=[];
  const segment=(a:number[],b:number[])=>vertices.push(...a,...b);
  const label=(text:string,x:number,y:number,z:number)=>{
    const canvas=document.createElement("canvas");canvas.width=384;canvas.height=96;
    const ctx=canvas.getContext("2d")!;
    ctx.font="600 64px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.strokeStyle="#061015";ctx.lineWidth=9;ctx.strokeText(text,192,48,370);
    ctx.fillStyle="#ffffff";ctx.fillText(text,192,48,370);
    const material=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false,depthWrite:false,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.position.set(x,y,z);sprite.renderOrder=20;sprite.userData.axisLabel=true;sprite.userData.labelPriority=text.endsWith("km")?3:2;if(text.endsWith("km"))sprite.center.set(.85,.5);sprite.userData.screenWidth=Math.min(ctx.measureText(text).width,370)/4+8;
    const worldPosition=new THREE.Vector3();
    sprite.onBeforeRender=(renderer,_scene,camera)=>{
      const perspective=camera as THREE.PerspectiveCamera;
      const worldPerPixel=2*perspective.position.distanceTo(sprite.getWorldPosition(worldPosition))*Math.tan(THREE.MathUtils.degToRad(perspective.fov/2))/Math.max(renderer.domElement.clientHeight,1);
      sprite.scale.set(worldPerPixel*96,worldPerPixel*24,1);sprite.updateMatrixWorld();
    };
    group.add(sprite);
  };
  if(!sparse){
    for(const depth of [0,maxDepthKm]){
      segment([x0,-depth,z0],[x1,-depth,z0]);segment([x1,-depth,z0],[x1,-depth,z1]);
      segment([x1,-depth,z1],[x0,-depth,z1]);segment([x0,-depth,z1],[x0,-depth,z0]);
    }
    for(const[x,z]of[[x0,z0],[x1,z0],[x1,z1]])segment([x,0,z],[x,-maxDepthKm,z]);
    for(let i=0;i<=2;i++){
      const t=i/2,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;
      label((bounds[0]+(bounds[2]-bounds[0])*t).toFixed(1)+"° lon",x,-maxDepthKm-25,z0);
      label((bounds[3]+(bounds[1]-bounds[3])*t).toFixed(1)+"° lat",x1,-maxDepthKm-25,z);
    }
  }
  segment([x0,0,z1],[x0,-maxDepthKm,z1]);
  const tick=Math.min(15,Math.abs(x1-x0)*.03);
  for(let depth=Math.ceil(Math.max(0,depthRange[0])/step)*step;depth<=Math.min(maxDepthKm,depthRange[1]);depth+=step){
    segment([x0-tick,-depth,z1],[x0+tick,-depth,z1]);
    if(!sparse){segment([x0,-depth,z1],[x1,-depth,z1]);segment([x0,-depth,z0],[x0,-depth,z1]);}
    if(depthLabels)label(depth+" km",x0-tick*3,-depth,z1);
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(vertices,3)),new THREE.LineBasicMaterial({color:0xf0f5fa,transparent:true,opacity:sparse?.75:.28,depthWrite:false})));
  return group;
}
