/**
 * Normalise bank / ledger transaction dates to YYYY-MM-DD.
 * Supports ISO, YYYY-MM-DD (padded or not), and Australian DD/MM/YYYY.
 */

export function toIsoDateString(raw: unknown): string | null {
  if (raw == null || raw === '') return null

    if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null
    const y = raw.getFullYear()
    // Reject absurd Date years (OCR leftovers like year 257)
    if (y < 1990 || y > 2100) return null
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw)
    return toIsoDateString(d)
  }

  const s = String(raw).trim()
  if (!s) return null

  // YYYY-MM-DD or YYYY-M-D (pad months/days)
  const isoLoose = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoLoose) {
    const year = Number(isoLoose[1])
    const month = Number(isoLoose[2])
    const day = Number(isoLoose[3])
    // Buggy OCR leftovers like 2067-04-08 (from "267") → 2026-04-08
    if (year >= 2035 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const fixedYear = Number(`202${String(year).charAt(2)}`)
      if (fixedYear >= 2015 && fixedYear <= 2035) {
        return `${fixedYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
    if (year >= 1990 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return null
  }

  // OCR 3-digit year ISO-like "267-04-08" → 2026-04-08 (not 2067).
  // Pattern: leading 2 + tens digit of year + noise digit → 202{tens}.
  const ocrYear = s.match(/^(\d{3})-(\d{1,2})-(\d{1,2})/)
  if (ocrYear && /^2\d{2}$/.test(ocrYear[1])) {
    const year = Number(`202${ocrYear[1].charAt(1)}`)
    const month = Number(ocrYear[2])
    const day = Number(ocrYear[3])
    if (year >= 2015 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return null
  }

  // Already-stored buggy ISO "2067-04-08" (from old 267→2067 mapping)
  const absurdFuture = s.match(/^(20[3-9]\d)-(\d{1,2})-(\d{1,2})/)
  if (absurdFuture) {
    const badYear = Number(absurdFuture[1])
    if (badYear >= 2035) {
      const year = Number(`202${String(badYear).charAt(2)}`)
      const month = Number(absurdFuture[2])
      const day = Number(absurdFuture[3])
      if (year >= 2015 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }

  // DD/MM/YYYY or D/M/YYYY (Australian)
  const au = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (au) {
    const day = Number(au[1])
    const month = Number(au[2])
    const year = Number(au[3])
    if (year >= 1990 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return null
  }

  // DD/MM/YYY OCR year "08/04/267" → 2026-04-08
  const auOcr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{3})$/)
  if (auOcr && /^2\d{2}$/.test(auOcr[3])) {
    const day = Number(auOcr[1])
    const month = Number(auOcr[2])
    const year = Number(`202${auOcr[3].charAt(1)}`)
    if (year >= 2015 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return null
  }

  // Period id YYYY-MM → mid-month anchor
  const period = s.match(/^(\d{4})-(\d{2})$/)
  if (period) {
    const year = Number(period[1])
    const month = Number(period[2])
    if (year >= 1990 && year <= 2100 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-15`
    }
    return null
  }

  // Reject OCR / padded absurd ISO years (0257-10-30) before Date() fallback
  const absurdPadded = s.match(/^0*([1-9]\d{0,2})-(\d{1,2})-(\d{1,2})/)
  if (absurdPadded && Number(absurdPadded[1]) < 1990) {
    return null
  }

  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return toIsoDateString(d)
}

export function parseTransactionDate(raw: unknown): Date | null {
  const iso = toIsoDateString(raw)
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function latestTransactionIsoDate(
  transactions: Array<{ date?: unknown }>
): string | null {
  let latest: string | null = null
  for (const tx of transactions) {
    const iso = toIsoDateString(tx.date)
    if (!iso) continue
    if (!latest || iso > latest) latest = iso
  }
  return latest
}

/** YYYY-MM period id → ISO date in that month */
export function periodIdToIsoDate(periodId: string | null | undefined): string | null {
  if (!periodId) return null
  return toIsoDateString(periodId)
}
