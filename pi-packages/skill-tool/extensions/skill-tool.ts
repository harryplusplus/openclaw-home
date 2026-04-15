import {
  type ExtensionAPI,
  type SlashCommandInfo,
  stripFrontmatter,
} from '@mariozechner/pi-coding-agent'
import { Type } from '@sinclair/typebox'
import { readFile } from 'node:fs/promises'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const FILE_LIMIT = 10

function collectFiles(dir: string, limit: number): string[] {
  const files: string[] = []
  const walk = (current: string) => {
    if (files.length >= limit) return
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (files.length >= limit) return
      if (
        entry.name === 'node_modules' ||
        entry.name.startsWith('.') ||
        entry.name === 'SKILL.md'
      )
        continue
      const fullPath = join(current, entry.name)
      let isDir = entry.isDirectory()
      let isFile = entry.isFile()
      if (entry.isSymbolicLink()) {
        try {
          const s = statSync(fullPath)
          isDir = s.isDirectory()
          isFile = s.isFile()
        } catch {
          continue
        }
      }
      if (isFile) {
        files.push(fullPath)
      } else if (isDir) {
        walk(fullPath)
      }
    }
  }
  walk(dir)
  return files
}

export default function skillToolExtension(pi: ExtensionAPI) {
  const pathMap = new Map<string, SlashCommandInfo>()

  const refreshPathMap = () => {
    pathMap.clear()
    for (const cmd of pi.getCommands()) {
      if (cmd.source !== 'skill' && cmd.source !== 'prompt') continue
      if (!cmd.sourceInfo?.path) continue
      const name = cmd.name.replace(/^(skill|prompt):/, '')
      pathMap.set(name, cmd)
    }
  }

  const buildDescription = () => {
    if (pathMap.size === 0) {
      return 'Load a specialized skill that provides domain-specific instructions and workflows. No skills are currently available.'
    }
    const lines = [
      'Load a specialized skill that provides domain-specific instructions and workflows.',
      '',
      'When you recognize that a task matches one of the available skills listed below, use this tool to load the full skill instructions.',
      '',
      'The skill will inject detailed instructions, workflows, and access to bundled resources (scripts, references, templates) into the conversation context.',
      '',
      'Tool output includes a `<skill>` block with the loaded content.',
      '',
      'The following skills provide specialized sets of instructions for particular tasks',
      'Invoke this tool to load a skill when a task matches one of the available skills listed below:',
      '',
    ]
    for (const [name, cmd] of pathMap) {
      const desc = cmd.description ?? 'No description'
      lines.push(`- **${name}**: ${desc}`)
    }
    return lines.join('\n')
  }

  const executeSkill = async (
    _toolCallId: string,
    { name }: { name: string },
    _signal: AbortSignal | undefined,
  ) => {
    const cmd = pathMap.get(name)
    if (!cmd) {
      const available =
        pathMap.size > 0 ? Array.from(pathMap.keys()).join(', ') : 'none'
      throw new Error(
        `Skill "${name}" not found. Available skills: ${available}`,
      )
    }

    const filePath = cmd.sourceInfo.path
    let content: string
    try {
      content = await readFile(filePath, 'utf8')
    } catch (e) {
      throw new Error(`Failed to read skill file: ${filePath}`, { cause: e })
    }

    const body = stripFrontmatter(content).trim()
    const dir = dirname(filePath)
    const base = pathToFileURL(dir).href
    const files = collectFiles(dir, FILE_LIMIT)

    return {
      content: [
        {
          type: 'text' as const,
          text: formatSkillBlock(name, filePath, base, dir, body, files),
        },
      ],
    }
  }

  pi.on('session_start', (event, ctx) => {
    refreshPathMap()
    pi.registerTool({
      name: 'skill',
      label: 'Skill',
      description: buildDescription(),
      parameters: Type.Object({
        name: Type.String({ description: 'Name of the skill to load' }),
      }),
      execute: executeSkill,
    })
  })

  pi.on('agent_start', (event, ctx) => {
    refreshPathMap()
    pi.registerTool({
      name: 'skill',
      label: 'Skill',
      description: buildDescription(),
      parameters: Type.Object({
        name: Type.String({ description: 'Name of the skill to load' }),
      }),
      execute: executeSkill,
    })
  })

  pi.on('turn_start', (event, ctx) => {
    console.log('')
  })

  pi.on('context', (event, ctx) => {
    console.log('')
  })
}

function formatSkillBlock(
  name: string,
  location: string,
  baseDir: string,
  baseDirLocal: string,
  body: string,
  files: string[],
): string {
  return [
    `<skill name="${name}" location="${location}">`,
    `# Skill: ${name}`,
    '',
    body,
    '',
    `Base directory for this skill: ${baseDir}`,
    'Relative paths in this skill (e.g., scripts/, references/) are relative to this base directory.',
    'Resolve them against the skill directory and use absolute paths in tool commands.',
    'Note: file list is sampled.',
    '',
    '<skill_files>',
    ...files.map((f) => `<file>${f}</file>`),
    '</skill_files>',
    '</skill>',
  ].join('\n')
}
