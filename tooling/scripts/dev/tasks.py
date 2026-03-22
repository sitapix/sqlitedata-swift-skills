#!/usr/bin/env python3

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import Callable, Optional


ROOT = Path(__file__).resolve().parents[3]


def run(command: list[str], *, env: Optional[dict[str, str]] = None) -> None:
    subprocess.run(command, cwd=ROOT, check=True, env=env)


def python(script: Path, *args: str, env: Optional[dict[str, str]] = None) -> None:
    run([sys.executable, str(script), *args], env=env)


def run_tests() -> None:
    env = os.environ.copy()
    pythonpath_entries = [str(ROOT / "tooling")]
    if env.get("PYTHONPATH"):
        pythonpath_entries.append(env["PYTHONPATH"])
    env["PYTHONPATH"] = os.pathsep.join(pythonpath_entries)
    run([sys.executable, "-m", "unittest", "discover", "-s", "tooling/tests"], env=env)


def task_setup(extra_args: list[str]) -> None:
    python(ROOT / "tooling/scripts/dev/bootstrap_dev.py", *extra_args)


def task_hooks_install() -> None:
    python(ROOT / "tooling/scripts/dev/install_git_hooks.py")


def task_lint_repo() -> None:
    python(ROOT / "tooling/scripts/quality/lint_repo.py")


def task_descriptions_lint() -> None:
    python(ROOT / "tooling/scripts/quality/evaluate_skill_descriptions.py")


def task_descriptions_dataset() -> None:
    python(
        ROOT / "tooling/scripts/quality/evaluate_skill_descriptions.py",
        "--dataset",
        "tooling/evals/description-triggers.json",
    )


def task_test() -> None:
    run_tests()


def task_lint() -> None:
    task_lint_repo()
    task_descriptions_lint()


def task_agents_build() -> None:
    run(["node", str(ROOT / "scripts/build-agents.mjs")])


def task_agents_check() -> None:
    run(["node", str(ROOT / "scripts/build-agents.mjs"), "--check"])


def task_mcp_smoke() -> None:
    run(["node", str(ROOT / "mcp-server/scripts/smoke-test.mjs")])


def task_check() -> None:
    task_lint()
    task_agents_check()
    python(ROOT / "tooling/scripts/quality/validate_plugin.py")
    task_descriptions_dataset()
    task_test()
    task_mcp_smoke()


def task_skills_freshness() -> None:
    python(ROOT / "tooling/scripts/quality/skill_freshness.py")


def task_version_set(extra_args: list[str]) -> None:
    python(ROOT / "tooling/scripts/release/set_version.py", *extra_args)


def task_agents_build_cmd(extra_args: list[str]) -> None:
    task_agents_build()


def task_agents_check_cmd(extra_args: list[str]) -> None:
    task_agents_check()


COMMANDS: dict[str, Callable[[list[str]], None]] = {
    "setup": lambda extra_args: task_setup(extra_args),
    "hooks:install": lambda extra_args: task_hooks_install(),
    "lint:repo": lambda extra_args: task_lint_repo(),
    "descriptions:lint": lambda extra_args: task_descriptions_lint(),
    "descriptions:dataset": lambda extra_args: task_descriptions_dataset(),
    "test": lambda extra_args: task_test(),
    "lint": lambda extra_args: task_lint(),
    "agents:build": task_agents_build_cmd,
    "agents:check": task_agents_check_cmd,
    "check": lambda extra_args: task_check(),
    "preflight": lambda extra_args: task_check(),
    "merge:check": lambda extra_args: task_check(),
    "release:check": lambda extra_args: task_check(),
    "skills:freshness": lambda extra_args: task_skills_freshness(),
    "version:set": task_version_set,
    "release": lambda extra_args: run(["bash", str(ROOT / "tooling/scripts/release/release.sh"), *extra_args]),
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run repository tasks without npm.")
    parser.add_argument("task", choices=sorted(COMMANDS))
    parser.add_argument("args", nargs=argparse.REMAINDER)
    parsed = parser.parse_args()

    extra_args = parsed.args
    if extra_args[:1] == ["--"]:
        extra_args = extra_args[1:]

    try:
        COMMANDS[parsed.task](extra_args)
    except subprocess.CalledProcessError as exc:
        print(
            f"ERROR: command failed with exit status {exc.returncode}: {' '.join(exc.cmd)}",
            file=sys.stderr,
        )
        return exc.returncode

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
