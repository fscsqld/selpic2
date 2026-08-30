import { describe, expect, it } from 'vitest'
import {
  defaultCompanyDepartment,
  isCompanyBusinessDepartment,
  isCorporateBankAccount,
} from '@/lib/classification/company-account'

describe('company-account', () => {
  it('treats company account as corporate-only', () => {
    expect(isCorporateBankAccount('company')).toBe(true)
    expect(isCorporateBankAccount('individual')).toBe(false)
    expect(defaultCompanyDepartment('company')).toBe('cleaning')
  })

  it('includes general department in company business metrics', () => {
    expect(isCompanyBusinessDepartment('general', 'company')).toBe(true)
    expect(isCompanyBusinessDepartment('cleaning', 'company')).toBe(true)
    expect(isCompanyBusinessDepartment('personal', 'company')).toBe(false)
  })
})
