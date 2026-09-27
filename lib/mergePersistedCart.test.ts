import { describe, expect, it } from 'vitest'
import { mergeCartFromPersist } from './mergePersistedCart'

describe('mergeCartFromPersist', () => {
  it('keeps in-memory cart when persist snapshot is empty (Checkout race)', () => {
    const current = [{ product: { id: 's1' }, quantity: 1, customizations: {} }]
    expect(mergeCartFromPersist([], current)).toEqual(current)
    expect(mergeCartFromPersist(undefined, current)).toEqual(current)
    expect(mergeCartFromPersist(null, current)).toEqual(current)
  })

  it('restores persisted cart when memory is still empty (normal first paint)', () => {
    const disk = [{ product: { id: 'old' }, quantity: 2, customizations: {} }]
    expect(mergeCartFromPersist(disk, [])).toEqual(disk)
    expect(mergeCartFromPersist(disk, undefined)).toEqual(disk)
  })

  it('stays empty when both sides are empty', () => {
    expect(mergeCartFromPersist([], [])).toEqual([])
    expect(mergeCartFromPersist(undefined, [])).toEqual([])
  })

  it('prefers in-memory when both have items (add raced ahead of rehydrate)', () => {
    const current = [{ product: { id: 'new' }, quantity: 1, customizations: {} }]
    const disk = [{ product: { id: 'old' }, quantity: 1, customizations: {} }]
    expect(mergeCartFromPersist(disk, current)).toEqual(current)
  })
})
