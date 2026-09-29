'use client'

import { adminVipGradeLabel, adminVipGradeLabelFromCode } from '@/lib/adminVipGradeLabel'
import { getGradeInfo, GradeConfig } from '@/lib/vipGradeConfig'
import { useContentStore } from '@/lib/contentStore'

interface GradeBadgeProps {
  gradeCode: number
  showName?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * VIP grade badge — English label by grade code (admin + storefront profile).
 */
export default function GradeBadge({ 
  gradeCode, 
  showName = true,
  size = 'md'
}: GradeBadgeProps) {
  const { getActiveVIPGradeConfigs, vipGradeConfigs } = useContentStore()
  
  const getAllGradeConfigs = () => {
    const defaultGradeDefinitions = [
      { code: 0, name: 'Basic', nameEn: 'Basic', minAmount: 0, maxAmount: 100, color: 'gray' },
      { code: 1, name: 'Silver', nameEn: 'Silver', minAmount: 100, maxAmount: 300, color: 'silver' },
      { code: 2, name: 'Gold', nameEn: 'Gold', minAmount: 300, maxAmount: 1000, color: 'gold' },
      { code: 3, name: 'Black', nameEn: 'Black', minAmount: 1000, maxAmount: 3000, color: 'black' },
      { code: 4, name: 'VVIP', nameEn: 'VVIP', minAmount: 3000, maxAmount: undefined, color: 'purple' }
    ]
    
    if (vipGradeConfigs && vipGradeConfigs.length > 0) {
      const configMap = new Map()
      
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
      
      vipGradeConfigs.forEach(config => {
        const label = adminVipGradeLabel(config)
        const gradeConfig: GradeConfig = {
          code: config.code,
          name: label,
          nameEn: label,
          minAmount: config.minAmount,
          maxAmount: config.maxAmount,
          color: config.color,
          benefits: config.benefits || []
        }
        configMap.set(config.code, gradeConfig)
      })
      
      return Array.from(configMap.values()).sort((a, b) => a.code - b.code)
    }
    
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
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  }
  
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800 border border-gray-200',
    silver: 'bg-gray-200 text-gray-900 border border-gray-300',
    gold: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 border border-yellow-300',
    black: 'bg-gradient-to-r from-gray-800 to-gray-900 text-white border border-gray-700',
    purple: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 border border-purple-300'
  }
  
  const colorClass = colorClasses[gradeInfo.color as keyof typeof colorClasses] || colorClasses.gray
  const label = adminVipGradeLabelFromCode(gradeCode)
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${colorClass}`}>
      {showName && (
        <span className="font-semibold">{label}</span>
      )}
    </span>
  )
}
