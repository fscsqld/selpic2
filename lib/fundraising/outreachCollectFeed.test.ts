import { describe, expect, it } from 'vitest'
import { assertSafeOutreachCollectFeedUrl } from './outreachCollectFeedUrl'
import { parseOutreachTargetImportText } from './outreachTargetImport'

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

describe('sample feed files parse', () => {
  it('parses committed CSV sample shape', () => {
    const csv = [
      'Organisation,Email,Contact,Type,State,Notes',
      'Sunnybank Early Learning,office@sunnybank-elc.example.com.au,Jane Smith,daycare,QLD,sample',
    ].join('\n')
    const { rows, parseErrors } = parseOutreachTargetImportText(csv)
    expect(parseErrors).toEqual([])
    expect(rows[0].contactEmail).toBe('office@sunnybank-elc.example.com.au')
  })

  it('parses committed JSON sample aliases', () => {
    const json = JSON.stringify([
      { schoolName: 'Westside', emailAddress: 'a@west.example.com.au', state: 'VIC' },
    ])
    const { rows } = parseOutreachTargetImportText(json)
    expect(rows[0].organizationName).toBe('Westside')
    expect(rows[0].contactEmail).toBe('a@west.example.com.au')
  })
})
