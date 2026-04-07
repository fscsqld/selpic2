/**
 * Intercepts `content-store` localStorage traffic so data goes to Supabase instead of the browser.
 * Import once from a client entry (e.g. `app/template.tsx`) before other app modules when possible.
 */
import { scheduleSiteConfigPersistString } from '@/lib/siteConfigClient'

const KEY = 'content-store'

function install() {
  if (typeof window === 'undefined') return
  const w = window as unknown as { __selpicContentStoreShim?: boolean }
  if (w.__selpicContentStoreShim) return
  w.__selpicContentStoreShim = true

  const origSet = localStorage.setItem.bind(localStorage)
  const origGet = localStorage.getItem.bind(localStorage)

  localStorage.setItem = function (key: string, value: string) {
    if (key === KEY) {
      scheduleSiteConfigPersistString(value)
      return
    }
    return origSet(key, value)
  }

  localStorage.getItem = function (key: string) {
    if (key === KEY) return null
    return origGet(key)
  }
}

install()
