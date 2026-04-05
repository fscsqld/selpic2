'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Lock, 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff,
  Check,
  X,
  AlertCircle,
  UserPlus,
  Settings
} from 'lucide-react'
import { useAdminAuth } from '@/lib/adminAuth'
import AdminRoute from '@/components/AdminRoute'
import PermissionManager from '@/components/PermissionManager'
import { useTranslation } from '@/lib/useTranslation'
import { hasPublicSupabaseEnv, useAdminEmailRegistry } from '@/lib/useAdminEmailRegistry'

export default function AdminManagementPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { 
    adminUser, 
    adminUsers, 
    changeAdminPassword, 
    updateAdminPermissions, 
    toggleAdminStatus, 
    createAdmin, 
    deleteAdmin 
  } = useAdminAuth()

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Form states
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'admin' as 'admin' | 'super_admin',
    permissions: [] as string[]
  })
  const [passwordChangeData, setPasswordChangeData] = useState({
    username: '',
    newPassword: ''
  })
  const [permissionsModal, setPermissionsModal] = useState<{
    kind: 'registry' | 'legacy'
    key: string
    label: string
    permissions: string[]
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'registry' | 'legacy'; key: string; label: string } | null>(
    null
  )

  // UI states
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Available permissions
  const availablePermissions = [
    'dashboard:read',
    'products:read',
    'products:write',
    'content:read',
    'content:write',
    'users:read',
    'users:write',
    'analytics:read',
    'orders:read',
    'orders:write',
    'messages:read',
    'messages:write',
    'community:read',
    'community:write',
    'community:moderate',
    'images:read',
    'images:write',
    'invoices:read',
    'invoices:write',
    'system:admin',
    'admin:manage'
  ]

  // Check if current user is super admin
  const isSuperAdmin = adminUser?.role === 'super_admin'
  const registry = useAdminEmailRegistry(isSuperAdmin)
  const useSupabaseRegistry = hasPublicSupabaseEnv()

  useEffect(() => {
    if (!isSuperAdmin) {
      setMessage(t('admin.common.onlySuperAdmin'))
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 2000)
    }
  }, [isSuperAdmin, router, t])

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      if (useSupabaseRegistry) {
        const email = newAdminData.email.trim()
        if (!email.includes('@')) {
          setMessage('Enter a valid admin email (Supabase sign-in).')
          setIsLoading(false)
          return
        }
        const result = await registry.createEntry({
          email,
          role: newAdminData.role,
          permissions: newAdminData.permissions,
        })
        if (result.ok) {
          setMessage(
            'Admin saved by email. When they sign in with Supabase, these permissions apply automatically.'
          )
          setIsCreateModalOpen(false)
          setNewAdminData({ email: '', username: '', password: '', role: 'admin', permissions: [] })
          setTimeout(() => setMessage(''), 5000)
        } else {
          setMessage(result.error || t('admin.common.accessDenied'))
        }
        setIsLoading(false)
        return
      }

      const success = await createAdmin(
        newAdminData.username,
        newAdminData.password,
        newAdminData.role,
        newAdminData.permissions
      )

      if (success) {
        setMessage(t('admin.common.adminCreated'))
        setIsCreateModalOpen(false)
        setNewAdminData({ email: '', username: '', password: '', role: 'admin', permissions: [] })
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(t('admin.common.accessDenied'))
      }
    } catch (error) {
      setMessage(t('admin.common.adminCreated'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const success = await changeAdminPassword(
        passwordChangeData.username,
        passwordChangeData.newPassword
      )

      if (success) {
        setMessage(t('admin.common.adminUpdated'))
        setIsPasswordModalOpen(false)
        setPasswordChangeData({ username: '', newPassword: '' })
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(t('admin.common.accessDenied'))
      }
    } catch (error) {
      setMessage(t('admin.common.adminUpdated'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!permissionsModal) return
    setIsLoading(true)
    setMessage('')

    try {
      if (permissionsModal.kind === 'registry') {
        const result = await registry.patchEntry(permissionsModal.key, {
          permissions: permissionsModal.permissions,
        })
        if (result.ok) {
          setMessage(t('admin.common.adminUpdated'))
          setIsPermissionsModalOpen(false)
          setPermissionsModal(null)
          setTimeout(() => setMessage(''), 3000)
        } else {
          setMessage(result.error || t('admin.common.accessDenied'))
        }
      } else {
        const success = await updateAdminPermissions(
          permissionsModal.key,
          permissionsModal.permissions
        )

        if (success) {
          setMessage(t('admin.common.adminUpdated'))
          setIsPermissionsModalOpen(false)
          setPermissionsModal(null)
          setTimeout(() => setMessage(''), 3000)
        } else {
          setMessage(t('admin.common.accessDenied'))
        }
      }
    } catch (error) {
      setMessage(t('admin.common.adminUpdated'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleRegistryStatus = async (email: string, isActive: boolean) => {
    if (email === adminUser?.email?.trim().toLowerCase()) {
      setMessage(t('admin.common.cannotModifySelf'))
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsLoading(true)
    setMessage('')
    try {
      const result = await registry.patchEntry(email, { is_active: !isActive })
      if (result.ok) {
        setMessage(t('admin.common.adminUpdated'))
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(result.error || t('admin.common.accessDenied'))
      }
    } catch {
      setMessage(t('admin.common.adminUpdated'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (username: string) => {
    if (username === adminUser?.username) {
      setMessage(t('admin.common.cannotModifySelf'))
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const success = await toggleAdminStatus(username)
      if (success) {
        setMessage(t('admin.common.adminUpdated'))
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(t('admin.common.accessDenied'))
      }
    } catch (error) {
      setMessage(t('admin.common.adminUpdated'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return

    if (deleteTarget.kind === 'legacy' && deleteTarget.key === adminUser?.username) {
      setMessage(t('admin.common.cannotModifySelf'))
      setTimeout(() => setMessage(''), 3000)
      return
    }
    if (deleteTarget.kind === 'registry' && deleteTarget.key === adminUser?.email?.trim().toLowerCase()) {
      setMessage(t('admin.common.cannotModifySelf'))
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      if (deleteTarget.kind === 'registry') {
        const result = await registry.deleteEntry(deleteTarget.key)
        if (result.ok) {
          setMessage(t('admin.common.adminDeleted'))
          setIsDeleteModalOpen(false)
          setDeleteTarget(null)
          setTimeout(() => setMessage(''), 3000)
        } else {
          setMessage(result.error || t('admin.common.accessDenied'))
        }
      } else {
        const success = await deleteAdmin(deleteTarget.key)
        if (success) {
          setMessage(t('admin.common.adminDeleted'))
          setIsDeleteModalOpen(false)
          setDeleteTarget(null)
          setTimeout(() => setMessage(''), 3000)
        } else {
          setMessage(t('admin.common.accessDenied'))
        }
      }
    } catch (error) {
      setMessage(t('admin.common.adminDeleted'))
    } finally {
      setIsLoading(false)
    }
  }

  const openPasswordModal = (username: string) => {
    setPasswordChangeData({ username, newPassword: '' })
    setIsPasswordModalOpen(true)
  }

  const openPermissionsModal = (username: string) => {
    const admin = adminUsers.find(u => u.username === username)
    if (admin) {
      setPermissionsModal({
        kind: 'legacy',
        key: username,
        label: username,
        permissions: [...admin.permissions],
      })
      setIsPermissionsModalOpen(true)
    }
  }

  const openRegistryPermissionsModal = (email: string, permissions: string[]) => {
    setPermissionsModal({
      kind: 'registry',
      key: email,
      label: email,
      permissions: [...permissions],
    })
    setIsPermissionsModalOpen(true)
  }

  const openDeleteModal = (username: string) => {
    setDeleteTarget({ kind: 'legacy', key: username, label: username })
    setIsDeleteModalOpen(true)
  }

  const openRegistryDeleteModal = (email: string) => {
    setDeleteTarget({ kind: 'registry', key: email, label: email })
    setIsDeleteModalOpen(true)
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('admin.common.accessDenied')}
          </h1>
          <p className="text-gray-600">
            {t('admin.common.onlySuperAdmin')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('admin.common.adminManagement')}
                </h1>
                <p className="text-sm text-gray-500">
                  Manage admin accounts, permissions, and access control
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('admin.common.createAdmin')}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.includes('성공') || message.includes('successfully') || message.includes('updated') || message.includes('created') || message.includes('deleted')
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {useSupabaseRegistry && registry.error && (
            <div className="mb-6 p-4 rounded-md bg-amber-50 text-amber-900 text-sm">
              {registry.error} Apply <code className="text-xs">supabase/migrations/002_admin_email_registry.sql</code> in
              the Supabase SQL editor if the table is missing.
            </div>
          )}

          {/* Supabase admins (email registry — synced to JWT on sign-in) */}
          {useSupabaseRegistry && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Supabase admins (by email)
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Permissions are stored in the database and written to each user&apos;s JWT when they sign in.
                  </p>
                </div>
                {registry.loading && (
                  <span className="text-sm text-gray-400">Loading…</span>
                )}
              </div>
              <div className="border-t border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.common.role')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.common.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.common.permissions')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registry.entries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                          No email-based admins yet. Create one to assign permissions before the user signs in with
                          Supabase.
                        </td>
                      </tr>
                    ) : (
                      registry.entries.map((row) => (
                        <tr key={row.email}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                row.role === 'super_admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {row.role === 'super_admin'
                                ? t('admin.common.superAdminRole')
                                : t('admin.common.adminRole')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                row.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {row.is_active ? t('admin.common.active') : t('admin.common.inactive')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{row.permissions.length} permissions</div>
                            <div className="text-xs text-gray-500">
                              {row.permissions.slice(0, 3).join(', ')}
                              {row.permissions.length > 3 && '...'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(row.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => openRegistryPermissionsModal(row.email, row.permissions)}
                                className="text-blue-600 hover:text-blue-900"
                                title={t('admin.common.updatePermissions')}
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleRegistryStatus(row.email, row.is_active)}
                                className={
                                  row.is_active
                                    ? 'text-yellow-600 hover:text-yellow-900'
                                    : 'text-green-600 hover:text-green-900'
                                }
                                title={t('admin.common.toggleStatus')}
                              >
                                {row.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              {row.email !== adminUser?.email?.trim().toLowerCase() && (
                                <button
                                  type="button"
                                  onClick={() => openRegistryDeleteModal(row.email)}
                                  className="text-red-600 hover:text-red-900"
                                  title={t('admin.common.deleteAdmin')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Legacy local admin users (username + password in browser) */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {useSupabaseRegistry ? 'Legacy local admins' : 'Admin users'} ({adminUsers.length})
              </h3>
              {useSupabaseRegistry && (
                <p className="text-sm text-gray-500 mt-1">
                  Demo accounts stored in this browser only. Prefer Supabase admins above for production.
                </p>
              )}
            </div>
            <div className="border-t border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.common.role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.common.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.common.permissions')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminUsers.map((admin) => (
                    <tr key={admin.username}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <Users className="h-6 w-6 text-indigo-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {admin.username}
                            </div>
                            {admin.lastModified && (
                              <div className="text-sm text-gray-500">
                                Modified: {new Date(admin.lastModified).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.role === 'super_admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {admin.role === 'super_admin' ? t('admin.common.superAdminRole') : t('admin.common.adminRole')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.isActive ? t('admin.common.active') : t('admin.common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {admin.permissions.length} permissions
                        </div>
                        <div className="text-xs text-gray-500">
                          {admin.permissions.slice(0, 3).join(', ')}
                          {admin.permissions.length > 3 && '...'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openPasswordModal(admin.username)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title={t('admin.common.changeAdminPassword')}
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openPermissionsModal(admin.username)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('admin.common.updatePermissions')}
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(admin.username)}
                            className={`${
                              admin.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                            }`}
                            title={t('admin.common.toggleStatus')}
                          >
                            {admin.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          {admin.username !== adminUser?.username && (
                            <button
                              onClick={() => openDeleteModal(admin.username)}
                              className="text-red-600 hover:text-red-900"
                              title={t('admin.common.deleteAdmin')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Create Admin Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('admin.common.createAdmin')}
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                {useSupabaseRegistry ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin email (Supabase)</label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={newAdminData.email}
                      onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="name@company.com"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Same email they use for Supabase Auth. Password is not set here; they use normal sign-up / forgot
                      password.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.common.adminUsername')}
                      </label>
                      <input
                        type="text"
                        value={newAdminData.username}
                        onChange={(e) => setNewAdminData({ ...newAdminData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.common.adminNewPassword')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newAdminData.password}
                          onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.common.role')}
                  </label>
                  <select
                    value={newAdminData.role}
                    onChange={(e) => setNewAdminData({ ...newAdminData, role: e.target.value as 'admin' | 'super_admin' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">{t('admin.common.adminRole')}</option>
                    <option value="super_admin">{t('admin.common.superAdminRole')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.common.permissions')}
                  </label>
                  <PermissionManager
                    selectedPermissions={newAdminData.permissions}
                    availablePermissions={availablePermissions}
                    onPermissionsChange={(permissions) => {
                      setNewAdminData({
                        ...newAdminData,
                        permissions,
                      })
                    }}
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    {t('admin.common.close')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </div>
                    ) : (
                      'Create Admin'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('admin.common.changeAdminPassword')}
                </h3>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin: {passwordChangeData.username}
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.common.adminNewPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordChangeData.newPassword}
                      onChange={(e) => setPasswordChangeData({ ...passwordChangeData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    {t('admin.common.close')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Permissions Modal */}
        {isPermissionsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  {t('admin.common.updatePermissions')}
                </h3>
                <button
                  onClick={() => {
                    setIsPermissionsModalOpen(false)
                    setPermissionsModal(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdatePermissions} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin: <span className="font-semibold text-indigo-600">{permissionsModal?.label}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.common.permissions')}
                  </label>
                  <PermissionManager
                    selectedPermissions={permissionsModal?.permissions ?? []}
                    availablePermissions={availablePermissions}
                    onPermissionsChange={(permissions) => {
                      setPermissionsModal((prev) =>
                        prev ? { ...prev, permissions } : prev
                      )
                    }}
                    username={permissionsModal?.label ?? ''}
                  />
                </div>

                <div className="flex space-x-3 pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPermissionsModalOpen(false)
                      setPermissionsModal(null)
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    {t('admin.common.close')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Permissions'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Admin Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('admin.common.deleteAdmin')}
                </h3>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteTarget(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Are you sure you want to remove admin <strong>{deleteTarget?.label}</strong>? This action cannot be
                  undone.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteTarget(null)
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAdmin}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete Admin'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  )
}
