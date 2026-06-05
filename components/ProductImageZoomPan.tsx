'use client'

import { useCallback, useRef, useState } from 'react'

type ProductImageZoomPanProps = {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  loading?: 'lazy' | 'eager'
  zoomScale?: number
  onError?: React.ReactEventHandler<HTMLImageElement>
}

const TAP_MOVE_THRESHOLD_PX = 8

/**
 * Click/tap to zoom, then move pointer to pan across areas hidden in the preview (eBay-style).
 */
export default function ProductImageZoomPan({
  src,
  alt,
  className = '',
  style,
  loading = 'lazy',
  zoomScale = 2.5,
  onError,
}: ProductImageZoomPanProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const didPanRef = useRef(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })

  const updateOriginFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    setOrigin({ x, y })
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const el = containerRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    didPanRef.current = false
    updateOriginFromEvent(e.clientX, e.clientY)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isZoomed) return
    if (pointerStartRef.current) {
      const dx = e.clientX - pointerStartRef.current.x
      const dy = e.clientY - pointerStartRef.current.y
      if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) {
        didPanRef.current = true
      }
    }
    updateOriginFromEvent(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const el = containerRef.current
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }

    const start = pointerStartRef.current
    pointerStartRef.current = null

    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const moved = Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX

    if (!moved && !didPanRef.current) {
      setIsZoomed((prev) => !prev)
    }
    didPanRef.current = false
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isZoomed) {
      setIsZoomed(false)
    }
  }

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-pressed={isZoomed}
      aria-label={
        isZoomed
          ? 'Zoomed product image. Move to explore. Click to exit zoom.'
          : 'Product image. Click to zoom.'
      }
      className={`product-image-zoom-pan relative w-full overflow-hidden bg-gray-50 select-none touch-none ${
        isZoomed ? 'cursor-move' : 'cursor-zoom-in'
      }`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading={loading}
        className={`block w-full h-full object-contain pointer-events-none ${className}`}
        style={{
          maxHeight: style?.maxHeight,
          transform: isZoomed ? `scale(${zoomScale})` : 'scale(1)',
          transformOrigin: `${origin.x}% ${origin.y}%`,
          transition: isZoomed ? 'transform 0.08s ease-out' : 'transform 0.2s ease-out',
        }}
        onError={onError}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2 transition-opacity ${
          isZoomed ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      >
        <span className="rounded bg-black/55 px-2 py-1 text-xs text-white">
          Move to explore · Click again to exit
        </span>
      </div>
    </div>
  )
}
