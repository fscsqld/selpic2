import { beforeEach, describe, expect, it } from 'vitest'
import { usePoSupplierStore } from './poSupplierStore'
import { isCatalogPriceConfirmed } from './poSupplierTypes'

describe('poSupplierStore catalog / unit prices', () => {
  beforeEach(() => {
    usePoSupplierStore.setState({ suppliers: [] })
  })

  it('saves confirmed unit price on catalog item and keeps it after re-read', () => {
    const supplier = usePoSupplierStore.getState().upsertSupplier({
      name: 'Test KR Co',
      vendor: { name: 'Test KR Co', email: 'a@b.com' },
      supplierBank: { accountName: 'Test', bankName: 'KB', accountNumber: '1' },
      items: [],
    })

    const item = usePoSupplierStore.getState().upsertCatalogItem(supplier.id, {
      descriptionEn: 'Mask Carton',
      descriptionKo: '마스크',
      sku: 'M-1',
      packUnit: 'carton',
      unitPrice: 35000,
      lineNote: '8EA Display',
      isActive: true,
    })

    expect(item).not.toBeNull()
    expect(isCatalogPriceConfirmed(item!)).toBe(true)
    expect(item!.unitPrice).toBe(35000)

    const again = usePoSupplierStore.getState().getSupplier(supplier.id)
    expect(again?.items).toHaveLength(1)
    expect(again?.items[0].unitPrice).toBe(35000)
    expect(again?.items[0].descriptionEn).toBe('Mask Carton')
  })

  it('allows TBD price (null) and updates to confirmed later', () => {
    const supplier = usePoSupplierStore.getState().upsertSupplier({
      name: 'TBD Co',
      vendor: { name: 'TBD Co' },
      supplierBank: { accountName: '', bankName: '', accountNumber: '' },
      items: [],
    })

    const draft = usePoSupplierStore.getState().upsertCatalogItem(supplier.id, {
      descriptionEn: 'New Serum',
      packUnit: 'box',
      unitPrice: null,
      isActive: true,
    })
    expect(draft).not.toBeNull()
    expect(isCatalogPriceConfirmed(draft!)).toBe(false)

    const priced = usePoSupplierStore.getState().upsertCatalogItem(supplier.id, {
      id: draft!.id,
      descriptionEn: 'New Serum',
      packUnit: 'box',
      unitPrice: 12000,
      isActive: true,
    })
    expect(priced?.unitPrice).toBe(12000)
    expect(isCatalogPriceConfirmed(priced!)).toBe(true)
  })
})
