#!/usr/bin/env python3
"""Valida estructura, orientación y sanity checks del artefacto GEBCO web."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

EXPECTED_BBOX = [-80.0, -46.0, -60.0, -18.0]
EXPECTED_DIMENSIONS = [256, 358]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "artifact",
        nargs="?",
        type=Path,
        default=Path("public/data/generated/gebco-2026-provisional.json"),
    )
    args = parser.parse_args()
    payload = json.loads(args.artifact.read_text(encoding="utf-8"))
    grid = payload["grid"]
    stats = payload["statistics"]
    checks = payload["sanityChecks"]

    assert payload["schemaVersion"] == 1
    assert payload["dataset"]["crs"] == "EPSG:4326"
    assert payload["dataset"]["units"] == "meters"
    assert grid["bbox"] == EXPECTED_BBOX
    assert [grid["width"], grid["height"]] == EXPECTED_DIMENSIONS
    assert grid["rowOrder"] == "north-to-south"
    assert grid["columnOrder"] == "west-to-east"
    assert len(grid["elevationMeters"]) == grid["width"] * grid["height"]
    assert stats["validCells"] + stats["nodataCells"] == len(grid["elevationMeters"])
    assert stats["minElevationMeters"] < 0 < stats["maxElevationMeters"]
    assert checks["AndesCentrales"]["elevationMeters"] > 0
    assert abs(checks["CostaChilena"]["elevationMeters"]) < 500
    assert checks["CentroArgentina"]["elevationMeters"] > 0
    assert checks["Pacifico"]["elevationMeters"] < 0
    assert checks["northWest"]["coordinates"] == [grid["bbox"][0], grid["bbox"][3]]
    assert checks["southEast"]["coordinates"] == [grid["bbox"][2], grid["bbox"][1]]

    print(
        json.dumps(
            {
                "artifact": str(args.artifact),
                "bbox": grid["bbox"],
                "dimensions": [grid["width"], grid["height"]],
                "elevationRangeMeters": [
                    stats["minElevationMeters"],
                    stats["maxElevationMeters"],
                ],
                "nodataCells": stats["nodataCells"],
                "orientation": [grid["columnOrder"], grid["rowOrder"]],
                "status": "ok",
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
