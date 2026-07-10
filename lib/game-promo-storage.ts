import {
  GAME_LEVEL_5_REWARD,
  GAME_PROMO_GUEST_STORAGE_KEY,
  gamePromoUserStorageKey,
} from '@/lib/game-promo-constants'

export interface GamePromoEntry {
  code: string
  date: string
  score?: number
  level?: number
  source?: string
}

function parseEntries(raw: string | null): GamePromoEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.code === 'string') : []
  } catch {
    return []
  }
}

function writeEntries(key: string, entries: GamePromoEntry[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(entries))
}

function mergeByCode(a: GamePromoEntry[], b: GamePromoEntry[]): GamePromoEntry[] {
  const map = new Map<string, GamePromoEntry>()
  for (const entry of [...a, ...b]) {
    const prev = map.get(entry.code)
    if (!prev) {
      map.set(entry.code, entry)
      continue
    }
    const prevTime = new Date(prev.date || 0).getTime()
    const nextTime = new Date(entry.date || 0).getTime()
    if (nextTime >= prevTime) map.set(entry.code, entry)
  }
  return Array.from(map.values()).sort(
    (x, y) => new Date(y.date || 0).getTime() - new Date(x.date || 0).getTime()
  )
}

/** Move guest-earned codes onto the logged-in user key (same browser). */
export function migrateGuestGamePromoCodesToUser(userId: string): void {
  if (typeof window === 'undefined' || !userId) return

  const userKey = gamePromoUserStorageKey(userId)
  const guestEntries = parseEntries(window.localStorage.getItem(GAME_PROMO_GUEST_STORAGE_KEY))
  if (guestEntries.length === 0) return

  const userEntries = parseEntries(window.localStorage.getItem(userKey))
  const merged = mergeByCode(userEntries, guestEntries)
  writeEntries(userKey, merged)

  const remainingGuest = guestEntries.filter(
    (g) => !merged.some((m) => m.code === g.code && m.source === g.source)
  )
  if (remainingGuest.length === 0) {
    window.localStorage.removeItem(GAME_PROMO_GUEST_STORAGE_KEY)
  } else {
    writeEntries(GAME_PROMO_GUEST_STORAGE_KEY, remainingGuest)
  }
}

export function loadGamePromoEntries(userId?: string | null): GamePromoEntry[] {
  if (typeof window === 'undefined') return []

  if (userId) {
    migrateGuestGamePromoCodesToUser(userId)
    return parseEntries(window.localStorage.getItem(gamePromoUserStorageKey(userId)))
  }

  return parseEntries(window.localStorage.getItem(GAME_PROMO_GUEST_STORAGE_KEY))
}

export function getFinalLevelRewardEntries(entries: GamePromoEntry[]): GamePromoEntry[] {
  return entries.filter((e) => e.source === GAME_LEVEL_5_REWARD.source)
}
