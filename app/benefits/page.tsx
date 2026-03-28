'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useContentStore } from '@/lib/contentStore'

type GradeRow = {
  code: number
  name: string
  stickersDiscount: number
  hotGoodsDiscount?: number
  freeShipping: boolean
  minPurchaseAmount?: number
  stackingAllowed: boolean
}

const defaultGradeNames: Record<number, string> = {
  0: 'Basic',
  1: 'Silver',
  2: 'Gold',
  3: 'Black',
  4: 'VVIP'
}

export default function BenefitsPage() {
  const {
    vipGradeBenefits,
    vipGradeConfigs,
    getActiveVIPGradeConfigs,
    promoCodes
  } = useContentStore()

  // Force re-render when admin updates content
  const [storeVersion, setStoreVersion] = useState(0)
  useEffect(() => {
    const handler = () => setStoreVersion(v => v + 1)
    if (typeof window !== 'undefined') {
      window.addEventListener('content-store-updated', handler)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('content-store-updated', handler)
      }
    }
  }, [])

  const gradeRows: GradeRow[] = useMemo(() => {
    // Use active configs; if empty, fall back to defaults
    const configs = (vipGradeConfigs && vipGradeConfigs.length > 0
      ? vipGradeConfigs
      : getActiveVIPGradeConfigs()
    ).slice().sort((a, b) => a.code - b.code)

    // Ensure all default codes 0-4 exist
    const ensuredConfigs = (() => {
      const seen = new Set(configs.map(c => c.code))
      const defaults = [0, 1, 2, 3, 4].filter(code => !seen.has(code)).map(code => ({
        code,
        name: defaultGradeNames[code] || `Grade ${code}`,
        nameEn: defaultGradeNames[code] || `Grade ${code}`,
        minAmount: 0,
        maxAmount: undefined,
        color: 'gray',
        benefits: [],
        isActive: true
      }))
      return [...configs, ...defaults].sort((a, b) => a.code - b.code)
    })()

    const defaultHotGoods: Record<number, number | undefined> = { 3: 5, 4: 10 }

    return ensuredConfigs.map(config => {
      const benefit = vipGradeBenefits.find(b => b.gradeCode === config.code && b.isActive)
      const name = config.nameEn || config.name || defaultGradeNames[config.code] || `Grade ${config.code}`
      const stickersDiscount = benefit?.baseDiscountPercentage ?? 0

      const categoryDiscounts = benefit?.categoryDiscounts
      const hasHotGoodsKey = categoryDiscounts
        ? Object.prototype.hasOwnProperty.call(categoryDiscounts, 'HotGoods')
        : false
      const hotGoodsDiscount = hasHotGoodsKey
        ? categoryDiscounts?.HotGoods
        : defaultHotGoods[config.code]

      const freeShipping = benefit?.freeShipping ?? false
      const minPurchaseAmount = benefit?.minPurchaseAmount
      const stackingAllowed = benefit?.allowPromoCodeStacking !== false

      return {
        code: config.code,
        name,
        stickersDiscount,
        hotGoodsDiscount,
        freeShipping,
        minPurchaseAmount,
        stackingAllowed
      }
    })
  }, [vipGradeBenefits, vipGradeConfigs, getActiveVIPGradeConfigs, storeVersion])

  const activePromoCodes = useMemo(() => {
    return (promoCodes || []).filter(code => code.isActive)
  }, [promoCodes, storeVersion])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">Customer Benefits & Promo Codes</h1>
          <p className="text-gray-600">
            Please see the table below for our current loyalty program benefits, including discounts, free shipping, and promotion stacking policies.
          </p>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">VIP Grade Benefits</h2>
            <span className="text-xs text-gray-500">Live data</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-800">
              <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Grade</th>
                  <th className="px-4 py-3 text-left">Stickers/Stamps</th>
                  <th className="px-4 py-3 text-left">Market S / Phonecase</th>
                  <th className="px-4 py-3 text-left">Free Shipping</th>
                  <th className="px-4 py-3 text-left">Min Purchase</th>
                  <th className="px-4 py-3 text-left">Promo Stacking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {gradeRows.map(row => (
                  <tr key={row.code} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                    <td className="px-4 py-3">{row.stickersDiscount}%</td>
                    <td className="px-4 py-3">{row.hotGoodsDiscount !== undefined ? `${row.hotGoodsDiscount}%` : '0%'}</td>
                    <td className="px-4 py-3">{row.freeShipping ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{row.minPurchaseAmount ? `$${row.minPurchaseAmount.toFixed(0)}` : '$0'}</td>
                    <td className="px-4 py-3">
                      {row.code === 0
                        ? 'Promo only'
                        : row.code === 4
                          ? 'Yes'
                          : row.stackingAllowed
                            ? 'Yes'
                            : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-gray-600 mt-3 space-y-1">
            <div className="font-semibold">Stacking rules</div>
            <div className="grid grid-cols-3 gap-2 items-center text-[11px] sm:text-xs">
              <div className="font-semibold text-gray-800">Condition 1</div>
              <div className="font-semibold text-gray-800">Condition 2</div>
              <div className="font-semibold text-gray-800">Stacking Outcome</div>

              <div className="font-medium text-gray-800 text-[10px] sm:text-[11px]">selpic allows stacking for this VIP tier</div>
              <div className="font-medium text-gray-800 text-[10px] sm:text-[11px]">selpic allows stacking for this specific Promo Code</div>
              <div className="text-green-600 font-semibold">✅ YES, both discounts will be applied.</div>

              <div className="font-medium text-gray-800 text-[10px] sm:text-[11px]">If either condition is set to "No Stacking"</div>
              <div className="font-medium text-gray-800 text-[10px] sm:text-[11px]">If either condition is set to "No Stacking"</div>
              <div className="text-red-600 font-semibold">❌ NO, only a single discount will apply.</div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Promo Codes</h2>
            <span className="text-xs text-gray-500">Targeted Offers &amp; Usage</span>
          </div>

          <div className="space-y-4 text-sm text-gray-700">
            <p className="font-medium">
              All promotional codes are exclusive benefits issued for specific events or targeted customers, including in-game rewards.
            </p>

            <div className="space-y-2">
              <p className="font-semibold text-gray-900">1. 🎯 Issuance Type &amp; Purpose</p>
              <div className="grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
                <div className="font-semibold text-gray-800">Type</div>
                <div className="font-semibold text-gray-800">Issuance Purpose</div>
                <div className="font-semibold text-gray-800">Key Features</div>

                <div className="font-medium text-gray-800">Targeted / Event Codes</div>
                <div className="text-gray-700">Issued to specific customers for special events or periods.</div>
                <div className="text-gray-700">Discount rates are not publicly listed to prevent misuse.</div>

                <div className="font-medium text-gray-800">Game-earned Promo Codes</div>
                <div className="text-gray-700">Issued as a reward upon completing in-game missions (e.g., Tetris).</div>
                <div className="text-gray-700">Issued only once per mission completion. May be linked to your login session or user account.</div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-gray-900">2. 💰 How to Apply and Check Discount</p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1">
                <li><span className="font-semibold">To Apply:</span> If you have received a code, please enter it at the Checkout stage.</li>
                <li><span className="font-semibold">Result:</span> You will instantly see the final discount amount and its stacking eligibility (with VIP benefits) verified in real-time.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-gray-900">3. 🚫 Code Restrictions (Important)</p>
              <p className="text-xs sm:text-sm text-gray-700">All codes are verified at checkout and may be subject to the following restrictions:</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs">
                <div className="font-semibold text-gray-800">Restriction</div>
                <div className="font-semibold text-gray-800">Detail</div>

                <div className="text-gray-800">Expiration Date</div>
                <div className="text-gray-700">Must be used within the specified timeframe.</div>

                <div className="text-gray-800">Product Restrictions</div>
                <div className="text-gray-700">Applicable only to certain products or categories.</div>

                <div className="text-gray-800">User Limits</div>
                <div className="text-gray-700">May be restricted for use only by the account to which it was issued.</div>

                <div className="text-gray-800">Non-Transferable</div>
                <div className="text-gray-700">Codes cannot be sold or transferred to other individuals. (Especially Game-earned Codes)</div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-gray-900">4. ❓ Code Inquiry</p>
              <p className="text-xs sm:text-sm text-gray-700">
                If you believe you were eligible for a specific event code but did not receive it, please contact our Customer Support team.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-gray-100 rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Tips</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-semibold text-gray-900">1. Real-time Pricing Guarantee</p>
              <p className="text-gray-700">
                Up-to-Date Values: Your VIP benefits and any active promo code discounts are updated instantly the moment they are changed by the administrator. This ensures that the prices you see on the site are always current and accurate.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">2. Product-Specific Discount Rules</p>
              <p className="text-gray-700">Please note how category discounts are applied at checkout:</p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1 mt-1">
                <li><span className="font-semibold">Base Discount:</span> The standard VIP discount (e.g., 50% for VVIP) is primarily applied to Stickers/Stamps products.</li>
                <li><span className="font-semibold">Category-Specific Discount:</span> A separate, lower discount rate (e.g., 10% for VVIP) is applied to the Phonecase and Market S categories.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900">3. Verification at Checkout</p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1 mt-1">
                <li><span className="font-semibold">Final Checks:</span> Minimum purchase amounts, stacking eligibility (whether two discounts can be combined), and any per-user limits are strictly enforced and checked the moment you enter the checkout process.</li>
                <li><span className="font-semibold">Trust the Total:</span> If a discount is shown in your cart, it means your eligibility has been confirmed by the system.</li>
              </ul>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}

