'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useUserAuth } from '@/lib/userAuth'
import { customerLoginHrefWithNext } from '@/lib/storefrontLoginNext'

type ProductLikeButtonProps = {
  productId: string
  /** compact = icon on cards; default = labeled control on PDP */
  variant?: 'default' | 'compact'
  className?: string
}

type LikeState = {
  count: number
  liked: boolean
  available: boolean
}

const BURST_OFFSETS = [
  { x: 0, y: -26 },
  { x: 22, y: -16 },
  { x: 24, y: 8 },
  { x: 0, y: 22 },
  { x: -24, y: 8 },
  { x: -22, y: -16 },
] as const

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function ProductLikeButton({
  productId,
  variant = 'default',
  className = '',
}: ProductLikeButtonProps) {
  const { isLoggedIn } = useUserAuth()
  const pathname = usePathname()
  const loginHref = customerLoginHrefWithNext(
    pathname && pathname.startsWith('/')
      ? pathname
      : productId
        ? `/products/${encodeURIComponent(productId)}`
        : '/'
  )
  const [state, setState] = useState<LikeState>({ count: 0, liked: false, available: true })
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [popping, setPopping] = useState(false)
  const [countBump, setCountBump] = useState(false)
  const [burst, setBurst] = useState(false)
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    if (!productId) return
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/like`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        setLoadError(true)
        return
      }
      const data = (await res.json()) as {
        count?: number
        liked?: boolean
        available?: boolean
      }
      setState({
        count: typeof data.count === 'number' ? data.count : 0,
        liked: !!data.liked,
        available: data.available !== false,
      })
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [productId])

  useEffect(() => {
    void refresh()
  }, [refresh, isLoggedIn])

  useEffect(() => {
    return () => {
      if (popTimer.current) clearTimeout(popTimer.current)
    }
  }, [])

  const playDelight = (becameLiked: boolean) => {
    if (!becameLiked || prefersReducedMotion()) return
    setPopping(true)
    setCountBump(true)
    if (variant === 'default') setBurst(true)
    if (popTimer.current) clearTimeout(popTimer.current)
    popTimer.current = setTimeout(() => {
      setPopping(false)
      setCountBump(false)
      setBurst(false)
    }, 420)
  }

  const onToggle = async () => {
    if (!isLoggedIn || busy) return
    const wasLiked = state.liked
    setBusy(true)
    try {
      const method = wasLiked ? 'DELETE' : 'POST'
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/like`, {
        method,
        credentials: 'include',
      })
      if (res.status === 401) {
        setBusy(false)
        return
      }
      if (!res.ok) {
        setBusy(false)
        return
      }
      const data = (await res.json()) as { count?: number; liked?: boolean }
      const liked = !!data.liked
      setState((prev) => ({
        ...prev,
        count: typeof data.count === 'number' ? data.count : prev.count,
        liked,
      }))
      playDelight(liked && !wasLiked)
    } catch {
      /* keep prior state */
    } finally {
      setBusy(false)
    }
  }

  if (loadError && !state.available) {
    return null
  }

  const heartClass =
    variant === 'compact'
      ? `w-5 h-5 transition-transform duration-200 ${
          state.liked ? 'fill-red-500 text-red-500' : 'text-rose-500 fill-rose-100'
        } ${popping ? 'scale-125' : 'scale-100'}`
      : `w-5 h-5 transition-transform duration-200 ${
          state.liked ? 'fill-red-500 text-red-500' : 'text-rose-500'
        } ${popping ? 'scale-[1.35]' : 'scale-100'}`

  const heart = <Heart className={heartClass} aria-hidden />

  const countClass = `inline-block tabular-nums transition-transform duration-200 ${
    countBump ? 'scale-125 text-red-600 font-semibold' : ''
  }`

  const burstLayer =
    burst && variant === 'default' ? (
      <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
        {BURST_OFFSETS.map((o, i) => (
          <Heart
            key={i}
            className="absolute left-1/2 top-1/2 w-2.5 h-2.5 -ml-1.5 -mt-1.5 fill-rose-400 text-rose-400"
            style={{
              animation: `product-like-burst-${i} 0.4s ease-out forwards`,
            }}
          />
        ))}
      </span>
    ) : null

  const burstKeyframes =
    variant === 'default' ? (
      <style jsx global>{`
        ${BURST_OFFSETS.map(
          (o, i) => `
          @keyframes product-like-burst-${i} {
            0% { opacity: 1; transform: translate(0, 0) scale(0.5); }
            100% { opacity: 0; transform: translate(${o.x}px, ${o.y}px) scale(1); }
          }
        `
        ).join('')}
        @media (prefers-reduced-motion: reduce) {
          ${BURST_OFFSETS.map(
            (_, i) => `@keyframes product-like-burst-${i} { 0%, 100% { opacity: 0; } }`
          ).join('')}
        }
      `}</style>
    ) : null

  if (variant === 'compact') {
    const pill =
      'inline-flex items-center gap-1 rounded-full bg-rose-50/95 px-2.5 py-1 text-xs text-rose-700 shadow-sm border border-rose-200 hover:bg-rose-100'
    if (!isLoggedIn) {
      return (
        <Link
          href={loginHref}
          className={`${pill} ${className}`}
          title="Log in to like"
          onClick={(e) => e.stopPropagation()}
        >
          {heart}
          <span className={countClass}>{state.count}</span>
        </Link>
      )
    }
    return (
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void onToggle()
        }}
        className={`${pill} disabled:opacity-60 ${className}`}
        aria-pressed={state.liked}
        aria-label={state.liked ? 'Unlike product' : 'Like product'}
        title={state.liked ? 'Unlike' : 'Like'}
      >
        {heart}
        <span className={countClass}>{state.count}</span>
      </button>
    )
  }

  return (
    <div className={`flex flex-col gap-1 mb-6 ${className}`}>
      {burstKeyframes}
      {isLoggedIn ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onToggle()}
          className={`relative inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors w-fit ${
            state.liked
              ? 'border-red-400 bg-red-50 text-red-700 shadow-sm shadow-red-100'
              : 'border-rose-300 bg-rose-50 text-rose-800 hover:border-red-400 hover:bg-red-50'
          } disabled:opacity-60`}
          aria-pressed={state.liked}
        >
          {burstLayer}
          {heart}
          <span>{state.liked ? 'Liked' : 'Like'}</span>
          <span className={`text-gray-600 ${countClass}`}>{state.count}</span>
        </button>
      ) : (
        <p className="text-sm text-gray-600">
          <Link
            href={loginHref}
            className="relative inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 font-medium text-rose-800 hover:border-red-400 hover:bg-red-50"
          >
            {heart}
            <span>Like</span>
            <span className={`text-gray-600 ${countClass}`}>{state.count}</span>
          </Link>
          <span className="ml-2 text-gray-500">
            <Link href={loginHref} className="text-red-600 hover:underline">
              Log in
            </Link>{' '}
            to like this product.
          </span>
        </p>
      )}
    </div>
  )
}
