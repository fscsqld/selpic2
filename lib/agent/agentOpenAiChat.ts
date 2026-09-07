/**
 * Shared OpenAI Chat Completions helper for Agent HITL draft polish.
 * Opt-in only at call sites; never auto-send / auto-publish.
 *
 * Cousins: missing key, AGENT_DRAFT_LLM=0 global kill, sector kill switches,
 * timeout, non-JSON responses, multi-sector reuse (inbound / community / later),
 * vision image_url payloads (https only at call sites), usage logging failures.
 */

import { randomUUID } from 'crypto'
import {
  parseChatUsageFromResponse,
} from './agentOpenAiPricing'
import {
  buildChatRunRecord,
  type AgentRunSector,
} from './agentRuns'

export const AGENT_OPENAI_DEFAULT_MODEL = 'gpt-4o-mini'
export const AGENT_OPENAI_DEFAULT_TIMEOUT_MS = 12_000
export const AGENT_OPENAI_VISION_TIMEOUT_MS = 25_000

export type AgentOpenAiUsageContext = {
  sector: AgentRunSector
  action: string
  adminLabel?: string
}

export function isAgentOpenAiEnabled(
  env: NodeJS.ProcessEnv = process.env,
  sectorKillEnvKey?: string
): boolean {
  if (env.AGENT_DRAFT_LLM === '0' || env.AGENT_DRAFT_LLM === 'false') return false
  if (
    sectorKillEnvKey &&
    (env[sectorKillEnvKey] === '0' || env[sectorKillEnvKey] === 'false')
  ) {
    return false
  }
  return Boolean(env.OPENAI_API_KEY?.trim())
}

export function stripCodeFence(text: string): string {
  const t = text.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  return (m?.[1] ?? t).trim()
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }

async function recordChatUsageSafe(opts: {
  model: string
  usageCtx?: AgentOpenAiUsageContext
  json: unknown
}): Promise<void> {
  if (!opts.usageCtx) return
  const tokens = parseChatUsageFromResponse(opts.json)
  if (!tokens) return
  try {
    const { appendAgentRun } = await import('@/lib/server/agentRunsStore')
    const record = buildChatRunRecord({
      id: randomUUID(),
      sector: opts.usageCtx.sector,
      action: opts.usageCtx.action,
      model: opts.model,
      adminLabel: opts.usageCtx.adminLabel || 'unknown',
      usage: tokens,
    })
    await appendAgentRun(record)
  } catch (e) {
    console.warn('[agentOpenAiChat] usage log failed:', e)
  }
}

/**
 * Returns raw assistant message content, or null on any failure.
 */
export async function openAiChatJsonContent(opts: {
  system: string
  user: string
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
  timeoutMs?: number
  model?: string
  temperature?: number
  sectorKillEnvKey?: string
  usage?: AgentOpenAiUsageContext
}): Promise<string | null> {
  return openAiChatCompletionContent({
    system: opts.system,
    userContent: opts.user,
    env: opts.env,
    fetchImpl: opts.fetchImpl,
    timeoutMs: opts.timeoutMs,
    model: opts.model,
    temperature: opts.temperature,
    sectorKillEnvKey: opts.sectorKillEnvKey,
    usage: opts.usage,
  })
}

/**
 * Vision-capable chat JSON — userContent may include https image_url parts.
 * Call sites must reject indexeddb:// / data: before invoking.
 */
export async function openAiVisionJsonContent(opts: {
  system: string
  userText: string
  imageUrl: string
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
  timeoutMs?: number
  model?: string
  temperature?: number
  sectorKillEnvKey?: string
  usage?: AgentOpenAiUsageContext
}): Promise<string | null> {
  const imageUrl = opts.imageUrl.trim()
  if (!/^https:\/\//i.test(imageUrl)) return null
  const userContent: ChatContentPart[] = [
    { type: 'text', text: opts.userText },
    { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
  ]
  return openAiChatCompletionContent({
    system: opts.system,
    userContent,
    env: opts.env,
    fetchImpl: opts.fetchImpl,
    timeoutMs: opts.timeoutMs ?? AGENT_OPENAI_VISION_TIMEOUT_MS,
    model: opts.model,
    temperature: opts.temperature ?? 0.2,
    sectorKillEnvKey: opts.sectorKillEnvKey,
    usage: opts.usage,
  })
}

async function openAiChatCompletionContent(opts: {
  system: string
  userContent: string | ChatContentPart[]
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
  timeoutMs?: number
  model?: string
  temperature?: number
  sectorKillEnvKey?: string
  usage?: AgentOpenAiUsageContext
}): Promise<string | null> {
  const env = opts.env ?? process.env
  if (!isAgentOpenAiEnabled(env, opts.sectorKillEnvKey)) return null

  const apiKey = env.OPENAI_API_KEY!.trim()
  const model =
    (opts.model || env.AGENT_DRAFT_MODEL || AGENT_OPENAI_DEFAULT_MODEL).trim() ||
    AGENT_OPENAI_DEFAULT_MODEL
  const timeoutMs = opts.timeoutMs ?? AGENT_OPENAI_DEFAULT_TIMEOUT_MS
  const fetchImpl = opts.fetchImpl ?? fetch

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: opts.temperature ?? 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.userContent },
        ],
      }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as ChatCompletionResponse
    const content = json.choices?.[0]?.message?.content
    if (!content?.trim()) return null
    void recordChatUsageSafe({ model, usageCtx: opts.usage, json })
    return content
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
