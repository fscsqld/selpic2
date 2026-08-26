import { describe, expect, it } from 'vitest'
import {
  applyEndDateToEmployeeFields,
  getTerminationFields,
  isEmploymentEnded,
} from './employee-termination'

describe('employee-termination', () => {
  it('marks employee inactive when end date is today or earlier', () => {
    const today = getTerminationFields().endDate
    expect(isEmploymentEnded(today)).toBe(true)
    expect(applyEndDateToEmployeeFields(today, { isActive: true })).toEqual({
      endDate: today,
      isActive: false,
    })
  })

  it('keeps active when end date is in the future', () => {
    expect(applyEndDateToEmployeeFields('2099-12-31', { isActive: true })).toEqual({
      endDate: '2099-12-31',
      isActive: true,
    })
  })

  it('does not auto-reactivate when end date is cleared', () => {
    expect(applyEndDateToEmployeeFields('', { isActive: false })).toEqual({
      endDate: '',
      isActive: false,
    })
  })
})
