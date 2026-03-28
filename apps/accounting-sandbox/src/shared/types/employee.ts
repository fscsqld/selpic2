/**
 * Employee 타입 정의
 * 급여 관리 및 HR 기능에 사용되는 직원 정보
 */

export type EmployeeType = 'employee' | 'director' | 'contractor' | 'partner'
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly'

export interface Employee {
  id: string
  name: string
  employeeId: string // 필수: 로그인 ID
  password?: string // 해시된 비밀번호 (직원이 설정)
  type: EmployeeType
  taxFileNumber?: string
  abn?: string
  hourlyRate?: number // 시급 (직원이 설정 가능)
  superannuationRate: number // 기본 11% (Contractor는 0)
  payFrequency: PayFrequency
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postcode?: string
  }
  startDate?: string
  endDate?: string
  isActive: boolean
  // HR 추가 필드
  annualLeaveBalance?: number // 연차 잔여 시간 (hours)
  sickLeaveBalance?: number // 병가 잔여 시간 (hours)
  superannuationFund?: string // Superannuation Fund (연금 기금 이름)
  superannuationMemberNumber?: string // Superannuation Member Number (연금 회원 번호)
  emergencyContact?: {
    name?: string
    relationship?: string
    phone?: string
  }
  // Contractor 관련 필드
  companyName?: string // Contractor의 회사명
  isGSTRegistered?: boolean // GST 등록 여부 (Contractor용)
  // 급여 결제 은행 정보
  bankAccount?: {
    bankName?: string // 은행명 (예: CBA, NAB, ANZ, Westpac)
    accountName?: string // 계좌명
    bsb?: string // BSB 번호
    accountNumber?: string // 계좌번호
  }
  createdAt: string
  updatedAt: string
}

export interface EmployeePayrollInfo {
  employeeId: string
  grossPay: number
  taxWithheld: number
  superannuation: number
  netPay: number
  payPeriod: {
    start: string
    end: string
  }
}
