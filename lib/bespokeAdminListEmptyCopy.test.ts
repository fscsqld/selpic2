import { describe, expect, it } from 'vitest'
import { bespokeAdminListEmptyCopy } from './bespokeAdminListEmptyCopy'

describe('bespokeAdminListEmptyCopy', () => {
  it('shows No requests found only for a successful empty database read', () => {
    expect(
      bespokeAdminListEmptyCopy({ loading: false, error: null, search: '', count: 0 })
    ).toBe('No requests found.')
  })

  it('does not use the empty-database copy when the load failed', () => {
    expect(
      bespokeAdminListEmptyCopy({
        loading: false,
        error: 'fetch failed',
        search: '',
        count: 0,
      })
    ).toBeNull()
  })

  it('uses a search-miss copy when records exist but the query matches none', () => {
    expect(
      bespokeAdminListEmptyCopy({
        loading: false,
        error: null,
        search: 'nobody@example.com',
        count: 0,
      })
    ).toBe('No matching requests.')
  })
})
