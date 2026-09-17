import * as THREE from "three";

import type {
  CartographicFeature,
  CartographyArtifact,
} from "@/lib/data/cartography";
import type { GebcoArtifact } from "@/lib/data/gebco";
import { geographicElevationToScene } from "@/lib/geo/scene-coordinates";
import { sampleGebcoElevationMeters } from "@/lib/terrain/create-gebco-geometry";

type Bbox = [number, number, number, number];

function inside([west, south, east, north]: Bbox, longitude: number, latitude: number) {
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}

function lineObject(
  features: CartographicFeature[],
  terrain: GebcoArtifact,
  displayBbox: Bbox,
  color: number,
  opacity: number,
) {
  const positions: number[] = [];
  for (const feature of features) {
    for (const line of feature.lines) {
      for (let index = 1; index < line.length; index++) {
        const [previousLongitude, previousLatitude] = line[index - 1];
        const [longitude, latitude] = line[index];
        if (
          !inside(displayBbox, previousLongitude, previousLatitude) ||
          !inside(displayBbox, longitude, latitude)
        ) {
          continue;
        }
        for (const [pointLongitude, pointLatitude] of [line[index - 1], line[index]]) {
          const elevationMeters =
            sampleGebcoElevationMeters(terrain, pointLongitude, pointLatitude) ?? 0;
          positions.push(
            ...geographicElevationToScene(
              pointLongitude,
              pointLatitude,
              elevationMeters / 1000 + 0.35,
            ),
          );
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 4;
  return lines;
}

export function createCartographyGroup(
  artifact: CartographyArtifact,
  terrain: GebcoArtifact,
  displayBbox: Bbox,
) {
  const group = new THREE.Group();
  group.add(
    lineObject(
      artifact.layers.naturalEarthCountries,
      terrain,
      displayBbox,
      0x7c969c,
      0.72,
    ),
    lineObject(
      artifact.layers.ignProvinces,
      terrain,
      displayBbox,
      0xffd892,
      0.95,
    ),
  );
  return group;
}

export function disposeCartographyGroup(group: THREE.Group) {
  group.traverse((object) => {
    if (!(object instanceof THREE.LineSegments)) return;
    object.geometry.dispose();
    if (object.material instanceof THREE.Material) object.material.dispose();
  });
}
