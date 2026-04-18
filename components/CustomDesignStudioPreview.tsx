'use client'

import { useMemo } from 'react'
import { isStampsCheckoutEnabled } from '@/lib/stampsCommerce'

/** Same sheet framing as sticker customize (96×138mm incl. margins); content grid Extra Large 2×6 — generic studio, no product image. */
const CONTENT_WIDTH_MM = 92
const CONTENT_HEIGHT_MM = 136
const SHEET_MARGIN_MM = { left: 2, right: 2, top: 1, bottom: 1 }
const STUDIO_STICKER_GRID = { cols: 2, rows: 6, gapMm: 2 } as const

function computeStickerStudioLayout() {
  const { cols, rows, gapMm } = STUDIO_STICKER_GRID
  const contentWidthMm = CONTENT_WIDTH_MM
  const contentHeightMm = CONTENT_HEIGHT_MM
  const widthMm = (contentWidthMm - (cols - 1) * gapMm) / cols
  const heightMm = (contentHeightMm - (rows - 1) * gapMm) / rows
  const sheetWidthMm = contentWidthMm + SHEET_MARGIN_MM.left + SHEET_MARGIN_MM.right
  const sheetHeightMm = contentHeightMm + SHEET_MARGIN_MM.top + SHEET_MARGIN_MM.bottom
  return {
    cols,
    rows,
    gapMm,
    widthMm,
    heightMm,
    sheetWidthMm,
    sheetHeightMm,
    contentWidthMm,
    contentHeightMm,
  }
}

export type CustomDesignStudioPreviewProps = {
  categoryFilter: 'Stickers' | 'Stamps'
  customText: string
  lineMode: 'single' | 'two'
  twoLineFormat: 'affiliation-name' | 'name-phone'
  fontFamily: string
  color: string
}

function CellTypography({
  lines,
  lineMode,
  twoLineFormat,
  fontFamily,
  color,
}: {
  lines: string[]
  lineMode: 'single' | 'two'
  twoLineFormat: 'affiliation-name' | 'name-phone'
  fontFamily: string
  color: string
}) {
  const safe = lines.map((l) => (l.trim() === '' ? '\u00a0' : l))
  const isTwo = lineMode === 'two' && safe.length >= 2

  let primaryIdx = 0
  let secondaryIdx = 1
  if (isTwo) {
    if (twoLineFormat === 'affiliation-name') {
      primaryIdx = 1
      secondaryIdx = 0
    } else {
      primaryIdx = 0
      secondaryIdx = 1
    }
  }

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center px-0.5 text-center leading-tight"
      style={{ fontFamily, color }}
    >
      {safe.map((line, index) => {
        const isPrimary = !isTwo ? true : index === primaryIdx
        const sizeClass = isTwo
          ? isPrimary
            ? 'text-[clamp(7px,2.8vmin,14px)] font-bold'
            : 'text-[clamp(6px,2.2vmin,11px)] font-semibold opacity-95'
          : 'text-[clamp(8px,3.2vmin,16px)] font-bold'

        return (
          <div
            key={`${index}-${line.slice(0, 12)}`}
            className={`max-w-full break-words ${sizeClass}`}
            style={{
              wordBreak: 'break-word',
              textShadow: '0 1px 0 rgba(255,255,255,0.35)',
            }}
          >
            {line}
          </div>
        )
      })}
    </div>
  )
}

export default function CustomDesignStudioPreview({
  categoryFilter,
  customText,
  lineMode,
  twoLineFormat,
  fontFamily,
  color,
}: CustomDesignStudioPreviewProps) {
  const lines = useMemo(() => {
    const raw = customText.split('\n')
    return raw.length ? raw : ['']
  }, [customText])

  const layout = useMemo(() => computeStickerStudioLayout(), [])

  if (categoryFilter === 'Stamps') {
    return (
      <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center px-3 py-6 sm:min-h-[340px] sm:px-6 lg:min-h-[400px]">
        <div className="relative w-[88%] max-w-[260px] sm:max-w-[280px] lg:max-w-[300px]">
          <div className="aspect-[3/4] w-full rounded-lg border-2 border-dashed border-slate-400/70 bg-gradient-to-b from-white to-slate-50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.04),0_8px_28px_rgba(0,0,0,0.07)]">
            <div className="flex h-full flex-col items-center justify-center p-[8%]">
              <CellTypography
                lines={lines}
                lineMode={lineMode}
                twoLineFormat={twoLineFormat}
                fontFamily={fontFamily}
                color={color}
              />
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-1 -z-10 rounded-xl bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 blur-xl" />
        </div>
        <p className="mt-4 max-w-md px-2 text-center text-[10px] leading-snug text-slate-500 sm:text-[11px]">
          {isStampsCheckoutEnabled() ? (
            <>
              Studio preview — generic stamp frame. Final impression depends on the stamp product you select at checkout.
            </>
          ) : (
            <>
              <span className="font-semibold text-amber-700/90">Stamps are not available for purchase yet.</span> This is a
              design preview only (generic stamp frame). Checkout will open when stamp products launch.
            </>
          )}
        </p>
      </div>
    )
  }

  const totalCells = layout.cols * layout.rows
  const padTopPercentOfW = (SHEET_MARGIN_MM.top / layout.sheetWidthMm) * 100
  const padBottomPercentOfW = (SHEET_MARGIN_MM.bottom / layout.sheetWidthMm) * 100
  const padXPercentOfW = (SHEET_MARGIN_MM.left / layout.sheetWidthMm) * 100

  return (
    <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center px-2 py-4 sm:min-h-[360px] sm:px-4 sm:py-6 lg:min-h-[420px]">
      <div className="w-full max-w-[min(100%,360px)] sm:max-w-[420px] lg:max-w-[480px]">
        <div
          className="rounded-xl border border-slate-200/95 bg-[linear-gradient(165deg,#fdfdfd_0%,#f4f5f7_55%,#eceef2_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_40px_rgba(15,23,42,0.09)]"
          style={{
            aspectRatio: `${layout.sheetWidthMm} / ${layout.sheetHeightMm}`,
          }}
        >
          <div
            className="flex h-full w-full flex-col"
            style={{
              paddingLeft: `${padXPercentOfW}%`,
              paddingRight: `${padXPercentOfW}%`,
              paddingTop: `${padTopPercentOfW}%`,
              paddingBottom: `${padBottomPercentOfW}%`,
            }}
          >
            <div
              className="grid min-h-0 min-w-0 flex-1 gap-0.5 sm:gap-1 lg:gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => (
                <div
                  key={`cell-${i}`}
                  className="relative min-h-0 min-w-0 overflow-hidden rounded-[3px] border border-slate-300/45 bg-white/85 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.35)_0%,transparent_45%)]" />
                  <div className="relative flex h-full w-full items-center justify-center">
                    <CellTypography
                      lines={lines}
                      lineMode={lineMode}
                      twoLineFormat={twoLineFormat}
                      fontFamily={fontFamily}
                      color={color}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 px-1 text-center text-[10px] leading-snug text-slate-500 sm:mt-4 sm:text-[11px]">
          Studio preview — {layout.cols}×{layout.rows} generic label grid ({layout.sheetWidthMm}×{layout.sheetHeightMm}
          mm sheet proportion). Not tied to a specific SKU; typography reference only.
        </p>
      </div>
    </div>
  )
}
