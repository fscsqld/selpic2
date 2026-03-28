'use client'

import Link from 'next/link'
import { Home, Receipt, FileText, BookOpen } from 'lucide-react'

export function AccountingNavbar() {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              <span>SELPIC A</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Home className="w-4 h-4" />
              Dashboard Home
            </Link>
            <Link
              href="/transactions"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Integrated Ledger
            </Link>
            <Link
              href="/?tab=hr"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Receipt className="w-4 h-4" />
              HR & Payroll
            </Link>
            <Link
              href="/compliance"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              <FileText className="w-4 h-4" />
              BAS/GST Compliance
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
