import type { CatalogProductRecord } from '@/lib/catalogProductRecord'
import { sanitizeMixedLabelsSheetBundles } from '@/lib/mixedLabelsPricing'
import type { BundleItem, CustomizationOption, Product } from '@/lib/store'

const MAX_NAME = 500
const MAX_CATEGORY = 200
const MAX_DESCRIPTION = 8000
const MAX_DETAIL_DESCRIPTION = 120_000
const MAX_IMAGE_URL = 2000
const MAX_FEATURE_STRING = 500
const MAX_OPTION_STRING = 500

export function publicCatalogImageUrl(image?: string): string | undefined {
  if (!image || typeof image !== 'string') return undefined
  const t = image.trim()
  if (!t || t === 'undefined') return undefined
  if (t.startsWith('indexeddb://') || t.startsWith('data:')) return undefined
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('/')) return t
  return undefined
}

/** True when image will survive catalog sync (https, /path — not data: or indexeddb://). */
export function isPersistableCatalogImageUrl(image?: string): boolean {
  return !!publicCatalogImageUrl(image)
}

/** User-facing message when admin saves a product image that catalog sync will drop. */
export function catalogImagePersistError(image?: string): string | null {
  const img = (image || '').trim()
  if (!img || isPersistableCatalogImageUrl(img)) return null
  if (img.startsWith('indexeddb://')) {
    return 'Image is only on this browser (indexeddb://). Upload again while signed in as admin so it saves to Supabase (https URL).'
  }
  if (img.startsWith('data:')) {
    return 'Base64 images are not saved to the server catalog. Upload the file again to get a public https URL.'
  }
  return 'Product image must be a public URL (https://… or /images/…). Re-upload the image.'
}

function snapshotInStock(p: Product): boolean {
  const stockQty = typeof p.stockQuantity === 'number' ? Math.max(0, p.stockQuantity) : undefined
  if (typeof stockQty === 'number') return stockQty > 0
  return !!p.inStock
}

const BUNDLE_CATEGORIES = new Set<BundleItem['category']>(['Stamps', 'Stickers', 'PhoneCases', 'HotGoods'])

function sanitizeBundleItems(items: unknown): BundleItem[] | undefined {
  if (!Array.isArray(items)) return undefined
  const out: BundleItem[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const b = raw as Record<string, unknown>
    const productId = typeof b.productId === 'string' ? b.productId : ''
    if (!productId) continue
    const name = typeof b.name === 'string' ? b.name.slice(0, 300) : ''
    const cat = b.category
    const category =
      cat === 'Stamps' || cat === 'Stickers' || cat === 'PhoneCases' || cat === 'HotGoods' ? cat : undefined
    if (!category || !BUNDLE_CATEGORIES.has(category)) continue
    const imgRaw = typeof b.image === 'string' ? b.image : ''
    const image =
      publicCatalogImageUrl(imgRaw) ||
      (imgRaw.startsWith('http://') || imgRaw.startsWith('https://') || imgRaw.startsWith('/')
        ? imgRaw.slice(0, MAX_IMAGE_URL)
        : '')
    out.push({ productId, category, name, image })
  }
  return out.length ? out : undefined
}

function sanitizeCustomizationOptions(items: unknown): CustomizationOption[] | undefined {
  if (!Array.isArray(items)) return undefined
  const out: CustomizationOption[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const name = typeof o.name === 'string' ? o.name.slice(0, 200) : ''
    const type = o.type
    if (!id || !name) continue
    if (type !== 'color' && type !== 'size' && type !== 'text' && type !== 'image') continue
    const required = Boolean(o.required)
    const price = typeof o.price === 'number' && Number.isFinite(o.price) ? o.price : undefined
    const options = Array.isArray(o.options)
      ? o.options
          .filter((x): x is string => typeof x === 'string')
          .map((s) => s.slice(0, MAX_OPTION_STRING))
      : undefined
    out.push({ id, name, type, required, ...(price !== undefined ? { price } : {}), ...(options?.length ? { options } : {}) })
  }
  return out.length ? out : undefined
}

