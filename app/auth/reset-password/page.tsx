'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Loader2, CheckCircle } from 'lucide-react'
import Header from '@/components/Header'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { tryRecoverSessionFromImplicitHashRedirect } from '@/lib/supabase/recoverySessionFromHash'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/login'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ready, setReady] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const authErr = searchParams.get('auth_error')
    if (authErr) {
      setSessionError(authErr)
      if (typeof window !== 'undefined') {
        const u = new URL(window.location.href)
        u.searchParams.delete('auth_error')
        window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`)
      }
      return
    }

    const supabase = createSupabaseBrowserClient()
    let cancelled = false
    let unsub: (() => void) | undefined
    let waitTimeout: ReturnType<typeof setTimeout> | undefined

    ;(async () => {
      try {
        const hashResult = await tryRecoverSessionFromImplicitHashRedirect()
        if (cancelled) return
        if (!hashResult.ok && hashResult.error) {
          setSessionError(hashResult.error)
          return
        }

        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session) {
          setReady(true)
          return
        }

        await new Promise<void>((resolve) => {
          let settled = false
          waitTimeout = setTimeout(() => {
            if (!settled) resolve()
          }, 8000)
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, session) => {
            if (
              !settled &&
              session &&
              (event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION' || event === 'SIGNED_IN')
            ) {
              settled = true
              if (waitTimeout) clearTimeout(waitTimeout)
              setReady(true)
              resolve()
            }
          })
          unsub = () => {
            subscription.unsubscribe()
            if (waitTimeout) clearTimeout(waitTimeout)
          }
        })

        unsub?.()
        unsub = undefined

        if (cancelled) return
        const { data: again } = await supabase.auth.getSession()
        if (again.session) {
          setReady(true)
          return
        }
        setSessionError(
          'This reset link is invalid or has expired. Please request a new password reset email.'
        )
      } catch {
        if (!cancelled) setSessionError('Could not verify reset link.')
      }
    })()

    return () => {
      cancelled = true
      if (waitTimeout) clearTimeout(waitTimeout)
      unsub?.()
    }
  }, [searchParams])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setFormError(error.message)
        setSubmitting(false)
        return
      }
      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => router.push(`${next}?reset=success`), 1500)
    } catch {
      setFormError('Update failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionError) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow border p-8 text-center">
          <p className="text-red-700 text-sm">{sessionError}</p>
          <Link href="/auth/forgot-password" className="mt-4 inline-block text-indigo-600 text-sm font-medium">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
        <p className="text-lg font-medium text-gray-900">Password updated</p>
        <p className="text-sm text-gray-600 mt-2">Redirecting to sign in…</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
          <Lock size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
        <p className="text-sm text-gray-600 mt-2">Choose a strong password for your account.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              id="pw"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="pw2" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              id="pw2"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
            Update password
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <Header />
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        }
      >
        <ResetPasswordInner />
      </Suspense>
    </div>
  )
}
