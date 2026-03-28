'use client'

/**
 * Employee Login Page - 직원 로그인 페이지
 * 
 * Staff Access를 통해 접근한 직원이 개인 로그인 ID와 패스워드로 로그인
 * 로그인 성공 시 개인 payroll 페이지로 리다이렉트
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EmployeeLogin } from '@/components/Payroll/EmployeeLogin'
import { getCurrentEmployeeSession, logoutEmployee } from '@/lib/auth/employee-auth'

export default function EmployeeLoginPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // 🔒 보안: 로그인 페이지에 접근할 때는 기존 세션을 무조건 삭제
    // 다른 직원의 정보 유출을 방지하기 위해
    const session = getCurrentEmployeeSession()
    if (session) {
      console.log('[Employee Login] 🔒 Security: Clearing existing session to prevent unauthorized access')
      console.log('[Employee Login] Previous session:', {
        employeeId: session.employeeId,
        employeeName: session.employeeName
      })
      logoutEmployee()
    }
    
    // SSO 토큰도 삭제 (혹시 남아있을 수 있음)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selpic_sso_token')
    }
    
    setIsChecking(false)
  }, [router])

  const handleLoginSuccess = (session: any) => {
    console.log('[Employee Login] Login successful, redirecting to payroll:', session.employeeId)
    // 로그인 성공 시 개인 payroll 페이지로 리다이렉트
    router.push('/employee/payroll')
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SELPIC A</h1>
          <p className="text-gray-600">Employee Payroll Access</p>
        </div>
        <EmployeeLogin onLoginSuccess={handleLoginSuccess} />
      </div>
    </div>
  )
}
