'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useUserAuth } from '@/lib/userAuth'
import { useAdminAuth } from '@/lib/adminAuth'
import { useStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useUserAuth()
  const { clearCart } = useStore()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [registeredBanner, setRegisteredBanner] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('reset') === 'success') {
      setResetSuccess(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('registered') === '1') {
      setRegisteredBanner(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  /** Send already-authenticated users away; keep fields empty (no default credentials in source). */
  useEffect(() => {
    let cancelled = false

    const redirectIfAuthenticated = async () => {
      if (useAdminAuth.getState().isLoggedIn) {
        router.replace('/admin/dashboard')
        return
      }
      if (useUserAuth.getState().isLoggedIn) {
        router.replace('/')
        return
      }

      const hasSupabase =
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())

      if (!hasSupabase) return

      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
        const { userHasAdminAccess } = await import('@/lib/supabase/adminClaims')
        const supabase = createSupabaseBrowserClient()
        const { data } = await supabase.auth.getSession()
        if (cancelled || !data.session?.user) return
        if (userHasAdminAccess(data.session.user)) {
          router.replace('/admin/dashboard')
        } else {
          router.replace('/')
        }
      } catch {
        /* ignore */
      }
    }

    void redirectIfAuthenticated()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'customer-login-email') {
      setFormData((prev) => ({ ...prev, email: value }))
    } else if (name === 'customer-login-password') {
      setFormData((prev) => ({ ...prev, password: value }))
    }
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError('')

    if (!formData.email?.trim() || !formData.password) {
      setFormError('Please enter both your email address and password.')
      setIsLoading(false)
      return
    }

    try {
      const hasSupabase =
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())

      if (hasSupabase) {
        try {
          const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
          const { postSupabasePasswordSignInBridge } = await import('@/lib/supabase/postSupabasePasswordSignInBridge')
          const supabase = createSupabaseBrowserClient()
          const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password,
          })
          if (!error && data.session && data.user) {
            const bridge = await postSupabasePasswordSignInBridge(supabase, data.session, 'storefront')
            if (bridge.outcome === 'admin') {
              router.replace('/admin/dashboard')
              return
            }
            if (bridge.outcome === 'roster_blocked' || bridge.outcome === 'not_admin_gate') {
              setFormError(bridge.error)
              setIsLoading(false)
              return
            }
            useUserAuth.getState().establishSessionFromSupabaseUser(bridge.user)
            try {
              clearCart(true)
            } catch {
              /* non-fatal */
            }
            router.replace('/')
            return
          }
          if (error) {
            const msg = error.message?.toLowerCase() || ''
            if (msg.includes('invalid') && msg.includes('credential')) {
              setFormError(
                'Invalid email or password. If an administrator set a new password for your account, use that password. ' +
                  'For security, this message does not indicate whether the email is registered—double-check spelling or use password reset.'
              )
            } else if (msg.includes('user not found') || msg.includes('no user found')) {
              setFormError(
                'No account was found for this email in our sign-in system. Check for typos or create an account.'
              )
            } else if (msg.includes('email not confirmed')) {
              setFormError('Please confirm your email address before signing in. Check your inbox for the verification link.')
            } else {
              setFormError(error.message || 'Sign-in failed. Please try again.')
            }
            setIsLoading(false)
            return
          }
        } catch {
          setFormError('Unable to sign in right now. Please try again in a moment.')
          setIsLoading(false)
          return
        }
      }

      const success = await login(formData.email, formData.password, keepLoggedIn)

      if (success) {
        try {
          clearCart(true)
        } catch {
          /* non-fatal */
        }
        router.replace('/')
      } else {
        setFormError('Invalid email address or password. Please try again.')
      }
    } catch {
      setFormError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/90">
      <Header />

      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-6 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-center">
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <p className="text-base font-bold text-slate-900 sm:text-lg">Customer Sign-in</p>
            <p className="max-w-sm text-sm font-light text-slate-500 leading-snug">
              (Manage your orders, deliveries, and profile)
            </p>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100/80 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <User size={32} className="text-white" />
            </div>
            <h1 className="mb-4 text-center tracking-tight">
              <span className="block text-xl sm:text-2xl font-light text-slate-500 leading-snug">
                Welcome back to
              </span>
              <span className="mt-2 block text-5xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight whitespace-nowrap bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 bg-clip-text text-transparent">
                Selpic
              </span>
            </h1>
            <p className="mx-auto max-w-[320px] text-center text-sm sm:text-base text-slate-600 leading-relaxed">
              <span className="block">Sign in to your Selpic account</span>
              <span className="block">to continue shopping.</span>
            </p>
          </div>

          {registeredBanner && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-emerald-900">
                Your account is ready. Sign in below with your email and password—you can shop immediately. (You may
                still receive a confirmation email; you do not need to wait for it to sign in.)
              </p>
            </div>
          )}

          {resetSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} className="text-green-600 shrink-0" />
                <p className="text-sm text-green-800">
                  Your password has been updated. You can sign in with your new password.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {formError}
              </div>
            )}

            <div className="group">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-emerald-700 transition-colors"
              >
                Email address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  name="customer-login-email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="username"
                  className="w-full px-5 py-4 pl-12 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                  placeholder="name@example.com"
                />
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              </div>
            </div>

            <div className="group">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-emerald-700 transition-colors"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="customer-login-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  autoComplete="current-password"
                  className="w-full px-5 py-4 pl-12 pr-12 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                  placeholder="Enter your password"
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors duration-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 -mt-2">
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  Remember me
                </span>
              </label>
              <Link
                href="/auth/forgot-password?next=/login"
                className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
              >
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-medium py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <User size={20} />
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 py-6 text-center px-2 sm:px-0">
            <p className="mx-auto max-w-[min(100%,20rem)] text-sm sm:text-[15px] leading-relaxed text-balance text-slate-500">
              <span className="text-slate-500">New to Selpic? </span>
              <Link
                href="/register"
                className="font-bold text-emerald-600 decoration-emerald-600/40 underline-offset-4 transition-colors duration-200 hover:text-teal-700 hover:underline hover:decoration-teal-600/60"
              >
                Create an account for a better shopping experience.
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
