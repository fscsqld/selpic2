/**
 * Employee Authentication - 직원 로그인 시스템
 * 
 * 직원 ID/Password 기반 로그인 및 세션 관리
 */

import { indexedDBStorage } from '@/lib/storage/indexed-db'

export interface EmployeeSession {
  employeeId: string
  employeeName: string
  employeeData: any
  loggedInAt: number
}

/**
 * 간단한 비밀번호 해시 (실제 프로덕션에서는 bcrypt 등 사용 권장)
 */
function hashPassword(password: string): string {
  // 간단한 해시 (실제로는 더 안전한 방법 사용)
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * 직원 로그인
 */
export async function loginEmployee(employeeId: string, password: string): Promise<EmployeeSession | null> {
  try {
    await indexedDBStorage.init()
    const employee = await indexedDBStorage.getEmployeeByEmployeeId(employeeId)

    if (!employee) {
      return null // 직원을 찾을 수 없음
    }

    if (!employee.isActive) {
      return null // 비활성 직원
    }

    // 비밀번호 확인
    const hashedPassword = hashPassword(password)
    if (employee.password && employee.password !== hashedPassword) {
      return null // 비밀번호 불일치
    }

    // 비밀번호가 없으면 초기 설정 필요
    if (!employee.password) {
      // 초기 비밀번호 설정 허용 (또는 별도 플래그 사용)
      // 여기서는 비밀번호가 없으면 로그인 실패로 처리
      return null
    }

    // 세션 생성
    const session: EmployeeSession = {
      employeeId: employee.employeeId,
      employeeName: employee.name,
      employeeData: employee,
      loggedInAt: Date.now(),
    }

    // localStorage에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('employee_session', JSON.stringify(session))
    }

    return session
  } catch (error) {
    console.error('Failed to login employee:', error)
    return null
  }
}

/**
 * 직원 로그아웃
 */
export function logoutEmployee(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('employee_session')
  }
}

/**
 * 현재 로그인된 직원 세션 가져오기
 */
export function getCurrentEmployeeSession(): EmployeeSession | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem('employee_session')
    if (!stored) return null

    const session = JSON.parse(stored) as EmployeeSession

    // 세션 유효성 검증 (24시간)
    const now = Date.now()
    const sessionAge = now - session.loggedInAt
    const maxAge = 24 * 60 * 60 * 1000 // 24시간

    if (sessionAge > maxAge) {
      localStorage.removeItem('employee_session')
      return null
    }

    return session
  } catch (error) {
    console.error('Failed to get employee session:', error)
    return null
  }
}

/**
 * 직원 비밀번호 설정/변경
 */
export async function setEmployeePassword(employeeId: string, newPassword: string): Promise<boolean> {
  try {
    await indexedDBStorage.init()
    const employee = await indexedDBStorage.getEmployeeByEmployeeId(employeeId)

    if (!employee) {
      return false
    }

    const hashedPassword = hashPassword(newPassword)
    employee.password = hashedPassword
    employee.updatedAt = new Date().toISOString()

    await indexedDBStorage.saveEmployee(employee)
    return true
  } catch (error) {
    console.error('Failed to set employee password:', error)
    return false
  }
}
