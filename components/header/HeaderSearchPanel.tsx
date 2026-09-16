'use client'

import { useState, FormEvent, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, Package, LayoutGrid } from 'lucide-react'
import { useContentStore } from '@/lib/contentStore'
import {
  buildStorefrontSearchPages,
  filterStorefrontSearchPages,
  pickBestStorefrontSearchPage,
  type StorefrontSearchPageHit,
} from '@/lib/storefrontSearchPages'

type SearchProduct = {
  id: string
  name: string
  category: string
  price: number
  description?: string
}

type Props = {
  products: SearchProduct[]
  onClose: () => void
}

const POPULAR_TAGS = [
  'Sticker',
  'Basic',
  'Premium',
  'Mixed Labels',
  'Fundraising',
  'Custom',
  'Name',
] as const

function productDetailHref(productId: string): string {
  const id = (productId || '').trim()
  if (!id) return '/'
  return `/products/${encodeURIComponent(id)}`
}

function filterProducts(products: SearchProduct[], query: string): SearchProduct[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return products.filter((product) => {
    const id = (product.id || '').trim()
    if (!id) return false
    return (
      product.name.toLowerCase().includes(q) ||
      (product.description || '').toLowerCase().includes(q) ||
      (product.category || '').toLowerCase().includes(q)
    )
  })
}

function pickBestProduct(matches: SearchProduct[], query: string): SearchProduct | null {
  if (matches.length === 0) return null
  const q = query.trim().toLowerCase()
  const exact = matches.find((p) => p.name.trim().toLowerCase() === q)
  return exact || matches[0]
}

/** Full-screen search — products + storefront pages / sticker collections. */
export default function HeaderSearchPanel({ products, onClose }: Props) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const subcategoryItems = useContentStore((s) => s.subcategoryItems)
  const categoryItems = useContentStore((s) => s.categoryItems)
  const sidebarMenuItems = useContentStore((s) => s.sidebarMenuItems)

  const allPages = useMemo(
    () =>
      buildStorefrontSearchPages({
        subcategoryItems,
        categoryItems,
        sidebarMenuItems,
      }),
    [subcategoryItems, categoryItems, sidebarMenuItems]
  )

  const filteredProducts = useMemo(
    () => filterProducts(products, searchQuery),
    [products, searchQuery]
  )

  const filteredPages = useMemo(
    () => filterStorefrontSearchPages(allPages, searchQuery),
    [allPages, searchQuery]
  )

  const popularTags = useMemo(() => {
    const withHits = POPULAR_TAGS.filter((tag) => {
      if (filterProducts(products, tag).length > 0) return true
      return filterStorefrontSearchPages(allPages, tag).length > 0
    })
    return withHits.length > 0 ? withHits : [...POPULAR_TAGS]
  }, [products, allPages])

  const goToHref = (href: string) => {
    onClose()
    setSearchQuery('')
    router.push(href)
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return

    const productMatches = filterProducts(products, q)
    const pageMatches = filterStorefrontSearchPages(allPages, q)
    const exactProduct = productMatches.find((p) => p.name.trim().toLowerCase() === q.toLowerCase())
    if (exactProduct) {
      goToHref(productDetailHref(exactProduct.id))
      return
    }
    const exactPage = pickBestStorefrontSearchPage(
      pageMatches.filter((p) => p.label.trim().toLowerCase() === q.toLowerCase()),
      q
    )
    if (exactPage) {
      goToHref(exactPage.href)
      return
    }
    const bestProduct = pickBestProduct(productMatches, q)
    if (bestProduct) {
      goToHref(productDetailHref(bestProduct.id))
      return
    }
    const bestPage = pickBestStorefrontSearchPage(pageMatches, q)
    if (bestPage) {
      goToHref(bestPage.href)
      return
    }
  }

  const totalHits = filteredProducts.length + filteredPages.length
  const showProductSlice = filteredProducts.slice(0, 6)
  const showPageSlice = filteredPages.slice(0, 8)

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="absolute top-0 left-0 right-0 bg-white shadow-2xl max-h-[100vh] overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Search</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close search"
            >
              <X size={24} aria-hidden />
            </button>
          </div>

          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, collections, and pages"
                className="w-full px-4 py-4 pl-12 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                autoFocus
              />
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
                aria-hidden
              />
              <button
                type="submit"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-full transition-colors"
                aria-label="Submit search"
              >
                <ArrowRight size={20} aria-hidden />
              </button>
            </div>
          </form>

          {searchQuery ? (
            <div className="space-y-8 pb-8">
              <p className="text-sm text-gray-500">
                {totalHits} result{totalHits === 1 ? '' : 's'}
              </p>

              {showPageSlice.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Pages & collections</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {showPageSlice.map((page: StorefrontSearchPageHit) => (
                      <Link
                        key={page.id}
                        href={page.href}
                        onClick={onClose}
                        className="block p-4 border border-gray-200 rounded-xl hover:border-pink-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center shrink-0">
                            <LayoutGrid className="text-pink-600" size={20} aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{page.label}</h4>
                            {page.description ? (
                              <p className="text-sm text-gray-500 line-clamp-2">{page.description}</p>
                            ) : (
                              <p className="text-sm text-gray-400 truncate">{page.href}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {showProductSlice.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Products ({filteredProducts.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {showProductSlice.map((product) => (
                      <Link
                        key={product.id}
                        href={productDetailHref(product.id)}
                        onClick={onClose}
                        className="block p-4 border border-gray-200 rounded-xl hover:border-pink-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="text-gray-400" size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                            <p className="text-sm text-gray-500 truncate">{product.category}</p>
                            <p className="text-lg font-bold text-pink-600">
                              ${Number(product.price || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {totalHits === 0 && (
                <div className="text-center py-8">
                  <Package className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500">No search results found.</p>
                  <p className="text-sm text-gray-400 mt-2">Try searching with different keywords.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Popular Search Terms</h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchQuery(tag)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-pink-100 hover:text-pink-700 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
