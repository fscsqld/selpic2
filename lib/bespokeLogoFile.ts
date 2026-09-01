/** Shared PNG/SVG rules for Bespoke logo upload (storefront + API). */
export function isAllowedBespokeLogoFile(file: { name: string; type: string }): boolean {
  const rawType = (file.type || '').trim().toLowerCase()
  if (rawType === 'image/png' || rawType === 'image/x-png' || rawType === 'image/svg+xml') return true
  const name = (file.name || '').trim().toLowerCase()
  return name.endsWith('.png') || name.endsWith('.svg')
}
