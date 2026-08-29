'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminRoute from '@/components/AdminRoute'

/**
 * Legacy URL. Staff email registry lives only at /admin/administrator-settings
 * so super admins have one place to manage other admins.
 */
export default function AdminManagementRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/administrator-settings')
  }, [router])

  return (
    <AdminRoute requiredPermissions={['admin:manage']}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-600">Redirecting to Administrator settings…</p>
      </div>
    </AdminRoute>
  )
}
