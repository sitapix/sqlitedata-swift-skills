import shutil
import unittest
from datetime import datetime, timezone
from pathlib import Path

from scripts.quality.skill_freshness import (
    SkillFreshness,
    collect_skills,
    format_age,
    months_ago,
)


class TestMonthsAgo(unittest.TestCase):
    def test_simple(self):
        now = datetime(2026, 6, 15, tzinfo=timezone.utc)
        result = months_ago(3, now)
        self.assertEqual(result.month, 3)
        self.assertEqual(result.year, 2026)

    def test_wraps_year(self):
        now = datetime(2026, 2, 15, tzinfo=timezone.utc)
        result = months_ago(6, now)
        self.assertEqual(result.month, 8)
        self.assertEqual(result.year, 2025)

    def test_clamps_day(self):
        now = datetime(2026, 3, 31, tzinfo=timezone.utc)
        result = months_ago(1, now)
        self.assertEqual(result.day, 28)


class TestFormatAge(unittest.TestCase):
    def test_this_month(self):
        now = datetime(2026, 3, 15, tzinfo=timezone.utc)
        self.assertEqual(format_age(now, now), "this month")

    def test_one_month(self):
        now = datetime(2026, 3, 15, tzinfo=timezone.utc)
        past = datetime(2026, 2, 10, tzinfo=timezone.utc)
        self.assertEqual(format_age(past, now), "1 month ago")

    def test_multiple_months(self):
        now = datetime(2026, 6, 15, tzinfo=timezone.utc)
        past = datetime(2026, 1, 10, tzinfo=timezone.utc)
        self.assertEqual(format_age(past, now), "5 months ago")


class TestCollectSkills(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(__file__).parent / "_tmp_freshness"
        self.tmp.mkdir(exist_ok=True)
        skills = self.tmp / "skills"
        skills.mkdir()
        skill_dir = skills / "test-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("---\nname: test-skill\n---\n# Test\n")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_collects_skills_with_mtime_fallback(self):
        now = datetime.now(tz=timezone.utc)
        threshold = months_ago(6, now)
        entries = collect_skills(self.tmp, threshold)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].name, "test-skill")
        self.assertEqual(entries[0].source, "mtime")
        self.assertFalse(entries[0].stale)


if __name__ == "__main__":
    unittest.main()
