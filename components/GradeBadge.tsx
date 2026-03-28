'use client'

import { getGradeInfo, GradeConfig } from '@/lib/vipGradeConfig'
import { useContentStore } from '@/lib/contentStore'

interface GradeBadgeProps {
  gradeCode: number
  showName?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * VIP 등급 배지 컴포넌트
 * 사용자의 등급을 시각적으로 표시합니다.
 */
export default function GradeBadge({ 
  gradeCode, 
  showName = true,
  size = 'md'
}: GradeBadgeProps) {
  const { getActiveVIPGradeConfigs, vipGradeConfigs } = useContentStore()
  
  // 모든 등급을 포함하도록: 기본값을 기반으로 하고 vipGradeConfigs에 있는 것들로 업데이트
  // 비활성화된 등급도 포함하여 표시
  const getAllGradeConfigs = () => {
    // 기본 등급 정의 (0-4 모두 포함)
    const defaultGradeDefinitions = [
      { code: 0, name: '일반', nameEn: 'Basic', minAmount: 0, maxAmount: 100, color: 'gray' },
      { code: 1, name: '실버', nameEn: 'Silver', minAmount: 100, maxAmount: 300, color: 'silver' },
      { code: 2, name: '골드', nameEn: 'Gold', minAmount: 300, maxAmount: 1000, color: 'gold' },
      { code: 3, name: '블랙', nameEn: 'Black', minAmount: 1000, maxAmount: 3000, color: 'black' },
      { code: 4, name: 'VVIP', nameEn: 'VVIP', minAmount: 3000, maxAmount: undefined, color: 'purple' }
    ]
    
    // vipGradeConfigs에 있는 등급들로 업데이트 (비활성화된 것도 포함)
    if (vipGradeConfigs && vipGradeConfigs.length > 0) {
      const configMap = new Map()
      
      // 먼저 기본값으로 초기화
      defaultGradeDefinitions.forEach(def => {
        const gradeConfig: GradeConfig = {
          code: def.code,
          name: def.name,
          nameEn: def.nameEn,
          minAmount: def.minAmount,
          maxAmount: def.maxAmount,
          color: def.color,
          benefits: []
        }
        configMap.set(def.code, gradeConfig)
      })
      
      // vipGradeConfigs의 등급으로 업데이트 (비활성화된 것도 포함)
      vipGradeConfigs.forEach(config => {
        const gradeConfig: GradeConfig = {
          code: config.code,
          name: config.name,
          nameEn: config.nameEn,
          minAmount: config.minAmount,
          maxAmount: config.maxAmount,
          color: config.color,
          benefits: config.benefits || []
        }
        configMap.set(config.code, gradeConfig)
      })
      
      return Array.from(configMap.values()).sort((a, b) => a.code - b.code)
    }
    
    // vipGradeConfigs가 없으면 기본값 사용 (활성화된 것만)
    return getActiveVIPGradeConfigs()
  }
  
  const gradeConfigs = getAllGradeConfigs()
  const gradeInfo = getGradeInfo(gradeCode, gradeConfigs)
  
  if (!gradeInfo) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Unknown
      </span>
    )
  }
  
  // 크기별 스타일
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  }
  
  // 등급별 색상 클래스
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800 border border-gray-200',
    silver: 'bg-gray-200 text-gray-900 border border-gray-300',
    gold: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 border border-yellow-300',
    black: 'bg-gradient-to-r from-gray-800 to-gray-900 text-white border border-gray-700',
    purple: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 border border-purple-300'
  }
  
  const colorClass = colorClasses[gradeInfo.color as keyof typeof colorClasses] || colorClasses.gray
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${colorClass}`}>
      {showName && (
        <span className="font-semibold">{gradeInfo.nameEn}</span>
      )}
    </span>
  )
}
