'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User, AlertCircle, Home, Shield } from 'lucide-react'
import { useAdminAuth } from '@/lib/adminAuth'
import { useUserAuth } from '@/lib/userAuth'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAdminAuth()
  const router = useRouter()

  /**
   * Staff already signed in → dashboard.
   * Supabase session without admin JWT → customer; send home (must not use staff console).
   * Local customer session only → home.
   */
  useEffect(() => {
    let cancelled = false

    const enforceAccess = async () => {
      if (useAdminAuth.getState().isLoggedIn) {
        router.replace('/admin/dashboard')
        return
      }

      const hasSupabase =
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())

      if (hasSupabase) {
        try {
          const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
          const { userHasAdminAccess } = await import('@/lib/supabase/adminClaims')
          const supabase = createSupabaseBrowserClient()
          const { data } = await supabase.auth.getSession()
          if (cancelled) return
          if (data.session?.user) {
            if (userHasAdminAccess(data.session.user)) {
              router.replace('/admin/dashboard')
            } else {
              router.replace('/')
            }
            return
          }
        } catch {
          /* ignore */
        }
      }

      if (cancelled) return
      if (useUserAuth.getState().isLoggedIn) {
        router.replace('/')
      }
    }

    void enforceAccess()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const hasPublicSupabase =
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
      const allowLegacy = process.env.NEXT_PUBLIC_ALLOW_LEGACY_ADMIN_LOGIN === 'true'

      if (hasPublicSupabase) {
        try {
          const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
          const supabase = createSupabaseBrowserClient()
          const { data, error: sbError } = await supabase.auth.signInWithPassword({
            email: username.trim(),
            password: password.trim(),
          })

          if (!sbError && data.session && data.user) {
            const { postSupabasePasswordSignInBridge } = await import('@/lib/supabase/postSupabasePasswordSignInBridge')
            const bridge = await postSupabasePasswordSignInBridge(supabase, data.session, 'admin_portal')
            if (bridge.outcome === 'admin') {
              router.replace('/admin/dashboard')
              return
            }
            if (bridge.outcome === 'not_admin_gate' || bridge.outcome === 'roster_blocked') {
              setError(bridge.error)
              return
            }
          }

          if (!allowLegacy) {
            setError(sbError?.message || 'Invalid email or password.')
            return
          }
        } catch {
          if (!allowLegacy) {
            setError('Sign-in failed. Check your email and password, or contact a super admin if your access was revoked.')
            return
          }
        }
      }

      const success = await login(username, password)
      if (success) {
        router.replace('/admin/dashboard')
      } else {
        setError('Invalid credentials.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row bg-zinc-950 text-zinc-100">
      <aside className="relative lg:w-[42%] min-h-[140px] lg:min-h-screen border-b lg:border-b-0 lg:border-r border-violet-900/40 bg-gradient-to-br from-violet-950 via-zinc-950 to-black flex flex-col justify-between p-8 lg:p-12">
        <div>
          <div className="flex items-center gap-2 text-violet-300/90 font-mono text-xs uppercase tracking-[0.25em]">
            <Shield className="h-4 w-4 shrink-0" aria-hidden />
            Internal
          </div>
          <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight">
            Staff Console
          </h1>
          <p className="mt-2 text-sm font-normal text-zinc-400">(Authorized Personnel Only)</p>
          <p className="mt-5 text-sm text-zinc-500 max-w-sm leading-relaxed">
            This entry is not the customer storefront. Sessions here are for admin tools only. Access is assigned by a
            super admin—not via public registration.
          </p>
        </div>
        <p className="hidden lg:block font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
          SELPIC internal
        </p>
      </aside>

      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 rounded"
          >
            <Home size={18} aria-hidden />
            Back to store
          </Link>

          <div className="rounded-2xl border border-violet-900/40 bg-zinc-900/80 p-8 shadow-2xl shadow-black/50">
            <div className="mb-8 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-zinc-100">Administrator Sign-in</h2>
              <p className="mt-3 mx-auto sm:mx-0 max-w-[280px] sm:max-w-xs text-sm text-zinc-400 leading-relaxed text-balance">
                <span className="block">Sign in with your staff email</span>
                <span className="block">to manage SELPIC operations.</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
              <div>
                <label
                  htmlFor="admin-email"
                  className="block font-mono text-xs uppercase tracking-wider text-violet-400/90 mb-2"
                >
                  Staff email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" aria-hidden />
                  <input
                    id="admin-email"
                    type="email"
                    name="staff-console-email"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-black/40 py-3 pl-11 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block font-mono text-xs uppercase tracking-wider text-violet-400/90 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" aria-hidden />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    name="staff-console-password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-black/40 py-3 pl-11 pr-11 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/40 p-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-400" aria-hidden />
                  <span className="text-sm text-red-200">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-gradient-to-r from-violet-700 to-indigo-900 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 hover:from-violet-600 hover:to-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono uppercase tracking-wide"
              >
                {isLoading ? 'Signing in…' : 'Enter dashboard'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
