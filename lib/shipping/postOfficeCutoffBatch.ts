import type { OrderRecord } from '@/lib/store'

export const POST_OFFICE_CUTOFF_TZ = 'Australia/Brisbane'
/** Previous post-office run (start of accumulation window). */
export const POST_OFFICE_WINDOW_START_HOUR = 10
/** Print/pack deadline before today's ~10:00 post-office trip. */
export const POST_OFFICE_WINDOW_END_HOUR = 8

type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

/**
 * Convert a wall-clock date/time in `timeZone` to a UTC Date (DST-safe via iteration).
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = POST_OFFICE_CUTOFF_TZ
): Date {
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  let utcMs = targetAsUtc
  for (let i = 0; i < 4; i++) {
    const p = getZonedParts(new Date(utcMs), timeZone)
    const shownAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0)
    utcMs += targetAsUtc - shownAsUtc
  }
  return new Date(utcMs)
}

export type PostOfficeCutoffWindow = {
  start: Date
  end: Date
  timeZone: string
  /** Human-readable Brisbane range for confirm dialogs */
  labelEn: string
}

/**
 * Daily post-office batch window:
 * yesterday 10:00 → today 08:00 (Australia/Brisbane).
 */
export function getPostOfficeCutoffWindow(now: Date = new Date()): PostOfficeCutoffWindow {
  const timeZone = POST_OFFICE_CUTOFF_TZ
  const today = getZonedParts(now, timeZone)
  const end = zonedWallTimeToUtc(
    today.year,
    today.month,
    today.day,
    POST_OFFICE_WINDOW_END_HOUR,
    0,
    timeZone
  )

  const todayNoon = zonedWallTimeToUtc(today.year, today.month, today.day, 12, 0, timeZone)
  const yesterday = getZonedParts(new Date(todayNoon.getTime() - 24 * 60 * 60 * 1000), timeZone)
  const start = zonedWallTimeToUtc(
    yesterday.year,
    yesterday.month,
    yesterday.day,
    POST_OFFICE_WINDOW_START_HOUR,
    0,
    timeZone
  )

  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return {
    start,
    end,
    timeZone,
    labelEn: `${fmt.format(start)} → ${fmt.format(end)} (${timeZone})`,
  }
}

function isClickAndCollect(order: OrderRecord): boolean {
  return (
    order.shippingOptionId === 'local-pickup' ||
    order.shippingOptionId === 'click-collect-mansfield' ||
    Boolean(order.shippingOptionName?.toLowerCase().includes('click & collect'))
  )
}

function isCutoffPrintableStatus(status: string): boolean {
  return status === 'paid' || status === 'processing' || status === 'approved'
}

export type CutoffBatchSelectOptions = {
  /** Include orders that already have an internal label on file (default false). */
  includeAlreadyLabeled?: boolean
  now?: Date
}

/**
 * Orders for the daily post-office Avery 4-up batch.
 * Excludes Click & Collect, unpaid/cancelled/shipped, and (by default) already-labeled.
 */
export function selectPostOfficeCutoffOrders(
  orders: OrderRecord[],
  options?: CutoffBatchSelectOptions
): { window: PostOfficeCutoffWindow; orders: OrderRecord[] } {
  const window = getPostOfficeCutoffWindow(options?.now)
  const startMs = window.start.getTime()
  const endMs = window.end.getTime()
  const includeAlreadyLabeled = Boolean(options?.includeAlreadyLabeled)

  const selected = orders
    .filter((o) => {
      const t = new Date(o.createdAtIso).getTime()
      if (!Number.isFinite(t) || t < startMs || t >= endMs) return false
      if (!isCutoffPrintableStatus(String(o.status || ''))) return false
      if (isClickAndCollect(o)) return false
      if (!includeAlreadyLabeled && o.ausPostShippingLabel?.status === 'created') return false
      return true
    })
    .sort((a, b) => new Date(a.createdAtIso).getTime() - new Date(b.createdAtIso).getTime())

  return { window, orders: selected }
}
