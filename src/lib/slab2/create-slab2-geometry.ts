import * as THREE from "three";

import type { Slab2Artifact } from "../data/slab2.ts";
import { geographicToScene } from "../geo/scene-coordinates.ts";

export function createSlab2Geometry(artifact: Slab2Artifact) {
  const { west, north, stepDegrees, width, height, depthKm } = artifact.grid;
  const positions = new Float32Array(width * height * 3);
  for (let row = 0; row < height; row++) {
    const latitude = north - row * stepDegrees;
    for (let column = 0; column < width; column++) {
      const index = row * width + column;
      const longitude = west + column * stepDegrees;
      positions.set(
        geographicToScene(longitude, latitude, depthKm[index] ?? 0),
        index * 3,
      );
    }
  }

  const indices: number[] = [];
  let firstColumn=width,lastColumn=-1;
  for (let row = 0; row < height - 1; row++) {
    for (let column = 0; column < width - 1; column++) {
      const northwest = row * width + column;
      const northeast = northwest + 1;
      const southwest = northwest + width;
      const southeast = southwest + 1;
      // No se cierra ni interpola sobre CLP o nodata. Cada cara usa 4 nodos válidos.
      if (
        depthKm[northwest] === null || depthKm[northeast] === null ||
        depthKm[southwest] === null || depthKm[southeast] === null
      ) continue;
      indices.push(northwest, southwest, northeast, northeast, southwest, southeast);
      firstColumn=Math.min(firstColumn,column);lastColumn=Math.max(lastColumn,column+1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return {
    geometry,
    validVertices: artifact.summary.validNodes,
    triangles: indices.length / 3,
    // Only drawable faces set the reveal range; nodata must not delay its start.
    revealRange: (lastColumn<0?[0,0]:[
      geographicToScene(west+firstColumn*stepDegrees,north,0)[0],
      geographicToScene(west+lastColumn*stepDegrees,north,0)[0],
    ]) as [number,number],
  };
}
