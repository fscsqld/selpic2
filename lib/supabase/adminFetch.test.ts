import { describe, expect, it } from 'vitest'
import { createSupabaseAdminFetch, retryTransientSupabaseOp } from './adminFetch'

function connectTimeoutFetchFailed(): TypeError {
  const timeout = Object.assign(
    new Error('Connect Timeout Error (attempted address: 104.18.38.10:443, timeout: 10000ms)'),
    { name: 'ConnectTimeoutError', code: 'UND_ERR_CONNECT_TIMEOUT' }
  )
  const wrapped = new TypeError('fetch failed')
  ;(wrapped as Error & { cause: unknown }).cause = timeout
  return wrapped
}

describe('retryTransientSupabaseOp', () => {
  it('retries a nested UND_ERR_CONNECT_TIMEOUT then succeeds', async () => {
    let calls = 0
    const result = await retryTransientSupabaseOp(
      async () => {
        calls += 1
        if (calls === 1) throw connectTimeoutFetchFailed()
        return 'ok'
      },
      { sleep: async () => {} }
    )
    expect(result).toBe('ok')
    expect(calls).toBe(2)
  })

  it('does not retry auth-style errors', async () => {
    let calls = 0
    await expect(
      retryTransientSupabaseOp(
        async () => {
          calls += 1
          throw new Error('Sign in with a Supabase admin email. Legacy local admin cannot save CMS.')
        },
        { sleep: async () => {} }
      )
    ).rejects.toThrow(/Supabase admin email/)
    expect(calls).toBe(1)
  })
})

describe('createSupabaseAdminFetch', () => {
  it('retries idempotent GET after connect timeout', async () => {
    let calls = 0
    const fetchImpl: typeof fetch = async () => {
      calls += 1
      if (calls === 1) throw connectTimeoutFetchFailed()
      return new Response('{}', { status: 200 })
    }
    const adminFetch = createSupabaseAdminFetch({
      fetchImpl,
      dispatcher: undefined,
      sleep: async () => {},
    })
    const res = await adminFetch('https://example.supabase.co/rest/v1/contact_messages')
    expect(res.status).toBe(200)
    expect(calls).toBe(2)
  })

  it('does not retry POST (insert/update must not double-write)', async () => {
    let calls = 0
    const fetchImpl: typeof fetch = async () => {
      calls += 1
      throw connectTimeoutFetchFailed()
    }
    const adminFetch = createSupabaseAdminFetch({
      fetchImpl,
      dispatcher: undefined,
      sleep: async () => {},
    })
    await expect(
      adminFetch('https://example.supabase.co/rest/v1/bespoke_sticker_requests', {
        method: 'POST',
        body: '{}',
      })
    ).rejects.toThrow(/fetch failed/)
    expect(calls).toBe(1)
  })
})
