import { describe, expect, it } from 'vitest'
import type { FundraisingOutreachTarget } from './types'
import {
  assignInsertIds,
  normalizeImportEmail,
  normalizeImportOrgType,
  parseOutreachTargetImportText,
  planOutreachTargetImport,
  OUTREACH_TARGET_IMPORT_MAX_ROWS,
} from './outreachTargetImport'

function target(
  partial: Partial<FundraisingOutreachTarget> & Pick<FundraisingOutreachTarget, 'id' | 'organizationName'>
): FundraisingOutreachTarget {
  return {
    status: 'PENDING',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('normalizeImportEmail', () => {
  it('lowercases and accepts simple emails', () => {
    expect(normalizeImportEmail('  Admin@School.EDU.AU ')).toBe('admin@school.edu.au')
  })

  it('rejects blank, no-at, no-domain-dot, or spaces', () => {
    expect(normalizeImportEmail('')).toBeNull()
    expect(normalizeImportEmail('not-an-email')).toBeNull()
    expect(normalizeImportEmail('a@b')).toBeNull()
    expect(normalizeImportEmail('a b@c.com')).toBeNull()
  })
})

describe('normalizeImportOrgType', () => {
  it('maps aliases and snake keys', () => {
    expect(normalizeImportOrgType('Kinder')).toBe('kindergarten')
    expect(normalizeImportOrgType('primary school')).toBe('primary_school')
    expect(normalizeImportOrgType('daycare')).toBe('daycare')
  })

  it('returns undefined for unknown labels', () => {
    expect(normalizeImportOrgType('scout troop')).toBeUndefined()
  })
})

describe('parseOutreachTargetImportText', () => {
  it('parses CSV with header aliases', () => {
    const text = [
      'Organisation,Email,Contact,Type,State,Notes',
      'Sunnybank Kinder,office@sunny.edu.au,Jane,kindergarten,QLD,warm lead',
      '"Quoted, Org",info@quoted.edu.au,,,NSW,',
    ].join('\n')
    const { rows, parseErrors } = parseOutreachTargetImportText(text)
    expect(parseErrors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0].organizationName).toBe('Sunnybank Kinder')
    expect(rows[0].contactEmail).toBe('office@sunny.edu.au')
    expect(rows[0].contactName).toBe('Jane')
    expect(rows[1].organizationName).toBe('Quoted, Org')
  })

  it('parses JSON array', () => {
    const { rows } = parseOutreachTargetImportText(
      JSON.stringify([
        { organizationName: 'ELC One', contactEmail: 'a@elc.com.au', orgType: 'daycare' },
      ])
    )
    expect(rows[0].organizationName).toBe('ELC One')
    expect(rows[0].orgType).toBe('daycare')
  })

  it('parses pipe lines without header', () => {
    const { rows } = parseOutreachTargetImportText(
      'Westside Primary | hello@west.edu.au | Sam | primary_school | VIC'
    )
    expect(rows[0].organizationName).toBe('Westside Primary')
    expect(rows[0].state).toBe('VIC')
  })

  it('truncates above max rows', () => {
    const header = 'organizationName,contactEmail\n'
    const body = Array.from({ length: OUTREACH_TARGET_IMPORT_MAX_ROWS + 5 }, (_, i) =>
      `Org ${i},org${i}@example.com.au`
    ).join('\n')
    const { rows, truncated, parseErrors } = parseOutreachTargetImportText(header + body)
    expect(truncated).toBe(true)
    expect(rows).toHaveLength(OUTREACH_TARGET_IMPORT_MAX_ROWS)
    expect(parseErrors.some((e) => e.includes(String(OUTREACH_TARGET_IMPORT_MAX_ROWS)))).toBe(true)
  })
})

describe('planOutreachTargetImport', () => {
  it('inserts new emails and updates PENDING', () => {
    const existing = new Map([
      [
        'keep@school.edu.au',
        target({
          id: 'OT-KEEP-1',
          organizationName: 'Old Name',
          contactEmail: 'keep@school.edu.au',
          status: 'PENDING',
        }),
      ],
    ])
    const plan = planOutreachTargetImport(
      [
        { organizationName: 'New Org', contactEmail: 'new@school.edu.au' },
        { organizationName: 'Keep Updated', contactEmail: 'keep@school.edu.au', notes: 'n1' },
      ],
      existing
    )
    expect(plan.inserted).toBe(1)
    expect(plan.updated).toBe(1)
    expect(plan.skipped).toBe(0)
    expect(plan.decisions[0].action).toBe('insert')
    expect(plan.decisions[1].action).toBe('update')
  })

  it('skips CONTACTED / OPTED_OUT and invalid rows', () => {
    const existing = new Map([
      [
        'sent@school.edu.au',
        target({
          id: 'OT-SENT-1',
          organizationName: 'Sent',
          contactEmail: 'sent@school.edu.au',
          status: 'CONTACTED',
        }),
      ],
      [
        'out@school.edu.au',
        target({
          id: 'OT-OUT-1',
          organizationName: 'Out',
          contactEmail: 'out@school.edu.au',
          status: 'OPTED_OUT',
        }),
      ],
    ])
    const plan = planOutreachTargetImport(
      [
        { organizationName: 'Sent', contactEmail: 'sent@school.edu.au' },
        { organizationName: 'Out', contactEmail: 'out@school.edu.au' },
        { organizationName: 'No Email', contactEmail: '' },
        { organizationName: '', contactEmail: 'x@y.com.au' },
      ],
      existing
    )
    expect(plan.inserted).toBe(0)
    expect(plan.updated).toBe(0)
    expect(plan.skipped).toBe(4)
    expect(plan.decisions.map((d) => (d.action === 'skip' ? d.reason : d.action))).toEqual([
      'status_locked',
      'status_locked',
      'missing_or_invalid_email',
      'missing_organization',
    ])
  })

  it('keeps last duplicate email in batch', () => {
    const plan = planOutreachTargetImport(
      [
        { organizationName: 'First', contactEmail: 'dup@school.edu.au' },
        { organizationName: 'Second', contactEmail: 'dup@school.edu.au', contactName: 'Pat' },
      ],
      new Map()
    )
    expect(plan.inserted).toBe(1)
    expect(plan.skipped).toBe(1)
    const insert = plan.decisions.find((d) => d.action === 'insert')
    expect(insert && insert.action === 'insert' && insert.row.organizationName).toBe('Second')
  })

  it('assignInsertIds uses OT sequence', () => {
    const plan = planOutreachTargetImport(
      [{ organizationName: 'Sunnybank Kindergarten', contactEmail: 'a@s.edu.au' }],
      new Map()
    )
    const ids = assignInsertIds(plan, ['OT-SUNNYBAN-1'])
    expect([...ids.values()][0]).toBe('OT-SUNNYBAN-2')
  })
})
