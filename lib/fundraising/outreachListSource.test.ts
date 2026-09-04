import { describe, expect, it } from 'vitest'
import {
  normalizeOutreachListSource,
  isOutreachListSourceType,
} from './outreachListSource'

describe('outreachListSource', () => {
  it('defaults unknown source to admin_csv_paste', () => {
    const r = normalizeOutreachListSource({})
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.meta.importSource).toBe('admin_csv_paste')
  })

  it('requires list name for licensed / official sources', () => {
    expect(normalizeOutreachListSource({ importSource: 'licensed_list_upload' }).ok).toBe(
      false
    )
    expect(
      normalizeOutreachListSource({
        importSource: 'official_directory_export',
        listName: '  ',
      }).ok
    ).toBe(false)
    const ok = normalizeOutreachListSource({
      importSource: 'licensed_list_upload',
      listName: 'Vendor Co AU schools Q3',
      licenseNote: 'Purchased 2026-09',
    })
    expect(ok).toEqual({
      ok: true,
      meta: {
        importSource: 'licensed_list_upload',
        listName: 'Vendor Co AU schools Q3',
        licenseNote: 'Purchased 2026-09',
      },
    })
  })

  it('recognises source type guard', () => {
    expect(isOutreachListSourceType('licensed_list_upload')).toBe(true)
    expect(isOutreachListSourceType('scrape')).toBe(false)
  })
})
