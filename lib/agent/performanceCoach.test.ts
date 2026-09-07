import { describe, expect, it } from 'vitest'
import {
  buildPerformanceOpportunities,
  emptyPerformanceCoachInputs,
  isThinProductCopy,
  summarizeThinProductCopy,
} from './performanceCoachBuild'

const emptyInputs = emptyPerformanceCoachInputs()

describe('isThinProductCopy', () => {
  it('skips out-of-stock products', () => {
    expect(
      isThinProductCopy({
        inStock: false,
        description: '',
        hasDetailPage: true,
      })
    ).toBe(false)
  })

  it('flags short listing copy when there is no solid PDP body', () => {
    expect(isThinProductCopy({ description: 'Short', inStock: true })).toBe(true)
  })

  it('does not flag a short card blurb when detailDescription is solid', () => {
    expect(
      isThinProductCopy({
        inStock: true,
        hasDetailPage: true,
        description: 'Cute animal name labels.',
        detailDescription: `${'Waterproof PET name labels for school bags and bottles. '.repeat(4)}`,
      })
    ).toBe(false)
  })

  it('flags hasDetailPage products when both short and detail are thin', () => {
    expect(
      isThinProductCopy({
        inStock: true,
        hasDetailPage: true,
        description: 'A reasonably long short description for the listing card area.',
        detailDescription: 'Too short detail',
      })
    ).toBe(true)
  })

  it('accepts solid listing without detail page', () => {
    expect(
      isThinProductCopy({
        inStock: true,
        hasDetailPage: false,
        description:
          'Clear durable personalisation for bags, bottles, and lunchboxes — made for Australian families.',
        detailDescription: '',
      })
    ).toBe(false)
  })
})

