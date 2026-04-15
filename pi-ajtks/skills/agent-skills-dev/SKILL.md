---
name: agent-skills-dev
description: >-
  Agent Skills를 개발하고 유지관리하는 스킬입니다. 새 스킬 스캐폴딩, SKILL.md 검증,
  속성 읽기, 프롬프트 XML 생성 시 사용하세요. 스킬 생성, 검증, 디버깅 작업이나
  SKILL.md frontmatter, 스킬 디렉토리 구조에 관한 작업을 할 때 활성화하세요.
license: MIT
compatibility: uv와 pyyaml이 필요합니다.
metadata:
  author: al-jal-ttak-kkal-sen
  version: "1.0"
---

# Agent Skills Development

Agent Skills 스펙에 따라 스킬을 생성, 검증, 유지관리합니다.

스펙: https://agentskills.io/specification
리포지토리: https://github.com/agentskills/agentskills

## 사용 가능한 스크립트

- **`scripts/scaffold.py`** — 새 스킬 디렉토리와 템플릿 SKILL.md 생성
- **`scripts/validate.py`** — 스킬 디렉토리를 스펙에 맞게 검증
- **`scripts/read_properties.py`** — SKILL.md frontmatter 속성을 JSON으로 출력
- **`scripts/to_prompt.py`** — `<available_skills>` XML 프롬프트 생성
- **`scripts/check.py`** — ruff 포맷/린트 + pyright 타입체크 (프로젝트 독립 설정 사용)

## 워크플로우

### 새 스킬 만들기

1. 스캐폴딩 생성:
   ```bash
   uv run scripts/scaffold.py <skill-name> --output-dir <target-dir>
   ```
2. 생성된 SKILL.md의 description과 본문을 실제 내용으로 채우기
3. 검증:
   ```bash
   uv run scripts/validate.py <skill-dir>
   ```
4. `errors`가 빈 배열이 될 때까지 수정 → 검증 반복

### 기존 스킬 검증/수정

1. 검증 실행:
   ```bash
   uv run scripts/validate.py <skill-dir>
   ```
2. `errors` 항목 수정 (필수), `warnings` 항목 검토 (권장)
3. 재검증하여 통과 확인

### 스킬 속성 확인

```bash
uv run scripts/read_properties.py <skill-dir>
```

### 프롬프트 XML 생성

```bash
uv run scripts/to_prompt.py <skill-dir1> [<skill-dir2> ...]
```

출력 JSON의 `prompt` 필드에 `<available_skills>` XML이 포함됩니다.

### 코드 품질 검사

```bash
# 전체 검사 (포맷 + 린트 + 타입체크)
uv run scripts/check.py <path>...

# 자동 수정
uv run scripts/check.py <path>... --fix

# 개별 검사
uv run scripts/check.py <path>... --format-only
uv run scripts/check.py <path>... --lint-only
uv run scripts/check.py <path>... --typecheck-only
```

`assets/ruff.toml`과 `assets/pyrightconfig.json`의 설정을 사용하므로
프로젝트의 pyproject.toml에 의존하지 않습니다.

## 핵심 스펙 규칙

- **name**: 소문자+숫자+하이픈만, 1~64자, 시작/끝 하이픈 금지, 연속 하이픈 금지, 디렉토리명과 일치
- **description**: 필수, 최대 1024자, 무엇을 하는지+언제 사용하는지 모두 기술
- **metadata 값**: 반드시 문자열 (숫자는 따옴표: `version: "1.0"`)
- **allowed-tools**: 하이픈 사용 (underscore 아님)
- **SKILL.md 본문**: 500줄 이하 권장, 상세 내용은 references/로 분리
- **스크립트**: PEP 723 인라인 메타데이터 사용, `uv run`으로 실행
- **출력**: JSON은 stdout, 진단 메시지는 stderr
- **상호작용 금지**: 대화형 프롬프트 없이 CLI 인수/환경변수/stdin으로 입력

## 주의사항

- description에 콜론이 포함되면 YAML에서 따옴표가 필요할 수 있음 (PyYAML은 관대하지만 strictyaml은 아님)
- `metadata`의 값은 모두 문자열이어야 함
- 디렉토리명이 `name` 필드와 정확히 일치해야 함
- SKILL.md (대문자)가 skill.md (소문자)보다 우선
- 스크립트는 대화형 입력 없이 자동화 친화적으로 설계할 것

## 상세 스펙 참조

스펙 전체 내용은 [SPEC_SUMMARY.md](references/SPEC_SUMMARY.md)를 참조하세요.