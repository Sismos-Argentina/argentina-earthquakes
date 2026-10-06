#!/usr/bin/env python3
"""EDA reproducible del catálogo INPRES y su relación nominal con Slab2.

El análisis mantiene separadas observaciones catalogadas, modelos, cartografía y
derivaciones. No modifica datasets fuente ni escribe en el frontend.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import platform
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import geopandas as gpd
import matplotlib
import numpy as np
import pandas as pd
import pyproj
import scipy
import shapely
from scipy.spatial.distance import jensenshannon
from shapely import covers, make_valid, points
from shapely.geometry import Polygon

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402


CATALOG_COLUMNS = [
    "fecha", "hora", "latitud", "longitud", "profundidad", "magnitud",
    "provincia", "sentido",
]
SCIENTIFIC_BBOX = (-82.0, -58.0, -52.0, -18.0)  # oeste, sur, este, norte
PROFILE_WEST = -73.0
PROFILE_EAST = -61.0
PROFILE_HALF_WIDTH_KM = 50.0
PROFILE_MIN_LATITUDE = -45.0
PROFILE_MAX_LATITUDE = -22.0
DEPTH_BINS = np.arange(0.0, 776.0, 25.0)
MAGNITUDE_BIN_WIDTH = 0.1

PROVINCE_NAMES = {
    "02": "Ciudad Autónoma de Buenos Aires",
    "06": "Buenos Aires",
    "10": "Catamarca",
    "14": "Córdoba",
    "18": "Corrientes",
    "22": "Chaco",
    "26": "Chubut",
    "30": "Entre Ríos",
    "34": "Formosa",
    "38": "Jujuy",
    "42": "La Pampa",
    "46": "La Rioja",
    "50": "Mendoza",
    "54": "Misiones",
    "58": "Neuquén",
    "62": "Río Negro",
    "66": "Salta",
    "70": "San Juan",
    "74": "San Luis",
    "78": "Santa Cruz",
    "82": "Santa Fe",
    "86": "Santiago del Estero",
    "90": "Tucumán",
    "94": "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
}


@dataclass(frozen=True)
class SlabGrid:
    longitudes_360: np.ndarray
    latitudes: np.ndarray
    polygon: Polygon
    fields: dict[str, np.ndarray]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_value(item) for item in value]
    if isinstance(value, np.ndarray):
        return [json_value(item) for item in value.tolist()]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return None if not np.isfinite(value) else float(value)
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if pd.isna(value):
        return None
    return value


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(json_value(payload), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def load_catalog(path: Path) -> pd.DataFrame:
    raw = pd.read_csv(path)
    missing = [column for column in CATALOG_COLUMNS if column not in raw.columns]
    if missing:
        raise ValueError(f"Columnas faltantes en catálogo: {missing}")

    depth_text = raw["profundidad"].astype("string")
    extracted = depth_text.str.extract(r"^\s*(-?\d+(?:[\.,]\d+)?)\s*[Kk][Mm]\.?\s*$", expand=False)
    depth = pd.to_numeric(extracted.str.replace(",", ".", regex=False), errors="coerce").astype(float)
    timestamp = pd.to_datetime(
        raw["fecha"].astype("string") + " " + raw["hora"].astype("string"),
        format="%d/%m/%Y %H:%M:%S",
        errors="coerce",
    )

    catalog = raw.copy()
    catalog["timestamp"] = timestamp
    catalog["depth_km"] = depth
    catalog["latitude"] = pd.to_numeric(catalog["latitud"], errors="coerce")
    catalog["longitude"] = pd.to_numeric(catalog["longitud"], errors="coerce")
    catalog["magnitude"] = pd.to_numeric(catalog["magnitud"], errors="coerce")
    catalog["source_row"] = np.arange(2, len(catalog) + 2)
    catalog["depth_class"] = pd.cut(
        catalog["depth_km"],
        bins=[-np.inf, 70.0, 300.0, np.inf],
        labels=["superficial", "intermedia", "profunda"],
        right=False,
    )
    return catalog


def basic_audit(catalog: pd.DataFrame, source: Path) -> dict[str, Any]:
    west, south, east, north = SCIENTIFIC_BBOX
    physical_columns = ["timestamp", "latitude", "longitude", "depth_km", "magnitude"]
    signature_columns = ["fecha", "hora", "latitud", "longitud", "profundidad", "magnitud"]
    date_values = catalog["timestamp"].dropna()
    in_bbox = (
        catalog["longitude"].between(west, east)
        & catalog["latitude"].between(south, north)
    )
    return {
        "source": str(source.as_posix()),
        "bytes": source.stat().st_size,
        "sha256": sha256(source),
        "rows": len(catalog),
        "source_columns": CATALOG_COLUMNS,
        "derived_columns": [
            "timestamp", "depth_km", "latitude", "longitude", "magnitude",
            "source_row", "depth_class",
        ],
        "missing_source": catalog[CATALOG_COLUMNS].isna().sum().to_dict(),
        "unparsed": {
            "timestamp": int(catalog["timestamp"].isna().sum()),
            "depth_km": int(catalog["depth_km"].isna().sum()),
            "latitude": int(catalog["latitude"].isna().sum()),
            "longitude": int(catalog["longitude"].isna().sum()),
            "magnitude": int(catalog["magnitude"].isna().sum()),
        },
        "duplicates": {
            "exact_rows": int(catalog[CATALOG_COLUMNS].duplicated().sum()),
            "same_reported_event_fields": int(catalog[signature_columns].duplicated().sum()),
            "same_parsed_physical_fields": int(catalog[physical_columns].duplicated().sum()),
        },
        "invalid": {
            "latitude_outside_world": int((~catalog["latitude"].between(-90, 90)).sum()),
            "longitude_outside_world": int((~catalog["longitude"].between(-180, 180)).sum()),
            "negative_depth": int((catalog["depth_km"] < 0).sum()),
            "depth_over_700_km": int((catalog["depth_km"] > 700).sum()),
            "magnitude_nonpositive": int((catalog["magnitude"] <= 0).sum()),
            "magnitude_over_10": int((catalog["magnitude"] > 10).sum()),
        },
        "ranges": {
            "timestamp": [date_values.min(), date_values.max()],
            "latitude": [catalog["latitude"].min(), catalog["latitude"].max()],
            "longitude": [catalog["longitude"].min(), catalog["longitude"].max()],
            "depth_km": [catalog["depth_km"].min(), catalog["depth_km"].max()],
            "magnitude": [catalog["magnitude"].min(), catalog["magnitude"].max()],
        },
        "scientific_bbox": {
            "bounds_wsen": SCIENTIFIC_BBOX,
            "inside": int(in_bbox.sum()),
            "outside": int((~in_bbox).sum()),
            "note": "Ventana de trabajo del producto; no define nacionalidad ni tectónica.",
        },
        "time_reference": "Fecha y hora publicadas sin zona horaria preservada; se analizan como tiempo local ingenuo.",
        "depth_reference": "Profundidad reportada en km; datum vertical no documentado en el export.",
        "magnitude_reference": "Tipo de magnitud no preservado; no asumir Mw homogénea.",
    }


def estimate_mc_b(magnitudes: Iterable[float], bin_width: float = MAGNITUDE_BIN_WIDTH) -> dict[str, Any]:
    values = np.asarray(list(magnitudes), dtype=float)
    values = values[np.isfinite(values)]
    if values.size < 50:
        return {"n": int(values.size), "mc": None, "b_value": None, "b_sigma": None, "n_above_mc": 0}

    rounded = np.round(values / bin_width).astype(int)
    bins, counts = np.unique(rounded, return_counts=True)
    mc = float(bins[int(np.argmax(counts))] * bin_width)
    selected = values[values >= mc - bin_width / 2]
    denominator = selected.mean() - (mc - bin_width / 2)
    if selected.size < 50 or denominator <= 0:
        return {"n": int(values.size), "mc": mc, "b_value": None, "b_sigma": None, "n_above_mc": int(selected.size)}
    b_value = math.log10(math.e) / denominator
    if selected.size > 1:
        variance = np.sum((selected - selected.mean()) ** 2) / (selected.size * (selected.size - 1))
        b_sigma = 2.30 * b_value * b_value * math.sqrt(variance)
    else:
        b_sigma = math.nan
    return {
        "n": int(values.size),
        "mc": round(mc, 2),
        "b_value": round(b_value, 4),
        "b_sigma": round(b_sigma, 4),
        "n_above_mc": int(selected.size),
        "method": "MAXC (pico no acumulado, bin 0.1) + estimador Aki-Utsu; diagnóstico exploratorio",
    }


def temporal_tables(catalog: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    valid = catalog.dropna(subset=["timestamp"]).copy()
    valid["date"] = valid["timestamp"].dt.floor("D")
    valid["month"] = valid["timestamp"].dt.to_period("M").astype(str)
    valid["year"] = valid["timestamp"].dt.year

    annual = valid.groupby("year", as_index=False).agg(
        events=("timestamp", "size"),
        first_event=("timestamp", "min"),
        last_event=("timestamp", "max"),
        magnitude_median=("magnitude", "median"),
        magnitude_p90=("magnitude", lambda value: value.quantile(0.90)),
        depth_median_km=("depth_km", "median"),
        depth_p90_km=("depth_km", lambda value: value.quantile(0.90)),
    )
    annual["covered_days"] = (annual["last_event"] - annual["first_event"]).dt.days + 1
    annual["partial_year"] = annual["covered_days"] < 330
    estimates = {
        int(year): estimate_mc_b(group["magnitude"])
        for year, group in valid.groupby("year")
    }
    annual["mc_maxc"] = annual["year"].map(lambda year: estimates[int(year)]["mc"])
    annual["b_value"] = annual["year"].map(lambda year: estimates[int(year)]["b_value"])
    annual["n_above_mc"] = annual["year"].map(lambda year: estimates[int(year)]["n_above_mc"])

    monthly = valid.groupby("month", as_index=False).agg(
        events=("timestamp", "size"),
        magnitude_median=("magnitude", "median"),
        depth_median_km=("depth_km", "median"),
    )
    daily = valid.groupby("date", as_index=False).agg(
        events=("timestamp", "size"),
        longitude_median=("longitude", "median"),
        latitude_median=("latitude", "median"),
        depth_median_km=("depth_km", "median"),
        magnitude_max=("magnitude", "max"),
        longitude_span=("longitude", lambda value: value.max() - value.min()),
        latitude_span=("latitude", lambda value: value.max() - value.min()),
    )
    daily = daily.sort_values(["events", "date"], ascending=[False, True]).reset_index(drop=True)
    daily["interpretation"] = "pico diario candidato; no clasificado como secuencia/aftershock"
    return annual, monthly, daily


def depth_summary(catalog: pd.DataFrame) -> tuple[dict[str, Any], pd.DataFrame]:
    depths = catalog["depth_km"].dropna()
    quantiles = depths.quantile([0.10, 0.25, 0.50, 0.75, 0.90, 0.95]).to_dict()
    classes = catalog["depth_class"].value_counts(sort=False, dropna=False)
    table = pd.DataFrame({
        "category": ["superficial", "intermedia", "profunda"],
        "definition": ["0 ≤ d < 70 km", "70 ≤ d < 300 km", "d ≥ 300 km"],
        "events": [int(classes.get(name, 0)) for name in ["superficial", "intermedia", "profunda"]],
    })
    table["proportion"] = table["events"] / len(catalog)
    return {
        "n": int(depths.size),
        "mean_km": float(depths.mean()),
        "median_km": float(depths.median()),
        "minimum_km": float(depths.min()),
        "maximum_km": float(depths.max()),
        "quantiles_km": {f"p{int(q * 100)}": float(value) for q, value in quantiles.items()},
        "classification_note": "Bandas descriptivas, no clases tectónicas.",
    }, table


def local_profile_selection(catalog: pd.DataFrame, center_latitude: float) -> np.ndarray:
    candidates = (
        catalog["longitude"].between(PROFILE_WEST - 1.0, PROFILE_EAST + 1.0)
        & catalog["latitude"].between(center_latitude - 1.5, center_latitude + 1.5)
    )
    selected_rows = np.flatnonzero(candidates.to_numpy())
    if selected_rows.size == 0:
        return selected_rows

    local = catalog.iloc[selected_rows]
    crs = pyproj.CRS.from_proj4(
        f"+proj=aeqd +lat_0={center_latitude} +lon_0=-67 +datum=WGS84 +units=m +no_defs"
    )
    transformer = pyproj.Transformer.from_crs("EPSG:4326", crs, always_xy=True)
    x, y = transformer.transform(local["longitude"].to_numpy(), local["latitude"].to_numpy())
    ax, ay = transformer.transform(PROFILE_WEST, center_latitude)
    bx, by = transformer.transform(PROFILE_EAST, center_latitude)
    abx, aby = bx - ax, by - ay
    denominator = abx * abx + aby * aby
    t = ((x - ax) * abx + (y - ay) * aby) / denominator
    foot_x = ax + t * abx
    foot_y = ay + t * aby
    distance = np.hypot(x - foot_x, y - foot_y) / 1000.0
    keep = (t >= 0.0) & (t <= 1.0) & (distance <= PROFILE_HALF_WIDTH_KM)
    return selected_rows[keep]


def latitude_scan(catalog: pd.DataFrame, step: float, slab: pd.DataFrame | None = None) -> tuple[pd.DataFrame, dict[str, Any]]:
    centers = np.arange(PROFILE_MIN_LATITUDE, PROFILE_MAX_LATITUDE + step / 2, step)
    rows: list[dict[str, Any]] = []
    histograms: list[np.ndarray] = []
    memberships: list[set[int]] = []
    for center in centers:
        indexes = local_profile_selection(catalog, float(center))
        section = catalog.iloc[indexes]
        depths = section["depth_km"].dropna()
        histogram, _ = np.histogram(depths, bins=DEPTH_BINS)
        histograms.append(histogram.astype(float))
        memberships.append(set(int(item) for item in indexes))
        counts = section["depth_class"].value_counts()
        row = {
            "latitude": round(float(center), 2),
            "events": len(section),
            "depth_median_km": depths.median() if len(depths) else np.nan,
            "depth_p10_km": depths.quantile(0.10) if len(depths) else np.nan,
            "depth_p25_km": depths.quantile(0.25) if len(depths) else np.nan,
            "depth_p75_km": depths.quantile(0.75) if len(depths) else np.nan,
            "depth_p90_km": depths.quantile(0.90) if len(depths) else np.nan,
            "depth_p95_km": depths.quantile(0.95) if len(depths) else np.nan,
            "magnitude_median": section["magnitude"].median(),
            "superficial_fraction": counts.get("superficial", 0) / len(section) if len(section) else np.nan,
            "intermediate_fraction": counts.get("intermedia", 0) / len(section) if len(section) else np.nan,
            "deep_fraction": counts.get("profunda", 0) / len(section) if len(section) else np.nan,
        }
        if slab is not None:
            relation = slab.iloc[indexes]
            valid_delta = relation["delta_z_km"].dropna()
            row.update({
                "slab_interpolated_events": int(relation["slab_interpolated"].sum()),
                "slab_coverage_fraction": float(relation["slab_interpolated"].mean()) if len(relation) else np.nan,
                "delta_z_median_km": valid_delta.median() if len(valid_delta) else np.nan,
                "delta_z_p10_km": valid_delta.quantile(0.10) if len(valid_delta) else np.nan,
                "delta_z_p90_km": valid_delta.quantile(0.90) if len(valid_delta) else np.nan,
                "abs_delta_z_median_km": valid_delta.abs().median() if len(valid_delta) else np.nan,
            })
        rows.append(row)
    result = pd.DataFrame(rows)
    change = [np.nan]
    jaccard = [np.nan]
    for index in range(1, len(histograms)):
        previous, current = histograms[index - 1], histograms[index]
        if previous.sum() and current.sum():
            change.append(float(jensenshannon(previous + 0.5, current + 0.5, base=2)))
        else:
            change.append(np.nan)
        union = memberships[index - 1] | memberships[index]
        jaccard.append(len(memberships[index - 1] & memberships[index]) / len(union) if union else np.nan)
    result["depth_distribution_change_js"] = change
    result["adjacent_event_jaccard"] = jaccard
    geod = pyproj.Geod(ellps="WGS84")
    result["profile_length_km"] = [
        geod.inv(PROFILE_WEST, latitude, PROFILE_EAST, latitude)[2] / 1000
        for latitude in result["latitude"]
    ]
    result["corridor_area_km2"] = result["profile_length_km"] * PROFILE_HALF_WIDTH_KM * 2
    result["density_events_per_1000_km2"] = result["events"] / result["corridor_area_km2"] * 1000
    metadata = {
        "step_degrees": step,
        "centers": len(result),
        "corridor": {
            "west": PROFILE_WEST,
            "east": PROFILE_EAST,
            "half_width_km": PROFILE_HALF_WIDTH_KM,
            "projection": "WGS84 to local azimuthal equidistant for each center; point-to-segment distance",
        },
        "events_median": float(result["events"].median()),
        "events_minimum": int(result["events"].min()),
        "adjacent_jaccard_median": float(result["adjacent_event_jaccard"].median()),
        "change_js_median": float(result["depth_distribution_change_js"].median()),
    }
    return result, metadata


def load_slab_grid(directory: Path) -> SlabGrid:
    version = "02.23.18"
    field_names = {"dep": "depth", "dip": "dip", "str": "strike", "thk": "thickness", "unc": "uncertainty"}
    coordinates = np.loadtxt(directory / f"sam_slab2_dep_{version}.xyz", delimiter=",", usecols=(0, 1))
    longitudes = np.unique(coordinates[:, 0])
    latitudes = np.unique(coordinates[:, 1])[::-1]
    expected = len(longitudes) * len(latitudes)
    if expected != len(coordinates) or len(longitudes) != 581 or len(latitudes) != 1281:
        raise ValueError("Grilla Slab2 SAM inesperada")
    fields: dict[str, np.ndarray] = {}
    for suffix, name in field_names.items():
        values = np.loadtxt(
            directory / f"sam_slab2_{suffix}_{version}.xyz",
            delimiter=",",
            usecols=(2,),
        )
        if len(values) != expected:
            raise ValueError(f"Tamaño inesperado en campo Slab2 {suffix}")
        fields[name] = values.reshape(len(latitudes), len(longitudes))
    clip = np.loadtxt(directory / f"sam_slab2_clp_{version}.csv", delimiter=",")
    polygon = Polygon(clip)
    if not polygon.is_valid or polygon.is_empty:
        raise ValueError("CLP de Slab2 inválido")
    return SlabGrid(longitudes, latitudes, polygon, fields)


def bilinear_slab(grid: SlabGrid, catalog: pd.DataFrame) -> pd.DataFrame:
    longitude = catalog["longitude"].to_numpy(dtype=float) + 360.0
    latitude = catalog["latitude"].to_numpy(dtype=float)
    lon0 = float(grid.longitudes_360[0])
    north = float(grid.latitudes[0])
    step = float(grid.longitudes_360[1] - grid.longitudes_360[0])
    x = (longitude - lon0) / step
    y = (north - latitude) / step
    col = np.floor(x).astype(int)
    row = np.floor(y).astype(int)
    in_grid = (
        np.isfinite(x) & np.isfinite(y)
        & (col >= 0) & (col < len(grid.longitudes_360) - 1)
        & (row >= 0) & (row < len(grid.latitudes) - 1)
    )
    inside_clip = np.zeros(len(catalog), dtype=bool)
    finite_coordinates = np.isfinite(longitude) & np.isfinite(latitude)
    inside_clip[finite_coordinates] = covers(
        grid.polygon,
        points(longitude[finite_coordinates], latitude[finite_coordinates]),
    )
    usable = in_grid & inside_clip
    result = pd.DataFrame(index=catalog.index)
    result["within_slab_grid"] = in_grid
    result["within_slab_clp"] = inside_clip

    for name, values in grid.fields.items():
        output = np.full(len(catalog), np.nan)
        indexes = np.flatnonzero(usable)
        r = row[indexes]
        c = col[indexes]
        corners = np.stack([values[r, c], values[r, c + 1], values[r + 1, c], values[r + 1, c + 1]], axis=1)
        finite = np.all(np.isfinite(corners), axis=1)
        valid_indexes = indexes[finite]
        fx = x[valid_indexes] - col[valid_indexes]
        fy = y[valid_indexes] - row[valid_indexes]
        corner = corners[finite]
        output[valid_indexes] = (
            (1 - fx) * (1 - fy) * corner[:, 0]
            + fx * (1 - fy) * corner[:, 1]
            + (1 - fx) * fy * corner[:, 2]
            + fx * fy * corner[:, 3]
        )
        result[f"slab_{name}"] = output

    result["slab_depth_km"] = -result["slab_depth"]
    result["delta_z_km"] = catalog["depth_km"] - result["slab_depth_km"]
    result["abs_delta_z_km"] = result["delta_z_km"].abs()
    result["slab_interpolated"] = result["slab_depth_km"].notna()
    return result


def slab_summaries(catalog: pd.DataFrame, slab: pd.DataFrame) -> tuple[dict[str, Any], pd.DataFrame, pd.DataFrame]:
    combined = pd.concat([
        catalog[["latitude", "longitude", "depth_km", "magnitude"]], slab,
    ], axis=1)
    valid = combined[combined["slab_interpolated"]].copy()
    quantiles = valid["delta_z_km"].quantile([0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95])
    summary = {
        "catalog_events": len(catalog),
        "inside_clp": int(slab["within_slab_clp"].sum()),
        "interpolated_four_valid_nodes": int(slab["slab_interpolated"].sum()),
        "coverage_fraction": float(slab["slab_interpolated"].mean()),
        "delta_z_definition": "profundidad INPRES - profundidad Slab2 DEP; positivo = hipocentro nominalmente más profundo",
        "delta_z_quantiles_km": {f"p{int(q * 100):02d}": float(value) for q, value in quantiles.items()},
        "abs_delta_z_median_km": float(valid["abs_delta_z_km"].median()),
        "near_model_counts": {
            "abs_delta_le_10_km": int((valid["abs_delta_z_km"] <= 10).sum()),
            "abs_delta_le_25_km": int((valid["abs_delta_z_km"] <= 25).sum()),
            "abs_delta_le_50_km": int((valid["abs_delta_z_km"] <= 50).sum()),
        },
        "warning": "Diferencia vertical nominal, no distancia 3D, membresía tectónica ni validación independiente de Slab2.",
    }

    valid["latitude_bin"] = pd.cut(valid["latitude"], bins=np.arange(-50, -17, 1), right=False)
    latitude = valid.groupby("latitude_bin", observed=True).agg(
        events=("delta_z_km", "size"),
        delta_z_median_km=("delta_z_km", "median"),
        delta_z_p10_km=("delta_z_km", lambda value: value.quantile(0.10)),
        delta_z_p90_km=("delta_z_km", lambda value: value.quantile(0.90)),
        abs_delta_z_median_km=("abs_delta_z_km", "median"),
        slab_depth_median_km=("slab_depth_km", "median"),
        dip_median_deg=("slab_dip", "median"),
        strike_median_deg=("slab_strike", "median"),
        thickness_median_km=("slab_thickness", "median"),
    ).reset_index()
    latitude["latitude_south"] = latitude["latitude_bin"].map(lambda interval: interval.left)
    latitude["latitude_north"] = latitude["latitude_bin"].map(lambda interval: interval.right)
    latitude = latitude.drop(columns="latitude_bin")

    histogram_counts, histogram_edges = np.histogram(valid["delta_z_km"], bins=np.arange(-400, 426, 25))
    histogram = pd.DataFrame({
        "delta_z_left_km": histogram_edges[:-1],
        "delta_z_right_km": histogram_edges[1:],
        "events": histogram_counts,
    })
    return summary, latitude, histogram


def province_metrics(catalog: pd.DataFrame, province_path: Path, mc: float | None) -> tuple[dict[str, Any], pd.DataFrame]:
    provinces = gpd.read_file(province_path)
    if provinces.crs is None:
        raise ValueError("Cartografía provincial sin CRS")
    provinces = provinces.to_crs("EPSG:4326")
    provinces["geometry"] = provinces.geometry.map(make_valid)
    provinces["province_code"] = provinces["in1"].astype("string").str.zfill(2)
    provinces["province"] = provinces["province_code"].map(PROVINCE_NAMES)
    if provinces["province"].isna().any():
        raise ValueError("Código IGN de provincia desconocido")
    provinces["area_km2_equal_area"] = provinces.to_crs("EPSG:6933").area / 1_000_000

    events = gpd.GeoDataFrame(
        catalog.copy(),
        geometry=gpd.points_from_xy(catalog["longitude"], catalog["latitude"]),
        crs="EPSG:4326",
    )
    joined = gpd.sjoin(
        events,
        provinces[["province_code", "province", "area_km2_equal_area", "geometry"]],
        how="left",
        predicate="within",
    )
    matched = joined.dropna(subset=["province_code"]).copy()
    period_years = (catalog["timestamp"].max() - catalog["timestamp"].min()).days / 365.2425
    grouped = matched.groupby(["province_code", "province", "area_km2_equal_area"], as_index=False).agg(
        events=("timestamp", "size"),
        magnitude_median=("magnitude", "median"),
        magnitude_max=("magnitude", "max"),
        depth_median_km=("depth_km", "median"),
        depth_p90_km=("depth_km", lambda value: value.quantile(0.90)),
        depth_p95_km=("depth_km", lambda value: value.quantile(0.95)),
        depth_max_km=("depth_km", "max"),
        superficial=("depth_class", lambda value: int((value == "superficial").sum())),
        intermediate=("depth_class", lambda value: int((value == "intermedia").sum())),
        deep=("depth_class", lambda value: int((value == "profunda").sum())),
        magnitude_ge_4=("magnitude", lambda value: int((value >= 4).sum())),
        magnitude_ge_5=("magnitude", lambda value: int((value >= 5).sum())),
    )
    grouped["events_per_km2"] = grouped["events"] / grouped["area_km2_equal_area"]
    grouped["events_per_year"] = grouped["events"] / period_years
    grouped["superficial_fraction"] = grouped["superficial"] / grouped["events"]
    grouped["intermediate_fraction"] = grouped["intermediate"] / grouped["events"]
    grouped["deep_fraction"] = grouped["deep"] / grouped["events"]
    if mc is not None:
        above = matched[matched["magnitude"] >= mc].groupby("province_code").size()
        grouped["events_above_global_mc"] = grouped["province_code"].map(above).fillna(0).astype(int)
        grouped["events_above_global_mc_per_km2"] = grouped["events_above_global_mc"] / grouped["area_km2_equal_area"]
    local_estimates = {
        str(code): estimate_mc_b(group["magnitude"])
        for code, group in matched.groupby("province_code")
    }
    grouped["local_mc_maxc"] = grouped["province_code"].map(lambda code: local_estimates[str(code)]["mc"])
    grouped["local_b_value"] = grouped["province_code"].map(lambda code: local_estimates[str(code)]["b_value"])
    grouped["events_above_local_mc"] = grouped["province_code"].map(
        lambda code: local_estimates[str(code)]["n_above_mc"]
    )
    grouped = grouped.sort_values("events", ascending=False).reset_index(drop=True)
    metadata = {
        "cartography": str(province_path.as_posix()),
        "cartography_files": {
            sidecar.name: {"bytes": sidecar.stat().st_size, "sha256": sha256(sidecar)}
            for suffix in [".shp", ".shx", ".dbf", ".prj", ".cpg"]
            if (sidecar := province_path.with_suffix(suffix)).is_file()
        },
        "crs_source": str(provinces.crs),
        "area_crs": "EPSG:6933",
        "geometry_repaired": int((~gpd.read_file(province_path).is_valid).sum()),
        "matched_events": len(matched),
        "unmatched_events": len(catalog) - len(matched),
        "global_mc_used": mc,
        "warning": "Provincias son unidades administrativas; densidad depende de geometría, catálogo y completitud.",
    }
    return metadata, grouped


def anomaly_tables(catalog: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    columns = ["fecha", "hora", "timestamp", "longitude", "latitude", "depth_km", "magnitude", "provincia", "sentido", "source_row"]
    deep = catalog[catalog["depth_km"] >= 500].sort_values(["depth_km", "timestamp"], ascending=[False, True])[columns].copy()
    deep["candidate_reason"] = "profundidad catalogada ≥500 km; verificar evento y solución antes de interpretar"
    large = catalog[catalog["magnitude"] >= 5].sort_values(["magnitude", "timestamp"], ascending=[False, True])[columns].copy()
    large["candidate_reason"] = "magnitud catalogada ≥5; tipo de magnitud no preservado"
    valid = catalog.dropna(subset=["timestamp", "longitude", "latitude"]).copy()
    valid["date"] = valid["timestamp"].dt.floor("D")
    valid["longitude_cell"] = (valid["longitude"] * 2).round() / 2
    valid["latitude_cell"] = (valid["latitude"] * 2).round() / 2
    bursts = valid.groupby(["date", "longitude_cell", "latitude_cell"], as_index=False).agg(
        events=("timestamp", "size"),
        longitude_median=("longitude", "median"),
        latitude_median=("latitude", "median"),
        depth_median_km=("depth_km", "median"),
        depth_min_km=("depth_km", "min"),
        depth_max_km=("depth_km", "max"),
        magnitude_max=("magnitude", "max"),
    )
    bursts = bursts[bursts["events"] >= 5].sort_values(["events", "date"], ascending=[False, True])
    bursts["candidate_reason"] = "concentración diaria en celda de 0,5°; no clasificada como secuencia/aftershock"
    return deep, large, bursts


def save_figures(
    output: Path,
    catalog: pd.DataFrame,
    annual: pd.DataFrame,
    monthly: pd.DataFrame,
    depth_table: pd.DataFrame,
    mc: dict[str, Any],
    scans: dict[float, pd.DataFrame],
    slab: pd.DataFrame,
    province_table: pd.DataFrame,
) -> None:
    plt.rcParams.update({"figure.dpi": 140, "savefig.dpi": 160, "font.size": 9})
    valid = catalog.dropna(subset=["timestamp", "longitude", "latitude", "depth_km", "magnitude"])

    fig, axes = plt.subplots(2, 2, figsize=(12, 8), constrained_layout=True)
    axes[0, 0].bar(annual["year"].astype(str), annual["events"], color="#397f8d")
    axes[0, 0].set_title("Eventos por año (años parciales marcados)")
    for index, row in annual.iterrows():
        if row["partial_year"]:
            axes[0, 0].text(index, row["events"], "*", ha="center", va="bottom")
    axes[0, 0].tick_params(axis="x", rotation=45)
    axes[0, 1].plot(monthly["month"], monthly["events"], color="#397f8d", linewidth=1)
    axes[0, 1].set_title("Eventos por mes")
    tick_positions = np.linspace(0, len(monthly) - 1, min(9, len(monthly)), dtype=int)
    axes[0, 1].set_xticks(tick_positions, monthly.iloc[tick_positions]["month"], rotation=45)
    axes[1, 0].plot(annual["year"], annual["mc_maxc"], marker="o", label="Mc (MAXC)")
    axes[1, 0].plot(annual["year"], annual["magnitude_median"], marker=".", label="Magnitud mediana")
    axes[1, 0].set_title("Magnitud y completitud diagnóstica")
    axes[1, 0].legend()
    axes[1, 1].plot(annual["year"], annual["depth_median_km"], marker="o", label="P50")
    axes[1, 1].plot(annual["year"], annual["depth_p90_km"], marker=".", label="P90")
    axes[1, 1].invert_yaxis()
    axes[1, 1].set_title("Profundidad anual (km, hacia abajo)")
    axes[1, 1].legend()
    fig.suptitle("INPRES — cobertura temporal y posibles cambios del catálogo")
    fig.savefig(output / "01_temporal_quality.png", bbox_inches="tight")
    plt.close(fig)

    values = valid["magnitude"].to_numpy()
    thresholds = np.arange(math.floor(values.min() * 10) / 10, math.ceil(values.max() * 10) / 10 + 0.1, 0.1)
    cumulative = np.array([(values >= threshold).sum() for threshold in thresholds])
    fig, ax = plt.subplots(figsize=(8, 5), constrained_layout=True)
    ax.semilogy(thresholds, cumulative, color="#8b4f3d")
    if mc.get("mc") is not None:
        ax.axvline(mc["mc"], color="#397f8d", linestyle="--", label=f"Mc MAXC ≈ {mc['mc']:.1f}")
    ax.set(xlabel="Magnitud reportada (tipo no preservado)", ylabel="N(M ≥ umbral)", title="Frecuencia–magnitud acumulada")
    ax.grid(alpha=0.25)
    ax.legend()
    fig.savefig(output / "02_frequency_magnitude.png", bbox_inches="tight")
    plt.close(fig)

    region = valid[
        valid["longitude"].between(SCIENTIFIC_BBOX[0], SCIENTIFIC_BBOX[2])
        & valid["latitude"].between(SCIENTIFIC_BBOX[1], SCIENTIFIC_BBOX[3])
    ]
    fig, axes = plt.subplots(1, 3, figsize=(16, 5), constrained_layout=True)
    image = axes[0].hexbin(region["longitude"], region["latitude"], gridsize=80, bins="log", mincnt=1, cmap="magma")
    axes[0].set(xlabel="Longitud", ylabel="Latitud", title="Densidad espacial")
    fig.colorbar(image, ax=axes[0], label="log10(N)")
    image = axes[1].hexbin(region["longitude"], region["depth_km"], gridsize=(80, 50), bins="log", mincnt=1, cmap="viridis")
    axes[1].invert_yaxis(); axes[1].set(xlabel="Longitud", ylabel="Profundidad (km)", title="Longitud × profundidad")
    fig.colorbar(image, ax=axes[1], label="log10(N)")
    image = axes[2].hexbin(region["latitude"], region["depth_km"], gridsize=(80, 50), bins="log", mincnt=1, cmap="viridis")
    axes[2].invert_yaxis(); axes[2].set(xlabel="Latitud", ylabel="Profundidad (km)", title="Latitud × profundidad")
    fig.colorbar(image, ax=axes[2], label="log10(N)")
    fig.suptitle("Estructura espacial en la ventana científica del producto")
    fig.savefig(output / "03_spatial_structure.png", bbox_inches="tight")
    plt.close(fig)

    fig, axes = plt.subplots(1, 2, figsize=(12, 5), constrained_layout=True)
    axes[0].hist(valid["depth_km"], bins=75, color="#397f8d")
    axes[0].set(xlabel="Profundidad (km)", ylabel="Eventos", title="Distribución continua")
    axes[1].bar(depth_table["category"], depth_table["proportion"], color=["#d79b45", "#397f8d", "#6b4c8a"])
    axes[1].set(ylabel="Proporción", title="Bandas descriptivas")
    fig.suptitle("Profundidad catalogada INPRES")
    fig.savefig(output / "04_depth_distribution.png", bbox_inches="tight")
    plt.close(fig)

    heat_counts, lat_edges, depth_edges = np.histogram2d(
        region["latitude"], region["depth_km"], bins=[np.arange(-58, -17.75, 0.25), DEPTH_BINS]
    )
    fig, ax = plt.subplots(figsize=(12, 6), constrained_layout=True)
    mesh = ax.pcolormesh(lat_edges, depth_edges, np.log10(heat_counts.T + 1), cmap="magma", shading="auto")
    ax.invert_yaxis(); ax.set(xlabel="Latitud", ylabel="Profundidad (km)", title="Latitud × profundidad — log10(N+1)")
    fig.colorbar(mesh, ax=ax, label="log10(N+1)")
    fig.savefig(output / "05_latitude_depth_heatmap.png", bbox_inches="tight")
    plt.close(fig)

    fig, axes = plt.subplots(2, 1, figsize=(12, 8), sharex=True, constrained_layout=True)
    for step, scan in scans.items():
        axes[0].plot(scan["latitude"], scan["events"], marker="." if step == 0.25 else "o", label=f"paso {step}°")
        axes[1].plot(scan["latitude"], scan["depth_distribution_change_js"], marker="." if step == 0.25 else "o", label=f"paso {step}°")
    axes[0].set(ylabel="Eventos en corredor", title="Señal disponible por perfil")
    axes[1].set(xlabel="Latitud", ylabel="Distancia Jensen–Shannon", title="Cambio contra el perfil anterior")
    axes[0].legend(); axes[1].legend(); axes[0].grid(alpha=0.2); axes[1].grid(alpha=0.2)
    fig.suptitle("Barrido longitudinal 73°O–61°O, corredor ±50 km")
    fig.savefig(output / "06_latitude_scan.png", bbox_inches="tight")
    plt.close(fig)

    combined = pd.concat([catalog[["latitude", "longitude", "depth_km", "magnitude"]], slab], axis=1)
    relation = combined[combined["slab_interpolated"]]
    fig, axes = plt.subplots(2, 2, figsize=(13, 9), constrained_layout=True)
    axes[0, 0].hist(relation["delta_z_km"], bins=np.arange(-400, 426, 25), color="#6b4c8a")
    axes[0, 0].axvline(0, color="black", linewidth=1)
    axes[0, 0].set(xlabel="Δz (km)", ylabel="Eventos", title="Distribución de Δz")
    image = axes[0, 1].hexbin(relation["latitude"], relation["delta_z_km"], gridsize=60, bins="log", mincnt=1, cmap="viridis")
    axes[0, 1].axhline(0, color="white", linewidth=0.8)
    axes[0, 1].set(xlabel="Latitud", ylabel="Δz (km)", title="Δz × latitud")
    fig.colorbar(image, ax=axes[0, 1], label="log10(N)")
    image = axes[1, 0].hexbin(relation["longitude"], relation["delta_z_km"], gridsize=60, bins="log", mincnt=1, cmap="viridis")
    axes[1, 0].axhline(0, color="white", linewidth=0.8)
    axes[1, 0].set(xlabel="Longitud", ylabel="Δz (km)", title="Δz × longitud")
    fig.colorbar(image, ax=axes[1, 0], label="log10(N)")
    image = axes[1, 1].hexbin(relation["depth_km"], relation["delta_z_km"], gridsize=60, bins="log", mincnt=1, cmap="viridis")
    axes[1, 1].axhline(0, color="white", linewidth=0.8)
    axes[1, 1].set(xlabel="Profundidad INPRES (km)", ylabel="Δz (km)", title="Δz × profundidad")
    fig.colorbar(image, ax=axes[1, 1], label="log10(N)")
    fig.suptitle("Relación nominal con Slab2; positivo = hipocentro más profundo que DEP")
    fig.savefig(output / "07_slab_relation.png", bbox_inches="tight")
    plt.close(fig)

    provinces = province_table.nlargest(15, "events").sort_values("events")
    fig, axes = plt.subplots(1, 2, figsize=(13, 7), constrained_layout=True)
    axes[0].barh(provinces["province"], provinces["events"], color="#397f8d")
    axes[0].set(xlabel="Eventos asignados por point-in-polygon", title="Conteo")
    density = province_table.nlargest(15, "events_per_km2").sort_values("events_per_km2")
    axes[1].barh(density["province"], density["events_per_km2"], color="#8b4f3d")
    axes[1].set(xlabel="Eventos / km² de geometría IGN", title="Densidad administrativa")
    fig.suptitle("Provincias como mecanismo exploratorio, no como unidades tectónicas")
    fig.savefig(output / "08_province_profiles.png", bbox_inches="tight")
    plt.close(fig)

    robust = scans[0.5][scans[0.5]["events"] >= 500].nlargest(6, "depth_distribution_change_js")
    fig, axes = plt.subplots(2, 3, figsize=(15, 9), sharex=True, sharey=True, constrained_layout=True)
    for ax, (_, profile) in zip(axes.flat, robust.sort_values("latitude").iterrows()):
        indexes = local_profile_selection(catalog, float(profile["latitude"]))
        section = catalog.iloc[indexes]
        image = ax.hexbin(
            section["longitude"], section["depth_km"],
            gridsize=(45, 35), bins="log", mincnt=1, cmap="magma",
        )
        beyond = int((section["depth_km"] > 350).sum())
        ax.set_title(
            f"{abs(profile['latitude']):.1f}°S · n={len(section):,} · P50={profile['depth_median_km']:.0f} km\n"
            f"JS={profile['depth_distribution_change_js']:.2f} · >350 km={beyond}"
        )
        ax.set_xlim(PROFILE_WEST, PROFILE_EAST)
        ax.set_ylim(350, 0)
        fig.colorbar(image, ax=ax, label="log10(N)")
    for ax in axes[-1, :]:
        ax.set_xlabel("Longitud")
    for ax in axes[:, 0]:
        ax.set_ylabel("Profundidad (km)")
    fig.suptitle("Cortes elegidos por cambio de distribución (paso 0,5°; n ≥ 500)")
    fig.savefig(output / "09_data_selected_latitude_sections.png", bbox_inches="tight")
    plt.close(fig)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=Path("../inpres-sismos/data/sismos.csv"))
    parser.add_argument("--slab-dir", type=Path, default=Path("../data/slab2"))
    parser.add_argument("--provinces", type=Path, default=Path("../inpres-sismos/data/provincia/provincia.shp"))
    parser.add_argument("--output", type=Path, default=Path("docs/research/eda-2026-09-19"))
    parser.add_argument("--skip-figures", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for path in [args.catalog, args.slab_dir, args.provinces]:
        if not path.exists():
            raise FileNotFoundError(path)
    args.output.mkdir(parents=True, exist_ok=True)

    catalog = load_catalog(args.catalog)
    audit = basic_audit(catalog, args.catalog)
    depth, depth_table = depth_summary(catalog)
    completeness = estimate_mc_b(catalog["magnitude"])
    annual, monthly, daily = temporal_tables(catalog)
    slab_grid = load_slab_grid(args.slab_dir)
    slab = bilinear_slab(slab_grid, catalog)
    slab_summary, slab_latitude, slab_histogram = slab_summaries(catalog, slab)
    version = "02.23.18"
    slab_summary["source"] = {
        "version": version,
        "files": {
            path.name: {"bytes": path.stat().st_size, "sha256": sha256(path)}
            for path in [
                args.slab_dir / f"sam_slab2_{suffix}_{version}.xyz"
                for suffix in ["dep", "dip", "str", "thk", "unc"]
            ] + [args.slab_dir / f"sam_slab2_clp_{version}.csv"]
        },
    }
    scans: dict[float, pd.DataFrame] = {}
    scan_metadata: dict[str, Any] = {}
    for step in [0.25, 0.5]:
        table, metadata = latitude_scan(catalog, step, slab)
        scans[step] = table
        scan_metadata[str(step)] = metadata
        table.to_csv(args.output / f"latitude_scan_{str(step).replace('.', '_')}deg.csv", index=False)
    province_summary, provinces = province_metrics(catalog, args.provinces, completeness.get("mc"))
    deep, large, local_bursts = anomaly_tables(catalog)

    annual.to_csv(args.output / "annual_quality.csv", index=False)
    monthly.to_csv(args.output / "monthly_counts.csv", index=False)
    daily.head(50).to_csv(args.output / "temporal_burst_candidates.csv", index=False)
    depth_table.to_csv(args.output / "depth_categories.csv", index=False)
    slab_latitude.to_csv(args.output / "slab_relation_by_latitude.csv", index=False)
    slab_histogram.to_csv(args.output / "slab_delta_histogram.csv", index=False)
    provinces.to_csv(args.output / "province_metrics.csv", index=False)
    deep.to_csv(args.output / "deep_event_candidates.csv", index=False)
    large.to_csv(args.output / "large_event_candidates.csv", index=False)
    local_bursts.head(100).to_csv(args.output / "spatiotemporal_burst_candidates.csv", index=False)

    metadata = {
        "run": {
            "analysis_date": "2026-09-19",
            "python": platform.python_version(),
            "pandas": pd.__version__,
            "numpy": np.__version__,
            "scipy": scipy.__version__,
            "geopandas": gpd.__version__,
            "shapely": shapely.__version__,
            "pyproj": pyproj.__version__,
        },
        "audit": audit,
        "depth": depth,
        "magnitude_completeness": completeness,
        "latitude_scan": scan_metadata,
        "slab2": slab_summary,
        "provinces": province_summary,
        "methodological_limits": [
            "Mc por MAXC es diagnóstico y no demuestra completitud homogénea.",
            "El tipo de magnitud y las incertidumbres por evento no están disponibles.",
            "Δz es diferencia vertical nominal; no es distancia 3D ni clasificación tectónica.",
            "El catálogo y Slab2 no son evidencia estadísticamente independiente.",
            "Point-in-polygon provincial es una agregación administrativa.",
            "Los picos diarios son candidatos; no se declaran secuencias de réplicas.",
        ],
    }
    write_json(args.output / "run_metadata.json", metadata)
    if not args.skip_figures:
        save_figures(args.output, catalog, annual, monthly, depth_table, completeness, scans, slab, provinces)

    print(f"EDA: {len(catalog):,} eventos; {args.output}")
    print(f"Mc MAXC~{completeness.get('mc')}; b~{completeness.get('b_value')}")
    print(f"Slab2 interpolado: {slab_summary['interpolated_four_valid_nodes']:,} eventos")
    print(f"IGN point-in-polygon: {province_summary['matched_events']:,} eventos")


if __name__ == "__main__":
    main()
