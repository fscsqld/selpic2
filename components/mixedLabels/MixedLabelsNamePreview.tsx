'use client'

type Props = {
  name: string
  fontFamily: string
  maxLength?: number
  className?: string
}

/**
 * Name-only preview for Mixed Labels — no product sheet image or slot overlays.
 * Artwork is fixed at print; customers only personalize the name shown on every label.
 */
export default function MixedLabelsNamePreview({
  name,
  fontFamily,
  maxLength = 12,
  className = '',
}: Props) {
  const displayName = name.trim()
  const previewSize =
    displayName.length <= 4
      ? 'text-4xl sm:text-5xl'
      : displayName.length <= 6
        ? 'text-3xl sm:text-4xl'
        : 'text-2xl sm:text-3xl'

  return (
    <div
      className={`flex flex-col items-center justify-center w-full min-h-[200px] sm:min-h-[280px] rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-8 ${className}`}
    >
      {displayName ? (
        <>
          <p
            className={`${previewSize} font-bold text-black text-center leading-tight break-all max-w-full`}
            style={{ fontFamily }}
            aria-live="polite"
          >
            {displayName}
          </p>
          <p className="mt-4 text-xs text-slate-500 text-center max-w-[240px] leading-relaxed">
            This name prints on every sticker on your sheet. Artwork and layout are fixed.
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-slate-400 uppercase tracking-widest">Your name</p>
          <p className="mt-3 text-xs text-slate-400 text-center max-w-[220px] leading-relaxed">
            Type your name in the sidebar — up to {maxLength} characters (English or Korean).
          </p>
        </>
      )}
    </div>
  )
}
