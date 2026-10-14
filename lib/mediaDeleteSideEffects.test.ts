import { describe, expect, it } from 'vitest'
import { urlsForMediaIds } from './mediaDeleteSideEffects'
import type { MediaFile } from './mediaStore'

describe('mediaDeleteSideEffects primary-safety', () => {
  it('collects only deleted media urls so unrelated catalog primary is not in the wipe set', () => {
    const primary =
      'https://bmeyyierrvjbjikliheo.supabase.co/storage/v1/object/public/selpic-contents/cms/product-media/BIODANCE_1.webp'
    const galleryExtra =
      'https://bmeyyierrvjbjikliheo.supabase.co/storage/v1/object/public/selpic-contents/hotgoods/BIODANCE_2.webp'
    const files = [
      {
        id: 'g1',
        name: 'extra',
        type: 'image',
        url: galleryExtra,
        size: 1,
        uploadedAt: new Date(),
        category: 'hotgoods',
        tags: [],
        productId: '1790146362269',
      },
    ] as MediaFile[]

    const dropped = urlsForMediaIds(files, ['g1'])
    expect(dropped.has(galleryExtra)).toBe(true)
    expect(dropped.has(primary)).toBe(false)
  })
})
