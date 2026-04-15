import {
  type ExtensionAPI,
  stripFrontmatter,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";

export default function skillToolExtension(pi: ExtensionAPI) {
  const pathMap = new Map<string, string>();

  const refreshPathMap = () => {
    pathMap.clear();
    for (const cmd of pi.getCommands()) {
      if (cmd.source !== "skill") continue;
      if (!cmd.sourceInfo.path) continue;
      const name = cmd.name.replace(/^skill:/, "");
      pathMap.set(name, cmd.sourceInfo.path);
    }
  };

  pi.on("turn_start", () => {
    refreshPathMap();
  });

  pi.registerTool({
    name: "skill",
    label: "Skill",
    description: `전문적인 지시사항과 워크플로를 제공하는 스킬을 로드합니다.
시스템 프롬프트에 나열된 사용 가능한 스킬 중 현재 작업과 일치하는 것이 있다면, 이 툴을 호출해 전체 지시사항을 로드하세요.
스킬이 로드되면 상세한 지시사항, 워크플로, 번들 리소스(스크립트, 참조문서, 템플릿)가 대화 컨텍스트에 주입됩니다.
툴 출력은 \`<skill>\` 블록으로 제공됩니다.
스킬이 상대 경로(예: scripts/, references/)를 참조하는 경우, 출력에 표시된 스킬 디렉토리를 기준으로 해석하고 필요시 read 툴로 로드하세요.`,
    parameters: Type.Object({
      name: Type.String({ description: "available_skills에 나열된 스킬 이름" }),
    }),
    async execute(_toolCallId, { name }, _signal, _onUpdate, _ctx) {
      const path = pathMap.get(name);
      if (!path) {
        const messages = [`Skill "${name}" not found.`];
        if (pathMap.size === 0) {
          messages.push("No skills are currently available.");
        } else {
          const available = Array.from(pathMap.keys()).join(", ");
          messages.push(`Available skills: ${available}`);
        }
        throw new Error(messages.join(" "));
      }

      let content: string;
      try {
        content = await readFile(path, "utf8");
      } catch (e) {
        throw new Error(`Failed to read skill file: ${path}`, { cause: e });
      }

      const body = stripFrontmatter(content).trim();
      const baseDir = dirname(path);
      const text = formatSkillBlock(name, path, baseDir, body);

      return { content: [{ type: "text", text }], details: {} };
    },
  });
}

function formatSkillBlock(
  name: string,
  location: string,
  baseDir: string,
  body: string,
): string {
  return `<skill name="${name}" location="${location}">
상대 경로는 ${baseDir} 기준입니다.

${body}
</skill>`;
}
