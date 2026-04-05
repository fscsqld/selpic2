'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { useStore } from '@/lib/store'
import type { OrderRecord } from '@/lib/store'
import { useContentStore } from '@/lib/contentStore'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { t } = useTranslation()

  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      setMessage('Missing payment session. Please return to checkout or contact support.')
      return
    }

    const doneKey = `stripe-order-done-${sessionId}`
    if (typeof window !== 'undefined' && sessionStorage.getItem(doneKey)) {
      setStatus('done')
      setTimeout(() => router.push('/'), 400)
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch('/api/stripe/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.order) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Could not verify payment or save order.')
        }

        const order = data.order as OrderRecord

        const { mergeOrdersFromServer } = useStore.getState()
        const { validatePromoCode, incrementPromoCodeUsage } = useContentStore.getState()
        const user = useUserAuth.getState().user

        mergeOrdersFromServer([order])

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(doneKey, order.id)
        }

        order.items.forEach((item) => {
          if (item.productId && item.quantity) {
            useStore.getState().adjustProductStock(item.productId, -item.quantity, `Order ${order.id}`, 'order')
          }
        })

        const ordersAfter = useStore.getState().orders
        if (order.promoCode) {
          const cartItemsForValidation = order.items.map((item) => ({
            productId: item.productId,
            category: item.category,
          }))
          const promoCode = validatePromoCode(
            order.promoCode,
            order.subtotal,
            cartItemsForValidation,
            user?.id,
            ordersAfter,
            user?.email,
            user?.phone
          )
          if (promoCode.valid && promoCode.promoCode) {
            incrementPromoCodeUsage(promoCode.promoCode.id)
          }
        }

        if (order.customer?.email) {
          setTimeout(() => {
            try {
              import('@/lib/userGradeUtils').then(({ updateUserGrade }) => {
                import('@/lib/userAuth').then(({ useUserAuth }) => {
                  const { users, updateUser } = useUserAuth.getState()
                  const u = users.find(
                    (x) =>
                      (x.email || '').trim().toLowerCase() === (order.customer?.email || '').trim().toLowerCase()
                  )
                  if (u) {
                    updateUserGrade(u, useStore.getState().orders, updateUser)
                  }
                })
              })
            } catch {
              /* non-fatal */
            }
          }, 100)
        }

        try {
          const { sendStripeCheckoutEmailsAction } = await import('@/app/actions/emails')
          await sendStripeCheckoutEmailsAction(sessionId)
        } catch {
          /* non-fatal */
        }

        if (cancelled) return
        setStatus('done')
        setTimeout(() => {
          router.push('/')
        }, 800)
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setMessage(e instanceof Error ? e.message : 'Something went wrong.')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [sessionId, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">{t('checkout.processing') ?? 'Processing…'}</h1>
            <p className="text-slate-600">Confirming your payment and creating your order.</p>
          </>
        )}
        {status === 'done' && (
          <>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Thank you!</h1>
            <p className="text-slate-600">Your order was placed. Redirecting to the home page…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-semibold text-red-700 mb-2">Could not complete order</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <Link
              href="/cart"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 text-white px-6 py-3 font-medium hover:bg-purple-700"
            >
              Back to cart
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
