import { describe, it, expect } from 'vitest'
import { findEmployeeMatchingAdminUsername } from './sso-employee-bridge'

describe('findEmployeeMatchingAdminUsername', () => {
  const employees = [
    { employeeId: 'EMP01', name: 'Alice', email: 'alice@selpic.com.au', isActive: true },
    { employeeId: 'kim', name: 'Kim Admin', email: 'kim@x.com', isActive: true },
    {
      employeeId: 'E99',
      name: 'Linked',
      linkedAdminUsername: 'shop_admin',
      isActive: true,
    },
    { employeeId: 'GONE', name: 'Inactive', isActive: false },
  ]

  it('matches linkedAdminUsername first', () => {
    const e = findEmployeeMatchingAdminUsername(employees, 'shop_admin')
    expect(e?.employeeId).toBe('E99')
  })

  it('matches employeeId case-insensitively', () => {
    expect(findEmployeeMatchingAdminUsername(employees, 'KIM')?.employeeId).toBe('kim')
  })

  it('matches email local-part', () => {
    expect(findEmployeeMatchingAdminUsername(employees, 'alice')?.employeeId).toBe('EMP01')
  })

  it('ignores inactive employees', () => {
    expect(findEmployeeMatchingAdminUsername(employees, 'GONE')).toBeNull()
  })
})
