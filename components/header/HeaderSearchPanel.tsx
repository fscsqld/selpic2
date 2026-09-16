'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Search, X, ArrowRight, Package } from 'lucide-react'

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

/** Full-screen search — code-split; mounts only when search is opened. */
export default function HeaderSearchPanel({ products, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onClose()
      setSearchQuery('')
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="absolute top-0 left-0 right-0 bg-white shadow-2xl">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Product Search</h2>
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
                placeholder="Search"
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Search Results ({filteredProducts.length} items)
              </h3>

              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.slice(0, 6).map((product) => (
                    <Link
                      key={product.id}
                      href={`/products#${product.id}`}
                      onClick={onClose}
                      className="block p-4 border border-gray-200 rounded-xl hover:border-pink-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="text-gray-400" size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-500">{product.category}</p>
                          <p className="text-lg font-bold text-pink-600">${product.price.toFixed(2)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
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
                {['Sticker', 'Custom', 'Name', 'Gift', 'Deco'].map((tag) => (
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
