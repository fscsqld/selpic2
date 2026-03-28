'use client'

import { useState, useMemo } from 'react'
import { 
  Search, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  permissionPresets,
  permissionDescriptions,
  permissionCategories,
  getPermissionDescription,
  getPermissionCategory,
  validatePermissionDependencies,
  autoIncludeDependencies,
  PermissionPreset
} from '@/lib/permissionUtils'

interface PermissionManagerProps {
  selectedPermissions: string[]
  availablePermissions: string[]
  onPermissionsChange: (permissions: string[]) => void
  username?: string
}

export default function PermissionManager({
  selectedPermissions = [],
  availablePermissions = [],
  onPermissionsChange,
  username
}: PermissionManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [expandedPermissions, setExpandedPermissions] = useState<Set<string>>(new Set())
  const [showDependencyWarning, setShowDependencyWarning] = useState(false)

  // Filter permissions based on search and category
  const filteredPermissions = useMemo(() => {
    if (!availablePermissions || !Array.isArray(availablePermissions) || availablePermissions.length === 0) {
      return []
    }

    let filtered = [...availablePermissions]

    // Search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(permission => {
        if (!permission || typeof permission !== 'string') return false
        const desc = getPermissionDescription(permission)
        return (
          permission.toLowerCase().includes(query) ||
          (desc?.name && desc.name.toLowerCase().includes(query)) ||
          (desc?.description && desc.description.toLowerCase().includes(query))
        )
      })
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter(permission => {
        if (!permission || typeof permission !== 'string') return false
        return getPermissionCategory(permission) === selectedCategory
      })
    }

    return filtered
  }, [availablePermissions, searchQuery, selectedCategory])

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, string[]> = {}
    
    if (!filteredPermissions || !Array.isArray(filteredPermissions) || filteredPermissions.length === 0) {
      return groups
    }
    
    filteredPermissions.forEach(permission => {
      if (!permission || typeof permission !== 'string') return
      const category = getPermissionCategory(permission) || '기타'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(permission)
    })

    return groups
  }, [filteredPermissions])

  // Handle preset selection
  const handlePresetSelect = (presetId: string) => {
    if (!permissionPresets || !Array.isArray(permissionPresets)) return
    const preset = permissionPresets.find(p => p && p.id === presetId)
    if (preset && preset.permissions && Array.isArray(preset.permissions) && 
        availablePermissions && Array.isArray(availablePermissions) && availablePermissions.length > 0) {
      // Only include permissions that are available
      const presetPermissions = preset.permissions.filter(p => 
        p && typeof p === 'string' && availablePermissions.includes(p)
      )
      // Auto-include dependencies
      const permissionsWithDeps = autoIncludeDependencies(presetPermissions)
      setSelectedPreset(presetId)
      onPermissionsChange(permissionsWithDeps)
    }
  }

  // Handle permission toggle
  const handlePermissionToggle = (permission: string, checked: boolean) => {
    let newPermissions: string[] = Array.isArray(selectedPermissions) ? [...selectedPermissions] : []
    
    if (checked) {
      // Add permission and auto-include dependencies
      const withDeps = autoIncludeDependencies([...newPermissions, permission])
      newPermissions = withDeps
    } else {
      // Remove permission
      newPermissions = newPermissions.filter(p => p !== permission)
      
      // Check if any other permission requires this one
      if (newPermissions.length > 0) {
        const validation = validatePermissionDependencies(newPermissions)
        if (!validation.isValid) {
          setShowDependencyWarning(true)
          // Auto-remove permissions that depend on this one
          validation.missing.forEach(({ permission: perm }) => {
            newPermissions = newPermissions.filter(p => p !== perm)
          })
        }
      }
    }
    
    setSelectedPreset(null) // Clear preset selection when manually changing
    onPermissionsChange(newPermissions)
  }

  // Toggle permission expansion
  const toggleExpansion = (permission: string) => {
    const newExpanded = new Set(expandedPermissions)
    if (newExpanded.has(permission)) {
      newExpanded.delete(permission)
    } else {
      newExpanded.add(permission)
    }
    setExpandedPermissions(newExpanded)
  }

  // Validate current permissions
  const validation = useMemo(() => {
    if (!selectedPermissions || !Array.isArray(selectedPermissions) || selectedPermissions.length === 0) {
      return { isValid: true, missing: [] }
    }
    return validatePermissionDependencies(selectedPermissions)
  }, [selectedPermissions])

  // Get accessible pages preview
  const accessiblePages = useMemo(() => {
    const pages = new Set<string>()
    if (!selectedPermissions || !Array.isArray(selectedPermissions) || selectedPermissions.length === 0) {
      return []
    }
    selectedPermissions.forEach(permission => {
      if (!permission || typeof permission !== 'string') return
      const desc = getPermissionDescription(permission)
      if (desc?.accessiblePages && Array.isArray(desc.accessiblePages)) {
        desc.accessiblePages.forEach(page => pages.add(page))
      }
    })
    return Array.from(pages)
  }, [selectedPermissions])

  // Get accessible features preview
  const accessibleFeatures = useMemo(() => {
    const features: Array<{ permission: string; feature: string }> = []
    if (!selectedPermissions || !Array.isArray(selectedPermissions) || selectedPermissions.length === 0) {
      return []
    }
    selectedPermissions.forEach(permission => {
      if (!permission || typeof permission !== 'string') return
      const desc = getPermissionDescription(permission)
      if (desc) {
        if (permission.includes(':write')) {
          features.push({ permission, feature: `${desc.name} (Editable)` })
        } else if (permission.includes(':moderate')) {
          features.push({ permission, feature: `${desc.name} (Manageable)` })
        } else {
          features.push({ permission, feature: `${desc.name} (Read Only)` })
        }
      }
    })
    return features
  }, [selectedPermissions])

  return (
    <div className="space-y-4">
      {/* Preset Selection */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Permission Preset Selection
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {permissionPresets && Array.isArray(permissionPresets) && permissionPresets.length > 0 ? (
            permissionPresets.map(preset => {
              if (!preset || !preset.id) return null
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`text-left p-3 rounded-md border transition-colors ${
                    selectedPreset === preset.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{preset.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500 mt-1">{preset.description || ''}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {preset.permissions && Array.isArray(preset.permissions) && availablePermissions && Array.isArray(availablePermissions)
                      ? preset.permissions.filter(p => availablePermissions.includes(p)).length
                      : 0} permissions
                  </div>
                </button>
              )
            })
          ) : (
            <div className="text-sm text-gray-500 col-span-2">No presets available.</div>
          )}
        </div>
        {selectedPreset && (
          <button
            type="button"
            onClick={() => {
              setSelectedPreset(null)
              onPermissionsChange([])
            }}
            className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
          >
            Clear Preset Selection
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {permissionCategories && Array.isArray(permissionCategories) && permissionCategories.length > 0 ? (
            permissionCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))
          ) : (
            <option value="All">All</option>
          )}
        </select>
      </div>

      {/* Dependency Warning */}
      {!validation.isValid && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-800">Permission Dependency Warning</div>
              <div className="text-xs text-yellow-700 mt-1">
                The following permissions are selected without required permissions:
                <ul className="list-disc list-inside mt-1">
                  {validation.missing && Array.isArray(validation.missing) && validation.missing.map(({ permission, requires }, idx) => (
                    <li key={idx}>
                      <code className="bg-yellow-100 px-1 rounded">{permission}</code> requires{' '}
                      {requires && Array.isArray(requires) && requires.map((r, i) => (
                        <span key={r}>
                          <code className="bg-yellow-100 px-1 rounded">{r}</code>
                          {i < requires.length - 1 && ', '}
                        </span>
                      ))}
                      .
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  const fixed = autoIncludeDependencies(Array.isArray(selectedPermissions) ? selectedPermissions : [])
                  onPermissionsChange(fixed)
                }}
                className="mt-2 text-xs text-yellow-800 underline hover:text-yellow-900"
              >
                Auto-include Required Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions List */}
      <div className="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
        {Object.keys(groupedPermissions).length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No search results.
          </div>
        ) : (
          Object.entries(groupedPermissions).map(([category, permissions]) => (
            <div key={category} className="border-b border-gray-100 last:border-b-0">
              <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-700 sticky top-0">
                {category}
              </div>
              <div className="p-2">
                {permissions && Array.isArray(permissions) && permissions.map(permission => {
                  if (!permission || typeof permission !== 'string') return null
                  const desc = getPermissionDescription(permission)
                  const isSelected = Array.isArray(selectedPermissions) && selectedPermissions.includes(permission)
                  const isExpanded = expandedPermissions.has(permission)
                  const required = (desc?.requires || [])
                  const hasRequired = required.length === 0 || (Array.isArray(selectedPermissions) && required.every(r => selectedPermissions.includes(r)))

                  return (
                    <div
                      key={permission}
                      className={`mb-1 rounded-md border ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <label className="flex items-start p-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handlePermissionToggle(permission, e.target.checked)}
                          className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono text-gray-900">{permission}</code>
                              {!hasRequired && isSelected && required.length > 0 && (
                                <span className="text-xs text-yellow-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Missing Required
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                toggleExpansion(permission)
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {desc && (
                            <div className="text-xs text-gray-600 mt-1">{desc.name}</div>
                          )}
                        </div>
                      </label>
                      
                      {isExpanded && desc && (
                        <div className="px-2 pb-2 ml-7 border-t border-gray-200 mt-2 pt-2">
                          <div className="text-xs text-gray-600 mb-2">{desc.description}</div>
                          {desc.accessiblePages && Array.isArray(desc.accessiblePages) && desc.accessiblePages.length > 0 && (
                            <div className="mb-2">
                              <div className="text-xs font-medium text-gray-700 mb-1">Accessible Pages:</div>
                              <ul className="text-xs text-gray-600 space-y-0.5">
                                {desc.accessiblePages.map((page, idx) => (
                                  <li key={idx} className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <code className="bg-gray-100 px-1 rounded">{page}</code>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {required.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">Required Permissions:</div>
                              <div className="flex flex-wrap gap-1">
                                {required.map(req => (
                                  <span
                                    key={req}
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      (Array.isArray(selectedPermissions) && selectedPermissions.includes(req))
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {req}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-700">
            Selected Permissions: {(Array.isArray(selectedPermissions) && selectedPermissions.length) || 0}
          </div>
          {validation.isValid && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-4 w-4" />
              All Dependencies Satisfied
            </div>
          )}
        </div>
        {accessiblePages && accessiblePages.length > 0 && (
          <div className="text-xs text-gray-600">
            Accessible Pages: {accessiblePages.length}
          </div>
        )}
      </div>

      {/* 권한 미리보기 섹션 */}
      {Array.isArray(selectedPermissions) && selectedPermissions.length > 0 && (
        <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Permission Preview
            </h4>
            <button
              type="button"
              onClick={() => {
                const preview = document.getElementById('permission-preview')
                if (preview) {
                  preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              View Details
            </button>
          </div>
          
          <div id="permission-preview" className="space-y-3">
            {/* 접근 가능한 페이지 */}
            {accessiblePages && accessiblePages.length > 0 && (
              <div>
                <div className="text-xs font-medium text-indigo-800 mb-2">✓ Accessible Pages ({accessiblePages.length})</div>
                <div className="flex flex-wrap gap-1">
                  {accessiblePages.slice(0, 8).map((page, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-white border border-indigo-200 rounded text-indigo-700">
                      {page}
                    </span>
                  ))}
                  {accessiblePages.length > 8 && (
                    <span className="text-xs px-2 py-1 bg-white border border-indigo-200 rounded text-indigo-500">
                      +{accessiblePages.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 권한 부족 경고 */}
            {!validation.isValid && validation.missing && validation.missing.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <div className="text-xs font-medium text-yellow-800 mb-1">⚠️ Permission Warning</div>
                <div className="text-xs text-yellow-700">
                  {validation.missing.length} permission(s) are selected without required permissions.
                </div>
              </div>
            )}

            {/* 권한 카테고리별 요약 */}
            {(() => {
              const categoryCounts: Record<string, number> = {}
              selectedPermissions.forEach(permission => {
                const category = getPermissionCategory(permission) || '기타'
                categoryCounts[category] = (categoryCounts[category] || 0) + 1
              })
              return Object.keys(categoryCounts).length > 0 ? (
                <div>
                  <div className="text-xs font-medium text-indigo-800 mb-2">Permission Categories</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(categoryCounts).map(([category, count]) => (
                      <span key={category} className="text-xs px-2 py-1 bg-white border border-indigo-200 rounded text-indigo-700">
                        {category}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
