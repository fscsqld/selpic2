/**
 * Pure Site Review summary helpers (unit-test friendly — no OpenAI imports).
 */

export const SITE_REVIEW_SUMMARY_LLM_KILL = 'AGENT_SITE_REVIEW_SUMMARY_LLM'

export function isSiteReviewSummaryLlmEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.AGENT_DRAFT_LLM === '0' || env.AGENT_DRAFT_LLM === 'false') return false
  if (
    env[SITE_REVIEW_SUMMARY_LLM_KILL] === '0' ||
    env[SITE_REVIEW_SUMMARY_LLM_KILL] === 'false'
  ) {
    return false
  }
  return Boolean(env.OPENAI_API_KEY?.trim())
}

export function stripCodeFenceLocal(text: string): string {
  const t = text.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  return (m?.[1] ?? t).trim()
}

export function parseSummaryParagraphJson(raw: string): string | null {
  try {
    const parsed = JSON.parse(stripCodeFenceLocal(raw)) as { summary?: unknown }
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
    if (!summary || summary.length < 20 || summary.length > 600) return null
    if (/\b(auto[- ]?edit|rewrite hero|publish now|deploy)\b/i.test(summary)) return null
    return summary
  } catch {
    return null
  }
}

export function composeReportSummary(opts: {
  heuristic: string
  llmParagraph?: string | null
}): string {
  const llm = opts.llmParagraph?.trim()
  if (!llm) return opts.heuristic
  return `${opts.heuristic}\n\n${llm}`
}
