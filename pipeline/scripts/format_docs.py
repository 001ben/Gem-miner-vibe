#!/usr/bin/env python3
import subprocess
import sys

def run_uvx(args):
    """Runs uvx with the specified arguments."""
    cmd = [
        "uvx",
        "--from", "mdformat",
        "--with", "mdformat-mkdocs",
        "--with", "mdformat-frontmatter",
        "--with", "mdformat-gfm",
        # mdformat-admon removed due to conflict with mdformat-mkdocs
        "mdformat"
    ] + args

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    return result.returncode

def main():
    # If arguments are passed, append them to the command (e.g. --check)
    extra_args = sys.argv[1:]

    # Target directories/files
    targets = ["docs/", "README.md"]

    return run_uvx(extra_args + targets)

if __name__ == "__main__":
    sys.exit(main())
