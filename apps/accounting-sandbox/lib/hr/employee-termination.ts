/**
 * Helpers for marking employees as terminated (inactive) while keeping payroll history.
 */

export function getTodayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isEmploymentEnded(endDate?: string): boolean {
  if (!endDate) return false
  return endDate <= getTodayIsoDate()
}

/** End date on or before today => inactive; clearing end date does not auto-reactivate. */
export function applyEndDateToEmployeeFields(
  endDate: string,
  current: { isActive?: boolean }
): { endDate: string; isActive: boolean } {
  if (!endDate) {
    return { endDate: '', isActive: current.isActive ?? true }
  }
  if (isEmploymentEnded(endDate)) {
    return { endDate, isActive: false }
  }
  return { endDate, isActive: current.isActive ?? true }
}

export function getTerminationFields(): { endDate: string; isActive: false } {
  return { endDate: getTodayIsoDate(), isActive: false }
}
