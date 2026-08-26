import type { FieldEntryKind, LodgmentField, LodgmentTab } from './types'

export interface FieldMeta {
  entryKind: FieldEntryKind
  atoScreenPath: string
  sortOrder: number
}

/** BAS labels in typical OSB activity-statement entry order. */
export const BAS_FIELD_META: Record<string, FieldMeta> = {
  G1: {
    entryKind: 'review',
    atoScreenPath: 'Activity statement → GST → G1 Total sales',
    sortOrder: 10,
  },
  G2: {
    entryKind: 'manual',
    atoScreenPath: 'Activity statement → GST → G2 Export sales',
    sortOrder: 20,
  },
  G3: {
    entryKind: 'review',
    atoScreenPath: 'Activity statement → GST → G3 Other GST-free sales',
    sortOrder: 30,
  },
  '1A': {
    entryKind: 'review',
    atoScreenPath: 'Activity statement → GST → 1A GST on sales',
    sortOrder: 40,
  },
  '1B': {
    entryKind: 'review',
    atoScreenPath: 'Activity statement → GST → 1B GST on purchases',
    sortOrder: 50,
  },
  '1C': {
    entryKind: 'auto',
    atoScreenPath: 'Activity statement → GST → 1C GST net payable',
    sortOrder: 60,
  },
  '7C': {
    entryKind: 'auto',
    atoScreenPath: 'Activity statement → GST → 7C GST refund',
    sortOrder: 70,
  },
  '1E': {
    entryKind: 'manual',
    atoScreenPath: 'Activity statement → GST → 1E Purchases without GST in price',
    sortOrder: 80,
  },
  '1F': {
    entryKind: 'manual',
    atoScreenPath: 'Activity statement → GST → 1F GST adjustments',
    sortOrder: 90,
  },
  '7A': {
    entryKind: 'manual',
    atoScreenPath: 'Activity statement → GST → 7A Deferred GST on imports',
    sortOrder: 100,
  },
  W1: {
    entryKind: 'review',
    atoScreenPath: 'Activity statement → PAYG withholding → W1 Total salary, wages and other payments',
    sortOrder: 110,
  },
  W2: {
    entryKind: 'review',
    atoScreenPath: 'Activity statement → PAYG withholding → W2 Amount withheld',
    sortOrder: 120,
  },
  '4': {
    entryKind: 'auto',
    atoScreenPath: 'Activity statement → PAYG withholding → 4 PAYG tax withheld',
    sortOrder: 130,
  },
  '5A': {
    entryKind: 'review',
    atoScreenPath: 'Activity statement → PAYG instalment → 5A PAYG income tax instalment',
    sortOrder: 140,
  },
  '6A': {
    entryKind: 'manual',
    atoScreenPath: 'Activity statement → Fuel tax credit → 6A Fuel tax credit',
    sortOrder: 150,
  },
}

export const CTR_FIELD_META: Record<string, FieldMeta> = {
  CTR_6_TOTAL_INCOME: {
    entryKind: 'review',
    atoScreenPath: 'Company tax return → Income → Item 6 Total income',
    sortOrder: 10,
  },
  CTR_7_TOTAL_EXPENSES: {
    entryKind: 'review',
    atoScreenPath: 'Company tax return → Expenses → Item 7 Total expenses',
    sortOrder: 20,
  },
  CTR_11_PROFIT_LOSS: {
    entryKind: 'auto',
    atoScreenPath: 'Company tax return → Reconciliation → Item 11 Total profit or loss',
    sortOrder: 30,
  },
  CTR_ADD_BACKS: {
    entryKind: 'manual',
    atoScreenPath: 'Company tax return → Reconciliation → Non-deductible expenses add-back',
    sortOrder: 40,
  },
  CTR_LOSS_CARRY: {
    entryKind: 'manual',
    atoScreenPath: 'Company tax return → Reconciliation → Prior year losses applied',
    sortOrder: 50,
  },
  CTR_ADJUSTMENTS: {
    entryKind: 'manual',
    atoScreenPath: 'Company tax return → Reconciliation → Other adjustments',
    sortOrder: 60,
  },
  CTR_TAXABLE: {
    entryKind: 'review',
    atoScreenPath: 'Company tax return → Tax calculation → Taxable income',
    sortOrder: 70,
  },
  CTR_PAYG_WITHHELD: {
    entryKind: 'auto',
    atoScreenPath: 'Company tax return → Tax offsets → PAYG tax withheld',
    sortOrder: 80,
  },
  CTR_TAX_EST: {
    entryKind: 'review',
    atoScreenPath: 'Company tax return → Tax calculation → Tax on taxable income',
    sortOrder: 90,
  },
  CTR_TAX_PAYABLE: {
    entryKind: 'review',
    atoScreenPath: 'Company tax return → Payment summary → Amount owing or refundable',
    sortOrder: 100,
  },
}

