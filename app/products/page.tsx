import Link from 'next/link'

import { ProductCard } from '@/components/ProductCard'
import { getProducts } from '@/lib/products'

export default function ProductsPage() {
  const products = getProducts()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">상품</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            옵션을 선택하고 장바구니에 담아보세요.
          </p>
        </div>
        <Link
          href="/cart"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          장바구니로
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}

