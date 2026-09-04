/**
 * Fundraising Agent — outreach target CSV / paste import (Step 1 supply).
 * No scrape. Cap + email dedupe + status-aware merge plan.
 */

import type {
  FundraisingOrganizationType,
  FundraisingOutreachTarget,
  FundraisingOutreachTargetStatus,
} from './types'
import { FUNDRAISING_ORG_TYPE_OPTIONS } from './types'
import { newOutreachTargetId } from './ids'

export const OUTREACH_TARGET_IMPORT_MAX_ROWS = 200

export type OutreachImportRawRow = {
  organizationName: string
  contactEmail: string
  contactName?: string
  orgType?: string
  state?: string
  notes?: string
  /** 1-based source line (CSV body / JSON index hint). */
  sourceLine?: number
}

export type OutreachImportSkipReason =
  | 'missing_organization'
  | 'missing_or_invalid_email'
  | 'duplicate_in_batch'
  | 'status_locked'
  | 'empty_row'

export type OutreachImportDecision =
  | { action: 'insert'; row: OutreachImportRawRow; normalizedEmail: string }
  | {
      action: 'update'
      row: OutreachImportRawRow
      normalizedEmail: string
      existingId: string
      existing: FundraisingOutreachTarget
    }
  | {
      action: 'skip'
      row: OutreachImportRawRow
      reason: OutreachImportSkipReason
      existingId?: string
      existingStatus?: FundraisingOutreachTargetStatus
    }

export type OutreachImportPlan = {
  decisions: OutreachImportDecision[]
  inserted: number
  updated: number
  skipped: number
  truncated: boolean
  parseErrors: string[]
}

const ORG_HEADERS = new Set([
  'organizationname',
  'organisationname',
  'organization',
  'organisation',
  'org',
  'orgname',
  'name',
  'school',
  'centre',
  'center',
])

const EMAIL_HEADERS = new Set([
  'contactemail',
  'email',
  'e-mail',
  'mail',
  'contact_email',
  'orgemail',
])

const CONTACT_HEADERS = new Set([
  'contactname',
  'contact',
  'contact_person',
  'person',
  'attention',
])

const TYPE_HEADERS = new Set([
  'orgtype',
  'organisationtype',
  'organizationtype',
  'type',
  'org_type',
  'category',
])

const STATE_HEADERS = new Set(['state', 'locality', 'location', 'region', 'suburb'])

const NOTES_HEADERS = new Set(['notes', 'note', 'comment', 'comments', 'memo'])

const ORG_TYPE_ALIASES: Record<string, FundraisingOrganizationType> = {
  daycare: 'daycare',
  'day care': 'daycare',
  childcare: 'daycare',
  'child care': 'daycare',
  elc: 'daycare',
  'early learning': 'daycare',
  'early learning centre': 'daycare',
  'early learning center': 'daycare',
  kindergarten: 'kindergarten',
  kinder: 'kindergarten',
  preschool: 'kindergarten',
  'pre-school': 'kindergarten',
  primary: 'primary_school',
  'primary school': 'primary_school',
  primary_school: 'primary_school',
  high: 'high_school',
  'high school': 'high_school',
  high_school: 'high_school',
  secondary: 'high_school',
  university: 'university',
  uni: 'university',
  tertiary: 'university',
  daycare_kindergarten: 'daycare_kindergarten',
  'daycare / kindergarten': 'daycare_kindergarten',
  other: 'other',
}

const LOCKED_STATUSES = new Set<FundraisingOutreachTargetStatus>([
  'CONTACTED',
  'CONVERTED',
  'FAILED',
  'OPTED_OUT',
])

export function normalizeImportEmail(raw: string): string | null {
  const email = String(raw || '')
    .trim()
    .toLowerCase()
  if (!email || !email.includes('@')) return null
  const [local, domain] = email.split('@')
  if (!local || !domain || !domain.includes('.')) return null
  if (/\s/.test(email)) return null
  return email
}

export function normalizeImportOrgType(raw: string | undefined): string | undefined {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
  if (!s) return undefined
  if ((FUNDRAISING_ORG_TYPE_OPTIONS as string[]).includes(s.replace(/ /g, '_'))) {
    return s.replace(/ /g, '_')
  }
  const aliased = ORG_TYPE_ALIASES[s]
  if (aliased) return aliased
  const underscored = s.replace(/ /g, '_') as FundraisingOrganizationType
  if ((FUNDRAISING_ORG_TYPE_OPTIONS as string[]).includes(underscored)) return underscored
  return undefined
}

