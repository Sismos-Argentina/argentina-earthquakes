import * as THREE from "three";

import type { GebcoProfile } from "@/lib/data/gebco";
import { geographicToScene } from "@/lib/geo/scene-coordinates";

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
  context.font = "600 38px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = "4px";
  context.shadowColor = "rgba(3, 10, 13, 0.95)";
  context.shadowBlur = 10;
  context.lineWidth = 7;
  context.strokeStyle = "rgba(3, 10, 13, 0.9)";
  context.strokeText(definition.text, canvas.width / 2, canvas.height / 2);
  context.fillStyle = labelColor(definition.tone);
  context.fillText(definition.text, canvas.width / 2, canvas.height / 2);

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
  const width = profile === "context" ? 900 : 620;
  sprite.scale.set(width, width / 6, 1);
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
