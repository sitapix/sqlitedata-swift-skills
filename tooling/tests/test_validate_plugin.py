import json
import shutil
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.quality.validate_plugin import (
    ValidationError,
    discover_skill_dirs,
    fail,
    validate_catalog,
)


class TestFail(unittest.TestCase):
    def test_raises_validation_error(self):
        with self.assertRaises(ValidationError):
            fail("boom")


class TestDiscoverSkillDirs(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(__file__).parent / "_tmp_discover"
        self.tmp.mkdir(exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_missing_skills_dir(self):
        with self.assertRaises(ValidationError):
            discover_skill_dirs(self.tmp)

    def test_empty_skills_dir(self):
        (self.tmp / "skills").mkdir()
        with self.assertRaises(ValidationError):
            discover_skill_dirs(self.tmp)

    def test_returns_sorted_dirs(self):
        skills = self.tmp / "skills"
        skills.mkdir()
        (skills / "beta").mkdir()
        (skills / "alpha").mkdir()
        result = discover_skill_dirs(self.tmp)
        self.assertEqual([p.name for p in result], ["alpha", "beta"])

    def test_ignores_files(self):
        skills = self.tmp / "skills"
        skills.mkdir()
        (skills / "catalog.json").write_text("{}")
        (skills / "real-skill").mkdir()
        result = discover_skill_dirs(self.tmp)
        self.assertEqual([p.name for p in result], ["real-skill"])


class TestValidateCatalog(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(__file__).parent / "_tmp_catalog"
        self.tmp.mkdir(exist_ok=True)
        self.skills = self.tmp / "skills"
        self.skills.mkdir()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _make_dirs(self, *names):
        dirs = []
        for name in names:
            d = self.skills / name
            d.mkdir(exist_ok=True)
            dirs.append(d)
        return dirs

    def _write_catalog(self, entries):
        catalog = {"skills": [{"name": n} for n in entries]}
        (self.skills / "catalog.json").write_text(json.dumps(catalog))

    def test_no_catalog_is_fine(self):
        dirs = self._make_dirs("a")
        validate_catalog(self.tmp, dirs)

    def test_in_sync(self):
        dirs = self._make_dirs("a", "b")
        self._write_catalog(["a", "b"])
        validate_catalog(self.tmp, dirs)

    def test_missing_from_catalog(self):
        dirs = self._make_dirs("a", "b")
        self._write_catalog(["a"])
        with self.assertRaises(ValidationError) as ctx:
            validate_catalog(self.tmp, dirs)
        self.assertIn("b", str(ctx.exception))

    def test_extra_in_catalog(self):
        dirs = self._make_dirs("a")
        self._write_catalog(["a", "ghost"])
        with self.assertRaises(ValidationError) as ctx:
            validate_catalog(self.tmp, dirs)
        self.assertIn("ghost", str(ctx.exception))

    def test_invalid_json(self):
        dirs = self._make_dirs("a")
        (self.skills / "catalog.json").write_text("not json")
        with self.assertRaises(ValidationError):
            validate_catalog(self.tmp, dirs)

    def test_wrong_structure(self):
        dirs = self._make_dirs("a")
        (self.skills / "catalog.json").write_text(json.dumps(["oops"]))
        with self.assertRaises(ValidationError):
            validate_catalog(self.tmp, dirs)


if __name__ == "__main__":
    unittest.main()
