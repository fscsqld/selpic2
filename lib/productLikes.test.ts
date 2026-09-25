import { describe, expect, it } from 'vitest'
import {
  aggregateLikeCounts,
  normalizeProductLikeId,
  parseProductLikeIdsQuery,
  sortLikeSummary,
} from './productLikes'

describe('normalizeProductLikeId', () => {
  it('accepts catalog-style ids', () => {
    expect(normalizeProductLikeId('1776300849353')).toBe('1776300849353')
  })

  it('rejects empty and unsafe', () => {
    expect(normalizeProductLikeId('')).toBeNull()
    expect(normalizeProductLikeId('../x')).toBeNull()
  })
})

describe('parseProductLikeIdsQuery', () => {
  it('dedupes and caps', () => {
    expect(parseProductLikeIdsQuery('a,a,b')).toEqual(['a', 'b'])
  })
})

describe('aggregateLikeCounts + sort', () => {
  it('counts and sorts descending', () => {
    const map = aggregateLikeCounts([
      { product_id: 'p1' },
      { product_id: 'p2' },
      { product_id: 'p1' },
    ])
    expect(map.get('p1')).toBe(2)
    expect(sortLikeSummary(map)[0]).toEqual({ productId: 'p1', count: 2 })
  })
})
