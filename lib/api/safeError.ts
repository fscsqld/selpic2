/** Generic client-facing API error body (no internal details). */
export const SAFE_API_ERROR_MESSAGE = 'An error occurred while processing your request.'

export function logAndSafeMessage(context: string, err: unknown): string {
  const detail = err instanceof Error ? err.message : String(err)
  console.error(`[${context}]`, detail, err)
  return SAFE_API_ERROR_MESSAGE
}
