#!/usr/bin/env python3
"""Valida el artefacto web Slab2 sin acceso a los archivos raw."""

import json
from pathlib import Path

path = Path("public/data/generated/slab2-sam-2018-scientific.json")
artifact = json.loads(path.read_text(encoding="utf-8"))
grid = artifact["grid"]
summary = artifact["summary"]
assert artifact["schemaVersion"] == 1
assert artifact["modelVersion"] == "02.23.18"
assert artifact["modelType"] == "geophysical-model-not-observation"
assert (grid["west"], grid["north"], grid["stepDegrees"]) == (-82.0, -18.0, 0.1)
assert (grid["width"], grid["height"]) == (241, 311)
assert len(grid["depthKm"]) == len(grid["uncertaintyKm"]) == 241 * 311
valid = [value for value in grid["depthKm"] if value is not None]
unc = [value for value in grid["uncertaintyKm"] if value is not None]
assert len(valid) == summary["validNodes"] == 27118
assert len(unc) == summary["uncertaintyNodes"]
assert all(value > 0 for value in valid + unc)
assert all(
    uncertainty is None if depth is None else True
    for depth, uncertainty in zip(grid["depthKm"], grid["uncertaintyKm"])
)
for latitude in (-26.0, -33.0):
    west = summary["sanityDepthKm"][f"-70.0,{latitude}"]
    east = summary["sanityDepthKm"][f"-67.0,{latitude}"]
    assert west < east, (latitude, west, east)
print(f"Slab2 OK: {len(valid):,} nodos, {path.stat().st_size:,} bytes")
