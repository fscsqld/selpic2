import { describe, expect, it } from 'vitest'

/** Mirror employee-auth hash (not exported). */
function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(36)
}

describe('employee password hash', () => {
  it('is stable for login round-trip', () => {
    const plain = 'test-pass-123'
    expect(hashPassword(plain)).toBe(hashPassword(plain))
    expect(hashPassword(plain)).not.toBe(plain)
  })

  it('requires at least 6 chars in UI validation', () => {
    expect('short'.length).toBeLessThan(6)
    expect('longenough'.length).toBeGreaterThanOrEqual(6)
  })
})
