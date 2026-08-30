/**
 * Map homepage admin SSO username → HR employee record for My Payroll (path B).
 */

import { indexedDBStorage } from '@/lib/storage/indexed-db'
import type { EmployeeSession } from '@/lib/auth/employee-auth'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

export function findEmployeeMatchingAdminUsername(
  employees: Array<Record<string, unknown>>,
  adminUsername: string
): Record<string, unknown> | null {
  const u = norm(adminUsername)
  if (!u) return null

  const active = employees.filter((e) => e.isActive !== false)

  const byLinked = active.find(
    (e) => typeof e.linkedAdminUsername === 'string' && norm(e.linkedAdminUsername) === u
  )
  if (byLinked) return byLinked

  const byEmployeeId = active.find(
    (e) => typeof e.employeeId === 'string' && norm(e.employeeId) === u
  )
  if (byEmployeeId) return byEmployeeId

  const byEmail = active.find((e) => {
    if (typeof e.email !== 'string') return false
    const email = norm(e.email)
    return email === u || email.split('@')[0] === u
  })
  if (byEmail) return byEmail

  const byName = active.find((e) => typeof e.name === 'string' && norm(e.name) === u)
  if (byName) return byName

  return null
}

/**
 * Create employee_session from SSO admin username so My Payroll works without re-login.
 */
export async function establishEmployeeSessionFromAdminSso(
  adminUsername: string
): Promise<{ ok: true; session: EmployeeSession } | { ok: false; reason: string }> {
  if (!adminUsername.trim()) {
    return { ok: false, reason: 'Missing admin username on SSO token.' }
  }

  await indexedDBStorage.init()
  const employees = (await indexedDBStorage.getAllEmployees()) as Array<Record<string, unknown>>
  const emp = findEmployeeMatchingAdminUsername(employees, adminUsername)

  if (!emp || typeof emp.employeeId !== 'string') {
    return {
      ok: false,
      reason:
        'No HR employee record matches your admin username. Ask an accounting admin to add you as an employee (employee ID or email should match your admin login), or set linkedAdminUsername.',
    }
  }

  const session: EmployeeSession = {
    employeeId: emp.employeeId,
    employeeName: String(emp.name || emp.employeeId),
    employeeData: emp,
    loggedInAt: Date.now(),
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('employee_session', JSON.stringify(session))
  }

  return { ok: true, session }
}
