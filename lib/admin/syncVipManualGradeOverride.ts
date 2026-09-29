/**
 * Admin UI helper: sync manual VIP grade to server (site_configs) so checkout APIs honour it.
 * Does not touch promo codes / storefront CMS blob.
 */

export async function syncVipManualGradeOverrideToServer(args: {
  email: string
  gradeCode: number
  reason?: string
  mode: 'set' | 'clear'
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = (args.email || '').trim()
  if (!email) return { ok: false, error: 'Customer email is required to sync VIP grade.' }

  try {
    if (args.mode === 'clear') {
      const res = await fetch('/api/admin/vip-grade-override', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { ok: false, error: typeof data.error === 'string' ? data.error : 'Failed to clear VIP override.' }
      }
      return { ok: true }
    }

    const res = await fetch('/api/admin/vip-grade-override', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email,
        gradeCode: args.gradeCode,
        reason: args.reason,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: typeof data.error === 'string' ? data.error : 'Failed to save VIP override.' }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error syncing VIP grade.' }
  }
}
