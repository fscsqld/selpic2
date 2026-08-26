'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { PAYMENT_SUMMARY_UPDATED_EVENT } from '@/components/Individual/PaymentSummaryForm'
import { TAX_WORKSHEET_UPDATED_EVENT } from '@/components/Individual/TaxWorksheetsPanel'
import {
  computePersonalTaxLodgment,
  filterTransactionsByFinancialYear,
  INDIVIDUAL_OVERRIDES_UPDATED_EVENT,
  readIndividualOverrides,
  type IndividualTransaction,
  type PaymentTotals,
  type WorksheetNets,
} from '@/lib/ato-lodgment/individual-lodgment-input'
import type { IndividualManualOverrides } from '@/lib/ato-lodgment/compute-individual-lodgment'
import type { IndividualLodgmentResult } from '@/lib/ato-lodgment/types'
import {
  computeNetCapitalGain,
  computeNetRentalIncome,
  computeTotalNetCapitalGain,
  computeTotalNetRental,
  normalizeWorksheetRecord,
  worksheetHasData,
} from '@/lib/storage/tax-worksheet-types'

const EMPTY_PAYMENTS: PaymentTotals = { grossPayments: 0, taxWithheld: 0, count: 0 }
const EMPTY_WORKSHEETS: WorksheetNets = {
  rental: 0,
  cgt: 0,
  rentalCount: 0,
  cgtCount: 0,
  rentalHasData: false,
  cgtHasData: false,
  active: false,
}

export interface UseIndividualLodgmentDataResult {
  loading: boolean
  overrides: IndividualManualOverrides
  paymentTotals: PaymentTotals
  worksheetNets: WorksheetNets
  fyTransactions: IndividualTransaction[]
  lodgment: IndividualLodgmentResult
  refresh: () => void
}

export function useIndividualLodgmentData(
  transactions: IndividualTransaction[],
  financialYear: string,
  /** When set (ATO Lodgment tab), overrides come from this state instead of localStorage. */
  overrideSource?: IndividualManualOverrides
): UseIndividualLodgmentDataResult {
  const [loading, setLoading] = useState(true)
  const [paymentTotals, setPaymentTotals] = useState<PaymentTotals>(EMPTY_PAYMENTS)
  const [worksheetNets, setWorksheetNets] = useState<WorksheetNets>(EMPTY_WORKSHEETS)
  const [storedOverrides, setStoredOverrides] = useState<IndividualManualOverrides>({})
  const [refreshToken, setRefreshToken] = useState(0)

  const overrides = overrideSource ?? storedOverrides

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), [])

  const loadAsync = useCallback(async () => {
    setLoading(true)
    try {
      await indexedDBStorage.init()
      const [totals, ws] = await Promise.all([
        indexedDBStorage.sumPaymentSummariesForYear(financialYear),
        indexedDBStorage.getTaxWorksheet(financialYear),
      ])
      setPaymentTotals(totals)

      if (!ws) {
        setWorksheetNets(EMPTY_WORKSHEETS)
      } else {
        const { rentals, cgtEvents } = normalizeWorksheetRecord(ws)
        const rentalHasData = rentals.some(
          (r) =>
            !!r.propertyAddress ||
            r.grossRent > 0 ||
            r.otherRentalIncome > 0 ||
            computeNetRentalIncome(r) !== 0
        )
        const cgtHasData = cgtEvents.some(
          (c) =>
            !!c.assetDescription ||
            c.capitalProceeds > 0 ||
            c.costBase > 0 ||
            computeNetCapitalGain(c) !== 0
        )
        setWorksheetNets({
          rental: computeTotalNetRental(rentals),
          cgt: computeTotalNetCapitalGain(cgtEvents),
          rentalCount: rentals.length,
          cgtCount: cgtEvents.length,
          rentalHasData,
          cgtHasData,
          active: worksheetHasData(rentals, cgtEvents),
        })
      }

      if (overrideSource === undefined) {
        setStoredOverrides(readIndividualOverrides(financialYear))
      }
    } catch {
      setPaymentTotals(EMPTY_PAYMENTS)
      setWorksheetNets(EMPTY_WORKSHEETS)
    } finally {
      setLoading(false)
    }
  }, [financialYear, overrideSource, refreshToken])

  useEffect(() => {
    loadAsync()
  }, [loadAsync])

  useEffect(() => {
    const onRefresh = () => refresh()
    window.addEventListener(PAYMENT_SUMMARY_UPDATED_EVENT, onRefresh)
    window.addEventListener(TAX_WORKSHEET_UPDATED_EVENT, onRefresh)
    window.addEventListener(INDIVIDUAL_OVERRIDES_UPDATED_EVENT, onRefresh)
    return () => {
      window.removeEventListener(PAYMENT_SUMMARY_UPDATED_EVENT, onRefresh)
      window.removeEventListener(TAX_WORKSHEET_UPDATED_EVENT, onRefresh)
      window.removeEventListener(INDIVIDUAL_OVERRIDES_UPDATED_EVENT, onRefresh)
    }
  }, [refresh])

  const fyTransactions = useMemo(
    () => filterTransactionsByFinancialYear(transactions, financialYear),
    [transactions, financialYear]
  )

  const lodgment = useMemo(
    () =>
      computePersonalTaxLodgment(
        fyTransactions,
        financialYear,
        overrides,
        paymentTotals,
        worksheetNets
      ),
    [fyTransactions, financialYear, overrides, paymentTotals, worksheetNets]
  )

  return {
    loading,
    overrides,
    paymentTotals,
    worksheetNets,
    fyTransactions,
    lodgment,
    refresh,
  }
}
