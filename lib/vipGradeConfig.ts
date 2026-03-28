/**
 * VIP 등급 시스템 설정
 * 고객의 누적 총판매금액을 기준으로 등급을 결정합니다.
 */

export interface GradeConfig {
  code: number
  name: string        // 한국어 등급명
  nameEn: string      // 영어 등급명
  minAmount: number   // 최소 금액 (이 금액 이상)
  maxAmount?: number  // 최대 금액 (이 금액 미만, undefined면 무제한)
  color: string       // UI 표시용 색상 키
  benefits: string[]  // 혜택 목록
}

/**
 * VIP 등급 설정
 * 등급 코드: 0 (Basic) ~ 4 (VVIP)
 */
export const VIP_GRADE_CONFIGS: GradeConfig[] = [
  {
    code: 0,
    name: '일반',
    nameEn: 'Basic',
    minAmount: 0,
    maxAmount: 100000,        // 10만원 미만
    color: 'gray',
    benefits: ['기본 5% 할인 쿠폰']
  },
  {
    code: 1,
    name: '실버',
    nameEn: 'Silver',
    minAmount: 100000,
    maxAmount: 300000,        // 30만원 미만
    color: 'silver',
    benefits: ['5% 상시 할인', '생일 쿠폰']
  },
  {
    code: 2,
    name: '골드',
    nameEn: 'Gold',
    minAmount: 300000,
    maxAmount: 1000000,       // 100만원 미만
    color: 'gold',
    benefits: ['10% 상시 할인', '무료 배송 쿠폰']
  },
  {
    code: 3,
    name: '블랙',
    nameEn: 'Black',
    minAmount: 1000000,
    maxAmount: 3000000,       // 300만원 미만
    color: 'black',
    benefits: ['20% 상시 할인', '전용 고객 센터']
  },
  {
    code: 4,
    name: 'VVIP',
    nameEn: 'VVIP',
    minAmount: 3000000,
    maxAmount: undefined,     // 무제한
    color: 'purple',
    benefits: ['50% 상시 할인', '특별 선물']
  }
]

/**
 * 총 판매액을 기준으로 등급을 계산합니다.
 * Content Store의 관리자 설정을 우선 사용하고, 없으면 기본 설정을 사용합니다.
 * @param totalSalesAmount 누적 총판매금액 (AUD)
 * @param gradeConfigs 관리자가 설정한 등급 기준 (선택)
 * @returns 등급 코드 (0-4)
 */
export function calculateGrade(totalSalesAmount: number, gradeConfigs?: Array<{ code: number; minAmount: number; maxAmount?: number; isActive?: boolean }>): number {
  // 관리자가 설정한 등급 기준이 있으면 사용
  const configs = gradeConfigs || VIP_GRADE_CONFIGS
  
  // 활성화된 등급만 필터링 (isActive가 있는 경우)
  const activeConfigs = configs.filter((g: any) => g.isActive !== false)
  
  // 높은 등급부터 확인 (VVIP -> Basic 순서)
  for (let i = activeConfigs.length - 1; i >= 0; i--) {
    const grade = activeConfigs[i]
    if (totalSalesAmount >= grade.minAmount) {
      // maxAmount가 undefined면 무제한 (최고 등급)
      if (grade.maxAmount === undefined || totalSalesAmount < grade.maxAmount) {
        return grade.code
      }
    }
  }
  return 0 // 기본 등급 (Basic)
}

/**
 * 등급 코드로 등급 정보를 가져옵니다.
 * Content Store의 관리자 설정을 우선 사용하고, 없으면 기본 설정을 사용합니다.
 * @param gradeCode 등급 코드 (0-4)
 * @param gradeConfigs 관리자가 설정한 등급 기준 (선택)
 * @returns 등급 설정 정보 또는 undefined
 */
export function getGradeInfo(gradeCode: number, gradeConfigs?: GradeConfig[]): GradeConfig | undefined {
  if (gradeConfigs) {
    return gradeConfigs.find(g => g.code === gradeCode)
  }
  return VIP_GRADE_CONFIGS.find(g => g.code === gradeCode)
}

/**
 * 다음 등급까지 필요한 금액을 계산합니다.
 * Content Store의 관리자 설정을 우선 사용하고, 없으면 기본 설정을 사용합니다.
 * @param currentGrade 현재 등급 코드
 * @param totalSalesAmount 현재 총 판매액 (AUD)
 * @param gradeConfigs 관리자가 설정한 등급 기준 (선택)
 * @returns 다음 등급까지 필요한 금액 (이미 최고 등급이면 0)
 */
export function calculateNextGradeAmount(currentGrade: number, totalSalesAmount: number, gradeConfigs?: GradeConfig[]): number {
  const configs = gradeConfigs || VIP_GRADE_CONFIGS
  const activeConfigs = configs.filter((g: any) => g.isActive !== false)
  const nextGrade = activeConfigs.find((g: any) => g.code === currentGrade + 1)
  if (!nextGrade) {
    return 0 // 이미 최고 등급
  }
  
  const remaining = nextGrade.minAmount - totalSalesAmount
  return remaining > 0 ? remaining : 0
}

/**
 * 등급명을 가져옵니다 (언어별)
 * @param gradeCode 등급 코드
 * @param language 언어 ('ko' | 'en')
 * @returns 등급명
 */
export function getGradeName(gradeCode: number, language: 'ko' | 'en' = 'en'): string {
  const grade = getGradeInfo(gradeCode)
  if (!grade) return 'Unknown'
  return language === 'ko' ? grade.name : grade.nameEn
}

