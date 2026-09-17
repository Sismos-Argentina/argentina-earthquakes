#!/usr/bin/env python3
"""Valida el artefacto web de cartografía IGN + Natural Earth."""

from __future__ import annotations

import json
from pathlib import Path

ARTIFACT = Path("public/data/generated/cartography-argentina-context.json")


def main() -> int:
    payload = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    diagnostics = payload["diagnostics"]
    assert payload["schemaVersion"] == 1
    assert payload["crs"] == "EPSG:4326"
    assert payload["territorialBbox"] == [-85.0, -90.0, -25.0, -10.0]
    assert payload["gebcoContextBbox"] == [-85.0, -77.0, -25.0, -10.0]
    assert diagnostics["ignJurisdictions"] == 24
    assert diagnostics["naturalEarthFeatures"] >= 8
    assert diagnostics["includesTierraDelFuego"] is True
    assert diagnostics["includesMalvinas"] is True
    assert diagnostics["includesAntarcticaTo90S"] is True
    assert payload["sources"]["ign"]["agency"] == "Instituto Geográfico Nacional (IGN)"
    assert payload["sources"]["naturalEarth"]["version"] == "5.1.1"
    print(
        json.dumps(
            {
                "artifact": str(ARTIFACT),
                "bytes": ARTIFACT.stat().st_size,
                "diagnostics": diagnostics,
                "status": "ok",
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
