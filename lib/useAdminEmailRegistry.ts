'use client'

import { useState, useCallback, useEffect } from 'react'

export type AdminRegistryEntry = {
  email: string
  role: 'admin' | 'super_admin'
  permissions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export function hasPublicSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

async function authHeaders(): Promise<HeadersInit | null> {
  const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
  const { data: { session } } = await createSupabaseBrowserClient().auth.getSession()
  if (!session?.access_token) return null
  return { Authorization: `Bearer ${session.access_token}` }
}

export function useAdminEmailRegistry(isSuperAdmin: boolean) {
  const [entries, setEntries] = useState<AdminRegistryEntry[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isSuperAdmin || !hasPublicSupabaseEnv()) return
    setLoading(true)
    setError('')
    try {
      const h = await authHeaders()
      if (!h) return
      const res = await fetch('/api/admin/email-registry', { headers: h })
      const j = (await res.json().catch(() => ({}))) as { entries?: AdminRegistryEntry[]; error?: string }
      if (!res.ok) {
        setError(j.error || 'Failed to load admin email registry')
        return
      }
      setEntries(j.entries ?? [])
    } catch {
      setError('Failed to load admin email registry')
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin])

  useEffect(() => {
    void load()
  }, [load])

  const createEntry = useCallback(
    async (params: {
      email: string
      role: 'admin' | 'super_admin'
      permissions: string[]
    }): Promise<{ ok: boolean; error?: string }> => {
      const h = await authHeaders()
      if (!h) return { ok: false, error: 'Not signed in with Supabase' }
      const res = await fetch('/api/admin/email-registry', {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: params.email.trim(),
          role: params.role,
          permissions: params.permissions,
          is_active: true,
        }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) return { ok: false, error: j.error || res.statusText }
      await load()
      return { ok: true }
    },
    [load]
  )

  const patchEntry = useCallback(
    async (
      email: string,
      body: Partial<{ permissions: string[]; is_active: boolean; role: 'admin' | 'super_admin' }>
    ): Promise<{ ok: boolean; error?: string }> => {
      const h = await authHeaders()
      if (!h) return { ok: false, error: 'Not signed in with Supabase' }
      const res = await fetch('/api/admin/email-registry', {
        method: 'PATCH',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...body }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) return { ok: false, error: j.error || res.statusText }
      await load()
      return { ok: true }
    },
    [load]
  )

  const deleteEntry = useCallback(
    async (email: string): Promise<{ ok: boolean; error?: string }> => {
      const h = await authHeaders()
      if (!h) return { ok: false, error: 'Not signed in with Supabase' }
      const q = new URLSearchParams({ email })
      const res = await fetch(`/api/admin/email-registry?${q}`, {
        method: 'DELETE',
        headers: h,
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) return { ok: false, error: j.error || res.statusText }
      await load()
      return { ok: true }
    },
    [load]
  )

  return { entries, error, loading, reload: load, createEntry, patchEntry, deleteEntry }
}
