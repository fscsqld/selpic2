'use client'

/**
 * Employee Payroll Page - 직원 전용 급여 페이지
 * 
 * SSO 토큰을 통해 접근하며, 현재 로그인한 직원의 데이터만 표시
 * Multi-tenant 보안: 직원은 자신의 데이터만 조회 가능
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MyPayrollPage } from '@/components/HR/MyPayrollPage'
import { getSSOToken } from '@/lib/sso-handler'
import { getCurrentEmployeeSession, loginEmployee } from '@/lib/auth/employee-auth'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

export default function EmployeePayrollPage() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthorization()
  }, [])

  const checkAuthorization = async () => {
    try {
      // 직원 세션 확인 (직원 로그인을 통해 생성된 세션)
      const currentSession = getCurrentEmployeeSession()
      
      if (!currentSession) {
        console.error('[Employee Payroll] No employee session found. Please login first.')
        // 로그인 페이지로 리다이렉트
        router.push('/employee/login')
        return
      }

      // 직원 정보 확인
      await indexedDBStorage.init()
      const employee = await indexedDBStorage.getEmployeeByEmployeeId(currentSession.employeeId)
      
      if (!employee) {
        console.error('[Employee Payroll] Employee not found:', currentSession.employeeId)
        // 세션 삭제 후 로그인 페이지로 리다이렉트
        if (typeof window !== 'undefined') {
          localStorage.removeItem('employee_session')
        }
        router.push('/employee/login')
        return
      }

      // 직원이 비활성화된 경우
      if (!employee.isActive) {
        console.error('[Employee Payroll] Employee is inactive')
        if (typeof window !== 'undefined') {
          localStorage.removeItem('employee_session')
        }
        router.push('/employee/login')
        return
      }

      console.log('[Employee Payroll] Employee session verified:', {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email
      })

      setIsAuthorized(true)
    } catch (error) {
      console.error('[Employee Payroll] Authorization error:', error)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <MyPayrollPage
          onLogout={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('employee_session')
              localStorage.removeItem('selpic_sso_token')
            }
            router.push('/')
          }}
        />
      </div>
    </div>
  )
}
