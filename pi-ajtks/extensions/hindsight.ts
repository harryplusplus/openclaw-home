import type { ExtensionAPI } from '@mariozechner/pi-coding-agent'
import {
  recallResponseToPromptString,
  type RecallResponse,
} from '@vectorize-io/hindsight-client'
import { createWriteStream, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

async function hindsightFetch(
  baseUrl: string,
  apiKey: string,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Hindsight ${res.status}: ${text}`)
  }

  return res.json()
}

async function retain(
  baseUrl: string,
  apiKey: string,
  bankId: string,
  content: string,
  options: {
    documentId: string
    updateMode: 'replace' | 'append'
    tags?: string[]
    signal?: AbortSignal
  },
): Promise<unknown> {
  return hindsightFetch(
    baseUrl,
    apiKey,
    `/v1/default/banks/${bankId}/memories`,
    {
      items: [
        {
          content,
          document_id: options.documentId,
          update_mode: options.updateMode,
          tags: options.tags,
        },
      ],
    },
    options.signal,
  )
}

async function recall(
  baseUrl: string,
  apiKey: string,
  bankId: string,
  query: string,
  options: { tags?: string[]; maxTokens?: number; signal?: AbortSignal },
): Promise<RecallResponse> {
  return hindsightFetch(
    baseUrl,
    apiKey,
    `/v1/default/banks/${bankId}/memories/recall`,
    {
      query,
      tags: options.tags,
      max_tokens: options.maxTokens ?? 2048,
      budget: 'mid',
    },
    options.signal,
  ) as Promise<RecallResponse>
}

interface SessionEntry {
  type: string
  id: string
  message?: {
    role: string
    content?:
      | string
      | Array<{
          type: string
          text?: string
          name?: string
          arguments?: Record<string, unknown>
        }>
    toolName?: string
    isError?: boolean
  }
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter(
        (b: Record<string, unknown>) =>
          b.type === 'text' && typeof b.text === 'string',
      )
      .map((b: Record<string, unknown>) => b.text as string)
      .join('\n')
  }
  return ''
}

function serializeBranch(branch: SessionEntry[]): string {
  const lines: string[] = []

  for (const entry of branch) {
    if (entry.type !== 'message' || !entry.message) continue
    const msg = entry.message

    switch (msg.role) {
      case 'user':
        lines.push(`## User\n\n${extractText(msg.content)}`)
        break
      case 'assistant': {
        const parts: string[] = []
        if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text' && block.text) {
              parts.push(block.text)
            } else if (block.type === 'toolCall' && block.name) {
              parts.push(
                `[Tool Call: ${block.name}(${JSON.stringify(block.arguments)})]`,
              )
            }
          }
        }
        if (parts.length) lines.push(`## Assistant\n\n${parts.join('\n')}`)
        break
      }
      case 'toolResult': {
        const label = msg.isError ? 'Tool Error' : 'Tool Result'
        lines.push(
          `## ${label} (${msg.toolName})\n\n${extractText(msg.content)}`,
        )
        break
      }
    }
  }

  return lines.join('\n\n')
}

interface LogEntry {
  ts: string
  level: 'debug' | 'error'
  event: string
  bankId: string
  sessionId: string
  [key: string]: unknown
}

function createLogStream(bankId: string) {
  const dir = join(homedir(), '.ajtks', 'logs')
  mkdirSync(dir, { recursive: true })
  return createWriteStream(join(dir, `${bankId}.jsonl`), { flags: 'a' })
}

function writeLog(stream: ReturnType<typeof createLogStream>, entry: LogEntry) {
  const line = JSON.stringify(entry) + '\n'
  if (Buffer.byteLength(line) > 4096) {
    const truncated: LogEntry = {
      ...entry,
      _truncated: true,
      _originalBytes: Buffer.byteLength(line),
    }
    const truncatedLine = JSON.stringify(truncated)
    stream.write(truncatedLine.slice(0, 4090) + '…"}\n')
  } else {
    stream.write(line)
  }
}

export default function (pi: ExtensionAPI) {
  const bankId = process.env.HINDSIGHT_BANK_ID
  if (!bankId) {
    throw new Error(
      'HINDSIGHT_BANK_ID is required. Set it to the agent memory bank ID.',
    )
  }

  const baseUrl = process.env.HINDSIGHT_BASE_URL ?? 'http://localhost:8888'
  const apiKey = process.env.HINDSIGHT_API_KEY ?? ''

  const logStream = createLogStream(bankId)

  pi.on('session_shutdown', () => {
    logStream.end()
  })

  pi.on('before_agent_start', async (event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId() ?? 'unknown'

    try {
      const response = await recall(baseUrl, apiKey, bankId, event.prompt, {
        maxTokens: 2048,
        signal: ctx.signal,
      })

      writeLog(logStream, {
        ts: new Date().toISOString(),
        level: 'debug',
        event: 'recall',
        bankId,
        sessionId,
        factsCount: response.results?.length ?? 0,
        entityNames: response.entities ? Object.keys(response.entities) : [],
        response,
      })

      const promptText = recallResponseToPromptString(response)
      if (!promptText) return

      return {
        systemPrompt:
          event.systemPrompt +
          `\n\n## Past Experiences (Hindsight)\n\n${promptText}\n`,
      }
    } catch (err) {
      writeLog(logStream, {
        ts: new Date().toISOString(),
        level: 'error',
        event: 'recall_failed',
        bankId,
        sessionId,
        error: String(err),
      })
    }
  })

  pi.on('agent_end', async (_event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId()
    if (!sessionId) return

    const branch = ctx.sessionManager.getBranch() as SessionEntry[]
    const content = serializeBranch(branch)
    if (!content.trim()) return

    try {
      await retain(baseUrl, apiKey, bankId, content, {
        documentId: sessionId,
        updateMode: 'replace',
        signal: ctx.signal,
      })

      writeLog(logStream, {
        ts: new Date().toISOString(),
        level: 'debug',
        event: 'retain',
        bankId,
        sessionId,
        contentLength: content.length,
      })
    } catch (err) {
      writeLog(logStream, {
        ts: new Date().toISOString(),
        level: 'error',
        event: 'retain_failed',
        bankId,
        sessionId,
        error: String(err),
      })
    }
  })
}
