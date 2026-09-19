#!/usr/bin/env python3
"""Prepara líneas cartográficas web desde IGN y Natural Earth locales."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import zipfile
from pathlib import Path
from typing import Any, Iterable

import shapefile
from shapely import make_valid
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, box, shape

NE_ARCHIVE = "ne_10m_admin_0_countries.zip"
NE_ARCHIVE_SHA256 = "ce1ac7036499a0edd641fbc093cd209a98f96a49d2eca8480aaacad35138a7f6"
NE_MEMBER_STEM = "ne_10m_admin_0_countries"
NE_VERSION = "5.1.1"
IGN_SHA256 = "183dc06a6a66832022976162f5e2a5e207075cd6feaf6d875170520a50e304b6"
TERRITORIAL_BBOX = (-100.0, -90.0, 8.0, 0.0)
GEBCO_CONTEXT_BBOX = TERRITORIAL_BBOX
OUTPUT = Path("public/data/generated/cartography-argentina-context.json")


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
        help="Raíz con Natural Earth. Alternativa: variable SISMOS_DATA_DIR.",
    )
    parser.add_argument(
        "--ign-source",
        type=Path,
        default=os.environ.get(
            "SISMOS_IGN_SOURCE", "../inpres-sismos/data/provincia/provincia.json"
        ),
        help="GeoJSON local de Provincias de la República Argentina (IGN).",
    )
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parsed = parser.parse_args()
    if parsed.data_dir is None:
        parser.error("definí SISMOS_DATA_DIR o usá --data-dir")
    return parsed


def validate_input(path: Path, expected_sha256: str) -> None:
    if not path.is_file():
        raise FileNotFoundError(f"No existe {path}")
    actual = sha256_file(path)
    if actual.lower() != expected_sha256:
        raise ValueError(f"Checksum inesperado para {path.name}: {actual}")


def polygons(geometry: Any) -> Iterable[Polygon]:
    if isinstance(geometry, Polygon):
        yield geometry
    elif isinstance(geometry, MultiPolygon):
        yield from geometry.geoms
    elif isinstance(geometry, GeometryCollection):
        for member in geometry.geoms:
            yield from polygons(member)


def rounded_ring(coordinates: Iterable[tuple[float, float]]) -> list[list[float]]:
    return [[round(float(x), 5), round(float(y), 5)] for x, y in coordinates]


def geometry_lines(geometry: Any) -> list[list[list[float]]]:
    lines: list[list[list[float]]] = []
    for polygon in polygons(geometry):
        lines.append(rounded_ring(polygon.exterior.coords))
        lines.extend(rounded_ring(interior.coords) for interior in polygon.interiors)
    return [line for line in lines if len(line) >= 2]


def prepare_geometry(raw_geometry: dict[str, Any], tolerance: float, clip: Any) -> Any:
    geometry = shape(raw_geometry)
    if not geometry.is_valid:
        geometry = make_valid(geometry)
    geometry = geometry.intersection(clip)
    return geometry.simplify(tolerance, preserve_topology=True)


def load_ign(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if raw.get("type") != "FeatureCollection" or len(raw.get("features", [])) != 24:
        raise ValueError("La fuente IGN no contiene las 24 jurisdicciones esperadas")
    clip = box(*TERRITORIAL_BBOX)
    features: list[dict[str, Any]] = []
    for feature in raw["features"]:
        properties = feature.get("properties", {})
        if properties.get("sag") != "IGN":
            raise ValueError("La fuente provincial no declara sag=IGN")
        geometry = prepare_geometry(feature["geometry"], 0.03, clip)
        lines = geometry_lines(geometry)
        if not lines:
            continue
        features.append(
            {
                "name": properties.get("fna") or properties.get("nam"),
                "code": properties.get("in1"),
                "lines": lines,
            }
        )
    return features


def load_natural_earth(path: Path) -> list[dict[str, Any]]:
    clip = box(*GEBCO_CONTEXT_BBOX)
    with zipfile.ZipFile(path) as archive:
        with (
            archive.open(f"{NE_MEMBER_STEM}.shp") as shp_file,
            archive.open(f"{NE_MEMBER_STEM}.shx") as shx_file,
            archive.open(f"{NE_MEMBER_STEM}.dbf") as dbf_file,
        ):
            reader = shapefile.Reader(
                shp=io.BytesIO(shp_file.read()),
                shx=io.BytesIO(shx_file.read()),
                dbf=io.BytesIO(dbf_file.read()),
                encoding="utf-8",
            )
    field_names = [field[0] for field in reader.fields[1:]]
    features: list[dict[str, Any]] = []
    for shape_record in reader.iterShapeRecords():
        properties = dict(zip(field_names, shape_record.record, strict=True))
        geometry = prepare_geometry(
            shape_record.shape.__geo_interface__, 0.06, clip
        )
        if geometry.is_empty:
            continue
        lines = geometry_lines(geometry)
        if not lines:
            continue
        features.append(
            {
                "name": properties.get("ADMIN"),
                "sovereignty": properties.get("SOVEREIGNT"),
                "code": properties.get("ADM0_A3"),
                "lines": lines,
            }
        )
    return features


def coordinate_count(features: list[dict[str, Any]]) -> int:
    return sum(len(line) for feature in features for line in feature["lines"])


def has_coordinate_in(
    features: list[dict[str, Any]], bbox: tuple[float, float, float, float]
) -> bool:
    west, south, east, north = bbox
    return any(
        west <= longitude <= east and south <= latitude <= north
        for feature in features
        for line in feature["lines"]
        for longitude, latitude in line
    )


def main() -> int:
    args = arguments()
    ne_path = args.data_dir.resolve() / NE_ARCHIVE
    ign_path = args.ign_source.resolve()
    validate_input(ne_path, NE_ARCHIVE_SHA256)
    validate_input(ign_path, IGN_SHA256)

    ign_features = load_ign(ign_path)
    ne_features = load_natural_earth(ne_path)
    diagnostics = {
        "ignJurisdictions": len(ign_features),
        "ignCoordinates": coordinate_count(ign_features),
        "naturalEarthFeatures": len(ne_features),
        "naturalEarthCoordinates": coordinate_count(ne_features),
        "includesTierraDelFuego": has_coordinate_in(
            ign_features, (-69.5, -55.5, -64.0, -52.0)
        ),
        "includesMalvinas": has_coordinate_in(
            ign_features, (-62.5, -53.5, -56.0, -50.0)
        ),
        "includesAntarcticaTo90S": has_coordinate_in(
            ign_features, (-74.0, -90.0, -25.0, -77.0)
        ),
    }
    if len(ign_features) != 24 or not all(
        diagnostics[key]
        for key in (
            "includesTierraDelFuego",
            "includesMalvinas",
            "includesAntarcticaTo90S",
        )
    ):
        raise ValueError(f"Cobertura IGN incompleta: {diagnostics}")

    payload = {
        "schemaVersion": 1,
        "crs": "EPSG:4326",
        "territorialBbox": list(TERRITORIAL_BBOX),
        "gebcoContextBbox": list(GEBCO_CONTEXT_BBOX),
        "sources": {
            "ign": {
                "name": "Provincias de la República Argentina",
                "agency": "Instituto Geográfico Nacional (IGN)",
                "category": "official-argentina-administrative-cartography",
                "sourceUrl": "https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG",
                "metadataUrl": "https://www.ign.gob.ar/capas-sig/metadata/provincia.pdf",
                "sourceFile": ign_path.name,
                "sourceSha256": IGN_SHA256,
                "sourceEdition": "local snapshot; exact download date not recorded",
                "license": "Libre uso con cita adecuada del IGN según metadatos del recurso",
                "transform": "topology-preserving simplification at 0.03 degrees; clipped to territorial bbox",
            },
            "naturalEarth": {
                "name": "Admin 0 - Countries",
                "agency": "Natural Earth",
                "category": "regional-reference-cartography",
                "sourceUrl": "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/",
                "sourceArchive": NE_ARCHIVE,
                "sourceArchiveSha256": NE_ARCHIVE_SHA256,
                "version": NE_VERSION,
                "scale": "1:10m",
                "license": "Public domain",
                "transform": "topology-preserving simplification at 0.06 degrees; clipped to GEBCO context bbox",
            },
        },
        "layers": {
            "ignProvinces": ign_features,
            "naturalEarthCountries": ne_features,
        },
        "diagnostics": diagnostics,
    }
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode(
        "utf-8"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    print(
        json.dumps(
            {
                "output": str(args.output),
                "outputBytes": len(encoded),
                "outputSha256": sha256_file(args.output),
                "diagnostics": diagnostics,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (FileNotFoundError, ValueError, zipfile.BadZipFile) as error:
        print(f"error: {error}")
        raise SystemExit(1) from error
