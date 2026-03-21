#!/usr/bin/env python3

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SKILLS_REF_SOURCE = "git+https://github.com/agentskills/agentskills.git#subdirectory=skills-ref"


class BootstrapError(RuntimeError):
    pass


def run(command: list[str], *, cwd: Path) -> None:
    subprocess.run(command, cwd=cwd, check=True)


def ensure_command(name: str) -> str:
    executable = shutil.which(name)
    if executable:
        return executable
    raise BootstrapError(f"Required command not found on PATH: {name}")


def ensure_skills_ref() -> None:
    if shutil.which("skills-ref"):
        print("skills-ref already installed")
        return

    uv = ensure_command("uv")
    print("Installing skills-ref with uv...")
    run([uv, "tool", "install", "--from", SKILLS_REF_SOURCE, "skills-ref"], cwd=ROOT)


def install_git_hooks() -> None:
    print("Installing Git hooks...")
    run([sys.executable, str(ROOT / "tooling" / "scripts" / "dev" / "install_git_hooks.py")], cwd=ROOT)


def main() -> int:
    parser = argparse.ArgumentParser(description="Bootstrap local development prerequisites.")
    parser.add_argument("--skip-skills-ref", action="store_true", help="Do not install or check skills-ref")
    parser.add_argument("--skip-hooks", action="store_true", help="Do not install Git hooks")
    args = parser.parse_args()

    try:
        if not args.skip_skills_ref:
            ensure_skills_ref()
        if not args.skip_hooks:
            install_git_hooks()
    except BootstrapError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as exc:
        print(f"ERROR: command failed with exit status {exc.returncode}: {' '.join(exc.cmd)}", file=sys.stderr)
        return exc.returncode

    print("Bootstrap complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
