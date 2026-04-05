'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Shield, ShieldOff, Mail, Ban, Unlock, Loader2, KeyRound, Trash2, X } from 'lucide-react'

type Row = {
  id: string
  email?: string
  created_at?: string
  last_sign_in_at?: string
  banned_until?: string
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
}

function isAdminMeta(row: Row): boolean {
  const m = row.app_metadata || {}
  const u = row.user_metadata || {}
  return (
    m.admin === true ||
    m.role === 'admin' ||
    m.role === 'super_admin' ||
    u.admin === true ||
    u.role === 'admin'
  )
}

export default function SupabaseAuthUsersPanel({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; email: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/supabase-users', { credentials: 'include' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Failed to load')
        setRows([])
        return
      }
      setRows(Array.isArray(j.users) ? j.users : [])
    } catch {
      setError('Network error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function closePasswordModal() {
    setPasswordTarget(null)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordSaving(false)
  }

  async function submitPasswordChange() {
    if (!passwordTarget || !canWrite) return
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.')
      return
    }
    setPasswordSaving(true)
    try {
      const res = await fetch('/api/admin/supabase-users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: passwordTarget.id,
          action: 'setPassword',
          newPassword,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(typeof j.error === 'string' ? j.error : 'Failed to update password')
        return
      }
      closePasswordModal()
      await load()
    } finally {
      setPasswordSaving(false)
    }
  }

  async function patch(userId: string, action: 'grantAdmin' | 'revokeAdmin' | 'ban' | 'unban') {
    if (!canWrite) return
    setBusyId(userId)
    try {
      const res = await fetch('/api/admin/supabase-users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(typeof j.error === 'string' ? j.error : 'Update failed')
        return
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function removeAuthUser(userId: string, email: string) {
    if (!canWrite) return
    if (
      !confirm(
        `Permanently delete ${email || userId}?\n\nThis removes the Auth user and related data we can resolve: profiles, matching ledger orders (by email in payload), optional cart tables, and admin roster entry for that email. This cannot be undone.`
      )
    ) {
      return
    }
    setBusyId(userId)
    try {
      const res = await fetch('/api/admin/supabase-users', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(typeof j.error === 'string' ? j.error : 'Delete failed')
        return
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function sendRecovery(userId: string) {
    if (!canWrite) return
    if (!confirm('Send a password reset email to this user?')) return
    setBusyId(userId)
    try {
      const res = await fetch('/api/admin/supabase-users/recovery', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(typeof j.error === 'string' ? j.error : 'Failed to send')
        return
      }
      alert('Reset email sent.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
        <Loader2 className="animate-spin" size={22} />
        Loading Supabase Auth users…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 text-sm">
        {error}
        <button
          type="button"
          onClick={() => load()}
          className="ml-4 text-indigo-600 font-medium underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {passwordTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Set login password</h3>
                <p className="text-sm text-gray-600 mt-1 font-mono break-all">{passwordTarget.email}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Updates Supabase Auth (real sign-in password), not the local VIP mirror only.
                </p>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={closePasswordModal}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={passwordSaving}
                onClick={() => void submitPasswordChange()}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {passwordSaving ? 'Saving…' : 'Save password'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-2xl">
          Supabase Auth accounts (real login). Use <strong>Set password</strong> to call{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">auth.admin.updateUserById</code>. Admin flag uses{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">user_metadata.admin</code>.
        </p>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const admin = isAdminMeta(r)
              const banned = Boolean(r.banned_until && new Date(r.banned_until) > new Date())
              const b = busyId === r.id
              return (
                <tr key={r.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">{r.email || r.id}</td>
                  <td className="px-4 py-3">{admin ? <span className="text-emerald-700 font-medium">Yes</span> : '—'}</td>
                  <td className="px-4 py-3">
                    {banned ? (
                      <span className="text-red-600 font-medium">Banned</span>
                    ) : (
                      <span className="text-gray-600">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.last_sign_in_at
                      ? new Date(r.last_sign_in_at).toLocaleString('en-AU')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {canWrite && (
                        <>
                          <button
                            type="button"
                            disabled={b}
                            onClick={() =>
                              setPasswordTarget({ id: r.id, email: r.email || r.id })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-indigo-200 text-indigo-800 text-xs hover:bg-indigo-50 disabled:opacity-40"
                          >
                            <KeyRound size={14} />
                            Set password
                          </button>
                          <button
                            type="button"
                            disabled={b || admin}
                            onClick={() => patch(r.id, 'grantAdmin')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-200 text-emerald-800 text-xs hover:bg-emerald-50 disabled:opacity-40"
                            title="Grant admin"
                          >
                            <Shield size={14} />
                            Admin
                          </button>
                          <button
                            type="button"
                            disabled={b || !admin}
                            onClick={() => patch(r.id, 'revokeAdmin')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-gray-700 text-xs hover:bg-gray-50 disabled:opacity-40"
                            title="Remove admin"
                          >
                            <ShieldOff size={14} />
                            Unadmin
                          </button>
                          <button
                            type="button"
                            disabled={b}
                            onClick={() => sendRecovery(r.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-indigo-200 text-indigo-800 text-xs hover:bg-indigo-50 disabled:opacity-40"
                          >
                            <Mail size={14} />
                            Reset email
                          </button>
                          {!banned ? (
                            <button
                              type="button"
                              disabled={b}
                              onClick={() => patch(r.id, 'ban')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 text-red-800 text-xs hover:bg-red-50 disabled:opacity-40"
                            >
                              <Ban size={14} />
                              Ban
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={b}
                              onClick={() => patch(r.id, 'unban')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-sky-200 text-sky-800 text-xs hover:bg-sky-50 disabled:opacity-40"
                            >
                              <Unlock size={14} />
                              Unban
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={b}
                            onClick={() => removeAuthUser(r.id, r.email || r.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 text-red-900 text-xs hover:bg-red-50 disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-gray-500 text-sm">No users returned (check Supabase service role).</p>
        )}
      </div>
    </div>
  )
}
