'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'
import Header from '@/components/Header'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

function ForgotPasswordInner() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/login'
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const hasSupabase =
    typeof window !== 'undefined' &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setMessage('Please enter your email.')
      setStatus('error')
      return
    }
    if (!hasSupabase) {
      setMessage('Password reset is not configured. Contact support.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      /**
       * PKCE recovery requires a `code_verifier` in this browser. Calling `resetPasswordForEmail` from the
       * server API never stores that verifier, so the email link’s `?code=` cannot be exchanged — the link
       * looks “instantly expired”. Always use the browser Supabase client here.
       */
      const supabase = createSupabaseBrowserClient()
      const origin = window.location.origin.replace(/\/$/, '')
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) {
        setMessage(error.message || 'Request failed.')
        setStatus('error')
        return
      }
      setStatus('sent')
      setMessage('If an account exists for that email, you will receive a reset link shortly.')
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Try again later.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <Header />
      <div className="max-w-md mx-auto px-4 py-16">
        <Link
          href={next}
          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mb-8"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
            <Mail size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot password</h1>
          <p className="text-sm text-gray-600 mt-2">
            Enter the email you use for SELPIC. We will send a secure link to reset your password (Supabase Auth).
          </p>

          {status === 'sent' ? (
            <p className="mt-6 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
              {message}
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="you@example.com"
                />
              </div>
              {status === 'error' && message && (
                <p className="text-sm text-red-600">{message}</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Sending…
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  )
}
