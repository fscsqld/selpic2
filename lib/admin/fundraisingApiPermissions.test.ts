import { describe, expect, it } from 'vitest'

import { permissionsForFundraisingPut } from '@/lib/admin/fundraisingApiPermissions'

describe('permissionsForFundraisingPut', () => {
  it('requires finance only for settlement-only saves', () => {
    expect(permissionsForFundraisingPut({ settlement: { id: 's1' } })).toEqual(['fundraising:finance'])
  })

  it('requires write for partner mutations', () => {
    expect(permissionsForFundraisingPut({ partner: { id: 'p1' } })).toEqual(['fundraising:write'])
  })

  it('requires both finance and write when payout and partner change together', () => {
    expect(
      permissionsForFundraisingPut({
        partner: { id: 'p1' },
        settlement: { id: 's1' },
      }).sort()
    ).toEqual(['fundraising:finance', 'fundraising:write'].sort())
  })

  it('returns empty for unrecognized bodies', () => {
    expect(permissionsForFundraisingPut({})).toEqual([])
    expect(permissionsForFundraisingPut(null)).toEqual([])
  })
})