function normalizeHeader(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function pickField(map: Record<string, string>, keys: Set<string>): string {
  for (const [k, v] of Object.entries(map)) {
    if (keys.has(normalizeHeader(k))) return v
  }
  return ''
}

/** Minimal CSV/TSV line splitter (quoted fields, comma or tab). */
export function splitDelimitedLine(line: string, delimiter: ',' | '\t'): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === delimiter) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

function detectDelimiter(headerLine: string): ',' | '\t' {
  const tabs = (headerLine.match(/\t/g) || []).length
  const commas = (headerLine.match(/,/g) || []).length
  return tabs > commas ? '\t' : ','
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '')
}

function rowFromObject(obj: Record<string, unknown>, sourceLine?: number): OutreachImportRawRow {
  const flat: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj || {})) {
    if (v == null) continue
    flat[k] = String(v).trim()
  }
  return {
    organizationName: pickField(flat, ORG_HEADERS),
    contactEmail: pickField(flat, EMAIL_HEADERS),
    contactName: pickField(flat, CONTACT_HEADERS) || undefined,
    orgType: pickField(flat, TYPE_HEADERS) || undefined,
    state: pickField(flat, STATE_HEADERS) || undefined,
    notes: pickField(flat, NOTES_HEADERS) || undefined,
    sourceLine,
  }
}

/**
 * Parse paste/file text into raw rows.
 * Supports: JSON array, CSV/TSV with header, or pipe-separated fallback lines
 * `Org Name | email@x.com | Contact | type | state`.
 */
export function parseOutreachTargetImportText(text: string): {
  rows: OutreachImportRawRow[]
  parseErrors: string[]
  truncated: boolean
} {
  const parseErrors: string[] = []
  const trimmed = stripBom(String(text || '')).trim()
  if (!trimmed) {
    return { rows: [], parseErrors: ['Paste is empty.'], truncated: false }
  }

  let rows: OutreachImportRawRow[] = []

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      rows = arr.map((item, i) => {
        if (!item || typeof item !== 'object') {
          parseErrors.push(`JSON row ${i + 1}: expected an object`)
          return {
            organizationName: '',
            contactEmail: '',
            sourceLine: i + 1,
          }
        }
        return rowFromObject(item as Record<string, unknown>, i + 1)
      })
    } catch {
      parseErrors.push('Invalid JSON. Use a JSON array or CSV with a header row.')
      return { rows: [], parseErrors, truncated: false }
    }
  } else {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length === 0) {
      return { rows: [], parseErrors: ['No data rows.'], truncated: false }
    }

    const first = lines[0]
    const delim = detectDelimiter(first)
    const headerCells = splitDelimitedLine(first, delim)
    const normalizedHeaders = headerCells.map(normalizeHeader)
    const looksLikeHeader =
      normalizedHeaders.some((h) => ORG_HEADERS.has(h) || EMAIL_HEADERS.has(h)) ||
      /organisation|organization|email|org/i.test(first)

    if (looksLikeHeader && lines.length >= 2) {
      const headers = headerCells
      for (let i = 1; i < lines.length; i++) {
        const cells = splitDelimitedLine(lines[i], delim)
        const map: Record<string, string> = {}
        headers.forEach((h, idx) => {
          map[h] = cells[idx] ?? ''
        })
        rows.push(rowFromObject(map, i + 1))
      }
    } else {
      // Pipe or simple "name, email" lines without header
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes('|')) {
          const parts = line.split('|').map((p) => p.trim())
          rows.push({
            organizationName: parts[0] || '',
            contactEmail: parts[1] || '',
            contactName: parts[2] || undefined,
            orgType: parts[3] || undefined,
            state: parts[4] || undefined,
            notes: parts[5] || undefined,
            sourceLine: i + 1,
          })
        } else {
          const cells = splitDelimitedLine(line, detectDelimiter(line))
          rows.push({
            organizationName: cells[0] || '',
            contactEmail: cells[1] || '',
            contactName: cells[2] || undefined,
            orgType: cells[3] || undefined,
            state: cells[4] || undefined,
            notes: cells[5] || undefined,
            sourceLine: i + 1,
          })
        }
      }
    }
  }

  let truncated = false
  if (rows.length > OUTREACH_TARGET_IMPORT_MAX_ROWS) {
    truncated = true
    parseErrors.push(
      `Only the first ${OUTREACH_TARGET_IMPORT_MAX_ROWS} rows are imported (received ${rows.length}).`
    )
    rows = rows.slice(0, OUTREACH_TARGET_IMPORT_MAX_ROWS)
  }

  return { rows, parseErrors, truncated }
}

