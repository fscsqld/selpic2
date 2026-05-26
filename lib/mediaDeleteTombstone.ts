import type { MediaFile } from '@/lib/mediaStore'

const IDS_KEY = 'selpic-suppressed-media-ids'
const URLS_KEY = 'selpic-suppressed-media-urls'

function normalizeComparableUrl(url: string): string {
  const t = url.trim()
  if (!t) return ''
  try {
    const u = new URL(t)
    return `${u.origin}${u.pathname}`
  } catch {
    return t.split('?')[0]?.split('#')[0] ?? t
  }
}

function collectUrls(file: MediaFile): string[] {
  const out: string[] = []
  for (const u of [file.url, file.webpUrl, file.thumbnailUrl, file.fallbackImageUrl]) {
    if (typeof u !== 'string') continue
    const t = u.trim()
    if (!t || t.startsWith('data:') || t.startsWith('blob:') || t.startsWith('indexeddb')) continue
    out.push(t)
    out.push(normalizeComparableUrl(t))
  }
  return out
}

function readJsonArray(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string' && v.length > 0) : []
  } catch {
    return []
  }
}

function writeJsonArray(key: string, values: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify([...values]))
  } catch {
    /* ignore quota */
  }
}

/** Survives navigation so ProductGallery can hide rows before server POST catches up. */
export function recordDeletedMediaTombstone(files: MediaFile[], ids: string[]): void {
  if (typeof window === 'undefined' || ids.length === 0) return
  const idSet = new Set(readJsonArray(IDS_KEY))
  const urlSet = new Set(readJsonArray(URLS_KEY))
  const idLookup = new Set(ids.map(String))
  for (const id of ids) idSet.add(String(id))
  for (const f of files) {
    if (!idLookup.has(String(f.id))) continue
    for (const u of collectUrls(f)) urlSet.add(u)
  }
  writeJsonArray(IDS_KEY, idSet)
  writeJsonArray(URLS_KEY, urlSet)
}

export function getSuppressedMediaIds(): Set<string> {
  return new Set(readJsonArray(IDS_KEY))
}

export function getSuppressedMediaUrls(): Set<string> {
  return new Set(readJsonArray(URLS_KEY))
}

export function isSuppressedMediaUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false
  const t = url.trim()
  if (!t) return false
  const urls = getSuppressedMediaUrls()
  if (urls.has(t)) return true
  const norm = normalizeComparableUrl(t)
  return norm.length > 0 && urls.has(norm)
}

/** True when this browser has a persisted media-store (local admin / dev). */
export function hasClientMediaStore(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem('media-store') != null
  } catch {
    return false
  }
}
