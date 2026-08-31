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

  const selectedAdminList = useMemo(() => {
    return adminUsers.filter((admin) => selectedAdmins.has(admin.username))
  }, [adminUsers, selectedAdmins])

  if (!isOpen) return null

  const toggleSelectAll = () => {
    if (selectedAdmins.size === adminUsers.length) {
      setSelectedAdmins(new Set())
    } else {
      setSelectedAdmins(new Set(adminUsers.map(admin => admin.username)))
    }
  }

  const toggleSelectAdmin = (username: string) => {
    const newSelected = new Set(selectedAdmins)
    if (newSelected.has(username)) {
      newSelected.delete(username)
    } else {
      newSelected.add(username)
    }
    setSelectedAdmins(newSelected)
  }

  const handleApply = async () => {
    if (selectedAdmins.size === 0) {
      alert('Select at least one administrator.')
      return
    }

    if (bulkPermissions.length === 0 && operation !== 'remove') {
      alert('Select at least one permission to apply.')
      return
    }

    setIsLoading(true)
    try {
      const updates = selectedAdminList.map(admin => {
        let newPermissions: string[] = []

        if (operation === 'add') {
          newPermissions = [...new Set([...admin.permissions, ...bulkPermissions])]
        } else if (operation === 'remove') {
          newPermissions = admin.permissions.filter(p => !bulkPermissions.includes(p))
        } else {
          newPermissions = [...bulkPermissions]
        }

        return {
          username: admin.username,
          permissions: newPermissions
        }
      })

      await onApply(updates)
      alert(`Permissions applied to ${selectedAdmins.size} administrator(s).`)
      setSelectedAdmins(new Set())
      setBulkPermissions([])
      setOperation('add')
      onClose()
    } catch (error) {
      console.error('Bulk permission update failed:', error)
      alert('Failed to apply permissions.')
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
            Bulk permission management
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Select administrators ({selectedAdmins.size} selected)
            </label>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              {selectedAdmins.size === adminUsers.length ? 'Clear all' : 'Select all'}
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
                      Currently {admin.permissions.length} permission(s)
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {selectedAdmins.size > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Operation
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
                  <span className="text-sm font-medium text-gray-900">Add permissions</span>
                </div>
                <div className="text-xs text-gray-500">
                  Append selected permissions to existing ones
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
                  <span className="text-sm font-medium text-gray-900">Remove permissions</span>
                </div>
                <div className="text-xs text-gray-500">
                  Remove selected permissions from existing ones
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
                  <span className="text-sm font-medium text-gray-900">Replace permissions</span>
                </div>
                <div className="text-xs text-gray-500">
                  Replace all permissions with the selected set
                </div>
              </button>
            </div>
          </div>
        )}

        {selectedAdmins.size > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {operation === 'add' && 'Permissions to add'}
              {operation === 'remove' && 'Permissions to remove'}
              {operation === 'replace' && 'Permissions to set'}
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

        {selectedAdmins.size > 0 && bulkPermissions.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-900 mb-2">Preview</div>
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
                    {admin.permissions.length} → {previewPermissions.length} permission(s)
                  </div>
                )
              })}
              {selectedAdmins.size > 3 && (
                <div className="text-blue-600">
                  ... and {selectedAdmins.size - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isLoading || selectedAdmins.size === 0 || (bulkPermissions.length === 0 && operation !== 'remove')}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Applying...' : `Apply to ${selectedAdmins.size}`}
          </button>
        </div>
      </div>
    </div>
  )
}