/** Client → catalog POST: full product row, safe images and bounded strings */
export function productToCatalogRecord(p: Product, updatedAt: string): CatalogProductRecord {
  const catalogImage = publicCatalogImageUrl(p.fallbackImage) || publicCatalogImageUrl(p.image) || ''
  const fallbackImage = publicCatalogImageUrl(p.fallbackImage)
  const detailDescription =
    typeof p.detailDescription === 'string' ? p.detailDescription.slice(0, MAX_DETAIL_DESCRIPTION) : undefined

  const bundleItemsSan = p.bundleItems?.map((b) => ({
    ...b,
    image:
      publicCatalogImageUrl(b.image) ||
      (typeof b.image === 'string' &&
      (b.image.startsWith('http://') || b.image.startsWith('https://') || b.image.startsWith('/')) &&
      !b.image.startsWith('data:')
        ? b.image.slice(0, MAX_IMAGE_URL)
        : ''),
  }))

  const {
    image: _i,
    fallbackImage: _f,
    bundleItems: _bi,
    description: _d,
    detailDescription: _dd,
    inStock: _stock,
    ...rest
  } = p

  return {
    ...(rest as Product),
    description: (p.description || '').slice(0, MAX_DESCRIPTION),
    detailDescription,
    image: catalogImage,
    ...(fallbackImage ? { fallbackImage } : {}),
    ...(bundleItemsSan !== undefined ? { bundleItems: bundleItemsSan } : {}),
    inStock: snapshotInStock(p),
    updatedAt,
  }
}

function isValidCore(o: Record<string, unknown>): boolean {
  return (
    typeof o.id === 'string' &&
    o.id.length > 0 &&
    typeof o.name === 'string' &&
    typeof o.description === 'string' &&
    typeof o.price === 'number' &&
    Number.isFinite(o.price) &&
    typeof o.category === 'string' &&
    typeof o.inStock === 'boolean' &&
    typeof o.updatedAt === 'string'
  )
}

