'use client'

import { useStore } from '@/lib/store'
import { useContentStore } from '@/lib/contentStore'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import { useState, useEffect, useMemo } from 'react'
import { Type, Image as ImageIcon, Ruler, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { getStickerFonts, type FontConfig } from '@/lib/fontList'

/** Same numbering as Sticker Customization (Font 1–7) */
const STICKER_FONT_PRESET_LABELS: Record<string, string> = {
  andika: 'Font 1',
  'edu-nsw-act-foundation': 'Font 2',
  'edu-au-vic-wa-nt-hand': 'Font 3',
  'edu-sa-beginner': 'Font 4',
  'edu-tas-beginner': 'Font 5',
  'k-round-joy': 'Font 6',
  'nanum-myeongjo': 'Font 7'
}

/** Short guide per preset (aligned with Sticker Customization) */
const STICKER_FONT_GUIDE: Record<string, { description: string; recommendedUse: string }> = {
  andika: {
    description:
      'Humanist sans-serif, widely used in Queensland (QLD) for clear printing. Friendly and very legible at small sizes. Latin and many scripts; Korean may use a fallback.',
    recommendedUse: 'QLD schools, readable name tags, professional everyday labels.'
  },
  'edu-nsw-act-foundation': {
    description:
      'Official NSW & ACT school handwriting style—sincere, childlike, active. Ideal for education contexts in those regions. Latin; Korean may use a fallback.',
    recommendedUse: 'NSW & ACT school name labels and children’s stickers.'
  },
  'edu-au-vic-wa-nt-hand': {
    description:
      'Official handwriting style for VIC, WA & NT schools. Matches regional education standards. Latin; Korean may use a fallback.',
    recommendedUse: 'VIC, WA & NT school and family name labels.'
  },
  'edu-sa-beginner': {
    description:
      'SA beginner handwriting—sloped print, childlike feel from Foundation Fonts for Australian Schools. Latin; Korean may use a fallback.',
    recommendedUse: 'South Australia beginner handwriting and name labels.'
  },
  'edu-tas-beginner': {
    description:
      'Tasmanian precursive print style for early handwriting—clean and easy for children. Latin; Korean may use a fallback.',
    recommendedUse: 'Tasmania school and family name labels.'
  },
  'k-round-joy': {
    description:
      'Jua (K-Round Joy)—rounded Korean sans-serif, playful and friendly. Full Korean + English support.',
    recommendedUse: 'Kids, casual labels, clear Hangul; more playful than Font 7.'
  },
  'nanum-myeongjo': {
    description:
      'Gungsuh-style look first with Nanum Myeongjo fallback—traditional serif, formal and elegant. Korean + English.',
    recommendedUse: 'Formal name labels, certificates, traditional look; more serious than Font 6.'
  }
}

function presetLabel(id: string | null): string | null {
  if (!id) return null
  return STICKER_FONT_PRESET_LABELS[id] ?? id
}

function PresetFontGrid({
  fonts,
  selectedId,
  onSelect,
  title
}: {
  fonts: FontConfig[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  title: string
}) {
  const [previewLetters, setPreviewLetters] = useState<{ A: boolean; b: boolean; c: boolean }>({
    A: true,
    b: true,
    c: true
  })
  const [hoverId, setHoverId] = useState<string | null>(null)

  const previewText =
    (previewLetters.A ? 'A' : '') + (previewLetters.b ? 'b' : '') + (previewLetters.c ? 'c' : '')

  const previewFontFamily =
    (hoverId ? fonts.find((f) => f.id === hoverId)?.fontFamily : null) ||
    fonts.find((f) => f.id === selectedId)?.fontFamily ||
    fonts[0]?.fontFamily

  return (
    <div className="mb-4">
      <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-gray-700">Preview: click letters</span>
          <span className="text-[11px] text-gray-500">
            Hover a preset to preview its font
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {(['A', 'b', 'c'] as const).map((ch) => {
            const active = ch === 'A' ? previewLetters.A : ch === 'b' ? previewLetters.b : previewLetters.c
            return (
              <button
                key={ch}
                type="button"
                onClick={() =>
                  setPreviewLetters((prev) => ({
                    ...prev,
                    ...(ch === 'A'
                      ? { A: !prev.A }
                      : ch === 'b'
                        ? { b: !prev.b }
                        : { c: !prev.c })
                  }))
                }
                className={`px-2.5 py-1 text-xs md:text-sm rounded-lg border transition-colors ${
                  active
                    ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {ch}
              </button>
            )
          })}
        </div>
        <div className="text-center">
          <div
            className="text-3xl md:text-4xl font-bold leading-none text-gray-900"
            style={{ fontFamily: previewFontFamily }}
          >
            {previewText}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            {selectedId
              ? STICKER_FONT_PRESET_LABELS[selectedId] ?? fonts.find((f) => f.id === selectedId)?.displayName ?? selectedId
              : title}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-gray-700">{title}</span>
        {selectedId ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Clear selection
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {fonts.map((f) => {
          const label = STICKER_FONT_PRESET_LABELS[f.id] ?? f.displayName
          const active = selectedId === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelect(active ? null : f.id)}
              onMouseEnter={() => setHoverId(f.id)}
              onMouseLeave={() => setHoverId(null)}
              className={`rounded-xl border px-2 py-2.5 text-center transition-colors ${
                active
                  ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-200'
                  : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50'
              }`}
              style={{ fontFamily: f.fontFamily }}
            >
              <span className="block text-xs font-semibold text-gray-900">{label}</span>
              <span className="mt-0.5 block text-[10px] leading-tight text-gray-500 line-clamp-2">
                {f.displayName}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function clampFontPt(n: number) {
  return Math.min(120, Math.max(6, n))
}

function FontSizeControl({
  label,
  value,
  onChange,
  hint
}: {
  label: string
  value: number
  onChange: (n: number) => void
  hint?: string
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="range"
          min={6}
          max={120}
          step={1}
          value={value}
          onChange={(e) => onChange(clampFontPt(Number(e.target.value)))}
          className="flex-1 min-w-[140px] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <input
          type="number"
          min={6}
          max={120}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isFinite(n)) return
            onChange(clampFontPt(n))
          }}
          className="w-20 px-2 py-1.5 text-sm rounded-lg border border-gray-200 text-center"
          aria-label={label}
        />
        <span className="text-xs text-gray-500">pt</span>
      </div>
      {hint ? <p className="text-[11px] text-gray-400 mt-1">{hint}</p> : null}
    </div>
  )
}

export default function CustomStickersPage() {
  const { products } = useStore()
  const { subcategoryItems, _hasHydrated: contentHydrated } = useContentStore()
  const [isMounted, setIsMounted] = useState(false)

  /** 2. Text layout — drives which line inputs are shown and request payload */
  const [textLineMode, setTextLineMode] = useState<'single' | 'two'>('single')
  const [line1Text, setLine1Text] = useState('')
  const [line2Text, setLine2Text] = useState('')
  const [textLayoutNotes, setTextLayoutNotes] = useState('')

  /** 3. Font — customer-specified name + size (pt). Single line: one size; double line: per-line sizes */
  const [fontName, setFontName] = useState('')
  const [fontSource, setFontSource] = useState('')
  const [fontNotes, setFontNotes] = useState('')
  const [fontSizeSinglePt, setFontSizeSinglePt] = useState(12)
  const [fontSizeLine1Pt, setFontSizeLine1Pt] = useState(14)
  const [fontSizeLine2Pt, setFontSizeLine2Pt] = useState(10)
  /** Font 1–7 presets: single line uses one; double line uses separate line 1 / line 2 */
  const [selectedPresetSingle, setSelectedPresetSingle] = useState<string | null>(null)
  const [selectedPresetLine1, setSelectedPresetLine1] = useState<string | null>(null)
  const [selectedPresetLine2, setSelectedPresetLine2] = useState<string | null>(null)
  const [isFontGuideOpen, setIsFontGuideOpen] = useState(false)

  const stickerFontPresets = useMemo(() => getStickerFonts(), [])

  /** 1. Roll Type */
  const [selectedRoll, setSelectedRoll] = useState<string | null>(null)
  const [selectedRollVariant, setSelectedRollVariant] = useState<string | null>(null)
  const [rollNotes, setRollNotes] = useState('')
  const [characterProductName, setCharacterProductName] = useState('')

  /** 4. Logo */
  const [logoPlacementNotes, setLogoPlacementNotes] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [isSubmittingBespoke, setIsSubmittingBespoke] = useState(false)

  useEffect(() => {
    // Revoke object URLs to avoid memory leaks when user changes the selected file.
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    }
  }, [logoPreviewUrl])

  /** Contact + extra (right column) */
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Custom sticker products only
  const customStickers = products.filter(product => 
    product.category === 'Stickers' && product.subcategory === 'Custom'
  )

  // Subcategory copy from content store (if configured)
  const subcategoryInfo = isMounted && contentHydrated
    ? subcategoryItems.find(item => item.linkUrl === '/stickers/custom')
    : null

  /** localStorage may still serve old CMS strings; treat them as legacy and show current brand copy */
  const LEGACY_PAGE_TITLE = 'Custom Stickers'
  const LEGACY_SUBTITLE_NEEDLE = 'Personalized designs tailored to your unique style and preferences'

  const pageTitle =
    !subcategoryInfo?.pageTitle || subcategoryInfo.pageTitle === LEGACY_PAGE_TITLE
      ? 'Bespoke Labels'
      : subcategoryInfo.pageTitle

  const pageSubtitle =
    !subcategoryInfo?.pageSubtitle ||
    subcategoryInfo.pageSubtitle.includes(LEGACY_SUBTITLE_NEEDLE)
      ? `The Ultimate Tailor-Made Sticker Experience. (${customStickers.length} ready-made products, plus bespoke requests below.)`
      : subcategoryInfo.pageSubtitle

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Page header */}
        <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
            <p className="text-gray-600">
              {pageSubtitle}
            </p>
          <p className="text-gray-700 font-semibold tracking-wide mt-2">
            Think it. Design it. Stick it.
          </p>
        </div>

        {/* Bespoke name sticker request section */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left: options & free-text fields */}
            <div className="space-y-8">
              {/* Roll / frame */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  1. Roll Type
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    'Type A (Hologram)',
                    'Type B (9-Color Pearl)',
                    'Type C (Pearl White Plain)',
                    'Type D (Crystal Clear)',
                    'Type E (Slim White Iron-onl)',
                    'Type F (Additional Character Rolls)'
                  ].map((roll) => (
                    <button
                      key={roll}
                      type="button"
                      onClick={() => {
                        setSelectedRoll(roll)
                        setSelectedRollVariant(null)
                        if (roll !== 'Type F (Additional Character Rolls)') {
                          setCharacterProductName('')
                        }
                      }}
                      className={`py-2.5 text-xs md:text-sm rounded-xl border transition-colors ${
                        selectedRoll === roll
                          ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                          : 'border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      {roll}
                    </button>
                  ))}
                </div>

                {selectedRoll === 'Type A (Hologram)' && (
                  <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Type A (Hologram) - size</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          value: 'Hologram Medium (30mm×13mm)',
                          label: 'Hologram Medium (30mm×13mm)'
                        },
                        {
                          value: 'Hologram Large (46mm×16mm)',
                          label: 'Hologram Large (46mm×16mm)'
                        }
                      ].map((v) => {
                        const active = selectedRollVariant === v.value
                        return (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => setSelectedRollVariant(active ? null : v.value)}
                            className={`px-3 py-2 text-xs md:text-sm rounded-lg border transition-colors ${
                              active
                                ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            {v.label}
                          </button>
                        )
                      })}
                    </div>
                    
                  </div>
                )}

                {selectedRoll === 'Type B (9-Color Pearl)' && (
                  <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Type B (9-Color Pearl) - size</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: '9-Color Pearl Medium (30mm×13mm)', label: '9-Color Pearl Medium (30mm×13mm)' },
                        { value: '9-Color Pearl Large (47mm×15mm)', label: '9-Color Pearl Large (47mm×15mm)' }
                      ].map((v) => {
                        const active = selectedRollVariant === v.value
                        return (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => setSelectedRollVariant(active ? null : v.value)}
                            className={`px-3 py-2 text-xs md:text-sm rounded-lg border transition-colors ${
                              active
                                ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            {v.label}
                          </button>
                        )
                      })}
                    </div>
                    
                  </div>
                )}

                {selectedRoll === 'Type C (Pearl White Plain)' && (
                  <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Type C (Pearl White Plain) - size</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'Pearl White Plain Medium (30mm×15mm)', label: 'Pearl White Plain Medium (30mm×15mm)' }
                      ].map((v) => {
                        const active = selectedRollVariant === v.value
                        return (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => setSelectedRollVariant(active ? null : v.value)}
                            className={`px-3 py-2 text-xs md:text-sm rounded-lg border transition-colors ${
                              active
                                ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            {v.label}
                          </button>
                        )
                      })}
                    </div>
                    
                  </div>
                )}

                {selectedRoll === 'Type D (Crystal Clear)' && (
                  <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Type D (Crystal Clear) - size</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'Crystal Clear Medium (30mm×15mm)', label: 'Crystal Clear Medium (30mm×15mm)' }
                      ].map((v) => {
                        const active = selectedRollVariant === v.value
                        return (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => setSelectedRollVariant(active ? null : v.value)}
                            className={`px-3 py-2 text-xs md:text-sm rounded-lg border transition-colors ${
                              active
                                ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            {v.label}
                          </button>
                        )
                      })}
                    </div>
                    
                  </div>
                )}

                {selectedRoll === 'Type E (Slim White Iron-onl)' && (
                  <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Type E (Slim White Iron-onl) - size</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'Slim White Iron-on Medium (30mm×15mm)', label: 'Slim White Iron-on Medium (30mm×15mm)' }
                      ].map((v) => {
                        const active = selectedRollVariant === v.value
                        return (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => setSelectedRollVariant(active ? null : v.value)}
                            className={`px-3 py-2 text-xs md:text-sm rounded-lg border transition-colors ${
                              active
                                ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            {v.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {selectedRoll === 'Type F (Additional Character Rolls)' && (
                  <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Type F (Additional Character Rolls)</p>
                    <p className="text-[11px] text-gray-500 mb-3">
                      For character (non-plain) roll products. Enter the exact product name you want us to sell/produce.
                    </p>
                    <input
                      value={characterProductName}
                      onChange={(e) => setCharacterProductName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Character Roll - Name (or the product name from our catalog)"
                    />
                  </div>
                )}

                <textarea
                  value={rollNotes}
                  onChange={(e) => setRollNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Describe your preferred roll or size (e.g. 30mm×13mm hologram )"
                />
              </div>

              {/* Text lines */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  2. Text layout (single line / double line)
                </label>
                <div className="flex flex-wrap gap-2 mb-3 text-xs md:text-sm">
                  <button
                    type="button"
                    onClick={() => setTextLineMode('single')}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      textLineMode === 'single'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    Single line
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextLineMode('two')}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      textLineMode === 'two'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    Double line
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {textLineMode === 'single'
                    ? 'One line of text on the sticker. Use the notes field if you need exceptions.'
                    : 'Double line (e.g. name + phone). Line 2 is hidden in single-line mode.'}
                </p>
                <div className={`grid gap-3 mb-2 ${textLineMode === 'two' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {textLineMode === 'single' ? 'Text' : 'Line 1'}
                    </label>
                    <input
                      value={line1Text}
                      onChange={(e) => setLine1Text(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={textLineMode === 'single' ? 'e.g. name or brand' : 'e.g. name / brand'}
                    />
                  </div>
                  {textLineMode === 'two' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Line 2</label>
                      <input
                        value={line2Text}
                        onChange={(e) => setLine2Text(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. phone / tagline"
                      />
                    </div>
                  )}
                </div>
                <textarea
                  value={textLayoutNotes}
                  onChange={(e) => setTextLayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Any special text layout or language notes (e.g. mixed Korean + English, logo above / double line below)."
                />
              </div>

              {/* Font – guide + customer-specified */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  3. Font (your choice)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {textLineMode === 'single'
                    ? 'Choose one standard font (Font 1–7) for your single line, or skip and describe another font below.'
                    : 'Choose Font 1–7 separately for line 1 and line 2 (e.g. larger formal line 1 + smaller casual line 2). You can still add custom font notes below.'}
                </p>

                {/* Collapsible font descriptions */}
                <div className="mb-3 rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsFontGuideOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span>Font descriptions (Font 1–7)</span>
                    {isFontGuideOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                  </button>
                  {isFontGuideOpen && (
                    <div className="px-3 py-3 space-y-3 max-h-[320px] overflow-y-auto border-t border-gray-100 bg-white">
                      {stickerFontPresets.map((f) => {
                        const label = STICKER_FONT_PRESET_LABELS[f.id] ?? f.displayName
                        const g = STICKER_FONT_GUIDE[f.id]
                        return (
                          <div
                            key={f.id}
                            className="rounded-lg border border-gray-100 p-2.5 bg-gray-50/80"
                          >
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-900">{label}</span>
                              <span
                                className="text-[11px] text-gray-600 truncate max-w-[50%]"
                                style={{ fontFamily: f.fontFamily }}
                              >
                                {f.displayName}
                              </span>
                            </div>
                            {g ? (
                              <>
                                <p className="text-[11px] text-gray-600 leading-relaxed">{g.description}</p>
                                <p className="text-[11px] text-gray-500 mt-1 italic">
                                  <span className="font-medium not-italic text-gray-600">Best for: </span>
                                  {g.recommendedUse}
                                </p>
                              </>
                            ) : (
                              <p className="text-[11px] text-gray-500">Details on request.</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {textLineMode === 'single' ? (
                  <PresetFontGrid
                    fonts={stickerFontPresets}
                    selectedId={selectedPresetSingle}
                    onSelect={setSelectedPresetSingle}
                    title="Standard font preset (single line)"
                  />
                ) : (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-1 mb-2">
                    <p className="text-xs font-medium text-gray-800 mb-2">
                      Double-line mode: pick a preset for each line
                    </p>
                    <PresetFontGrid
                      fonts={stickerFontPresets}
                      selectedId={selectedPresetLine1}
                      onSelect={setSelectedPresetLine1}
                      title="Line 1 font preset"
                    />
                    <PresetFontGrid
                      fonts={stickerFontPresets}
                      selectedId={selectedPresetLine2}
                      onSelect={setSelectedPresetLine2}
                      title="Line 2 font preset"
                    />
                  </div>
                )}
                <input
                  value={fontName}
                  onChange={(e) => setFontName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                  placeholder="Other / exact font name (e.g. corporate font, different from presets)"
                />
                {textLineMode === 'single' ? (
                  <FontSizeControl
                    label="Font size — single line (approx. print height, points)"
                    value={fontSizeSinglePt}
                    onChange={setFontSizeSinglePt}
                    hint="Final size may be adjusted for legibility on your roll; we will confirm in review."
                  />
                ) : (
                  <div className="mb-1 space-y-1 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Font size — double line (set each line separately)
                    </p>
                    <FontSizeControl
                      label="Line 1 (e.g. name / brand)"
                      value={fontSizeLine1Pt}
                      onChange={setFontSizeLine1Pt}
                    />
                    <FontSizeControl
                      label="Line 2 (e.g. phone / tagline)"
                      value={fontSizeLine2Pt}
                      onChange={setFontSizeLine2Pt}
                    />
                    <p className="text-[11px] text-gray-400 pt-1">
                      Different sizes per line are common (e.g. larger line 1, smaller line 2). We will confirm fit on your roll.
                    </p>
                  </div>
                )}
                <textarea
                  value={fontNotes}
                  onChange={(e) => setFontNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Describe your preferred Font size (approx. print height, points)"
                />
              </div>

              {/* Logo / image + placement */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  4. Logo / image + placement
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center bg-gray-50 text-xs md:text-sm text-gray-500 mb-3">
                  <p className="mb-2">
                    Upload PNG or SVG here. Drag-and-drop placement on a canvas editor will be added in a future update.
                  </p>
                  <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/png,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        if (!file) {
                          setLogoFile(null)
                          if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
                          setLogoPreviewUrl(null)
                          return
                        }

                        const allowed = ['image/png', 'image/svg+xml']
                        const isAllowed = allowed.includes(file.type)
                        if (!isAllowed) {
                          alert('Only PNG or SVG files are allowed.')
                          e.target.value = ''
                          return
                        }

                        // Basic size guard (10MB).
                        const maxBytes = 10 * 1024 * 1024
                        if (file.size > maxBytes) {
                          alert('File is too large. Max size is 10MB.')
                          e.target.value = ''
                          return
                        }

                        if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
                        setLogoFile(file)
                        setLogoPreviewUrl(URL.createObjectURL(file))
                      }}
                    />
                    <span className="font-semibold text-gray-800">Choose file</span>
                    {logoFile ? (
                      <span className="text-[11px] text-gray-500 truncate max-w-[220px]">{logoFile.name}</span>
                    ) : (
                      <span className="text-[11px] text-gray-400">No file selected</span>
                    )}
                  </label>

                  {logoPreviewUrl ? (
                    <div className="mt-3 flex flex-col items-center gap-2">
                      {/* For svg, this renders as an image (not inline). */}
                      <img
                        src={logoPreviewUrl}
                        alt="Logo preview"
                        className="max-h-28 w-auto rounded-lg border border-gray-200 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null)
                          if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
                          setLogoPreviewUrl(null)
                        }}
                        className="text-[11px] text-gray-600 underline hover:text-gray-900"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
                <textarea
                  value={logoPlacementNotes}
                  onChange={(e) => setLogoPlacementNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Describe logo and text position, size, and alignment in detail."
                />
              </div>
            </div>

            {/* Right: summary & request form */}
            <div className="space-y-6">
              <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-7">
                <h2 className="text-lg md:text-xl font-semibold mb-3">
                  Bespoke name sticker — production request
                </h2>
                <p className="text-sm text-slate-300 mb-4">
                  Beyond standard options, describe the roll, font, layout, and logo use you want. Our team will review feasibility, estimated pricing, and how we can proceed with proofs or samples.
                </p>
                <div className="space-y-3 mb-4">
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Your name / contact person"
                  />
                  <input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Email"
                  />
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Phone (optional)"
                  />
                  <textarea
                    value={extraNotes}
                    onChange={(e) => setExtraNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-slate-700 bg-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    rows={3}
                    placeholder="Special finishes (foil, hologram, etc.), expected quantity, deadline, brand guidelines or reference image links — anything else we should know."
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (isSubmittingBespoke) return

                    if (selectedRoll === 'Type F (Additional Character Rolls)' && !characterProductName.trim()) {
                      setSubmitMessage('Please enter the character roll product name.')
                      setTimeout(() => setSubmitMessage(null), 6000)
                      return
                    }

                    const payload = {
                      roll: {
                        preset: selectedRoll,
                        variant: selectedRollVariant,
                        notes: rollNotes,
                        ...(selectedRoll === 'Type F (Additional Character Rolls)' && characterProductName.trim()
                          ? { characterProductName: characterProductName.trim() }
                          : {})
                      },
                      text: {
                        layout: textLineMode,
                        line1: line1Text,
                        line2: textLineMode === 'two' ? line2Text : '',
                        notes: textLayoutNotes
                      },
                      font: {
                        presets:
                          textLineMode === 'single'
                            ? {
                                mode: 'single' as const,
                                presetId: selectedPresetSingle,
                                presetLabel: presetLabel(selectedPresetSingle)
                              }
                            : {
                                mode: 'two' as const,
                                line1PresetId: selectedPresetLine1,
                                line1PresetLabel: presetLabel(selectedPresetLine1),
                                line2PresetId: selectedPresetLine2,
                                line2PresetLabel: presetLabel(selectedPresetLine2)
                              },
                        name: fontName,
                        source: fontSource,
                        notes: fontNotes,
                        sizes:
                          textLineMode === 'single'
                            ? { layout: 'single' as const, textPt: fontSizeSinglePt }
                            : {
                                layout: 'two' as const,
                                line1Pt: fontSizeLine1Pt,
                                line2Pt: fontSizeLine2Pt
                              }
                      },
                      logo: { placementNotes: logoPlacementNotes },
                      contact: {
                        name: contactName,
                        email: contactEmail,
                        phone: contactPhone,
                        extra: extraNotes
                      }
                    }

                    setIsSubmittingBespoke(true)
                    setSubmitMessage(null)

                    try {
                      const formData = new FormData()
                      formData.append('payload', JSON.stringify(payload))
                      if (logoFile) formData.append('logoFile', logoFile, logoFile.name)

                      const res = await fetch('/api/bespoke-requests/stickers/custom', {
                        method: 'POST',
                        body: formData
                      })

                      const data = await res.json().catch(() => ({}))
                      if (!res.ok) {
                        throw new Error(data?.message || 'Upload failed')
                      }

                      setSubmitMessage('Request submitted. Our admin team will review and follow up.')
                      setTimeout(() => setSubmitMessage(null), 8000)
                    } catch (err) {
                      console.error('Bespoke request submission failed:', err)
                      setSubmitMessage('Submission failed. Please try again.')
                      setTimeout(() => setSubmitMessage(null), 6000)
                    } finally {
                      setIsSubmittingBespoke(false)
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-sm md:text-base font-semibold shadow-lg shadow-blue-500/30 transition-colors"
                  disabled={isSubmittingBespoke}
                >
                  Submit request
                  <Send className="w-4 h-4" />
                </button>
                {submitMessage && (
                  <p className="mt-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-700/50 rounded-lg px-3 py-2">
                    {submitMessage}
                  </p>
                )}
                <p className="mt-3 text-[11px] text-slate-400">
                  * After submission, your file and request details are saved for admin review.
                </p>
              </div>

              <div className="text-xs md:text-sm text-gray-500">
                <h3 className="font-semibold text-gray-800 mb-2">Selpic bespoke process</h3>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>You describe roll, text, font, logo, and layout in your own words.</li>
                  <li>Selpic reviews fonts, print methods, and materials.</li>
                  <li>We suggest adjustments if needed and share estimated pricing.</li>
                  <li>After physical or digital proof approval, we confirm full production.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Ready-made custom sticker products — ProductCard (max 240×240px) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {customStickers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {customStickers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No custom stickers available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
