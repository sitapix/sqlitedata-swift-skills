import shutil
import unittest
from pathlib import Path

from scripts.quality.lint_repo import (
    check_common_text_rules,
    check_json,
    check_python,
    is_text_target,
    should_skip,
)


class TestShouldSkip(unittest.TestCase):
    def test_skips_git(self):
        root = Path("/repo")
        self.assertTrue(should_skip(Path("/repo/.git/config"), root))

    def test_skips_node_modules(self):
        root = Path("/repo")
        self.assertTrue(should_skip(Path("/repo/node_modules/pkg/index.js"), root))

    def test_allows_normal(self):
        root = Path("/repo")
        self.assertFalse(should_skip(Path("/repo/skills/foo/SKILL.md"), root))


class TestIsTextTarget(unittest.TestCase):
    def test_markdown(self):
        root = Path("/repo")
        self.assertTrue(is_text_target(Path("/repo/README.md"), root))

    def test_python(self):
        root = Path("/repo")
        self.assertTrue(is_text_target(Path("/repo/script.py"), root))

    def test_binary(self):
        root = Path("/repo")
        self.assertFalse(is_text_target(Path("/repo/image.png"), root))

    def test_gitignore(self):
        root = Path("/repo")
        self.assertTrue(is_text_target(Path("/repo/.gitignore"), root))


class TestCheckCommonTextRules(unittest.TestCase):
    def test_clean_file(self):
        issues = check_common_text_rules(Path("test.py"), "hello\nworld\n")
        self.assertEqual(issues, [])

    def test_crlf(self):
        issues = check_common_text_rules(Path("test.py"), "hello\r\nworld\n")
        self.assertTrue(any("CRLF" in i for i in issues))

    def test_missing_newline(self):
        issues = check_common_text_rules(Path("test.py"), "hello")
        self.assertTrue(any("trailing newline" in i for i in issues))

    def test_trailing_whitespace(self):
        issues = check_common_text_rules(Path("test.py"), "hello   \n")
        self.assertTrue(any("trailing whitespace" in i for i in issues))

    def test_markdown_allows_trailing_whitespace(self):
        issues = check_common_text_rules(Path("test.md"), "hello   \n")
        self.assertFalse(any("trailing whitespace" in i for i in issues))

    def test_tab_indent_in_python(self):
        issues = check_common_text_rules(Path("test.py"), "\thello\n")
        self.assertTrue(any("tab" in i for i in issues))


class TestCheckJson(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(check_json(Path("t.json"), '{"a": 1}'), [])

    def test_invalid(self):
        issues = check_json(Path("t.json"), "{bad}")
        self.assertTrue(len(issues) > 0)


class TestCheckPython(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(check_python(Path("t.py"), "x = 1\n"), [])

    def test_invalid(self):
        issues = check_python(Path("t.py"), "def f(\n")
        self.assertTrue(len(issues) > 0)


if __name__ == "__main__":
    unittest.main()
