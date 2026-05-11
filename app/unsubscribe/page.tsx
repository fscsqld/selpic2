'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function UnsubscribeContent() {
  const searchParams = useSearchParams()

  const email = searchParams.get('email')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!email) {
      setStatus('error')
      setMessage('Email address is required.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setStatus('error')
      setMessage('Invalid email address.')
      return
    }

    setStatus('idle')
    setMessage('')
  }, [email])

  const handleUnsubscribe = async () => {
    if (!email) return

    try {
      setStatus('loading')
      setMessage('')

      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string }

      if (!res.ok || !data?.success) {
        setStatus('error')
        setMessage(data?.message || 'Failed to unsubscribe. Please try again or contact support.')
        return
      }

      setStatus('success')
      setMessage(
        data.message ||
          'You have been successfully unsubscribed from our newsletter.'
      )
    } catch (error) {
      console.error('Unsubscribe error:', error)
      setStatus('error')
      setMessage('An error occurred. Please try again or contact support.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Mail className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unsubscribe from Newsletter
          </h1>
          <p className="text-sm text-gray-600">
            We're sorry to see you go
          </p>
        </div>

        {email && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-1">
              <span className="font-medium">Email:</span> {email}
            </p>
          </div>
        )}

        {status === 'idle' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800">
                    Are you sure you want to unsubscribe? You will no longer receive our newsletter updates, promotions, and announcements.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleUnsubscribe}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Yes, Unsubscribe
            </button>

            <Link
              href="/"
              className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        )}

        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-sm text-gray-600">Processing your request...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Successfully Unsubscribed
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {message}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Error
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-2">
              <button
                onClick={handleUnsubscribe}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/"
                className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            If you have any questions or concerns, please{' '}
            <Link href="/contact" className="text-indigo-600 hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center text-gray-600">
            Loading…
          </div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  )
}
