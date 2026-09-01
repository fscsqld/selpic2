export type InboundAgentChannel = 'message' | 'bespoke'

/** Deep-link from Messages / Bespoke into the Agent inbound draft workspace. */
export function buildAgentInboundDraftHref(channel: InboundAgentChannel, id: string): string {
  const params = new URLSearchParams({ channel, id: id.trim() })
  return `/admin/agent/inbound?${params.toString()}`
}

/** Parse `?channel=message|bespoke&id=…` for queue pre-selection. */
export function parseAgentInboundPreselect(
  channel: string | null,
  id: string | null
): { key: string; channel: InboundAgentChannel; id: string } | null {
  if (channel !== 'message' && channel !== 'bespoke') return null
  const trimmed = (id || '').trim()
  if (!trimmed) return null
  return { key: `${channel}:${trimmed}`, channel, id: trimmed }
}
