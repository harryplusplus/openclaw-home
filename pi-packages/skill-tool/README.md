# skill-tool

Pi 에이전트에게 [Agent Skills](https://agentskills.io)를 불러오는 `skill` 툴을 제공하는 pi 패키지.

## 왜 필요한가

Pi는 스킬을 발견하고 시스템 프롬프트의 `<available_skills>` 블록에 이름·설명·경로를 나열합니다. 그런데 에이전트는 이 목록을 보고도 `read` 툴로 직접 파일을 읽지 않습니다. 스킬이 로드되지 않으면 전문 지시사항이 컨텍스트에 들어오지 않아, 에이전트가 스킬이 존재한다는 것만 알고 실제 내용은 모르는 상태가 됩니다.

OpenCode에서는 전용 `skill` 툴이 이 문제를 해결합니다. Pi에도 같은 접근이 필요했습니다.

## 어떻게 동작하나

1. `turn_start` 이벤트에서 `pi.getCommands()`를 순회해 `source === "skill"`인 항목을 찾아 이름 → `SKILL.md` 경로 맵을 구축합니다. 이 맵은 시스템 프롬프트의 `<available_skills>`와 동일한 SOT(Source of Truth)에서 옵니다. 즉, 패키지 스킬, 설정 스킬, CLI 플래그 스킬, extension에서 추가한 스킬까지 모두 포함됩니다.

2. 에이전트가 `skill` 툴을 호출하면:
   - 이름으로 `SKILL.md` 경로를 찾는다
   - 파일을 읽어 YAML frontmatter를 제거하고 본문만 추출한다
   - Pi의 기존 `/skill:name` 슬래시 커맨드와 동일한 `<skill>` XML 블록으로 감싸서 반환한다

3. 스킬이 상대 경로(`scripts/`, `references/` 등)를 참조하면, 에이전트는 출력에 표시된 스킬 디렉토리를 기준으로 `read` 툴로 필요한 파일을 추가로 읽습니다. 이것이 Agent Skills의 Progressive Disclosure 3단계 구조에 해당합니다.

## 설치

```json
{
  "packages": ["skill-tool"]
}
```

또는 수동 설치:

```bash
pi package install ./path/to/pi-packages/skill-tool
```

## 출력 형식

Pi의 `/skill:name` 슬래시 커맨드와 호환되는 XML 구조를 사용합니다:

```xml
<skill name="ripgrep" location="/home/user/.pi/agent/skills/ripgrep/SKILL.md">
상대 경로는 /home/user/.pi/agent/skills/ripgrep 기준입니다.

# Ripgrep (rg) — Advanced Cheat Sheet
...본문...
</skill>
```

## 참고

- [Agent Skills 사양](https://agentskills.io/specification) — `SKILL.md` 포맷과 Progressive Disclosure 모델
- OpenCode의 `skill` 툴 — 이 패키지의 설계 참조
- Pi의 `/skill:name` 슬래시 커맨드 — 동일한 `<skill>` 출력 형식
