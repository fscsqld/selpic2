'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ticket } from 'lucide-react'

type Props = {
  displayName: string
  staffDashboardReady: boolean
  ordersLabel: string
  onClose: () => void
  onLogout: () => void
}

/** Account dropdown — loaded only when the menu is open (code-split from Header). */
export default function HeaderAccountMenu({
  displayName,
  staffDashboardReady,
  ordersLabel,
  onClose,
  onLogout,
}: Props) {
  const router = useRouter()

  return (
    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm text-gray-500">Signed in as</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
      </div>
      {staffDashboardReady && (
        <Link
          href="/admin/dashboard"
          onClick={onClose}
          className="block w-full text-left px-4 py-3 text-sm font-medium text-violet-800 hover:bg-violet-50 border-b border-gray-100"
        >
          Staff dashboard
        </Link>
      )}
      <Link
        href="/profile"
        onClick={onClose}
        className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-pink-50"
      >
        Profile
      </Link>
      <Link
        href="/orders"
        onClick={onClose}
        className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-pink-50"
      >
        {ordersLabel}
      </Link>
      <Link
        href="/promo-codes"
        onClick={onClose}
        className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-pink-50 flex items-center gap-2"
      >
        <Ticket className="w-4 h-4" />
        Promo Codes
      </Link>
      <button
        type="button"
        onClick={() => {
          onClose()
          onLogout()
          router.push('/')
        }}
        className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
      >
        Logout
      </button>
    </div>
  )
}
