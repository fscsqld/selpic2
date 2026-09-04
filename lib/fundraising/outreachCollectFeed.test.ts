import { describe, expect, it } from 'vitest'
import { assertSafeOutreachCollectFeedUrl } from './outreachCollectFeedUrl'

describe('assertSafeOutreachCollectFeedUrl', () => {
  it('accepts https public hosts', () => {
    const r = assertSafeOutreachCollectFeedUrl('https://lists.example.com/au-schools.csv')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.url.hostname).toBe('lists.example.com')
  })

  it('rejects http, localhost, and private IPs', () => {
    expect(assertSafeOutreachCollectFeedUrl('http://lists.example.com/x.csv').ok).toBe(false)
    expect(assertSafeOutreachCollectFeedUrl('https://localhost/x.csv').ok).toBe(false)
    expect(assertSafeOutreachCollectFeedUrl('https://127.0.0.1/x.csv').ok).toBe(false)
    expect(assertSafeOutreachCollectFeedUrl('https://192.168.1.5/x.csv').ok).toBe(false)
  })
})
