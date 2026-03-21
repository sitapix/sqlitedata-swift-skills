import json
import shutil
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.release.set_version import load_json, write_json


class TestJsonHelpers(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(__file__).parent / "_tmp_version"
        self.tmp.mkdir(exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_roundtrip(self):
        p = self.tmp / "test.json"
        data = {"version": "1.0.0", "name": "test"}
        write_json(p, data)
        result = load_json(p)
        self.assertEqual(result, data)

    def test_trailing_newline(self):
        p = self.tmp / "test.json"
        write_json(p, {"a": 1})
        text = p.read_text()
        self.assertTrue(text.endswith("\n"))

    def test_indented(self):
        p = self.tmp / "test.json"
        write_json(p, {"a": 1, "b": 2})
        text = p.read_text()
        self.assertIn("  ", text)


if __name__ == "__main__":
    unittest.main()
