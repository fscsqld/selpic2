import { describe, expect, it } from 'vitest'
import {
  MARKET_S_HYGIENE_REFUND_BODY,
  MARKET_S_HYGIENE_REFUND_BODY_LEGACY,
  MARKET_S_HYGIENE_REFUND_LIST,
  MARKET_S_HYGIENE_REFUND_LIST_LEGACY,
} from './marketSHygieneCopy'
import {
  MARKET_S_PREORDER_REFUND_BODY,
  MARKET_S_PREORDER_REFUND_BODY_LEGACY,
  MARKET_S_PREORDER_REFUND_LIST,
  MARKET_S_PREORDER_REFUND_LIST_LEGACY,
} from './marketSPreorder'
import { migrateMarketSRefundPolicyContentItems } from './policyPageContent'

describe('migrateMarketSRefundPolicyContentItems', () => {
  it('upgrades legacy section 4/5 copy and inserts missing section 5', () => {
    const migrated = migrateMarketSRefundPolicyContentItems([
      {
        id: 'refund-16a',
        section: 'refund',
        title: 'Section 4 Content',
        content: MARKET_S_HYGIENE_REFUND_BODY_LEGACY,
      },
      {
        id: 'refund-17',
        section: 'refund',
        title: 'Section 4 List',
        content: MARKET_S_HYGIENE_REFUND_LIST_LEGACY,
      },
    ])

    expect(migrated.find((i) => i.title === 'Section 4 Content')?.content).toBe(
      MARKET_S_HYGIENE_REFUND_BODY
    )
    expect(migrated.find((i) => i.title === 'Section 4 List')?.content).toBe(
      MARKET_S_HYGIENE_REFUND_LIST
    )
    expect(migrated.find((i) => i.title === 'Section 5 Content')?.content).toBe(
      MARKET_S_PREORDER_REFUND_BODY
    )
    expect(migrated.find((i) => i.title === 'Section 5 List')?.content).toBe(
      MARKET_S_PREORDER_REFUND_LIST
    )
  })

  it('does not overwrite custom section 4 body', () => {
    const custom = 'Custom hygiene wording with ACL still mentioned.'
    const migrated = migrateMarketSRefundPolicyContentItems([
      {
        id: 'refund-16a',
        section: 'refund',
        title: 'Section 4 Content',
        content: custom,
      },
      {
        id: 'x',
        section: 'refund',
        title: 'Section 5 Content',
        content: MARKET_S_PREORDER_REFUND_BODY_LEGACY,
      },
      {
        id: 'y',
        section: 'refund',
        title: 'Section 5 List',
        content: MARKET_S_PREORDER_REFUND_LIST_LEGACY,
      },
      {
        id: 'z',
        section: 'refund',
        title: 'Section 5 Title',
        content: '5. Market S pre-orders',
      },
    ])
    expect(migrated.find((i) => i.title === 'Section 4 Content')?.content).toBe(custom)
    expect(migrated.find((i) => i.title === 'Section 5 Content')?.content).toBe(
      MARKET_S_PREORDER_REFUND_BODY
    )
  })
})
