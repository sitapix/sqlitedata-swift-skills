import json
import shutil
import unittest
from pathlib import Path

from scripts.quality.evaluate_skill_descriptions import (
    EvaluationError,
    lint_description,
    load_dataset,
    load_skill_descriptions,
    normalize_front_matter_scalar,
    parse_front_matter,
)


class TestNormalizeFrontMatterScalar(unittest.TestCase):
    def test_unquoted(self):
        self.assertEqual(normalize_front_matter_scalar("hello"), "hello")

    def test_double_quoted(self):
        self.assertEqual(normalize_front_matter_scalar('"hello"'), "hello")

    def test_single_quoted(self):
        self.assertEqual(normalize_front_matter_scalar("'hello'"), "hello")

    def test_mismatched_quotes(self):
        self.assertEqual(normalize_front_matter_scalar("'hello\""), "'hello\"")


class TestParseFrontMatter(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(__file__).parent / "_tmp_fm"
        self.tmp.mkdir(exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_basic(self):
        p = self.tmp / "SKILL.md"
        p.write_text("---\nname: foo\ndescription: Use when testing\n---\n# Body\n")
        result = parse_front_matter(p)
        self.assertEqual(result["name"], "foo")
        self.assertEqual(result["description"], "Use when testing")

    def test_missing_opening(self):
        p = self.tmp / "BAD.md"
        p.write_text("name: foo\n---\n")
        with self.assertRaises(EvaluationError):
            parse_front_matter(p)

    def test_missing_closing(self):
        p = self.tmp / "BAD.md"
        p.write_text("---\nname: foo\n")
        with self.assertRaises(EvaluationError):
            parse_front_matter(p)


class TestLintDescription(unittest.TestCase):
    def test_good_description(self):
        issues = lint_description("test", "Use when building something or debugging issues with the framework")
        errors = [i for i in issues if i["level"] == "error"]
        self.assertEqual(errors, [])

    def test_empty_description(self):
        issues = lint_description("test", "")
        self.assertTrue(any(i["level"] == "error" for i in issues))

    def test_missing_use_when(self):
        issues = lint_description("test", "A great skill for doing things or other things")
        errors = [i for i in issues if i["level"] == "error"]
        self.assertTrue(any("Use when" in i["message"] for i in errors))

    def test_too_long(self):
        desc = "Use when " + "x" * 1020
        issues = lint_description("test", desc)
        self.assertTrue(any("exceeds" in i["message"] for i in issues))

    def test_short_description_warns(self):
        issues = lint_description("test", "Use when building or fixing")
        warnings = [i for i in issues if i["level"] == "warning"]
        self.assertTrue(any("short" in i["message"] for i in warnings))


class TestLoadSkillDescriptions(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(__file__).parent / "_tmp_load"
        self.tmp.mkdir(exist_ok=True)
        self.skills = self.tmp / "skills"
        self.skills.mkdir()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_loads_skills(self):
        skill_dir = self.skills / "my-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "---\nname: my-skill\ndescription: Use when testing things or debugging\n---\n# Skill\n"
        )
        result = load_skill_descriptions(self.tmp)
        self.assertIn("my-skill", result)
        self.assertIn("Use when testing", result["my-skill"]["description"])

    def test_missing_name_fails(self):
        skill_dir = self.skills / "bad"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("---\ndescription: stuff\n---\n")
        with self.assertRaises(EvaluationError):
            load_skill_descriptions(self.tmp)


class TestLoadDataset(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(__file__).parent / "_tmp_dataset"
        self.tmp.mkdir(exist_ok=True)
        self.skills = {"my-skill": {"description": "test", "path": "x"}}

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_valid_dataset(self):
        p = self.tmp / "data.json"
        p.write_text(json.dumps([
            {"skill": "my-skill", "query": "test?", "should_trigger": True, "split": "train"}
        ]))
        result = load_dataset(p, self.skills)
        self.assertEqual(len(result), 1)

    def test_unknown_skill(self):
        p = self.tmp / "data.json"
        p.write_text(json.dumps([
            {"skill": "nope", "query": "test?", "should_trigger": True, "split": "train"}
        ]))
        with self.assertRaises(EvaluationError):
            load_dataset(p, self.skills)

    def test_invalid_split(self):
        p = self.tmp / "data.json"
        p.write_text(json.dumps([
            {"skill": "my-skill", "query": "test?", "should_trigger": True, "split": "bad"}
        ]))
        with self.assertRaises(EvaluationError):
            load_dataset(p, self.skills)

    def test_invalid_json(self):
        p = self.tmp / "data.json"
        p.write_text("not json")
        with self.assertRaises(EvaluationError):
            load_dataset(p, self.skills)


if __name__ == "__main__":
    unittest.main()
