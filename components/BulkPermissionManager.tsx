'use client'

import { useState, useMemo } from 'react'
import { Users, CheckCircle, X, Plus, Minus } from 'lucide-react'
import PermissionManager from './PermissionManager'

interface AdminUser {
  username: string
  permissions: string[]
}

interface BulkPermissionManagerProps {
  isOpen: boolean
  onClose: () => void
  adminUsers: AdminUser[]
  availablePermissions: string[]
  onApply: (updates: Array<{ username: string; permissions: string[] }>) => Promise<void>
}

export default function BulkPermissionManager({
  isOpen,
  onClose,
  adminUsers,
  availablePermissions,
  onApply
}: BulkPermissionManagerProps) {
  const [selectedAdmins, setSelectedAdmins] = useState<Set<string>>(new Set())
  const [bulkPermissions, setBulkPermissions] = useState<string[]>([])
  const [operation, setOperation] = useState<'add' | 'remove' | 'replace'>('add')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  // 선택된 관리자 목록
  const selectedAdminList = useMemo(() => {
    return adminUsers.filter(admin => selectedAdmins.has(admin.username))
  }, [adminUsers, selectedAdmins])

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedAdmins.size === adminUsers.length) {
      setSelectedAdmins(new Set())
    } else {
      setSelectedAdmins(new Set(adminUsers.map(admin => admin.username)))
    }
  }

  // 개별 선택/해제
  const toggleSelectAdmin = (username: string) => {
    const newSelected = new Set(selectedAdmins)
    if (newSelected.has(username)) {
      newSelected.delete(username)
    } else {
      newSelected.add(username)
    }
    setSelectedAdmins(newSelected)
  }

  // 일괄 적용
  const handleApply = async () => {
    if (selectedAdmins.size === 0) {
      alert('최소 1명의 관리자를 선택해주세요.')
      return
    }

    if (bulkPermissions.length === 0 && operation !== 'remove') {
      alert('적용할 권한을 선택해주세요.')
      return
    }

    setIsLoading(true)
    try {
      const updates = selectedAdminList.map(admin => {
        let newPermissions: string[] = []
        
        if (operation === 'add') {
          // 권한 추가
          newPermissions = [...new Set([...admin.permissions, ...bulkPermissions])]
        } else if (operation === 'remove') {
          // 권한 제거
          newPermissions = admin.permissions.filter(p => !bulkPermissions.includes(p))
        } else {
          // 권한 교체
          newPermissions = [...bulkPermissions]
        }

        return {
          username: admin.username,
          permissions: newPermissions
        }
      })

      await onApply(updates)
      alert(`${selectedAdmins.size}명의 관리자에게 권한이 적용되었습니다.`)
      setSelectedAdmins(new Set())
      setBulkPermissions([])
      setOperation('add')
      onClose()
    } catch (error) {
      console.error('Bulk permission update failed:', error)
      alert('권한 적용 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-5xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            권한 일괄 관리
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 단계 1: 관리자 선택 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              관리자 선택 ({selectedAdmins.size}명 선택됨)
            </label>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              {selectedAdmins.size === adminUsers.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50 max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {adminUsers.map(admin => (
                <label
                  key={admin.username}
                  className="flex items-center p-2 rounded-md hover:bg-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAdmins.has(admin.username)}
                    onChange={() => toggleSelectAdmin(admin.username)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">{admin.username}</div>
                    <div className="text-xs text-gray-500">
                      현재 {admin.permissions.length}개 권한
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 단계 2: 작업 선택 */}
        {selectedAdmins.size > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              작업 선택
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOperation('add')}
                className={`p-3 rounded-md border transition-colors text-left ${
                  operation === 'add'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium text-gray-900">권한 추가</span>
                </div>
                <div className="text-xs text-gray-500">
                  선택한 권한을 기존 권한에 추가
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOperation('remove')}
                className={`p-3 rounded-md border transition-colors text-left ${
                  operation === 'remove'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Minus className="h-4 w-4" />
                  <span className="text-sm font-medium text-gray-900">권한 제거</span>
                </div>
                <div className="text-xs text-gray-500">
                  선택한 권한을 기존 권한에서 제거
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOperation('replace')}
                className={`p-3 rounded-md border transition-colors text-left ${
                  operation === 'replace'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium text-gray-900">권한 교체</span>
                </div>
                <div className="text-xs text-gray-500">
                  기존 권한을 선택한 권한으로 교체
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 단계 3: 권한 선택 */}
        {selectedAdmins.size > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {operation === 'add' && '추가할 권한 선택'}
              {operation === 'remove' && '제거할 권한 선택'}
              {operation === 'replace' && '교체할 권한 선택'}
            </label>
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <PermissionManager
                selectedPermissions={bulkPermissions}
                availablePermissions={availablePermissions}
                onPermissionsChange={setBulkPermissions}
              />
            </div>
          </div>
        )}

        {/* 미리보기 */}
        {selectedAdmins.size > 0 && bulkPermissions.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-900 mb-2">적용 미리보기</div>
            <div className="text-xs text-blue-700 space-y-1">
              {selectedAdminList.slice(0, 3).map(admin => {
                let previewPermissions: string[] = []
                if (operation === 'add') {
                  previewPermissions = [...new Set([...admin.permissions, ...bulkPermissions])]
                } else if (operation === 'remove') {
                  previewPermissions = admin.permissions.filter(p => !bulkPermissions.includes(p))
                } else {
                  previewPermissions = [...bulkPermissions]
                }
                return (
                  <div key={admin.username}>
                    <span className="font-medium">{admin.username}:</span>{' '}
                    {admin.permissions.length}개 → {previewPermissions.length}개 권한
                  </div>
                )
              })}
              {selectedAdmins.size > 3 && (
                <div className="text-blue-600">
                  ... 외 {selectedAdmins.size - 3}명
                </div>
              )}
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isLoading || selectedAdmins.size === 0 || (bulkPermissions.length === 0 && operation !== 'remove')}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '적용 중...' : `${selectedAdmins.size}명에게 적용`}
          </button>
        </div>
      </div>
    </div>
  )
}

