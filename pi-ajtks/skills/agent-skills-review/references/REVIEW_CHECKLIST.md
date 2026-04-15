# Agent Skills Review Checklist

Condensed review criteria for Agent Skills quality assessment.
Based on: https://agentskills.io/specification and best practices guides.

## Spec Compliance (Critical)

- [ ] SKILL.md exists (uppercase preferred over lowercase)
- [ ] YAML frontmatter is valid (starts/ends with ---)
- [ ] `name` field: present, valid format, matches directory name
- [ ] `description` field: present, non-empty, ≤1024 chars
- [ ] No unexpected frontmatter fields
- [ ] `compatibility` ≤500 chars (if present)
- [ ] `metadata` is string→string mapping (if present)

## Description Quality (Critical/Warning)

- [ ] At least 50 characters with specific keywords
- [ ] Uses imperative phrasing ("Use this skill when...")
- [ ] Describes WHEN to activate, not just WHAT it does
- [ ] Focuses on user intent, not implementation
- [ ] Includes keywords for agent discovery
- [ ] Mentions implicit trigger cases ("even if they don't mention X")

## Body Quality (Warning/Suggestion)

- [ ] Non-empty with clear instructions
- [ ] Has "When to use" or activation conditions section
- [ ] Has step-by-step instructions section
- [ ] Has "Gotchas" section for non-obvious facts
- [ ] Under 500 lines (move details to references/)
- [ ] No unfilled placeholders ([describe...], TODO, FIXME)
- [ ] File references use relative paths from skill root

## Scripts Quality (Warning/Suggestion)

- [ ] PEP 723 inline metadata (`# /// script` block)
- [ ] No interactive input (input() is forbidden)
- [ ] JSON output to stdout, diagnostics to stderr
- [ ] argparse or CLI argument parsing
- [ ] Helpful error messages with actionable guidance
- [ ] Meaningful exit codes
- [ ] Idempotent where possible

## Code Quality (Warning)

- [ ] ruff format: passes
- [ ] ruff check: no errors
- [ ] pyright: no type errors

## Structure (Info/Suggestion)

- [ ] SKILL.md (uppercase) preferred
- [ ] evals/ directory with test cases (recommended)
- [ ] scripts/ directory if skill has executable code
- [ ] references/ for detailed documentation
- [ ] assets/ for templates and resources

## Severity Guide

| Severity | Meaning |
|----------|---------|
| critical | Must fix — skill is broken or violates spec |
| warning | Should fix — quality or effectiveness issue |
| suggestion | Consider — improvement opportunity |
| info | FYI — no action required |