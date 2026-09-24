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
 * How the homepage *image* fills the full-viewport hero.
 *
 * Charcoal slides (live `hero-3`): `object-contain` below `lg` so the whole
 * 16:9 family photo is visible on phones — same idea as slide 1 video.
 * `lg+` stays `object-cover` so laptops keep the current full-bleed crop.
 *
 * White-center slides (1 video is not this helper; 2 is 1:1 cover) stay cover.
 */
export function homeHeroImageFit(slide: {
  id?: string | null
  textOverlay?: string | null
}): 'contain-mobile' | 'cover' {
  return isHomeHeroCharcoalLeft(slide) ? 'contain-mobile' : 'cover'
}
