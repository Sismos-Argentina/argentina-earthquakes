#!/usr/bin/env python3
"""Prepara la grilla DEP/UNC de Slab2 SAM 2018 para la escena científica.

No interpola ni triangula: toma uno de cada dos nodos de la grilla de 0,05°.
Los nodos fuera de CLP o sin DEP permanecen como null en el artefacto.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import numpy as np
import rasterio
from shapely import covers, points
from shapely.geometry import Polygon

VERSION = "02.23.18"
SOURCE_NAMES = {
    "dep": f"sam_slab2_dep_{VERSION}.grd",
    "unc": f"sam_slab2_unc_{VERSION}.grd",
    "clp": f"sam_slab2_clp_{VERSION}.csv",
}
SOURCE_SHA256 = {
    "dep": "0e09dc45baaf402204bdecbe3254b637e3a8f4818ff23903bf61254de3525257",
    "unc": "38b27b519c368631e52598708b24012cb0911cecbe0144b593003fb0d45c1dc0",
    "clp": "b85e7211e0842d21026de6d9f5fae4544a18f6291d74fac0023784f13bce45c8",
}
WEST, EAST, SOUTH, NORTH = -82.0, -58.0, -49.0, -18.0
STEP_DEGREES = 0.1


def digest(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            sha.update(chunk)
    return sha.hexdigest()


def source_directory(data_dir: Path) -> Path:
    candidate = data_dir / "slab2"
    return candidate if candidate.is_dir() else data_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir", type=Path, default=os.environ.get("SISMOS_DATA_DIR"),
        help="Directorio que contiene slab2/ (o los archivos directamente).",
    )
    parser.add_argument(
        "--output", type=Path,
        default=Path("public/data/generated/slab2-sam-2018-scientific.json"),
    )
    args = parser.parse_args()
    if args.data_dir is None:
        parser.error("definí SISMOS_DATA_DIR o --data-dir")
    return args


def checked_paths(directory: Path) -> dict[str, Path]:
    paths = {key: directory / name for key, name in SOURCE_NAMES.items()}
    for key, path in paths.items():
        if not path.is_file():
            raise FileNotFoundError(path)
        actual = digest(path)
        if actual != SOURCE_SHA256[key]:
            raise ValueError(f"Checksum inesperado para {path.name}: {actual}")
    return paths


def main() -> None:
    args = parse_args()
    paths = checked_paths(source_directory(args.data_dir))
    clip_coordinates = np.loadtxt(paths["clp"], delimiter=",")
    polygon = Polygon(clip_coordinates)
    if not polygon.is_valid or polygon.is_empty:
        raise ValueError("CLP no es un polígono válido")

    with rasterio.open(paths["dep"]) as dep, rasterio.open(paths["unc"]) as unc:
        if (
            dep.driver != "netCDF" or unc.driver != "netCDF"
            or dep.width != 581 or dep.height != 1281
            or dep.transform != unc.transform
            or dep.width != unc.width or dep.height != unc.height
            or not np.isclose(dep.transform.a, 0.05)
            or not np.isclose(dep.transform.e, -0.05)
        ):
            raise ValueError("DEP/UNC no tienen la grilla Slab2 SAM esperada")
        # GMT/NetCDF no declara CRS a rasterio; la fuente USGS declara lon/lat.
        if not np.isclose(dep.transform.c + dep.transform.a / 2, 274.0) or not np.isclose(
            dep.transform.f + dep.transform.e / 2, 15.0
        ):
            raise ValueError("Origen de grilla inesperado")

        lon_360 = np.arange(WEST + 360, EAST + 360 + STEP_DEGREES / 2, STEP_DEGREES)
        latitudes = np.arange(NORTH, SOUTH - STEP_DEGREES / 2, -STEP_DEGREES)
        columns = np.rint((lon_360 - 274.0) / 0.05).astype(int)
        rows = np.rint((15.0 - latitudes) / 0.05).astype(int)
        if columns.min() < 0 or columns.max() >= dep.width or rows.min() < 0 or rows.max() >= dep.height:
            raise ValueError("El recorte sale de la grilla fuente")

        depth = dep.read(1)[np.ix_(rows, columns)]
        uncertainty = unc.read(1)[np.ix_(rows, columns)]
        longitudes_2d, latitudes_2d = np.meshgrid(lon_360, latitudes)
        inside = covers(polygon, points(longitudes_2d, latitudes_2d))
        valid = inside & np.isfinite(depth)
        if np.any(depth[valid] >= 0) or np.any(uncertainty[np.isfinite(uncertainty)] < 0):
            raise ValueError("Convención de signo DEP/UNC inesperada")
        if valid.sum() < 10000:
            raise ValueError("Demasiados pocos nodos válidos: revisar CLP/coordenadas")

        def sample(lon: float, lat: float) -> float:
            column = round((lon - WEST) / STEP_DEGREES)
            row = round((NORTH - lat) / STEP_DEGREES)
            if not valid[row, column]:
                raise ValueError(f"Sanity check sin modelo: {lon}, {lat}")
            return float(-depth[row, column])

        for latitude in (-26.0, -33.0):
            if not sample(-70.0, latitude) < sample(-67.0, latitude):
                raise ValueError(f"DEP no aumenta hacia el este a {latitude}°")

        depth_flat = [round(float(-value), 2) if usable else None
                      for value, usable in zip(depth.flat, valid.flat)]
        unc_flat = [round(float(value), 2) if usable and np.isfinite(value) else None
                    for value, usable in zip(uncertainty.flat, valid.flat)]
        unc_values = uncertainty[valid & np.isfinite(uncertainty)]
        depth_values = -depth[valid]
        artifact = {
            "schemaVersion": 1,
            "dataset": "USGS Slab2 South America",
            "modelVersion": VERSION,
            "modelType": "geophysical-model-not-observation",
            "sourceDoi": "10.5066/F7PV6JNV",
            "sourceSha256": SOURCE_SHA256,
            "method": "original-0.05-degree-grid-every-second-node; CLP-covered and finite DEP only; no interpolation",
            "horizontalReference": "geographic lon/lat; source 0-360 converted to -180..180",
            "verticalReference": "DEP negative km in source; positive km downward in artifact; exact vertical datum not specified in local metadata; scene 0 is nominal sea level",
            "grid": {
                "west": WEST, "north": NORTH,
                "stepDegrees": STEP_DEGREES,
                "width": len(columns), "height": len(rows),
                "depthKm": depth_flat,
                "uncertaintyKm": unc_flat,
            },
            "summary": {
                "validNodes": int(valid.sum()),
                "maskedNodes": int(valid.size - valid.sum()),
                "uncertaintyNodes": len(unc_values),
                "depthRangeKm": [round(float(depth_values.min()), 2), round(float(depth_values.max()), 2)],
                "uncertaintyRangeKm": [round(float(unc_values.min()), 2), round(float(unc_values.max()), 2)],
                "uncertaintyMedianKm": round(float(np.median(unc_values)), 2),
                "sanityDepthKm": {
                    f"{lon},{lat}": round(sample(lon, lat), 2)
                    for lat in (-26.0, -33.0) for lon in (-70.0, -67.0)
                },
            },
        }
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"{args.output}: {valid.sum():,} nodos válidos, {args.output.stat().st_size:,} bytes")
        print(f"DEP km: {artifact['summary']['depthRangeKm']}; UNC km: {artifact['summary']['uncertaintyRangeKm']}")


if __name__ == "__main__":
    main()
