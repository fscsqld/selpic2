'use client'

import Link from 'next/link'
import { ReactNode } from 'react'

const links = [
  { href: '/admin/fundraising/partners', label: 'Partners' },
  { href: '/admin/fundraising/settings', label: 'Settings' },
  { href: '/admin/fundraising/report', label: 'Impact' },
  { href: '/admin/fundraising/payout', label: 'Grant Tracker' },
  { href: '/admin/fundraising/documents', label: 'Documents' },
]

export default function FundraisingAdminNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            current === l.href
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

export function FundraisingAdminShell({
  title,
  subtitle,
  current,
  children,
}: {
  title: string
  subtitle: string
  current: string
  children: ReactNode
}) {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
      </div>
      <FundraisingAdminNav current={current} />
      {children}
    </div>
  )
}
