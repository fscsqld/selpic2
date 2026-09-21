'use client'

import { useEffect, useRef, useState, type ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'
import {
  ADMIN_CHART_DEFAULT_HEIGHT,
  isSafeRechartsBox,
} from '@/lib/adminChartLayout'

type SafeResponsiveChartProps = {
  children: ReactElement
  height?: number
  className?: string
}

/**
 * Wait until the parent has a real pixel box, then mount Recharts.
 * Avoids width(-1)/height(-1) on first layout, period switches, and grid cells.
 */
export default function SafeResponsiveChart({
  children,
  height = ADMIN_CHART_DEFAULT_HEIGHT,
  className = '',
}: SafeResponsiveChartProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = frameRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      setBox({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const ready = isSafeRechartsBox(box.width, box.height)

  return (
    <div
      ref={frameRef}
      className={className}
      style={{ width: '100%', height, minWidth: 0, minHeight: height }}
    >
      {ready ? (
        <ResponsiveContainer
          width="100%"
          height={height}
          minWidth={1}
          minHeight={1}
          debounce={50}
          initialDimension={{ width: box.width, height }}
        >
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}
