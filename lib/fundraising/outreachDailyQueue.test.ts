import { describe, expect, it } from 'vitest'
import type { FundraisingOutreachTarget } from './types'
import {
  assertBatchFitsDailyQuota,
  buildOutreachDailyQuota,
  isOutreachDailyQueueCandidate,
  OUTREACH_DAILY_SEND_CAP,
  pickOutreachDailyQueue,
} from './outreachDailyQueue'
import { sydneyCalendarDateKey } from './auFinancialQuarter'

function target(
  partial: Partial<FundraisingOutreachTarget> & Pick<FundraisingOutreachTarget, 'id' | 'organizationName'>
): FundraisingOutreachTarget {
  return {
    status: 'PENDING',
    contactEmail: 'a@school.edu.au',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('outreachDailyQueue', () => {
  it('counts lastSentAt on the Sydney calendar day only', () => {
    // 2026-09-03 10:00 Sydney = 2026-09-03T00:00:00.000Z (AEST UTC+10)
    const now = new Date('2026-09-03T05:00:00.000Z')
    expect(sydneyCalendarDateKey(now)).toBe('2026-09-03')
    const quota = buildOutreachDailyQuota(
      [
        { lastSentAt: '2026-09-03T01:00:00.000Z' }, // still 3 Sep Sydney
        { lastSentAt: '2026-09-02T12:00:00.000Z' }, // 2 Sep evening Sydney? 12:00Z = 22:00 AEST Sep 2
        { lastSentAt: '2026-09-03T14:00:00.000Z' }, // 4 Sep 00:00 AEST — next day
        { lastSentAt: undefined },
      ],
      now
    )
    expect(quota.dayKey).toBe('2026-09-03')
    expect(quota.sentToday).toBe(1)
    expect(quota.remaining).toBe(OUTREACH_DAILY_SEND_CAP - 1)
  })

  it('picks oldest PENDING with email up to remaining slots', () => {
    const picked = pickOutreachDailyQueue(
      [
        target({
          id: 'OT-B-1',
          organizationName: 'B',
          createdAt: '2026-02-01T00:00:00.000Z',
        }),
        target({
          id: 'OT-A-1',
          organizationName: 'A',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
        target({
          id: 'OT-C-1',
          organizationName: 'C',
          status: 'CONTACTED',
          createdAt: '2025-01-01T00:00:00.000Z',
        }),
        target({
          id: 'OT-D-1',
          organizationName: 'D',
          contactEmail: '',
          createdAt: '2025-06-01T00:00:00.000Z',
        }),
      ],
      1
    )
    expect(picked.map((t) => t.id)).toEqual(['OT-A-1'])
  })

  it('rejects candidates without PENDING + valid email', () => {
    expect(isOutreachDailyQueueCandidate(target({ id: '1', organizationName: 'x' }))).toBe(true)
    expect(
      isOutreachDailyQueueCandidate(
        target({ id: '2', organizationName: 'x', status: 'FAILED' })
      )
    ).toBe(false)
    expect(
      isOutreachDailyQueueCandidate(
        target({ id: '3', organizationName: 'x', contactEmail: 'bad' })
      )
    ).toBe(false)
  })

  it('assertBatchFitsDailyQuota blocks over-cap batches', () => {
    expect(assertBatchFitsDailyQuota({ batchSize: 3, remaining: 3 }).ok).toBe(true)
    expect(assertBatchFitsDailyQuota({ batchSize: 4, remaining: 3 }).ok).toBe(false)
    expect(assertBatchFitsDailyQuota({ batchSize: 1, remaining: 0 }).ok).toBe(false)
  })
})
