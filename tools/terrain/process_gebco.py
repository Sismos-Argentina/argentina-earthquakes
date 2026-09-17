#!/usr/bin/env python3
"""Genera una grilla web reproducible desde el GeoTIFF GEBCO 2026 local."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import zipfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.vrt import WarpedVRT

ZIP_NAME = "GEBCO_07_Aug_2026_5422771e0b37.zip"
ZIP_SHA256 = "5bcaf61045b50461332829c44c36c1f3385bfaa2febb2da62941e0bdce528ecb"
TIF_NAME = "gebco_2026_n0.0_s-77.0_w-85.0_e-9.0_geotiff.tif"
TIF_BYTES = 674_269_122
DEFAULT_BBOX = (-80.0, -46.0, -60.0, -18.0)
DEFAULT_WIDTH = 256
DEFAULT_HEIGHT = 358
OUTPUT_NAME = "gebco-2026-provisional.json"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_bbox(raw: str) -> tuple[float, float, float, float]:
    try:
        west, south, east, north = (float(value) for value in raw.split(","))
    except ValueError as error:
        raise argparse.ArgumentTypeError("BBOX debe ser oeste,sur,este,norte") from error
    if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise argparse.ArgumentTypeError("BBOX geográfica inválida")
    return west, south, east, north


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=os.environ.get("SISMOS_DATA_DIR"),
        help="Raíz con el ZIP GEBCO. Alternativa: variable SISMOS_DATA_DIR.",
    )
    parser.add_argument(
        "--bbox",
        type=parse_bbox,
        default=DEFAULT_BBOX,
        metavar="W,S,E,N",
        help="Recorte científico PROVISIONAL (default: -80,-46,-60,-18).",
    )
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/data/generated") / OUTPUT_NAME,
    )
    parser.add_argument(
        "--skip-zip-checksum",
        action="store_true",
        help="Sólo para iterar localmente; nunca omite la validación interna del GeoTIFF.",
    )
    parsed = parser.parse_args()
    if parsed.data_dir is None:
        parser.error("definí SISMOS_DATA_DIR o usá --data-dir")
    if parsed.width < 2 or parsed.height < 2:
        parser.error("width y height deben ser mayores que 1")
    return parsed


def validate_archive(zip_path: Path, skip_checksum: bool) -> None:
    if not zip_path.is_file():
        raise FileNotFoundError(f"No existe {zip_path}")
    with zipfile.ZipFile(zip_path) as archive:
        member = archive.getinfo(TIF_NAME)
        if member.file_size != TIF_BYTES:
            raise ValueError(
                f"GeoTIFF inesperado: {member.file_size} bytes; se esperaban {TIF_BYTES}"
            )
    if not skip_checksum:
        actual = sha256_file(zip_path)
        if actual != ZIP_SHA256:
            raise ValueError(f"Checksum ZIP inesperado: {actual}")


def sample_nearest(
    grid: np.ma.MaskedArray,
    bbox: tuple[float, float, float, float],
    longitude: float,
    latitude: float,
) -> int | None:
    west, south, east, north = bbox
    row = min(grid.shape[0] - 1, max(0, round((north - latitude) / (north - south) * (grid.shape[0] - 1))))
    col = min(grid.shape[1] - 1, max(0, round((longitude - west) / (east - west) * (grid.shape[1] - 1))))
    return None if np.ma.is_masked(grid[row, col]) else int(grid[row, col])


def main() -> int:
    args = arguments()
    data_dir = args.data_dir.resolve()
    zip_path = data_dir / ZIP_NAME
    validate_archive(zip_path, args.skip_zip_checksum)

    vsi_path = f"zip://{zip_path.as_posix()}!{TIF_NAME}"
    west, south, east, north = args.bbox
    destination_transform = from_bounds(west, south, east, north, args.width, args.height)

    with rasterio.open(vsi_path) as source:
        if source.crs is None or source.crs.to_epsg() != 4326:
            raise ValueError(f"CRS inesperado: {source.crs}; se requiere EPSG:4326")
        if not (
            source.bounds.left <= west < east <= source.bounds.right
            and source.bounds.bottom <= south < north <= source.bounds.top
        ):
            raise ValueError(f"BBOX {args.bbox} fuera de cobertura {source.bounds}")
        if source.count != 1 or source.dtypes[0] != "int16":
            raise ValueError(f"Raster inesperado: count={source.count}, dtype={source.dtypes[0]}")
        if source.transform.a <= 0 or source.transform.e >= 0:
            raise ValueError(
                "Orientación raster inesperada: se requiere oeste→este y norte→sur"
            )

        with WarpedVRT(
            source,
            crs="EPSG:4326",
            transform=destination_transform,
            width=args.width,
            height=args.height,
            resampling=Resampling.bilinear,
            nodata=source.nodata,
        ) as vrt:
            grid = vrt.read(1, masked=True)

        source_metadata = {
            "crs": source.crs.to_string(),
            "bbox": [source.bounds.left, source.bounds.bottom, source.bounds.right, source.bounds.top],
            "width": source.width,
            "height": source.height,
            "dtype": source.dtypes[0],
            "nodata": source.nodata,
            "resolutionDegrees": [abs(source.res[0]), abs(source.res[1])],
        }

    mask = np.ma.getmaskarray(grid)
    elevations: list[int | None] = [
        None if masked else int(value)
        for value, masked in zip(grid.data.ravel().tolist(), mask.ravel().tolist(), strict=True)
    ]
    valid = grid.compressed()
    if valid.size == 0:
        raise ValueError("El recorte no contiene elevaciones válidas")

    checks = {
        "AndesCentrales": {"coordinates": [-69.5, -32.8], "expected": "land-positive"},
        "CostaChilena": {"coordinates": [-71.6, -33.0], "expected": "near-sea-level"},
        "CentroArgentina": {"coordinates": [-64.0, -34.5], "expected": "land-positive"},
        "Pacifico": {"coordinates": [-76.0, -33.0], "expected": "ocean-negative"},
        "northWest": {"coordinates": [west, north], "expected": "orientation-anchor"},
        "southEast": {"coordinates": [east, south], "expected": "orientation-anchor"},
    }
    for check in checks.values():
        longitude, latitude = check["coordinates"]
        check["elevationMeters"] = sample_nearest(grid, args.bbox, longitude, latitude)

    if not (checks["AndesCentrales"]["elevationMeters"] or -1) > 0:
        raise ValueError("Sanity check falló: Andes Centrales no son positivos")
    if not (checks["CentroArgentina"]["elevationMeters"] or -1) > 0:
        raise ValueError("Sanity check falló: centro de Argentina no es positivo")
    if not (checks["Pacifico"]["elevationMeters"] or 1) < 0:
        raise ValueError("Sanity check falló: Pacífico no es negativo")

    cell_width = (east - west) / args.width
    cell_height = (north - south) / args.height
    payload = {
        "schemaVersion": 1,
        "dataset": {
            "name": "GEBCO_2026 Grid",
            "version": "GEBCO_2026",
            "category": "external-elevation-bathymetry-model",
            "sourceUrl": "https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid",
            "doi": "10.5285/4f68d5c7-45eb-f999-e063-7086abc036fa",
            "sourceArchive": ZIP_NAME,
            "sourceArchiveSha256": ZIP_SHA256,
            "sourceMember": TIF_NAME,
            "crs": "EPSG:4326",
            "verticalReference": "nominal mean sea level; GEBCO documents exceptions",
            "units": "meters",
        },
        "grid": {
            "bbox": [west, south, east, north],
            "bboxStatus": "provisional-scientific-area-not-territorial-extent",
            "width": args.width,
            "height": args.height,
            "registration": "cell-center",
            "rowOrder": "north-to-south",
            "columnOrder": "west-to-east",
            "cellSizeDegrees": [cell_width, cell_height],
            "nodata": None,
            "elevationMeters": elevations,
        },
        "statistics": {
            "validCells": int(valid.size),
            "nodataCells": int(mask.sum()),
            "minElevationMeters": int(valid.min()),
            "maxElevationMeters": int(valid.max()),
        },
        "transform": {
            "crop": [west, south, east, north],
            "resampling": "bilinear",
            "source": source_metadata,
            "outputElevationEncoding": "JSON integers in meters; null means nodata",
            "tool": f"Python {sys.version.split()[0]}; rasterio {rasterio.__version__}; GDAL {rasterio.__gdal_version__}; numpy {np.__version__}",
        },
        "sanityChecks": checks,
    }

    json_bytes = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(json_bytes)

    result = {
        "output": str(args.output),
        "outputBytes": args.output.stat().st_size,
        "outputSha256": sha256_file(args.output),
        "uncompressedBytes": len(json_bytes),
        "bbox": list(args.bbox),
        "dimensions": [args.width, args.height],
        "statistics": payload["statistics"],
        "sanityChecks": checks,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (FileNotFoundError, ValueError, zipfile.BadZipFile, rasterio.errors.RasterioError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
