/**
 * Homepage main-banner title style. Independent of Market S /hot-goods
 * Category Backgrounds, which always use charcoal-left.
 *
 * CMS Title/Subtitle only supply copy. Overlay is this field (or a one-slide
 * fallback for the live mum/family photo on `hero-3`).
 */
export const HOME_HERO_TEXT_OVERLAYS = ['white-center', 'charcoal-left'] as const

export type HomeHeroTextOverlay = (typeof HOME_HERO_TEXT_OVERLAYS)[number]

/** Live homepage slide 3 (Glow Time / family photo). Bundle default `hero-3` must set `white-center` explicitly. */
export const HOME_HERO_CHARCOAL_FALLBACK_SLIDE_ID = 'hero-3'

export function resolveHomeHeroTextOverlay(slide: {
  id?: string | null
  textOverlay?: string | null
}): HomeHeroTextOverlay {
  const raw = String(slide?.textOverlay || '').trim()
  if (raw === 'charcoal-left') return 'charcoal-left'
  if (raw === 'white-center') return 'white-center'
  if (String(slide?.id || '').trim() === HOME_HERO_CHARCOAL_FALLBACK_SLIDE_ID) {
    return 'charcoal-left'
  }
  return 'white-center'
}

export function isHomeHeroCharcoalLeft(slide: {
  id?: string | null
  textOverlay?: string | null
}): boolean {
  return resolveHomeHeroTextOverlay(slide) === 'charcoal-left'
}

/**
 * Full-viewport homepage hero uses `object-cover`. Portrait phones crop the
 * left wall (charcoal slot) unless we pin cover to the left; landscape
 * desktops keep center so the family stays in frame.
 */
export function homeHeroCoverObjectPosition(slide: {
  id?: string | null
  textOverlay?: string | null
}): 'left' | 'center' {
  return isHomeHeroCharcoalLeft(slide) ? 'left' : 'center'
}
