/**
 * Fundraising Agent — licensed / official list source metadata (Step A).
 * No vendor API and no scrape: admins tag paste/CSV with provenance.
 */

export const OUTREACH_LIST_SOURCE_TYPES = [
  'admin_csv_paste',
  'licensed_list_upload',
  'official_directory_export',
] as const

export type OutreachListSourceType = (typeof OUTREACH_LIST_SOURCE_TYPES)[number]

export const OUTREACH_LIST_SOURCE_LABELS: Record<OutreachListSourceType, string> = {
  admin_csv_paste: 'Manual CSV / paste',
  licensed_list_upload: 'Licensed / purchased list',
  official_directory_export: 'Official directory export',
}

export type OutreachListSourceMeta = {
  importSource: OutreachListSourceType
  listName?: string
  licenseNote?: string
}

export function isOutreachListSourceType(raw: unknown): raw is OutreachListSourceType {
  return (
    typeof raw === 'string' &&
    (OUTREACH_LIST_SOURCE_TYPES as readonly string[]).includes(raw)
  )
}

/**
 * Normalize import provenance. Licensed/official sources require a list/vendor name.
 */
export function normalizeOutreachListSource(input: {
  importSource?: unknown
  listName?: unknown
  licenseNote?: unknown
}): { ok: true; meta: OutreachListSourceMeta } | { ok: false; error: string } {
  const importSource = isOutreachListSourceType(input.importSource)
    ? input.importSource
    : 'admin_csv_paste'
  const listName = String(input.listName || '')
    .trim()
    .slice(0, 120)
  const licenseNote = String(input.licenseNote || '')
    .trim()
    .slice(0, 500)

  if (
    (importSource === 'licensed_list_upload' ||
      importSource === 'official_directory_export') &&
    !listName
  ) {
    return {
      ok: false,
      error: 'Enter the list / vendor name for licensed or official directory imports.',
    }
  }

  const meta: OutreachListSourceMeta = { importSource }
  if (listName) meta.listName = listName
  if (licenseNote) meta.licenseNote = licenseNote
  return { ok: true, meta }
}
