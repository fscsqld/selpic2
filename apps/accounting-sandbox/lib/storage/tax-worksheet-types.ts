/** Rental schedule worksheet (simplified myTax rental). */
export interface RentalWorksheetData {
  propertyAddress?: string
  grossRent: number
  otherRentalIncome: number
  advertising: number
  bodyCorporate: number
  borrowingExpenses: number
  cleaning: number
  councilRates: number
  depreciation: number
  insurance: number
  interest: number
  landTax: number
  legalFees: number
  repairs: number
  waterCharges: number
  otherExpenses: number
}

/** Capital gains worksheet (simplified CGT event). */
export interface CgtWorksheetData {
  assetDescription?: string
  acquisitionDate?: string
  disposalDate?: string
  capitalProceeds: number
  costBase: number
  incidentalCosts: number
}

export interface RentalWorksheetEntry extends RentalWorksheetData {
  id: string
}

export interface CgtWorksheetEntry extends CgtWorksheetData {
  id: string
}

export interface IndividualTaxWorksheetRecord {
  id: string
  financialYear: string
  /** @deprecated Migrated to `rentals` on read */
  rental?: RentalWorksheetData
  /** @deprecated Migrated to `cgtEvents` on read */
  cgt?: CgtWorksheetData
  rentals: RentalWorksheetEntry[]
  cgtEvents: CgtWorksheetEntry[]
  updatedAt: string
}

export function newWorksheetEntryId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function emptyRentalWorksheet(): RentalWorksheetData {
  return {
    grossRent: 0,
    otherRentalIncome: 0,
    advertising: 0,
    bodyCorporate: 0,
    borrowingExpenses: 0,
    cleaning: 0,
    councilRates: 0,
    depreciation: 0,
    insurance: 0,
    interest: 0,
    landTax: 0,
    legalFees: 0,
    repairs: 0,
    waterCharges: 0,
    otherExpenses: 0,
  }
}

export function emptyCgtWorksheet(): CgtWorksheetData {
  return {
    capitalProceeds: 0,
    costBase: 0,
    incidentalCosts: 0,
  }
}

export function createRentalEntry(): RentalWorksheetEntry {
  return { id: newWorksheetEntryId(), ...emptyRentalWorksheet() }
}

export function createCgtEntry(): CgtWorksheetEntry {
  return { id: newWorksheetEntryId(), ...emptyCgtWorksheet() }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeNetRentalIncome(data: RentalWorksheetData): number {
  const income = data.grossRent + data.otherRentalIncome
  const expenses =
    data.advertising +
    data.bodyCorporate +
    data.borrowingExpenses +
    data.cleaning +
    data.councilRates +
    data.depreciation +
    data.insurance +
    data.interest +
    data.landTax +
    data.legalFees +
    data.repairs +
    data.waterCharges +
    data.otherExpenses
  return roundMoney(income - expenses)
}

export function computeNetCapitalGain(data: CgtWorksheetData): number {
  return roundMoney(data.capitalProceeds - data.costBase - data.incidentalCosts)
}

export function computeTotalNetRental(rentals: RentalWorksheetEntry[]): number {
  return roundMoney(rentals.reduce((sum, entry) => sum + computeNetRentalIncome(entry), 0))
}

export function computeTotalNetCapitalGain(events: CgtWorksheetEntry[]): number {
  return roundMoney(events.reduce((sum, entry) => sum + computeNetCapitalGain(entry), 0))
}

export function normalizeWorksheetRecord(
  record: IndividualTaxWorksheetRecord | null
): { rentals: RentalWorksheetEntry[]; cgtEvents: CgtWorksheetEntry[] } {
  if (!record) {
    return { rentals: [createRentalEntry()], cgtEvents: [createCgtEntry()] }
  }

  let rentals = record.rentals
  if (!rentals?.length) {
    rentals = record.rental
      ? [{ id: newWorksheetEntryId(), ...record.rental }]
      : [createRentalEntry()]
  }

  let cgtEvents = record.cgtEvents
  if (!cgtEvents?.length) {
    cgtEvents = record.cgt
      ? [{ id: newWorksheetEntryId(), ...record.cgt }]
      : [createCgtEntry()]
  }

  return { rentals, cgtEvents }
}

export function worksheetHasData(
  rentals: RentalWorksheetEntry[],
  cgtEvents: CgtWorksheetEntry[]
): boolean {
  if (computeTotalNetRental(rentals) !== 0 || computeTotalNetCapitalGain(cgtEvents) !== 0) {
    return true
  }
  return (
    rentals.some(
      (r) =>
        !!r.propertyAddress ||
        r.grossRent > 0 ||
        r.otherRentalIncome > 0 ||
        r.interest > 0 ||
        r.councilRates > 0
    ) ||
    cgtEvents.some(
      (c) =>
        !!c.assetDescription ||
        c.capitalProceeds > 0 ||
        c.costBase > 0 ||
        c.incidentalCosts > 0
    )
  )
}

export function worksheetRecordId(financialYear: string): string {
  return `tax_worksheet_${financialYear}`
}
