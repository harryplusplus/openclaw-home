# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pyyaml",
# ]
# ///
"""Shared utilities for Agent Skills development scripts."""

import json
import sys
from pathlib import Path

import yaml


def find_skill_md(skill_dir: Path) -> Path | None:
    """Find SKILL.md in a skill directory. Prefers uppercase."""
    for name in ("SKILL.md", "skill.md"):
        path = skill_dir / name
        if path.exists():
            return path
    return None


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from SKILL.md content.

    Returns (metadata_dict, body_string).
    Raises ValueError on invalid frontmatter.
    """
    if not content.startswith("---"):
        raise ValueError("SKILL.md must start with YAML frontmatter (---)")

    parts = content.split("---", 2)
    if len(parts) < 3:
        raise ValueError("SKILL.md frontmatter not properly closed with ---")

    frontmatter_str = parts[1]
    body = parts[2].strip()

    try:
        metadata = yaml.safe_load(frontmatter_str)
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML in frontmatter: {e}") from e

    if metadata is None:
        raise ValueError("SKILL.md frontmatter is empty")

    if not isinstance(metadata, dict):
        raise ValueError("SKILL.md frontmatter must be a YAML mapping")

    # Normalize metadata: ensure string values for known string fields
    if "metadata" in metadata and isinstance(metadata["metadata"], dict):
        metadata["metadata"] = {str(k): str(v) for k, v in metadata["metadata"].items()}

    return metadata, body


def read_skill_md(skill_dir: Path) -> tuple[dict, str, Path]:
    """Find and parse SKILL.md from a skill directory.

    Returns (metadata_dict, body_string, skill_md_path).
    Raises FileNotFoundError if SKILL.md not found.
    Raises ValueError if frontmatter is invalid.
    """
    skill_dir = Path(skill_dir).resolve()
    skill_md = find_skill_md(skill_dir)

    if skill_md is None:
        raise FileNotFoundError(f"SKILL.md not found in {skill_dir}")

    content = skill_md.read_text(encoding="utf-8")
    metadata, body = parse_frontmatter(content)
    return metadata, body, skill_md


def output_json(data: dict | list) -> None:
    """Print data as JSON to stdout."""
    print(json.dumps(data, ensure_ascii=False, indent=2))


def error_exit(message: str, code: int = 1) -> None:
    """Print error as JSON to stderr and exit."""
    print(json.dumps({"error": message}, ensure_ascii=False), file=sys.stderr)
    sys.exit(code)
