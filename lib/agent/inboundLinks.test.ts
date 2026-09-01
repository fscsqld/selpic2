import { describe, expect, it } from 'vitest'
import { buildAgentInboundDraftHref, parseAgentInboundPreselect } from './inboundLinks'

describe('inboundLinks', () => {
  it('builds deep link for message channel', () => {
    expect(buildAgentInboundDraftHref('message', 'msg_123')).toBe(
      '/admin/agent/inbound?channel=message&id=msg_123'
    )
  })

  it('parses valid preselect params', () => {
    expect(parseAgentInboundPreselect('bespoke', 'bsp_1')).toEqual({
      key: 'bespoke:bsp_1',
      channel: 'bespoke',
      id: 'bsp_1',
    })
  })

  it('rejects invalid channel or missing id', () => {
    expect(parseAgentInboundPreselect('orders', 'x')).toBeNull()
    expect(parseAgentInboundPreselect('message', '')).toBeNull()
  })
})