/** Server POST body item → storable record (drops unsafe images, caps strings) */
export function sanitizeIncomingCatalogRecord(item: unknown): CatalogProductRecord | null {
  if (!item || typeof item !== 'object') return null
  const src = item as Record<string, unknown>
  if (!isValidCore(src)) return null

  let clone: Record<string, unknown>
  try {
    clone = JSON.parse(JSON.stringify(src)) as Record<string, unknown>
  } catch {
    return null
  }

  const mainImg = clone.image
  const safeMain =
    typeof mainImg === 'string' &&
    !mainImg.startsWith('data:') &&
    !mainImg.startsWith('indexeddb://') &&
    (mainImg.startsWith('http://') || mainImg.startsWith('https://') || mainImg.startsWith('/'))
      ? mainImg.slice(0, MAX_IMAGE_URL)
      : ''

  const fb = clone.fallbackImage
  const safeFallback =
    typeof fb === 'string' && publicCatalogImageUrl(fb) ? publicCatalogImageUrl(fb)!.slice(0, MAX_IMAGE_URL) : undefined

  const detail =
    typeof clone.detailDescription === 'string'
      ? clone.detailDescription.slice(0, MAX_DETAIL_DESCRIPTION)
      : undefined

  const bundleItems = sanitizeBundleItems(clone.bundleItems)
  const customizationOptions = sanitizeCustomizationOptions(clone.customizationOptions)

  const features = Array.isArray(clone.features)
    ? clone.features
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.slice(0, MAX_FEATURE_STRING))
    : undefined

  const {
    image: _dropImg,
    fallbackImage: _dropFb,
    bundleItems: _dropBi,
    detailDescription: _dropDetail,
    customizationOptions: _dropCo,
    features: _dropFeat,
    updatedAt: _dropUpd,
    ...rest
  } = clone

  const record: CatalogProductRecord = {
    ...(rest as unknown as Product),
    id: String(clone.id),
    name: String(clone.name).slice(0, MAX_NAME),
    description: String(clone.description).slice(0, MAX_DESCRIPTION),
    price: Number(clone.price),
    category: String(clone.category).slice(0, MAX_CATEGORY),
    subcategory:
      typeof clone.subcategory === 'string' && clone.subcategory ? clone.subcategory.slice(0, MAX_CATEGORY) : undefined,
    inStock: Boolean(clone.inStock),
    image: safeMain,
    ...(safeFallback ? { fallbackImage: safeFallback } : {}),
    ...(detail !== undefined && detail.length > 0 ? { detailDescription: detail } : detail === '' ? { detailDescription: '' } : {}),
    ...(bundleItems ? { bundleItems } : {}),
    ...(customizationOptions ? { customizationOptions } : {}),
    ...(features?.length ? { features } : {}),
    updatedAt: String(clone.updatedAt),
  }

  if (typeof clone.originalPrice === 'number' && Number.isFinite(clone.originalPrice)) {
    record.originalPrice = clone.originalPrice
  }
  if (typeof clone.hasDetailPage === 'boolean') record.hasDetailPage = clone.hasDetailPage
  if (typeof clone.isHotGoods === 'boolean') record.isHotGoods = clone.isHotGoods
  if (typeof clone.isPopular === 'boolean') record.isPopular = clone.isPopular
  if (typeof clone.stockQuantity === 'number' && Number.isFinite(clone.stockQuantity)) {
    record.stockQuantity = Math.max(0, clone.stockQuantity)
  }
  if (typeof clone.safetyStock === 'number' && Number.isFinite(clone.safetyStock)) record.safetyStock = clone.safetyStock
  if (typeof clone.incomingStock === 'number' && Number.isFinite(clone.incomingStock)) {
    record.incomingStock = Math.max(0, clone.incomingStock)
  }
  if (typeof clone.brand === 'string') record.brand = clone.brand.slice(0, 200)
  if (typeof clone.model === 'string') record.model = clone.model.slice(0, 200)
  if (typeof clone.size === 'string') record.size = clone.size.slice(0, 200)
  if (typeof clone.color === 'string') record.color = clone.color.slice(0, 200)
  if (typeof clone.type === 'string') record.type = clone.type.slice(0, 200)
  if (typeof clone.spfLevel === 'string') record.spfLevel = clone.spfLevel.slice(0, 100)
  if (typeof clone.isNew === 'boolean') record.isNew = clone.isNew
  if (typeof clone.isBestSeller === 'boolean') record.isBestSeller = clone.isBestSeller
  if (typeof clone.setItemCount === 'number' && Number.isFinite(clone.setItemCount)) record.setItemCount = clone.setItemCount
  if (typeof clone.isBundle === 'boolean') record.isBundle = clone.isBundle
  if (typeof clone.stickerSheetQuantity === 'number' && Number.isFinite(clone.stickerSheetQuantity)) {
    record.stickerSheetQuantity = clone.stickerSheetQuantity
  }
  if (typeof clone.stickerWidthMm === 'number' && Number.isFinite(clone.stickerWidthMm)) record.stickerWidthMm = clone.stickerWidthMm
  if (typeof clone.stickerHeightMm === 'number' && Number.isFinite(clone.stickerHeightMm)) {
    record.stickerHeightMm = clone.stickerHeightMm
  }
  if (typeof clone.stickerCols === 'number' && Number.isFinite(clone.stickerCols)) record.stickerCols = clone.stickerCols
  if (typeof clone.stickerRows === 'number' && Number.isFinite(clone.stickerRows)) record.stickerRows = clone.stickerRows
  if (typeof clone.stickerGapMm === 'number' && Number.isFinite(clone.stickerGapMm)) record.stickerGapMm = clone.stickerGapMm
  if (typeof clone.stickerHasImage === 'boolean') record.stickerHasImage = clone.stickerHasImage
  if (typeof clone.twoLineSurcharge === 'number' && Number.isFinite(clone.twoLineSurcharge)) {
    record.twoLineSurcharge = clone.twoLineSurcharge
  }
  if (typeof clone.customizationMode === 'string' && clone.customizationMode.trim()) {
    record.customizationMode = clone.customizationMode.trim().slice(0, 80)
  }
  if (typeof clone.mixedSheetTemplateId === 'string' && clone.mixedSheetTemplateId.trim()) {
    record.mixedSheetTemplateId = clone.mixedSheetTemplateId.trim().slice(0, 120)
  }
  if (typeof clone.mixedLabelsNameMaxLength === 'number' && Number.isFinite(clone.mixedLabelsNameMaxLength)) {
    record.mixedLabelsNameMaxLength = Math.max(1, Math.min(20, Math.round(clone.mixedLabelsNameMaxLength)))
  }
  if (typeof clone.mixedLabelsNameHint === 'string' && clone.mixedLabelsNameHint.trim()) {
    record.mixedLabelsNameHint = clone.mixedLabelsNameHint.trim().slice(0, 500)
  }
  if (typeof clone.limitedEditionText === 'string' && clone.limitedEditionText.trim()) {
    record.limitedEditionText = clone.limitedEditionText.trim().slice(0, 500)
  }
  if (typeof clone.isLimitedEdition === 'boolean') record.isLimitedEdition = clone.isLimitedEdition
  if (Array.isArray(clone.mixedLabelsSheetBundles) && clone.mixedLabelsSheetBundles.length > 0) {
    record.mixedLabelsSheetBundles = sanitizeMixedLabelsSheetBundles(clone.mixedLabelsSheetBundles)
  }
  if (typeof clone.rating === 'number' && Number.isFinite(clone.rating)) record.rating = clone.rating
  if (typeof clone.reviews === 'number' && Number.isFinite(clone.reviews)) record.reviews = Math.max(0, clone.reviews)

  return record
}
