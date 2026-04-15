# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pyyaml",
# ]
# ///
"""Read and output Agent Skill properties as JSON.

Parses the YAML frontmatter from SKILL.md and outputs the properties.

Usage:
    uv run scripts/read_properties.py <skill_dir>

Exit codes:
    0: Success
    1: Parse error
    2: Usage error
"""

import argparse
from pathlib import Path

from _common import error_exit, output_json, read_skill_md


def read_properties(skill_dir: Path) -> dict:
    """Read skill properties from SKILL.md frontmatter.

    Returns a dict with the skill properties.
    """
    skill_dir = Path(skill_dir).resolve()
    metadata, _body, _skill_md_path = read_skill_md(skill_dir)

    # Build output dict, including only present fields
    result = {}

    if "name" not in metadata:
        raise ValueError("Missing required field in frontmatter: name")
    if "description" not in metadata:
        raise ValueError("Missing required field in frontmatter: description")

    result["name"] = metadata["name"].strip() if isinstance(metadata["name"], str) else metadata["name"]
    result["description"] = (
        metadata["description"].strip() if isinstance(metadata["description"], str) else metadata["description"]
    )

    if "license" in metadata:
        result["license"] = metadata["license"]
    if "compatibility" in metadata:
        result["compatibility"] = metadata["compatibility"]
    if "allowed-tools" in metadata:
        result["allowed-tools"] = metadata["allowed-tools"]
    if "metadata" in metadata and isinstance(metadata["metadata"], dict) and metadata["metadata"]:
        result["metadata"] = metadata["metadata"]

    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Read and output Agent Skill properties as JSON.",
        epilog=(
            "Examples:\n"
            "  uv run scripts/read_properties.py ./my-skill\n"
            "  uv run scripts/read_properties.py ./my-skill/SKILL.md\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "skill_path",
        help="Path to the skill directory (or SKILL.md file)",
    )
    args = parser.parse_args()

    skill_path = Path(args.skill_path)

    # If pointed at SKILL.md, use parent directory
    if skill_path.is_file() and skill_path.name.lower() == "skill.md":
        skill_path = skill_path.parent

    try:
        props = read_properties(skill_path)
        output_json(props)
    except (FileNotFoundError, ValueError) as e:
        error_exit(str(e))


if __name__ == "__main__":
    main()
