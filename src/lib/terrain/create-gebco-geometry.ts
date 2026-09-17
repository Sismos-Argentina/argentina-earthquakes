import * as THREE from "three";

import type { GebcoArtifact } from "@/lib/data/gebco";
import { geographicElevationToScene } from "@/lib/geo/scene-coordinates";

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * Math.min(1, Math.max(0, amount));
}

function elevationColor(elevationMeters: number): [number, number, number] {
  if (elevationMeters < 0) {
    const amount = Math.pow((elevationMeters + 8000) / 8000, 0.72);
    return [
      mix(0.018, 0.12, amount),
      mix(0.07, 0.36, amount),
      mix(0.16, 0.5, amount),
    ];
  }
  const amount = Math.pow(elevationMeters / 6000, 0.58);
  return [
    mix(0.19, 0.88, amount),
    mix(0.43, 0.82, amount),
    mix(0.26, 0.68, amount),
  ];
}

export function sampleGebcoElevationMeters(
  artifact: GebcoArtifact,
  longitude: number,
  latitude: number,
): number | null {
  const { bbox, width, height, elevationMeters } = artifact.grid;
  const [west, south, east, north] = bbox;
  if (longitude < west || longitude > east || latitude < south || latitude > north) {
    return null;
  }
  const column = Math.min(
    width - 1,
    Math.max(0, Math.floor(((longitude - west) / (east - west)) * width)),
  );
  const row = Math.min(
    height - 1,
    Math.max(0, Math.floor(((north - latitude) / (north - south)) * height)),
  );
  return elevationMeters[row * width + column];
}

export function createGebcoGeometry(artifact: GebcoArtifact) {
  const { bbox, width, height, elevationMeters } = artifact.grid;
  const [west, south, east, north] = bbox;
  const longitudeStep = (east - west) / width;
  const latitudeStep = (north - south) / height;
  const positions = new Float32Array(width * height * 3);
  const colors = new Float32Array(width * height * 3);

  for (let row = 0; row < height; row++) {
    const latitude = north - (row + 0.5) * latitudeStep;
    for (let column = 0; column < width; column++) {
      const index = row * width + column;
      const elevationMeters = artifact.grid.elevationMeters[index];
      const longitude = west + (column + 0.5) * longitudeStep;
      const offset = index * 3;
      const elevationKm = (elevationMeters ?? 0) / 1000;
      positions.set(
        geographicElevationToScene(longitude, latitude, elevationKm),
        offset,
      );
      colors.set(elevationColor(elevationMeters ?? 0), offset);
    }
  }

  const maxIndices = (width - 1) * (height - 1) * 6;
  const indices = new Uint32Array(maxIndices);
  let indexOffset = 0;
  for (let row = 0; row < height - 1; row++) {
    for (let column = 0; column < width - 1; column++) {
      const northWest = row * width + column;
      const northEast = northWest + 1;
      const southWest = northWest + width;
      const southEast = southWest + 1;
      if (
        elevationMeters[northWest] === null ||
        elevationMeters[northEast] === null ||
        elevationMeters[southWest] === null ||
        elevationMeters[southEast] === null
      ) {
        continue;
      }
      // Orden antihorario visto desde +Y para orientar la cara hacia arriba.
      indices.set(
        [northWest, southWest, northEast, northEast, southWest, southEast],
        indexOffset,
      );
      indexOffset += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices.slice(0, indexOffset), 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return {
    geometry,
    vertices: width * height,
    triangles: indexOffset / 3,
  };
}