describe('buildPerformanceOpportunities', () => {
  it('returns empty when no signals fire', () => {
    expect(buildPerformanceOpportunities(emptyInputs)).toEqual([])
  })

  it('surfaces stale fundraising applications', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      stalePendingApps: [{ organizationName: 'Test School', daysPending: 10 }],
    })
    expect(cards.some((c) => c.id === 'fundraising_stale_pending')).toBe(true)
  })

  it('surfaces bank transfer pending orders', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      bankPendingCount: 2,
      bankPendingTotalAud: 120.5,
    })
    const card = cards.find((c) => c.id === 'bank_transfer_pending')
    expect(card?.metric).toContain('120.50')
    expect(card?.kind).toBe('ops')
  })

  it('surfaces traffic up with flat conversion', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      trafficRecent7: { pageviews: 200, uniqueVisitors: 80, orders: 2 },
      trafficPrior7: { pageviews: 100, uniqueVisitors: 50, orders: 2 },
    })
    expect(cards.some((c) => c.id === 'traffic_up_conversion_flat')).toBe(true)
  })

  it('surfaces revenue week down', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      revenueThisWeekAud: 400,
      revenuePriorWeekAud: 600,
    })
    expect(cards.some((c) => c.id === 'revenue_week_down')).toBe(true)
  })

  it('surfaces thin product copy with products deep-link', () => {
    const thin = summarizeThinProductCopy([
      {
        name: 'Stub SKU',
        description: 'x',
        detailDescription: '',
        inStock: true,
        hasDetailPage: true,
      },
    ])
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      thinProductCopy: thin,
    })
    const card = cards.find((c) => c.id === 'thin_product_copy')
    expect(card?.kind).toBe('site_upgrade')
    expect(card?.href).toBe('/admin/products')
    expect(card?.summary).toContain('Stub SKU')
  })

  it('does not count short card + rich detail as thin product copy', () => {
    const thin = summarizeThinProductCopy([
      {
        name: 'Cute Animal Friends Name label',
        description: 'Cute animal name labels.',
        detailDescription: `${'Full PDP body for school bags and bottles. '.repeat(6)}`,
        inStock: true,
        hasDetailPage: true,
      },
    ])
    expect(thin.count).toBe(0)
  })

  it('surfaces inbound backlog combining messages and bespoke', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      newInboundMessages: 2,
      newBespokeRequests: 1,
    })
    const card = cards.find((c) => c.id === 'inbound_queue_backlog')
    expect(card?.href).toBe('/admin/agent/inbound')
    expect(card?.title).toContain('3')
  })

  it('surfaces community pending drafts with titles and next steps', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      communityPendingDrafts: 2,
      communityDraftTitles: ['Artwork tips', 'Market S drop'],
      communityDraftItems: [
        { id: 'd1', title: 'Artwork tips' },
        { id: 'd2', title: 'Market S drop' },
      ],
    })
    const card = cards.find((c) => c.id === 'community_drafts_pending')
    expect(card?.href).toBe('/admin/agent/community')
    expect(card?.kind).toBe('site_upgrade')
    expect(card?.items?.[0]?.href).toContain('draft=d1')
    expect(card?.nextSteps?.length).toBeGreaterThanOrEqual(2)
  })

  it('attaches next steps on ops bank-transfer card', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      bankPendingCount: 1,
      bankPendingTotalAud: 40,
    })
    const card = cards.find((c) => c.id === 'bank_transfer_pending')
    expect(card?.nextSteps?.[0]).toMatch(/bank-transfer/i)
    expect(card?.nextSteps?.some((s) => /never auto/i.test(s))).toBe(true)
  })

  it('lists thin product sample names as items with product deep-links', () => {
    const thin = summarizeThinProductCopy([
      {
        id: 'sku-a',
        name: 'Stub A',
        description: 'x',
        detailDescription: '',
        inStock: true,
        hasDetailPage: true,
      },
      {
        id: 'sku-b',
        name: 'Stub B',
        description: 'y',
        detailDescription: '',
        inStock: true,
        hasDetailPage: true,
      },
    ])
    expect(thin.sampleNames).toEqual(['Stub A', 'Stub B'])
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      thinProductCopy: thin,
    })
    const card = cards.find((c) => c.id === 'thin_product_copy')
    expect(card?.items?.map((i) => i.label)).toEqual(['Stub A', 'Stub B'])
    expect(card?.items?.[0]?.href).toContain('q=sku-a')
    expect(card?.nextSteps?.[1]).toMatch(/Generate template|Polish/i)
  })

  it('surfaces newsletter idle when subscribers exist and no recent send', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      newsletterActiveSubscribers: 12,
      newsletterDaysSinceLastCampaign: 21,
    })
    const card = cards.find((c) => c.id === 'newsletter_idle')
    expect(card?.href).toBe('/admin/agent/newsletter')
    expect(card?.domain).toBe('newsletter')
    expect(card?.kind).toBe('site_upgrade')
  })

  it('surfaces newsletter idle when never sent (null) with active subscribers', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      newsletterActiveSubscribers: 3,
      newsletterDaysSinceLastCampaign: null,
    })
    expect(cards.some((c) => c.id === 'newsletter_idle')).toBe(true)
  })

  it('does not invent newsletter idle when campaign age is unknown', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      newsletterActiveSubscribers: 20,
      newsletterDaysSinceLastCampaign: undefined,
    })
    expect(cards.some((c) => c.id === 'newsletter_idle')).toBe(false)
  })

  it('does not surface newsletter idle under the 14-day threshold', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      newsletterActiveSubscribers: 20,
      newsletterDaysSinceLastCampaign: 7,
    })
    expect(cards.some((c) => c.id === 'newsletter_idle')).toBe(false)
  })

  it('includes fundraising reply subject and from in items', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      fundraisingOpenReplies: 2,
      fundraisingOpenReplyItems: [
        { subject: 'Re: partnership', fromEmail: 'school@example.edu.au' },
      ],
    })
    const card = cards.find((c) => c.id === 'fundraising_open_replies')
    expect(card?.items?.[0]?.label).toContain('partnership')
    expect(card?.items?.[0]?.detail).toContain('school@example.edu.au')
  })

  it('surfaces fundraising open replies without inventing a new sector href', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      fundraisingOpenReplies: 1,
    })
    const card = cards.find((c) => c.id === 'fundraising_open_replies')
    expect(card?.href).toBe('/admin/fundraising/agent')
  })

  it('ranks ops ahead of site_upgrade at the same severity', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyInputs,
      bankPendingCount: 1,
      bankPendingTotalAud: 10,
      communityPendingDrafts: 1,
    })
    expect(cards[0]?.kind).toBe('ops')
    expect(cards.some((c) => c.kind === 'site_upgrade')).toBe(true)
  })
})
