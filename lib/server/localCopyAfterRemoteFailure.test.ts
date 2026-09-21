import { describe, expect, it } from 'vitest'
import { localCopyAfterRemoteFailure } from './localCopyAfterRemoteFailure'

describe('localCopyAfterRemoteFailure', () => {
  it('returns the local records when a real copy exists (local/dev)', () => {
    const local = [{ id: 'req-1' }]
    expect(localCopyAfterRemoteFailure(local)).toEqual(local)
  })

  it('does not treat an empty production file as source of truth after a remote timeout', () => {
    expect(localCopyAfterRemoteFailure([])).toBeNull()
  })
})
