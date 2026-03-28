'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'

type NewsletterStatus = 'idle' | 'loading' | 'success' | 'error'

interface NewsletterFormProps {
  variant?: 'dark' | 'light'
}

const baseInputClasses = 'w-full px-4 py-2.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
const baseButtonClasses = 'w-full bg-emerald-500 text-white px-3 py-2 rounded-md hover:bg-emerald-600 transition-colors duration-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'

export default function NewsletterForm({ variant = 'dark' }: NewsletterFormProps) {
  const { subscribeToNewsletter } = useStore()
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState<NewsletterStatus>('idle')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')

  const isDark = variant === 'dark'

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!newsletterEmail || !emailRegex.test(newsletterEmail)) {
      setNewsletterStatus('error')
      setNewsletterMessage('Please enter a valid email address.')
      setTimeout(() => {
        setNewsletterStatus('idle')
        setNewsletterMessage('')
      }, 3000)
      return
    }

    try {
      setNewsletterStatus('loading')
      setNewsletterMessage('')

      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, honeypot })
      })

      const data = await res.json()

      if (!res.ok) {
        setNewsletterStatus('error')
        setNewsletterMessage(data?.message || 'Something went wrong. Please try again.')
        setTimeout(() => {
          setNewsletterStatus('idle')
          setNewsletterMessage('')
        }, 3000)
        return
      }

      // API 호출 성공 후 Store에 저장
      const success = subscribeToNewsletter(newsletterEmail)
      if (!success) {
        // 이미 구독 중인 경우 (API에서는 중복 체크를 했지만, 혹시 모를 경우를 대비)
        setNewsletterStatus('error')
        setNewsletterMessage('This email is already subscribed.')
        setTimeout(() => {
          setNewsletterStatus('idle')
          setNewsletterMessage('')
        }, 3000)
        return
      }

      setNewsletterStatus('success')
      setNewsletterMessage(data?.message || 'Thank you for subscribing!')
      setNewsletterEmail('')

      setTimeout(() => {
        setNewsletterStatus('idle')
        setNewsletterMessage('')
      }, 3000)
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      setNewsletterStatus('error')
      setNewsletterMessage('Something went wrong. Please try again.')
      setTimeout(() => {
        setNewsletterStatus('idle')
        setNewsletterMessage('')
      }, 3000)
    }
  }

  return (
    <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2">
      {/* Honeypot to deter bots */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />
      <input
        type="email"
        placeholder="Enter your email"
        value={newsletterEmail}
        onChange={(e) => setNewsletterEmail(e.target.value)}
        className={`${baseInputClasses} ${
          isDark
            ? 'bg-gray-800 text-white border border-gray-700'
            : 'bg-white text-gray-900 border border-gray-300'
        }`}
        required
      />
      <button
        type="submit"
        className={baseButtonClasses}
        disabled={newsletterStatus === 'success' || newsletterStatus === 'loading'}
      >
        {newsletterStatus === 'loading'
          ? 'Subscribing...'
          : newsletterStatus === 'success'
            ? 'Subscribed!'
            : 'Subscribe'}
      </button>
      {newsletterMessage && (
        <p
          className={`text-xs mt-1 ${
            newsletterStatus === 'success'
              ? 'text-green-400'
              : newsletterStatus === 'error'
                ? 'text-red-500'
                : isDark
                  ? 'text-gray-300'
                  : 'text-gray-600'
          }`}
        >
          {newsletterMessage}
        </p>
      )}
    </form>
  )
}

