'use client'

import { useState, useMemo } from 'react'
import { X, CheckCircle, AlertCircle, ArrowRight, Copy } from 'lucide-react'
import { getPermissionDescription, getPermissionCategory } from '@/lib/permissionUtils'

interface PermissionComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  admin1: { username: string; permissions: string[] }
  admin2: { username: string; permissions: string[] }
  onSyncPermissions?: (fromAdmin: string, toAdmin: string) => void
}

export default function PermissionComparisonModal({
  isOpen,
  onClose,
  admin1,
  admin2,
  onSyncPermissions
}: PermissionComparisonModalProps) {
  const [syncDirection, setSyncDirection] = useState<'1to2' | '2to1' | null>(null)

  if (!isOpen) return null

  // 공통 권한
  const commonPermissions = useMemo(() => {
    return admin1.permissions.filter(p => admin2.permissions.includes(p))
  }, [admin1.permissions, admin2.permissions])

  // admin1만 가진 권한
  const onlyAdmin1 = useMemo(() => {
    return admin1.permissions.filter(p => !admin2.permissions.includes(p))
  }, [admin1.permissions, admin2.permissions])

  // admin2만 가진 권한
  const onlyAdmin2 = useMemo(() => {
    return admin2.permissions.filter(p => !admin1.permissions.includes(p))
  }, [admin1.permissions, admin2.permissions])

  // 권한을 카테고리별로 그룹화
  const groupByCategory = (permissions: string[]) => {
    const groups: Record<string, string[]> = {}
    permissions.forEach(permission => {
      const category = getPermissionCategory(permission) || '기타'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(permission)
    })
    return groups
  }

  const handleSync = () => {
    if (!syncDirection || !onSyncPermissions) return
    
    if (syncDirection === '1to2') {
      onSyncPermissions(admin1.username, admin2.username)
    } else {
      onSyncPermissions(admin2.username, admin1.username)
    }
    setSyncDirection(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-5xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            권한 비교: {admin1.username} vs {admin2.username}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-900">공통 권한</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{commonPermissions.length}개</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm font-medium text-green-900">{admin1.username}만</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{onlyAdmin1.length}개</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-900">{admin2.username}만</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{onlyAdmin2.length}개</div>
          </div>
        </div>

        {/* 공통 권한 */}
        {commonPermissions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              공통 권한 ({commonPermissions.length}개)
            </h4>
            <div className="border border-gray-200 rounded-md p-3 bg-gray-50 max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {commonPermissions.map(permission => {
                  const desc = getPermissionDescription(permission)
                  return (
                    <span
                      key={permission}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200"
                      title={desc?.description}
                    >
                      {permission}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 비교 결과 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Admin1만 가진 권한 */}
          {onlyAdmin1.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-green-600" />
                {admin1.username}만 가진 권한 ({onlyAdmin1.length}개)
              </h4>
              <div className="border border-green-200 rounded-md p-3 bg-green-50 max-h-60 overflow-y-auto">
                {Object.entries(groupByCategory(onlyAdmin1)).map(([category, permissions]) => (
                  <div key={category} className="mb-2 last:mb-0">
                    <div className="text-xs font-medium text-green-800 mb-1">{category}</div>
                    <div className="flex flex-wrap gap-1">
                      {permissions.map(permission => {
                        const desc = getPermissionDescription(permission)
                        return (
                          <span
                            key={permission}
                            className="text-xs px-2 py-1 bg-white text-green-700 rounded border border-green-200"
                            title={desc?.description}
                          >
                            {permission}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin2만 가진 권한 */}
          {onlyAdmin2.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                {admin2.username}만 가진 권한 ({onlyAdmin2.length}개)
              </h4>
              <div className="border border-purple-200 rounded-md p-3 bg-purple-50 max-h-60 overflow-y-auto">
                {Object.entries(groupByCategory(onlyAdmin2)).map(([category, permissions]) => (
                  <div key={category} className="mb-2 last:mb-0">
                    <div className="text-xs font-medium text-purple-800 mb-1">{category}</div>
                    <div className="flex flex-wrap gap-1">
                      {permissions.map(permission => {
                        const desc = getPermissionDescription(permission)
                        return (
                          <span
                            key={permission}
                            className="text-xs px-2 py-1 bg-white text-purple-700 rounded border border-purple-200"
                            title={desc?.description}
                          >
                            {permission}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 권한 동기화 */}
        {onSyncPermissions && (onlyAdmin1.length > 0 || onlyAdmin2.length > 0) && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">권한 동기화</h4>
            <div className="space-y-2">
              {onlyAdmin1.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSyncDirection('1to2')}
                  className={`w-full p-3 rounded-md border transition-colors text-left ${
                    syncDirection === '1to2'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {admin1.username}의 권한을 {admin2.username}에 적용
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {onlyAdmin1.length}개의 추가 권한이 부여됩니다
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              )}
              {onlyAdmin2.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSyncDirection('2to1')}
                  className={`w-full p-3 rounded-md border transition-colors text-left ${
                    syncDirection === '2to1'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {admin2.username}의 권한을 {admin1.username}에 적용
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {onlyAdmin2.length}개의 추가 권한이 부여됩니다
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              )}
            </div>
            {syncDirection && (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleSync}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  동기화 실행
                </button>
                <button
                  type="button"
                  onClick={() => setSyncDirection(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

