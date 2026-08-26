import fs from 'fs'

const lines = fs.readFileSync('app/page.tsx', 'utf8').split(/\r?\n/)
const header = `'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, Trash2 } from 'lucide-react'
import { ApiKeyForm } from '@/components/Settings/ApiKeyForm'
import { ApiBalanceDashboard } from '@/components/Settings/ApiBalanceDashboard'
import { BusinessProfileForm } from '@/components/Settings/BusinessProfileForm'
import { DataBackupRestore } from '@/components/Settings/DataBackupRestore'
import { PeriodManagement } from '@/components/Settings/PeriodManagement'
import { IncomingOrders } from '@/components/Settings/IncomingOrders'
import { OrderReconciliation } from '@/components/Reconciliation/OrderReconciliation'
import { BankReconciliationPanel } from '@/components/Reconciliation/BankReconciliationPanel'
import { AuditTrailView } from '@/components/AuditTrailView'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import type { ClassifiedTransaction } from '@/lib/dashboard/types'

`

let body = lines.slice(3402, 3890).join('\n')
body = body
  .replace(/^function TaxReportingForm/m, 'export function TaxReportingForm')
  .replace(/^function ClearAllHistorySection/m, 'export function ClearAllHistorySection')
  .replace(/^function SettingsPage/m, 'export function SettingsPage')
  .replace(/^interface ClearAllHistorySectionProps/m, 'export interface ClearAllHistorySectionProps')
  .replace(/^interface SettingsPageProps/m, 'export interface SettingsPageProps')

fs.writeFileSync('components/Dashboard/SettingsPage.tsx', header + body)
console.log('OK')
