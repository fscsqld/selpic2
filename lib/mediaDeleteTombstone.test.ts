import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  getSuppressedMediaIds,
  isSuppressedMediaUrl,
  recordDeletedMediaTombstone,
} from './mediaDeleteTombstone'
import type { MediaFile } from './mediaStore'

describe('mediaDeleteTombstone', () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
    const sessionStorageMock = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    }
    vi.stubGlobal('window', { sessionStorage: sessionStorageMock })
    vi.stubGlobal('sessionStorage', sessionStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('records deleted ids/urls so refresh cannot treat them as other-tab adds', () => {
    const file = {
      id: 'media-1',
      name: 'a.webp',
      type: 'image',
      url: 'https://bmeyyierrvjbjikliheo.supabase.co/storage/v1/object/public/selpic-contents/x.webp',
      size: 1,
      uploadedAt: new Date(),
      category: 'hotgoods',
      tags: [],
    } as MediaFile

    recordDeletedMediaTombstone([file], ['media-1'])
    expect(getSuppressedMediaIds().has('media-1')).toBe(true)
    expect(isSuppressedMediaUrl(file.url)).toBe(true)
  })
})
