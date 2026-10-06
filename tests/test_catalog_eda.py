import importlib.util
import math
import sys
import unittest
from pathlib import Path

import pandas as pd


MODULE_PATH = Path(__file__).parents[1] / "tools" / "eda" / "catalog_eda.py"
SPEC = importlib.util.spec_from_file_location("catalog_eda", MODULE_PATH)
assert SPEC and SPEC.loader
eda = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = eda
SPEC.loader.exec_module(eda)


class CatalogEdaTests(unittest.TestCase):
    def test_load_catalog_parses_units_and_time(self):
        fixture = Path(__file__).parent / "fixtures" / "catalog_eda.csv"
        frame = eda.load_catalog(fixture)
        self.assertEqual(frame["depth_km"].tolist(), [69.0, 70.0, 300.0])
        self.assertEqual(frame["depth_class"].astype(str).tolist(), ["superficial", "intermedia", "profunda"])
        self.assertEqual(frame.loc[0, "timestamp"], pd.Timestamp("2026-09-18 06:25:00"))

    def test_mc_and_b_are_defined_for_synthetic_catalog(self):
        magnitudes = [2.0] * 60 + [2.1] * 50 + [2.2] * 40 + [2.3] * 30 + [2.4] * 20
        result = eda.estimate_mc_b(magnitudes)
        self.assertEqual(result["mc"], 2.0)
        self.assertGreater(result["b_value"], 0)
        self.assertEqual(result["n_above_mc"], 200)

    def test_json_value_removes_non_finite_values(self):
        payload = eda.json_value({"finite": 1.5, "nan": math.nan})
        self.assertEqual(payload["finite"], 1.5)
        self.assertIsNone(payload["nan"])


if __name__ == "__main__":
    unittest.main()
