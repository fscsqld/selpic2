'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import AdminRoute from '@/components/AdminRoute'
import PermissionManager from '@/components/PermissionManager'
import { useAdminAuth } from '@/lib/adminAuth'
import { hasPublicSupabaseEnv, useAdminEmailRegistry } from '@/lib/useAdminEmailRegistry'

const AVAILABLE_PERMISSIONS = [
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
  'admin:manage',
]

export default function AdministratorSettingsPage() {
  const router = useRouter()
  const { adminUser } = useAdminAuth()
  const isSuperAdmin = adminUser?.role === 'super_admin'
  const registry = useAdminEmailRegistry(isSuperAdmin)
  const useSupabaseRegistry = hasPublicSupabaseEnv()

  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPermOpen, setIsPermOpen] = useState(false)
  const [permEmail, setPermEmail] = useState('')
  const [permList, setPermList] = useState<string[]>([])
  const [deleteEmail, setDeleteEmail] = useState<string | null>(null)
  const [newRow, setNewRow] = useState({
    email: '',
    role: 'admin' as 'admin' | 'super_admin',
    permissions: [] as string[],
  })

  const selfEmail = (adminUser?.email ?? '').trim().toLowerCase()

  useEffect(() => {
    if (!isSuperAdmin) {
      setMessage('Only a super administrator can manage the email registry.')
      const t = setTimeout(() => router.replace('/admin/dashboard'), 2000)
      return () => clearTimeout(t)
    }
  }, [isSuperAdmin, router])

  const showMsg = useCallback((text: string, ok: boolean) => {
    setMessage(text)
    setTimeout(() => setMessage(''), ok ? 5000 : 8000)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = newRow.email.trim()
    if (!email.includes('@')) {
      showMsg('Enter a valid email address.', false)
      return
    }
    setIsLoading(true)
    const result = await registry.createEntry({
      email,
      role: newRow.role,
      permissions: newRow.permissions,
    })
    setIsLoading(false)
    if (result.ok) {
      showMsg('Administrator saved. They receive these permissions on next sign-in (JWT sync).', true)
      setIsCreateOpen(false)
      setNewRow({ email: '', role: 'admin', permissions: [] })
    } else {
      showMsg(result.error || 'Could not create entry.', false)
    }
  }

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!permEmail) return
    setIsLoading(true)
    const result = await registry.patchEntry(permEmail, { permissions: permList })
    setIsLoading(false)
    if (result.ok) {
      showMsg('Permissions updated.', true)
      setIsPermOpen(false)
      setPermEmail('')
    } else {
      showMsg(result.error || 'Update failed.', false)
    }
  }

  const handleDelete = async () => {
    if (!deleteEmail) return
    setIsLoading(true)
    const result = await registry.deleteEntry(deleteEmail)
    setIsLoading(false)
    if (result.ok) {
      showMsg('Removed from registry.', true)
      setDeleteEmail(null)
    } else {
      showMsg(result.error || 'Delete failed.', false)
    }
  }

  const handleToggle = async (email: string, isActive: boolean) => {
    if (email === selfEmail) {
      showMsg('You cannot deactivate your own registry row here.', false)
      return
    }
    setIsLoading(true)
    const result = await registry.patchEntry(email, { is_active: !isActive })
    setIsLoading(false)
    if (result.ok) showMsg('Status updated.', true)
    else showMsg(result.error || 'Update failed.', false)
  }

  const handleRoleChange = async (email: string, next: 'admin' | 'super_admin') => {
    if (email === selfEmail && next === 'admin') {
      showMsg('You cannot remove your own super_admin role from this screen.', false)
      return
    }
    setIsLoading(true)
    const result = await registry.patchEntry(email, { role: next })
    setIsLoading(false)
    if (result.ok) showMsg('Role updated.', true)
    else showMsg(result.error || 'Update failed.', false)
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">Access denied</h1>
          <p className="text-gray-600 mt-2">Redirecting to the dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <AdminRoute requiredPermissions={['admin:manage']}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Administrator settings</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage who can access the admin app via <code className="text-xs">admin_email_registry</code> (active{' '}
                <code className="text-xs">admin</code> or <code className="text-xs">super_admin</code> rows).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              disabled={!useSupabaseRegistry}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add administrator
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <div
              className={`mb-6 p-4 rounded-md text-sm ${
                message.toLowerCase().includes('fail') ||
                message.toLowerCase().includes('cannot') ||
                message.toLowerCase().includes('denied')
                  ? 'bg-red-50 text-red-800'
                  : 'bg-green-50 text-green-800'
              }`}
            >
              {message}
            </div>
          )}

          {!useSupabaseRegistry && (
            <div className="mb-6 p-4 rounded-md bg-amber-50 text-amber-900 text-sm">
              Supabase browser environment is not configured. Add{' '}
              <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to use the registry UI.
            </div>
          )}

          {useSupabaseRegistry && registry.error && (
            <div className="mb-6 p-4 rounded-md bg-amber-50 text-amber-900 text-sm">
              {registry.error} If the table is missing, run{' '}
              <code className="text-xs">supabase/migrations/002_admin_email_registry.sql</code> in the Supabase SQL
              editor.
            </div>
          )}

          {useSupabaseRegistry && (
            <div className="bg-white shadow border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Email registry</h2>
                {registry.loading && <span className="text-sm text-gray-400">Loading…</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permissions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registry.entries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                          No rows yet. Add at least one active super administrator to enforce roster-based access.
                        </td>
                      </tr>
                    ) : (
                      registry.entries.map((row) => (
                        <tr key={row.email}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{row.email}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={row.role}
                              disabled={isLoading}
                              onChange={(e) =>
                                void handleRoleChange(row.email, e.target.value as 'admin' | 'super_admin')
                              }
                              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                              <option value="admin">admin</option>
                              <option value="super_admin">super_admin</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                row.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {row.is_active ? 'active' : 'inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {row.permissions.length} granted
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                title="Edit permissions"
                                className="p-1 text-indigo-600 hover:text-indigo-900"
                                onClick={() => {
                                  setPermEmail(row.email)
                                  setPermList([...row.permissions])
                                  setIsPermOpen(true)
                                }}
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title={row.is_active ? 'Deactivate' : 'Activate'}
                                className="p-1 text-gray-600 hover:text-gray-900"
                                onClick={() => void handleToggle(row.email, row.is_active)}
                              >
                                {row.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              {row.email !== selfEmail && (
                                <button
                                  type="button"
                                  title="Remove"
                                  className="p-1 text-red-600 hover:text-red-900"
                                  onClick={() => setDeleteEmail(row.email)}
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
        </main>

        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add administrator</h3>
                <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setIsCreateOpen(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Supabase Auth)</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={newRow.email}
                    onChange={(e) => setNewRow({ ...newRow, email: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newRow.role}
                    onChange={(e) => setNewRow({ ...newRow, role: e.target.value as 'admin' | 'super_admin' })}
                    className="w-full rounded-md border-gray-300 shadow-sm text-sm"
                  >
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <PermissionManager
                    selectedPermissions={newRow.permissions}
                    availablePermissions={AVAILABLE_PERMISSIONS}
                    onPermissionsChange={(permissions) => setNewRow({ ...newRow, permissions })}
                    username={newRow.email || 'new'}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isPermOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Permissions — {permEmail}</h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setIsPermOpen(false)
                    setPermEmail('')
                  }}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSavePermissions} className="space-y-4">
                <PermissionManager
                  selectedPermissions={permList}
                  availablePermissions={AVAILABLE_PERMISSIONS}
                  onPermissionsChange={setPermList}
                  username={permEmail}
                />
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                    onClick={() => {
                      setIsPermOpen(false)
                      setPermEmail('')
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving…' : 'Save permissions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove administrator</h3>
              <p className="text-sm text-gray-600 mb-6">
                Remove <strong>{deleteEmail}</strong> from the registry? Their admin JWT will be cleared on next sync.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 px-3 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setDeleteEmail(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 px-3 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                  onClick={() => void handleDelete()}
                >
                  {isLoading ? '…' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  )
}