export const ANNUAL_FIELD_META: Record<string, FieldMeta> = {
  MYTAX_GROSS_PAYMENTS: {
    entryKind: 'review',
    atoScreenPath: 'myTax → Business/sole trader → Income → Gross payments (excluding GST)',
    sortOrder: 10,
  },
  MYTAX_OTHER_INCOME: {
    entryKind: 'review',
    atoScreenPath: 'myTax → Business/sole trader → Income → Other business income',
    sortOrder: 20,
  },
  MYTAX_GOVT_PAYMENTS: {
    entryKind: 'manual',
    atoScreenPath: 'myTax → Business/sole trader → Income → Government industry payments',
    sortOrder: 30,
  },
  MYTAX_TOTAL_INCOME: {
    entryKind: 'auto',
    atoScreenPath: 'myTax → Business/sole trader → Income → Total business income',
    sortOrder: 40,
  },
  MYTAX_OPENING_STOCK: {
    entryKind: 'manual',
    atoScreenPath: 'myTax → Business/sole trader → Expenses → Opening stock',
    sortOrder: 50,
  },
  MYTAX_PURCHASES: {
    entryKind: 'review',
    atoScreenPath: 'myTax → Business/sole trader → Expenses → Purchases and other costs',
    sortOrder: 60,
  },
  MYTAX_CONTRACTOR: {
    entryKind: 'review',
    atoScreenPath: 'myTax → Business/sole trader → Expenses → Contractor, sub-contractor and commission payments',
    sortOrder: 70,
  },
  MYTAX_MOTOR_VEHICLE: {
    entryKind: 'review',
    atoScreenPath: 'myTax → Business/sole trader → Expenses → Motor vehicle expenses',
    sortOrder: 80,
  },
  MYTAX_DEPRECIATION: {
    entryKind: 'manual',
    atoScreenPath: 'myTax → Business/sole trader → Expenses → Depreciation expenses',
    sortOrder: 90,
  },
  MYTAX_OTHER_EXPENSES: {
    entryKind: 'review',
    atoScreenPath: 'myTax → Business/sole trader → Expenses → All other expenses',
    sortOrder: 100,
  },
  MYTAX_TOTAL_EXPENSES: {
    entryKind: 'auto',
    atoScreenPath: 'myTax → Business/sole trader → Expenses → Total business expenses',
    sortOrder: 110,
  },
  MYTAX_NET_INCOME: {
    entryKind: 'auto',
    atoScreenPath: 'myTax → Business/sole trader → Summary → Net income or loss',
    sortOrder: 120,
  },
  MYTAX_GST_ON_INCOME: {
    entryKind: 'review',
    atoScreenPath: 'myTax → Business/sole trader → GST → GST included in income (information)',
    sortOrder: 130,
  },
  MYTAX_GST_ON_PURCHASES: {
    entryKind: 'review',
    atoScreenPath: 'myTax → Business/sole trader → GST → GST paid on purchases (information)',
    sortOrder: 140,
  },
}

function metaForField(
  tab: LodgmentTab,
  fieldId: string,
  fallbackKind: FieldEntryKind
): FieldMeta {
  const map =
    tab === 'bas' ? BAS_FIELD_META : tab === 'ctr' ? CTR_FIELD_META : ANNUAL_FIELD_META
  const meta = map[fieldId]
  if (meta) return meta

  if (fieldId.startsWith('INC_')) {
    return {
      entryKind: 'review',
      atoScreenPath: 'myTax → Business/sole trader → Income → Category breakdown',
      sortOrder: 200 + fieldId.charCodeAt(4),
    }
  }
  if (fieldId.startsWith('EXP_')) {
    return {
      entryKind: 'review',
      atoScreenPath: 'myTax → Business/sole trader → Expenses → Category breakdown',
      sortOrder: 300 + fieldId.charCodeAt(4),
    }
  }

  return {
    entryKind: fallbackKind,
    atoScreenPath: tab === 'bas' ? 'Activity statement' : tab === 'ctr' ? 'Company tax return' : 'myTax business schedule',
    sortOrder: 900,
  }
}

export function enrichLodgmentField(
  field: LodgmentField,
  tab: LodgmentTab
): LodgmentField {
  const fallbackKind: FieldEntryKind =
    field.source === 'manual' ? 'manual' : field.amount === 0 ? 'manual' : 'auto'
  const meta = metaForField(tab, field.id, fallbackKind)
  return {
    ...field,
    entryKind: field.entryKind ?? meta.entryKind,
    atoScreenPath: field.atoScreenPath ?? meta.atoScreenPath,
    sortOrder: field.sortOrder ?? meta.sortOrder,
    myTaxLabel: field.myTaxLabel ?? (tab === 'annual' ? field.label : undefined),
  }
}

export function enrichLodgmentFields(
  fields: LodgmentField[],
  tab: LodgmentTab
): LodgmentField[] {
  return fields.map((f) => enrichLodgmentField(f, tab))
}

export function sortFieldsByAtoOrder(fields: LodgmentField[]): LodgmentField[] {
  return [...fields].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
}

export function entryKindLabel(kind: FieldEntryKind): string {
  switch (kind) {
    case 'auto':
      return 'Auto'
    case 'review':
      return 'Review'
    case 'manual':
      return 'Manual'
  }
}
