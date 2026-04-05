'use client'

import Link from 'next/link'
import { Mail, Home } from 'lucide-react'

export default function RegisterThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/60 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Mail className="h-8 w-8 text-emerald-700" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">You&apos;re all set</h1>
        <p className="mt-4 text-slate-600 text-sm leading-relaxed">
          Your account is ready. You can sign in right away with your email and password—no need to wait for a
          confirmation email. If you still see this page, use the button below to open the sign-in screen.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Go to sign in
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4" aria-hidden />
            Continue to home
          </Link>
        </div>
      </div>
    </div>
  )
}
