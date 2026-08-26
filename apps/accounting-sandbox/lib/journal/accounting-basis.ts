/**
 * Accounting basis (cash vs accrual) — stored on business profile.
 */

import { indexedDBStorage } from '@/lib/storage/indexed-db'

export type AccountingBasis = 'cash' | 'accrual'

export interface AccountingSettings {
  basis: AccountingBasis
  autoPostArApJournals: boolean
}

const DEFAULT_SETTINGS: AccountingSettings = {
  basis: 'cash',
  autoPostArApJournals: true,
}

export async function getAccountingSettings(): Promise<AccountingSettings> {
  try {
    const profile = await indexedDBStorage.getBusinessProfile()
    return {
      basis: profile?.accountingBasis === 'accrual' ? 'accrual' : 'cash',
      autoPostArApJournals: profile?.autoPostArApJournals !== false,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function getAccountingSettingsFromProfile(
  profile: { accountingBasis?: string; autoPostArApJournals?: boolean } | null
): AccountingSettings {
  if (!profile) return DEFAULT_SETTINGS
  return {
    basis: profile.accountingBasis === 'accrual' ? 'accrual' : 'cash',
    autoPostArApJournals: profile.autoPostArApJournals !== false,
  }
}
