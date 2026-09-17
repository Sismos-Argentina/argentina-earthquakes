#!/usr/bin/env python3
"""Genera perfiles web reproducibles desde el GeoTIFF GEBCO 2026 local."""

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

PROFILES = {
    "scientific": {
        "bbox": (-82.0, -58.0, -52.0, -18.0),
        "dimensions": (360, 480),
        "output": "gebco-2026-scientific.json",
        "bbox_status": "scientific-area-andes-argentina-chile-south-atlantic",
    },
    "context": {
        "bbox": (-85.0, -77.0, -25.0, -10.0),
        "dimensions": (300, 360),
        "output": "gebco-2026-context.json",
        "bbox_status": "territorial-context-partial-antarctica-to-77S",
    },
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=os.environ.get("SISMOS_DATA_DIR"),
        help="Raíz con el ZIP GEBCO. Alternativa: variable SISMOS_DATA_DIR.",
    )
    parser.add_argument(
        "--profile",
        choices=["all", *PROFILES],
        default="all",
        help="Perfil a generar; por defecto genera ambos.",
    )
    parser.add_argument(
        "--output-dir", type=Path, default=Path("public/data/generated")
    )
    parser.add_argument(
        "--skip-zip-checksum",
        action="store_true",
        help="Sólo para iterar localmente; conserva las demás validaciones.",
    )
    parsed = parser.parse_args()
    if parsed.data_dir is None:
        parser.error("definí SISMOS_DATA_DIR o usá --data-dir")
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
    row = min(
        grid.shape[0] - 1,
        max(0, round((north - latitude) / (north - south) * (grid.shape[0] - 1))),
    )
    column = min(
        grid.shape[1] - 1,
        max(0, round((longitude - west) / (east - west) * (grid.shape[1] - 1))),
    )
    return None if np.ma.is_masked(grid[row, column]) else int(grid[row, column])


def build_profile(
    source: rasterio.io.DatasetReader,
    source_metadata: dict[str, object],
    profile_name: str,
    output_dir: Path,
) -> dict[str, object]:
    profile = PROFILES[profile_name]
    bbox = profile["bbox"]
    width, height = profile["dimensions"]
    west, south, east, north = bbox
    destination_transform = from_bounds(west, south, east, north, width, height)

    with WarpedVRT(
        source,
        crs="EPSG:4326",
        transform=destination_transform,
        width=width,
        height=height,
        resampling=Resampling.bilinear,
        nodata=source.nodata,
    ) as vrt:
        grid = vrt.read(1, masked=True)

    mask = np.ma.getmaskarray(grid)
    elevations: list[int | None] = [
        None if masked else int(value)
        for value, masked in zip(
            grid.data.ravel().tolist(), mask.ravel().tolist(), strict=True
        )
    ]
    valid = grid.compressed()
    if valid.size == 0:
        raise ValueError(f"El perfil {profile_name} no contiene elevaciones válidas")

    checks = {
        "AndesCentrales": {"coordinates": [-69.5, -32.8], "expected": "land-positive"},
        "CentroArgentina": {"coordinates": [-64.0, -34.5], "expected": "land-positive"},
        "Pacifico": {"coordinates": [-76.0, -33.0], "expected": "ocean-negative"},
        "TierraDelFuego": {"coordinates": [-68.3, -54.3], "expected": "land-positive"},
        "Malvinas": {"coordinates": [-59.0, -51.7], "expected": "land-or-coastal"},
        "northWest": {"coordinates": [west, north], "expected": "orientation-anchor"},
        "southEast": {"coordinates": [east, south], "expected": "orientation-anchor"},
    }
    if profile_name == "context":
        checks["PeninsulaAntartica"] = {
            "coordinates": [-64.5, -69.8],
            "expected": "land-or-ice-positive",
        }
    for check in checks.values():
        longitude, latitude = check["coordinates"]
        check["elevationMeters"] = sample_nearest(grid, bbox, longitude, latitude)

    if (checks["AndesCentrales"]["elevationMeters"] or -1) <= 0:
        raise ValueError(f"{profile_name}: Andes Centrales no son positivos")
    if (checks["CentroArgentina"]["elevationMeters"] or -1) <= 0:
        raise ValueError(f"{profile_name}: centro de Argentina no es positivo")
    if (checks["Pacifico"]["elevationMeters"] or 1) >= 0:
        raise ValueError(f"{profile_name}: Pacífico no es negativo")

    payload = {
        "schemaVersion": 2,
        "profile": profile_name,
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
            "bbox": list(bbox),
            "bboxStatus": profile["bbox_status"],
            "width": width,
            "height": height,
            "registration": "cell-center",
            "rowOrder": "north-to-south",
            "columnOrder": "west-to-east",
            "cellSizeDegrees": [(east - west) / width, (north - south) / height],
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
            "crop": list(bbox),
            "resampling": "bilinear",
            "source": source_metadata,
            "outputElevationEncoding": "JSON integers in meters; null means nodata",
            "tool": f"Python {sys.version.split()[0]}; rasterio {rasterio.__version__}; GDAL {rasterio.__gdal_version__}; numpy {np.__version__}",
        },
        "sanityChecks": checks,
    }

    output = output_dir / str(profile["output"])
    json_bytes = json.dumps(
        payload, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(json_bytes)
    return {
        "profile": profile_name,
        "output": str(output),
        "outputBytes": output.stat().st_size,
        "outputSha256": sha256_file(output),
        "bbox": list(bbox),
        "dimensions": [width, height],
        "statistics": payload["statistics"],
        "sanityChecks": checks,
    }


def main() -> int:
    args = arguments()
    zip_path = args.data_dir.resolve() / ZIP_NAME
    validate_archive(zip_path, args.skip_zip_checksum)
    selected = list(PROFILES) if args.profile == "all" else [args.profile]
    vsi_path = f"zip://{zip_path.as_posix()}!{TIF_NAME}"

    with rasterio.open(vsi_path) as source:
        if source.crs is None or source.crs.to_epsg() != 4326:
            raise ValueError(f"CRS inesperado: {source.crs}; se requiere EPSG:4326")
        if source.count != 1 or source.dtypes[0] != "int16":
            raise ValueError(
                f"Raster inesperado: count={source.count}, dtype={source.dtypes[0]}"
            )
        if source.transform.a <= 0 or source.transform.e >= 0:
            raise ValueError(
                "Orientación raster inesperada: se requiere oeste→este y norte→sur"
            )
        for profile_name in selected:
            west, south, east, north = PROFILES[profile_name]["bbox"]
            if not (
                source.bounds.left <= west < east <= source.bounds.right
                and source.bounds.bottom <= south < north <= source.bounds.top
            ):
                raise ValueError(
                    f"BBOX de {profile_name} fuera de cobertura {source.bounds}"
                )

        source_metadata = {
            "crs": source.crs.to_string(),
            "bbox": [
                source.bounds.left,
                source.bounds.bottom,
                source.bounds.right,
                source.bounds.top,
            ],
            "width": source.width,
            "height": source.height,
            "dtype": source.dtypes[0],
            "nodata": source.nodata,
            "resolutionDegrees": [abs(source.res[0]), abs(source.res[1])],
        }
        results = [
            build_profile(source, source_metadata, name, args.output_dir)
            for name in selected
        ]

    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (
        FileNotFoundError,
        ValueError,
        zipfile.BadZipFile,
        rasterio.errors.RasterioError,
    ) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
