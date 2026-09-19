#!/usr/bin/env python3
"""Valida estructura, orientación y puntos de control de los perfiles GEBCO."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

EXPECTED = {
    "scientific": {
        "path": Path("public/data/generated/gebco-2026-scientific.json"),
        "bbox": [-85.0, -72.0, -20.0, 0.0],
        "dimensions": [1300, 1440],
    },
    "context": {
        "path": Path("public/data/generated/gebco-2026-context.json"),
        "bbox": [-100.0, -90.0, 8.0, 0.0],
        "dimensions": [360, 300],
    },
}


def validate(profile: str, artifact: Path) -> dict[str, object]:
    expected = EXPECTED[profile]
    payload = json.loads(artifact.read_text(encoding="utf-8"))
    grid = payload["grid"]
    stats = payload["statistics"]
    checks = payload["sanityChecks"]

    assert payload["schemaVersion"] == 2
    assert payload["profile"] == profile
    assert payload["dataset"]["crs"] == "EPSG:4326"
    assert payload["dataset"]["units"] == "meters"
    assert grid["bbox"] == expected["bbox"]
    assert [grid["width"], grid["height"]] == expected["dimensions"]
    assert grid["rowOrder"] == "north-to-south"
    assert grid["columnOrder"] == "west-to-east"
    assert len(grid["elevationMeters"]) == grid["width"] * grid["height"]
    assert stats["validCells"] + stats["nodataCells"] == len(
        grid["elevationMeters"]
    )
    assert stats["minElevationMeters"] < 0 < stats["maxElevationMeters"]
    assert checks["AndesCentrales"]["elevationMeters"] > 0
    assert checks["CentroArgentina"]["elevationMeters"] > 0
    assert checks["Pacifico"]["elevationMeters"] < 0
    assert checks["northWest"]["coordinates"] == [grid["bbox"][0], grid["bbox"][3]]
    assert checks["southEast"]["coordinates"] == [grid["bbox"][2], grid["bbox"][1]]
    if profile == "context":
        assert checks["PeninsulaAntartica"]["elevationMeters"] > 0
    if profile == "scientific":
        assert checks["GeorgiaDelSur"]["elevationMeters"] > 0
        assert checks["PeninsulaAntartica"]["elevationMeters"] > 0

    return {
        "profile": profile,
        "artifact": str(artifact),
        "bbox": grid["bbox"],
        "dimensions": [grid["width"], grid["height"]],
        "elevationRangeMeters": [
            stats["minElevationMeters"],
            stats["maxElevationMeters"],
        ],
        "nodataCells": stats["nodataCells"],
        "status": "ok",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=["all", *EXPECTED], default="all")
    args = parser.parse_args()
    selected = list(EXPECTED) if args.profile == "all" else [args.profile]
    results = [validate(name, EXPECTED[name]["path"]) for name in selected]
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
