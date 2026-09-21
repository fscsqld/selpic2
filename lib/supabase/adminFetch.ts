import { isTransientSiteConfigNetworkError } from '../siteConfigNetworkError'

/** Undici default is 10s; Cloudflare/Supabase connect often needs a second path. */
export const SUPABASE_CONNECT_TIMEOUT_MS = 20_000
export const SUPABASE_IDEMPOTENT_RETRY_ATTEMPTS = 2
export const SUPABASE_IDEMPOTENT_RETRY_DELAY_MS = 400

export type SupabaseAdminFetchDeps = {
  fetchImpl?: typeof fetch
  dispatcher?: unknown
  sleep?: (ms: number) => Promise<void>
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return String(init.method).toUpperCase()
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.method.toUpperCase()
  }
  return 'GET'
}

function isIdempotentMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD'
}

function isRetryableGatewayStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}

function isCallerAbort(e: unknown, signal?: AbortSignal | null): boolean {
  if (signal?.aborted) return true
  if (!e || typeof e !== 'object') return false
  const name = 'name' in e ? String((e as { name?: string }).name || '') : ''
  return name === 'AbortError' && Boolean(signal)
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

let cachedDispatcher: unknown
let dispatcherResolved = false

function getDefaultDispatcher(): unknown {
  if (dispatcherResolved) return cachedDispatcher
  dispatcherResolved = true
  try {
    // Native Node fetch uses undici. Lengthen connect beyond the 10s UND_ERR_CONNECT_TIMEOUT.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const undici = require('node:undici') as {
      Agent?: new (opts: {
        connectTimeout?: number
        headersTimeout?: number
        bodyTimeout?: number
      }) => unknown
    }
    if (undici.Agent) {
      cachedDispatcher = new undici.Agent({
        connectTimeout: SUPABASE_CONNECT_TIMEOUT_MS,
        headersTimeout: 30_000,
        bodyTimeout: 60_000,
      })
    }
  } catch {
    cachedDispatcher = undefined
  }
  return cachedDispatcher
}

export async function retryTransientSupabaseOp<T>(
  op: () => Promise<T>,
  opts?: {
    attempts?: number
    delayMs?: number
    sleep?: (ms: number) => Promise<void>
    signal?: AbortSignal | null
  }
): Promise<T> {
  const attempts = opts?.attempts ?? SUPABASE_IDEMPOTENT_RETRY_ATTEMPTS
  const delayMs = opts?.delayMs ?? SUPABASE_IDEMPOTENT_RETRY_DELAY_MS
  const sleep = opts?.sleep ?? defaultSleep
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await op()
    } catch (e) {
      last = e
      if (isCallerAbort(e, opts?.signal) || !isTransientSiteConfigNetworkError(e) || i === attempts - 1) {
        throw e
      }
      await sleep(delayMs)
    }
  }
  throw last
}

export function createSupabaseAdminFetch(deps: SupabaseAdminFetchDeps = {}): typeof fetch {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch.bind(globalThis)
  const sleep = deps.sleep ?? defaultSleep

  return async function supabaseAdminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = resolveMethod(input, init)
    const dispatcher = 'dispatcher' in deps ? deps.dispatcher : getDefaultDispatcher()
    const run = () =>
      fetchImpl(input, {
        ...init,
        ...(dispatcher ? { dispatcher } : {}),
      } as RequestInit)

    if (!isIdempotentMethod(method)) {
      return run()
    }

    let lastResponse: Response | undefined
    for (let i = 0; i < SUPABASE_IDEMPOTENT_RETRY_ATTEMPTS; i++) {
      try {
        const res = await run()
        lastResponse = res
        if (isRetryableGatewayStatus(res.status) && i < SUPABASE_IDEMPOTENT_RETRY_ATTEMPTS - 1) {
          await sleep(SUPABASE_IDEMPOTENT_RETRY_DELAY_MS)
          continue
        }
        return res
      } catch (e) {
        if (
          isCallerAbort(e, init?.signal) ||
          !isTransientSiteConfigNetworkError(e) ||
          i === SUPABASE_IDEMPOTENT_RETRY_ATTEMPTS - 1
        ) {
          throw e
        }
        await sleep(SUPABASE_IDEMPOTENT_RETRY_DELAY_MS)
      }
    }
    if (lastResponse) return lastResponse
    throw new Error('Supabase fetch failed after retry')
  }
}

export const supabaseAdminFetch: typeof fetch = createSupabaseAdminFetch()

export function supabaseNoSessionClientOptions() {
  return {
    auth: { persistSession: false, autoRefreshToken: false } as const,
    global: { fetch: supabaseAdminFetch },
  }
}
