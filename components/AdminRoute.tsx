'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/lib/adminAuth'
import { useAdminSession } from '@/lib/adminSession'
import AdminInboundSync from '@/components/AdminInboundSync'
import AdminInboundSoundAlert from '@/components/AdminInboundSoundAlert'

interface AdminRouteProps {
  children: React.ReactNode
  requiredPermissions?: string[]
}

export default function AdminRoute({ children, requiredPermissions = [] }: AdminRouteProps) {
  const { isLoggedIn, adminUser, logout } = useAdminAuth()
  const { currentSessionId, isSessionValid, updateActivity } = useAdminSession()
  const router = useRouter()
  const [hasHydrated, setHasHydrated] = useState(false)
  /** null = checking; true = allowed (or no Supabase session / no public env — legacy path). */
  const [registryAccessOk, setRegistryAccessOk] = useState<boolean | null>(null)

  // Wait for persisted admin auth to hydrate before deciding
  useEffect(() => {
    // 하이드레이션 상태를 더 안전하게 처리
    const checkHydration = () => {
      try {
        const persistApi: any = (useAdminAuth as any).persist
        if (persistApi?.hasHydrated) {
          const hydrated = persistApi.hasHydrated()
          console.log('🔄 AdminRoute hydration check:', hydrated)
          setHasHydrated(hydrated)
        } else {
          // persist API가 없는 경우 바로 true로 설정
          console.log('⚠️ AdminRoute: No persist API found, setting hydrated to true')
          setHasHydrated(true)
        }

        // 하이드레이션 완료 리스너 등록
        const unsub = persistApi?.onFinishHydration?.(() => {
          console.log('✅ AdminRoute: Hydration finished')
          setHasHydrated(true)
        })
        
        return unsub
      } catch (error) {
        console.error('❌ AdminRoute hydration error:', error)
        // 에러 발생 시 바로 하이드레이션 완료로 처리
        setHasHydrated(true)
        return undefined
      }
    }

    const unsub = checkHydration()
    
    // 타임아웃으로 최대 3초 후 강제 하이드레이션 완료
    const timeout = setTimeout(() => {
      console.log('⏰ AdminRoute: Forcing hydration completion after timeout')
      setHasHydrated(true)
    }, 3000)

    return () => {
      if (typeof unsub === 'function') unsub()
      clearTimeout(timeout)
    }
  }, [])

  // Check permissions on mount and when permissions change
  const checkPermissions = useCallback(() => {
    if (!hasHydrated || !isLoggedIn) return

    // Check session validity on mount
    if (currentSessionId && !isSessionValid(currentSessionId)) {
      console.log('Session invalid on mount, logging out...')
      logout()
      router.push('/admin/login')
      return
    }

    // 권한 확인 (super_admin / admin:manage = full app access; avoids hidden menus + route redirects)
    if (requiredPermissions.length > 0 && adminUser) {
      const fullAccess =
        adminUser.role === 'super_admin' ||
        adminUser.permissions.includes('admin:manage')

      const hasPermission =
        fullAccess ||
        requiredPermissions.every((permission) => adminUser.permissions.includes(permission))

      if (!hasPermission) {
        console.log('Permission denied, redirecting to dashboard...')
        router.push('/admin/dashboard')
      }
    }
  }, [hasHydrated, isLoggedIn, adminUser, requiredPermissions, router, currentSessionId, isSessionValid, logout])

  // Check session validity periodically
  useEffect(() => {
    if (!hasHydrated || !isLoggedIn || !currentSessionId) return

    // Update activity on mount and periodically
    if (currentSessionId) {
      updateActivity(currentSessionId)
    }

    // Check session validity every 30 seconds
    const sessionCheckInterval = setInterval(() => {
      if (currentSessionId) {
        updateActivity(currentSessionId)
        
        // Check if session is still valid
        if (!isSessionValid(currentSessionId)) {
          console.log('Session expired, logging out...')
          logout()
          router.push('/admin/login')
        }
      }
    }, 30000)

    return () => clearInterval(sessionCheckInterval)
  }, [hasHydrated, isLoggedIn, currentSessionId, isSessionValid, updateActivity, logout, router])

  useEffect(() => {
    checkPermissions()
  }, [checkPermissions])

  // When Supabase is configured and the user has a browser session, require registry + JWT (server-side gate).
  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) return
    const skip =
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (skip) {
      setRegistryAccessOk(true)
      return
    }

    let cancelled = false
    setRegistryAccessOk(null)
    ;(async () => {
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
        const supabase = createSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled) return
        if (!session?.access_token) {
          setRegistryAccessOk(true)
          return
        }
        const r = await fetch('/api/admin/registry-access', { credentials: 'same-origin' })
        if (cancelled) return
        if (!r.ok) {
          logout()
          router.replace('/admin/login')
          return
        }
        setRegistryAccessOk(true)
      } catch {
        if (!cancelled) {
          logout()
          router.replace('/admin/login')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hasHydrated, isLoggedIn, logout, router])

  // Keep JWT app_metadata in sync with admin_email_registry (permissions / role updates).
  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) return
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
        const { mapSupabaseUserToAdminUser } = await import('@/lib/supabase/mapSupabaseAdminUser')
        const { syncAdminRegistryWithSession } = await import('@/lib/supabase/syncAdminRegistryClient')
        const supabase = createSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token || cancelled) return

        await syncAdminRegistryWithSession(supabase, session.access_token)
        if (cancelled) return

        const {
          data: { session: s2 },
        } = await supabase.auth.getSession()
        if (!s2?.user || cancelled) return

        const mapped = mapSupabaseUserToAdminUser(s2.user)
        useAdminAuth.setState({ adminUser: mapped })
        window.dispatchEvent(new Event('admin-auth-updated'))
      } catch (e) {
        console.warn('[AdminRoute] admin registry sync', e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hasHydrated, isLoggedIn])

  // Listen for permission changes
  useEffect(() => {
    if (!hasHydrated) return

    const handleAuthUpdate = () => {
      console.log('🔄 Admin auth updated, checking permissions...')
      // Get latest admin user from store
      const latestAdminUser = useAdminAuth.getState().adminUser
      
      // Check if current user's permissions changed
      if (latestAdminUser && adminUser && latestAdminUser.username === adminUser.username) {
        // Re-check permissions
        setTimeout(() => {
          checkPermissions()
        }, 100)
      }
    }

    window.addEventListener('admin-auth-updated', handleAuthUpdate)
    return () => window.removeEventListener('admin-auth-updated', handleAuthUpdate)
  }, [hasHydrated, adminUser, checkPermissions])

  // 하이드레이션 완료 후 isLoggedIn이 false면 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (hasHydrated && !isLoggedIn) {
      console.log('🔄 AdminRoute: Not logged in, redirecting to login')
      router.push('/admin/login')
    }
  }, [hasHydrated, isLoggedIn, router])

  // 모든 Hooks 호출 후 조건부 렌더링 (중요: Hooks는 항상 같은 순서로 호출되어야 함)
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    )
  }

  // 하이드레이션 완료 후 isLoggedIn이 false면 리다이렉트 중 로딩 화면
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  if (registryAccessOk !== true) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <AdminInboundSync />
      <AdminInboundSoundAlert />
      {children}
    </>
  )
} 