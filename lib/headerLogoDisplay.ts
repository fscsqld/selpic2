/**
 * Static files that always exist under `public/` for storefront fallbacks.
 * Do not reference `/logo.svg` or `/images/logo.svg` — they are not shipped (404).
 */
export const STOREFRONT_LOGO_WEBP = '/images/logo.webp'
export const STOREFRONT_LOGO_PNG = '/images/logo.png'

/** Order PDF / admin preview when a product has no image. */
export const STOREFRONT_PRODUCT_IMAGE_PLACEHOLDER = STOREFRONT_LOGO_PNG

/**
 * Header / footer logo error chain. PNG/WebP only — SVGs removed after live 404 audit (2026-09-16).
 */
export const HEADER_LOGO_STATIC_FALLBACKS: readonly string[] = [
  STOREFRONT_LOGO_WEBP,
  STOREFRONT_LOGO_PNG,
  '/logo.webp',
  '/logo.png',
]
