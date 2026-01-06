'use client'

import { useMemo, useState } from 'react'

import type { Customization, Product } from '@/lib/types'
import { formatKRW, useShopStore } from '@/lib/store'

type Props = {
  product: Product
}

export function ProductCard({ product }: Props) {
  const addToCart = useShopStore((s) => s.addToCart)
  const [color, setColor] = useState<string>('블루')
  const [size, setSize] = useState<Customization['size']>('M')
  const [text, setText] = useState<string>('')
  const [qty, setQty] = useState<number>(1)

  const customization: Customization = useMemo(
    () => ({ color, size, text: text.trim() ? text.trim() : undefined }),
    [color, size, text],
  )

  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{product.name}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{product.description}</p>
        </div>
        <div className="shrink-0 text-sm font-semibold">{formatKRW(product.price)}</div>
      </div>

      {product.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {product.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">색상</span>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="블루">블루</option>
            <option value="블랙">블랙</option>
            <option value="레드">레드</option>
            <option value="그린">그린</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">사이즈</span>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as Customization['size'])}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">텍스트(선택)</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="예) Hello"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">수량</span>
          <input
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            type="number"
            min={1}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => addToCart({ productId: product.id, quantity: qty, customization })}
          className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          장바구니 담기
        </button>
      </div>
    </div>
  )
}

