'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { useShopStore } from '@/lib/store'

export function Header() {
  const [dark, setDark] = useState(false)
  const cart = useShopStore((s) => s.cart)

  const cartCount = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart])

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">SelPic2</span>
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-slate-800 dark:text-slate-200">
            홈
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/products"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            상품
          </Link>
          <Link
            href="/cart"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            장바구니
            <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              {cartCount}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => {
              const next = !dark
              setDark(next)
              document.documentElement.classList.toggle('dark', next)
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="다크 모드 토글"
          >
            {dark ? '라이트' : '다크'}
          </button>
        </nav>
      </div>
    </header>
  )
}

