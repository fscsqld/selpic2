'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import OrderTracking from '@/components/OrderTracking'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'

function normalizeEmail(email: string) {
  return (email || '').trim().toLowerCase()
}

function normalizePhoneAu(input: string) {
  const digits = (input || '').replace(/\D/g, '')
  if (digits.startsWith('61')) return '0' + digits.slice(2)
  if (digits.startsWith('+61')) return '0' + digits.slice(3)
  return digits
}

export default function OrdersPage() {
  const { t } = useTranslation()
  const { orders, refreshOrdersFromStorage } = useStore()
  const { isLoggedIn, user } = useUserAuth()

  // 페이지 진입 시 localStorage에서 주문 목록 동기화 (주문 직후 Order History에 반영)
  useEffect(() => {
    refreshOrdersFromStorage()
  }, [refreshOrdersFromStorage])

  const [lookupId, setLookupId] = useState('')
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupPhone, setLookupPhone] = useState('')
  const [lookupError, setLookupError] = useState('')

  const myOrders = useMemo(() => {
    if (!isLoggedIn || !user?.email) return []
    const userEmail = normalizeEmail(user.email)
    return orders.filter(o => normalizeEmail(o.customer.email) === userEmail)
  }, [isLoggedIn, user, orders])

  // Total Purchase Amount 계산 (Profile과 동일한 방식)
  const totalPurchaseAmount = useMemo(() => {
    if (!isLoggedIn || !user?.email) return 0
    const userEmail = normalizeEmail(user.email)
    const userPhone = user.phone ? normalizePhoneAu(user.phone) : ''
    
    // calculateUserTotalSales와 동일한 로직
    const userOrders = orders.filter(order => {
      // 취소된 주문 제외
      if (order.status === 'cancelled') return false
      
      const orderEmail = normalizeEmail(order.customer.email)
      const orderPhone = normalizePhoneAu(order.customer.phone)
      
      // 이메일 또는 전화번호로 매칭
      const emailMatch = userEmail && orderEmail === userEmail
      const phoneMatch = userPhone && orderPhone && orderPhone.includes(userPhone)
      
      return emailMatch || phoneMatch
    })
    
    return userOrders.reduce((sum, order) => sum + (order.total || 0), 0)
  }, [isLoggedIn, user, orders])

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    setLookupError('')
    const id = lookupId.trim()
    const email = normalizeEmail(lookupEmail)
    const phone = normalizePhoneAu(lookupPhone)
    const order = orders.find(o => {
      const emailMatch = email ? normalizeEmail(o.customer.email) === email : false
      const phoneMatch = phone ? normalizePhoneAu(o.customer.phone) === phone : false
      return o.id === id && (emailMatch || phoneMatch)
    })
    if (!order) {
      setLookupError(t('ordersPage.noMatch'))
      return
    }
    window.location.href = `/orders/${order.id}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl lg:text-4xl font-light text-slate-900 tracking-wide">{t('ordersPage.title')}</h1>
          <div className="w-20 h-1 bg-gradient-to-r from-purple-600 to-pink-600 mx-auto mt-4 rounded-full" />
        </div>

        {isLoggedIn && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">{t('myOrders')}</h2>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Purchase Amount</p>
                <p className="text-lg font-bold text-purple-600">${totalPurchaseAmount.toFixed(2)}</p>
              </div>
            </div>
            {myOrders.length === 0 ? (
              <p className="text-gray-500">{t('ordersPage.noOrders')}</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">{t('ordersPage.placedOn')}</th>
                      <th className="px-4 py-3 text-left">{t('ordersPage.status')}</th>
                      <th className="px-4 py-3 text-left">{t('ordersPage.total')}</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {myOrders.map((order) => (
                      <tr key={order.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-mono text-xs">{order.id}</td>
                        <td className="px-4 py-3">{new Date(order.createdAtIso).toLocaleString()}</td>
                        <td className="px-4 py-3 capitalize">{order.status}</td>
                        <td className="px-4 py-3 font-semibold">${order.total.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/orders/${order.id}`} className="inline-flex items-center px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
                            {t('ordersPage.viewDetails')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-4">{t('orderLookup')}</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-600 mb-4">{t('lookupTitle')}</p>
            <form onSubmit={handleLookup} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('OrderID')}</label>
                <input value={lookupId} onChange={(e) => setLookupId(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Email')}</label>
                <input type="email" value={lookupEmail} onChange={(e) => setLookupEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Phone')}</label>
                <input value={lookupPhone} onChange={(e) => setLookupPhone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>
              <div className="md:col-span-3">
                <button type="submit" className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-700 hover:to-pink-700">
                  {t('FindOrder')}
                </button>
              </div>
            </form>
            {lookupError && <p className="text-red-600 mt-3 text-sm">{lookupError}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}


