'use client'

import { useEffect, useRef, useState } from 'react'
import type { MixedLabelsPreviewSlot } from '@/lib/mixedLabelsTemplates'

type MixedLabelsSheetPreviewProps = {
  imageUrl: string
  name: string
  slots: MixedLabelsPreviewSlot[]
  fontFamily: string
  alt?: string
  className?: string
}

function slotFontPx(slot: MixedLabelsPreviewSlot, containerWidth: number): number {
  const w = Math.max(120, containerWidth)
  return Math.max(9, Math.round((slot.fontSizeRem / 0.65) * (w / 520)))
}

export default function MixedLabelsSheetPreview({
  imageUrl,
  name,
  slots,
  fontFamily,
  alt = 'Sheet preview',
  className = '',
}: MixedLabelsSheetPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(400)
  const displayName = name.trim()

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => setContainerWidth(el.clientWidth || 400)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [imageUrl])

  if (!imageUrl?.trim()) return null

  return (
    <div
      ref={containerRef}
      className={`relative inline-block max-w-full ${className}`}
    >
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-full max-h-[min(70vh,520px)] w-auto h-auto object-contain rounded-lg shadow-md block mx-auto"
        draggable={false}
      />
      {displayName
        ? slots.map((slot, index) => (
            <span
              key={`${slot.x}-${slot.y}-${index}`}
              className="absolute font-bold text-black text-center pointer-events-none select-none whitespace-nowrap leading-none"
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                transform: `translate(-50%, -50%)${slot.rotateDeg ? ` rotate(${slot.rotateDeg}deg)` : ''}`,
                fontFamily,
                fontSize: `${slotFontPx(slot, containerWidth)}px`,
                textShadow:
                  '0 0 3px rgba(255,255,255,0.95), 0 1px 4px rgba(0,0,0,0.4)',
              }}
              aria-hidden
            >
              {displayName}
            </span>
          ))
        : null}
    </div>
  )
}
