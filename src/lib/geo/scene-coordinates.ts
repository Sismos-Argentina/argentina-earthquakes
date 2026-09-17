// Aproximación equirectangular local para exploración visual, NO para medir
// distancias geodésicas. +X es este, +Y es arriba y -Z es norte para
// conservar una orientación diestra al mirar la superficie desde arriba.
// Sustituible cuando se integren capas geográficas.
export const SCENE_ORIGIN = { longitude: -66, latitude: -35 } as const;
export const VERTICAL_EXAGGERATION = 1;

const KM_PER_DEGREE = 111.32;
const LONGITUDE_SCALE =
  KM_PER_DEGREE * Math.cos((SCENE_ORIGIN.latitude * Math.PI) / 180);

export function geographicToScene(
  longitude: number,
  latitude: number,
  depthKm: number,
  verticalExaggeration = VERTICAL_EXAGGERATION,
): [number, number, number] {
  return [
    (longitude - SCENE_ORIGIN.longitude) * LONGITUDE_SCALE,
    -depthKm * verticalExaggeration,
    -(latitude - SCENE_ORIGIN.latitude) * KM_PER_DEGREE,
  ];
}

export function geographicElevationToScene(
  longitude: number,
  latitude: number,
  elevationKm: number,
  verticalExaggeration = VERTICAL_EXAGGERATION,
): [number, number, number] {
  return geographicToScene(
    longitude,
    latitude,
    -elevationKm,
    verticalExaggeration,
  );
}
