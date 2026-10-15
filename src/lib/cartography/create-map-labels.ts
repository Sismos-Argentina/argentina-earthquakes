import * as THREE from "three";

import type { GebcoProfile } from "@/lib/data/gebco";
import { geographicToScene } from "@/lib/geo/scene-coordinates";
import type { GebcoArtifact } from "@/lib/data/gebco";
import type { RegionBounds } from "@/lib/geo/region";
import { sampleGebcoElevationMeters } from "@/lib/terrain/create-gebco-geometry";
import places from "@/data/place-labels.json";

type LabelDefinition = {
  text: string;
  longitude: number;
  latitude: number;
  tone?: "place" | "water" | "context";
};

const LABELS: Record<GebcoProfile, LabelDefinition[]> = {
  scientific: [
    { text: "ARGENTINA", longitude: -64.5, latitude: -39.5 },
    { text: "CHILE", longitude: -72.5, latitude: -36.5 },
    { text: "ANDES", longitude: -69.4, latitude: -29.5, tone: "context" },
    { text: "TIERRA DEL FUEGO", longitude: -67.6, latitude: -54.2 },
    { text: "ISLAS MALVINAS", longitude: -59.0, latitude: -51.7 },
    { text: "OCÉANO PACÍFICO", longitude: -78.0, latitude: -41.0, tone: "water" },
    { text: "OCÉANO ATLÁNTICO", longitude: -55.0, latitude: -42.5, tone: "water" },
  ],
  context: [
    { text: "ARGENTINA", longitude: -64.5, latitude: -39.5 },
    { text: "CHILE", longitude: -72.5, latitude: -36.5 },
    { text: "TIERRA DEL FUEGO", longitude: -67.6, latitude: -54.2 },
    { text: "ISLAS MALVINAS", longitude: -59.0, latitude: -51.7 },
    { text: "ATLÁNTICO SUR", longitude: -27.0, latitude: -43.0, tone: "water" },
    { text: "PACÍFICO", longitude: -89.0, latitude: -42.0, tone: "water" },
    { text: "ANTÁRTIDA ARGENTINA", longitude: -49.5, latitude: -82.0, tone: "context" },
  ],
};

function labelColor(tone: LabelDefinition["tone"]) {
  if (tone === "water") return "#8fc9d5";
  if (tone === "context") return "#c7d3d2";
  return "#fff1cb";
}

function createLabelSprite(definition: LabelDefinition, profile: GebcoProfile) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para rótulos.");
  context.font = "600 84px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = "4px";
  context.shadowColor = "rgba(3, 10, 13, 0.95)";
  context.shadowBlur = 10;
  context.lineWidth = 7;
  context.strokeStyle = "rgba(3, 10, 13, 0.9)";
  context.strokeText(definition.text, canvas.width / 2, canvas.height / 2,740);
  context.fillStyle = labelColor(definition.tone);
  context.fillText(definition.text, canvas.width / 2, canvas.height / 2,740);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const [x, , z] = geographicToScene(definition.longitude, definition.latitude, 0);
  sprite.position.set(x, 55, z);
  sprite.userData.placeLabel=true;
  sprite.userData.profile=profile;
  sprite.onBeforeRender=(renderer,_scene,camera)=>{
    const view=camera as THREE.PerspectiveCamera,world=sprite.getWorldPosition(new THREE.Vector3());
    const pixel=2*view.position.distanceTo(world)*Math.tan(THREE.MathUtils.degToRad(view.fov/2))/Math.max(renderer.domElement.clientHeight,1);
    sprite.scale.set(pixel*125,pixel*21,1);sprite.updateMatrixWorld();
  };
  sprite.renderOrder = 6;
  return sprite;
}

export function createMapLabels(profile: GebcoProfile) {
  const group = new THREE.Group();
  for (const definition of LABELS[profile]) {
    group.add(createLabelSprite(definition, profile));
  }
  return group;
}

export function disposeMapLabels(group: THREE.Group) {
  group.traverse((object) => {
    if (!(object instanceof THREE.Sprite)) return;
    object.material.map?.dispose();
    object.material.dispose();
  });
}

export function createRegionalPlaceLabels(bounds:RegionBounds, terrain:GebcoArtifact) {
  const group=new THREE.Group();group.userData.placeLabels=true;
  const candidates=places.places.filter(p=>p.longitude>=bounds[0]&&p.longitude<=bounds[2]&&p.latitude>=bounds[1]&&p.latitude<=bounds[3]).sort((a,b)=>a.rank-b.rank).slice(0,28);
  for(const place of candidates){
    const sprite=createLabelSprite({text:place.name,longitude:place.longitude,latitude:place.latitude},"scientific");
    sprite.userData.placeLabel=true;
    sprite.position.y=(sampleGebcoElevationMeters(terrain,place.longitude,place.latitude)??0)/1000+.8;
    sprite.onBeforeRender=(renderer,_scene,camera)=>{
      const view=camera as THREE.PerspectiveCamera,pos=sprite.getWorldPosition(new THREE.Vector3()),scale=sprite.parent!.getWorldScale(new THREE.Vector3());
      const pixel=2*view.position.distanceTo(pos)*Math.tan(THREE.MathUtils.degToRad(view.fov/2))/Math.max(renderer.domElement.clientHeight,1);
      sprite.scale.set(pixel*110/scale.x,pixel*18/scale.y,1);sprite.updateMatrixWorld();
    };
    group.add(sprite);
  }
  return group;
}

export function updatePlaceLabels(root:THREE.Object3D,camera:THREE.Camera,width:number,height:number) {
  root.updateMatrixWorld(true);
  const boxes:number[][]=[];
  const labels:THREE.Object3D[]=[];root.traverse(o=>{if(o.userData.placeLabel||o.userData.axisLabel)labels.push(o);});
  labels.sort((a,b)=>(b.userData.labelPriority??1)-(a.userData.labelPriority??1));
  for(const object of labels){
    const p=object.getWorldPosition(new THREE.Vector3()).project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;
    const labelWidth=object.userData.screenWidth??110,labelHeight=object.userData.axisLabel?24:18;
    const shift=object.userData.labelPriority===3?34:0;
    const box=[x-labelWidth/2-shift,y-labelHeight/2,labelWidth,labelHeight];
    object.visible=p.z>-1&&p.z<1&&x>labelWidth/2+shift&&x<width-labelWidth/2&&y>labelHeight/2&&y<height-labelHeight/2&&!boxes.some(b=>box[0]<b[0]+b[2]&&box[0]+box[2]>b[0]&&box[1]<b[1]+b[3]&&box[1]+box[3]>b[1]);
    if(object.visible)boxes.push(box);
  }
}
