'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// 이 페이지는 /custom-design로 리다이렉트합니다.
export const dynamic = 'force-dynamic'

function CustomizeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // /customize를 /custom-design로 리다이렉트 (쿼리 파라미터 유지)
    const queryString = searchParams.toString()
    const redirectUrl = queryString ? `/custom-design?${queryString}` : '/custom-design'
    router.replace(redirectUrl)
  }, [router, searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Redirecting to Custom Design Studio...</p>
      </div>
    </div>
  )
}

export default function CustomizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <CustomizeContent />
    </Suspense>
  )
}