/**
 * Build insert/update/skip decisions against existing targets (matched by contact email).
 * Within a batch, duplicate emails keep the last non-empty org row; earlier ones are skipped.
 */
export function planOutreachTargetImport(
  rows: OutreachImportRawRow[],
  existingByEmail: Map<string, FundraisingOutreachTarget>
): OutreachImportPlan {
  const decisions: OutreachImportDecision[] = []
  const seenInBatch = new Map<string, number>() // email → decision index

  let inserted = 0
  let updated = 0
  let skipped = 0

  for (const raw of rows) {
    const organizationName = String(raw.organizationName || '').trim()
    const contactEmailRaw = String(raw.contactEmail || '').trim()
    const normalizedEmail = normalizeImportEmail(contactEmailRaw)

    if (!organizationName && !contactEmailRaw) {
      decisions.push({ action: 'skip', row: raw, reason: 'empty_row' })
      skipped++
      continue
    }
    if (!organizationName) {
      decisions.push({ action: 'skip', row: raw, reason: 'missing_organization' })
      skipped++
      continue
    }
    if (!normalizedEmail) {
      decisions.push({ action: 'skip', row: raw, reason: 'missing_or_invalid_email' })
      skipped++
      continue
    }

    const row: OutreachImportRawRow = {
      ...raw,
      organizationName,
      contactEmail: normalizedEmail,
      contactName: String(raw.contactName || '').trim() || undefined,
      orgType: normalizeImportOrgType(raw.orgType),
      state: String(raw.state || '').trim() || undefined,
      notes: String(raw.notes || '').trim() || undefined,
    }

    const prevIdx = seenInBatch.get(normalizedEmail)
    if (prevIdx != null) {
      const prev = decisions[prevIdx]
      if (prev.action === 'insert' || prev.action === 'update') {
        // Retract previous: count as duplicate skip, replace with latest
        if (prev.action === 'insert') inserted--
        if (prev.action === 'update') updated--
        skipped++
        decisions[prevIdx] = {
          action: 'skip',
          row: prev.row,
          reason: 'duplicate_in_batch',
        }
      }
    }

    const existing = existingByEmail.get(normalizedEmail)
    if (existing) {
      if (LOCKED_STATUSES.has(existing.status)) {
        decisions.push({
          action: 'skip',
          row,
          reason: 'status_locked',
          existingId: existing.id,
          existingStatus: existing.status,
        })
        skipped++
        seenInBatch.set(normalizedEmail, decisions.length - 1)
        continue
      }
      // PENDING (and any unexpected writable status): update
      decisions.push({
        action: 'update',
        row,
        normalizedEmail,
        existingId: existing.id,
        existing,
      })
      updated++
      seenInBatch.set(normalizedEmail, decisions.length - 1)
      continue
    }

    decisions.push({ action: 'insert', row, normalizedEmail })
    inserted++
    seenInBatch.set(normalizedEmail, decisions.length - 1)
  }

  return {
    decisions,
    inserted,
    updated,
    skipped,
    truncated: false,
    parseErrors: [],
  }
}

export function buildTargetFromImportRow(opts: {
  row: OutreachImportRawRow
  id: string
  existing?: FundraisingOutreachTarget | null
  nowIso: string
}): FundraisingOutreachTarget {
  const { row, id, existing, nowIso } = opts
  const notes = row.notes
  const payload = {
    ...(existing?.payload || {}),
    ...(notes ? { notes } : {}),
    importSource: 'admin_csv_paste',
    importedAt: nowIso,
  }
  return {
    id,
    organizationName: row.organizationName,
    contactEmail: row.contactEmail,
    contactName: row.contactName || existing?.contactName,
    orgType: row.orgType || existing?.orgType,
    state: row.state || existing?.state,
    status: existing?.status === 'PENDING' ? 'PENDING' : existing?.status || 'PENDING',
    lastSentAt: existing?.lastSentAt,
    lastError: existing?.lastError,
    convertedPartnerId: existing?.convertedPartnerId,
    payload,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  }
}

/** Allocate OT-* ids for all insert decisions; mutates a working id list. */
export function assignInsertIds(
  plan: OutreachImportPlan,
  existingIds: string[]
): Map<number, string> {
  const ids = [...existingIds]
  const map = new Map<number, string>()
  plan.decisions.forEach((d, idx) => {
    if (d.action !== 'insert') return
    const id = newOutreachTargetId(d.row.organizationName, ids)
    ids.push(id)
    map.set(idx, id)
  })
  return map
}
