# Agent Skills Specification Summary

Condensed reference for the Agent Skills open format.
Full spec: https://agentskills.io/specification
Repo: https://github.com/agentskills/agentskills

## Directory Structure

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

## SKILL.md Format

YAML frontmatter + Markdown body:

```markdown
---
name: skill-name
description: What this skill does and when to use it.
license: Apache-2.0
compatibility: Requires Python 3.10+
allowed-tools: Bash(git:*) Read
metadata:
  author: org-name
  version: "1.0"
---

# Skill Instructions

Body content goes here...
```

### Frontmatter Fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars. Lowercase letters, digits, hyphens only. No leading/trailing/consecutive hyphens. Must match directory name. |
| `description` | Yes | Max 1024 chars. Non-empty. Describe what + when to use. |
| `license` | No | String. License name or reference to bundled file. |
| `compatibility` | No | Max 500 chars. Environment requirements. |
| `allowed-tools` | No | Space-separated string of pre-approved tools. Experimental. |
| `metadata` | No | Dict of string→string. Client-specific properties. |

### Name Rules

- 1–64 characters
- Only `a-z`, `0-9`, `-`
- Cannot start or end with `-`
- No consecutive `--`
- Must match parent directory name
- Unicode: use NFKC normalization

### Description Guidelines

- Describe both **what** the skill does and **when** to use it
- Use imperative phrasing: "Use this skill when..."
- Include specific keywords for agent discovery
- Err on the side of being pushy about when to activate
- Max 1024 characters

## Progressive Disclosure

Three tiers of context loading:

1. **Catalog** (~50-100 tokens/skill): `name` + `description` loaded at startup
2. **Instructions** (<5000 tokens recommended): Full SKILL.md body loaded on activation
3. **Resources** (as needed): scripts/, references/, assets/ loaded on demand

Keep SKILL.md under 500 lines. Move detailed content to separate files.

## File References

- Use relative paths from skill root
- Keep references one level deep from SKILL.md
- Avoid deeply nested reference chains

## Scripts Best Practices

- Self-contained or clearly document dependencies
- PEP 723 inline metadata for Python scripts (`uv run`)
- No interactive prompts — accept input via CLI flags, env vars, or stdin
- Structured output (JSON) to stdout, diagnostics to stderr
- Helpful error messages with actionable guidance
- Idempotent where possible
- Meaningful exit codes

## Validation Checklist

- [ ] SKILL.md exists with valid YAML frontmatter
- [ ] `name` field: required, valid format, matches directory
- [ ] `description` field: required, non-empty, ≤1024 chars
- [ ] No unexpected frontmatter fields
- [ ] `compatibility` ≤500 chars (if present)
- [ ] `metadata` is string→string mapping (if present)
- [ ] Body is non-empty with clear instructions
- [ ] Body under 500 lines
- [ ] Scripts are self-contained with PEP 723 metadata
- [ ] File references use relative paths

## Common Gotchas

- Description with unquoted colons is technically invalid YAML but common in practice — PyYAML handles it, strictyaml does not
- `metadata` values must be strings (quote numbers: `version: "1.0"`)
- `allowed-tools` uses a hyphen, not underscore
- Directory name must exactly match the `name` field
- SKILL.md (uppercase) is preferred over skill.md (lowercase)