/** Customer-facing Bespoke Labels copy helpers. Do not put HMR / roadmap notes on the storefront. */

export const BESPOKE_TYPE_E_ROLL = 'Type E (Slim White Iron-on)'
export const BESPOKE_TYPE_E_ROLL_LEGACY = 'Type E (Slim White Iron-onl)'

export const BESPOKE_ROLL_TYPES = [
  'Type A (Hologram)',
  'Type B (9-Color Pearl)',
  'Type C (Pearl White Plain)',
  'Type D (Crystal Clear)',
  BESPOKE_TYPE_E_ROLL,
  'Type F (Additional Character Rolls)',
] as const

const BESPOKE_DEFAULT_SUBTITLE = 'The Ultimate Tailor-Made Sticker Experience.'

/** Fix the Type E typo without losing older saved requests. */
export function displayBespokeRollType(value: string): string {
  return value.replace(/\bIron-onl\b/gi, 'Iron-on')
}

export function isTypeERoll(value: string | null | undefined): boolean {
  if (!value) return false
  return displayBespokeRollType(value) === BESPOKE_TYPE_E_ROLL
}

export function fontButtonSecondaryLine(label: string, displayName: string): string | null {
  const secondary = displayName.trim()
  if (!secondary || secondary === label.trim()) return null
  return secondary
}

export function bespokePageSubtitle(
  cmsSubtitle: string | null | undefined,
  readyMadeCount: number,
  legacyNeedle: string
): string {
  if (cmsSubtitle && !cmsSubtitle.includes(legacyNeedle)) return cmsSubtitle
  if (readyMadeCount > 0) {
    return `${BESPOKE_DEFAULT_SUBTITLE} (${readyMadeCount} ready-made products, plus bespoke requests below.)`
  }
  return BESPOKE_DEFAULT_SUBTITLE
}
