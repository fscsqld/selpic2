/**
 * Wave 4.5 Site Review — finding + report types (S0).
 * L0 reports only; no Hero edits / no open-web scrape.
 *
 * Cousins: empty baseline, legacy rows without provider fields, multi-admin
 * shared site_configs, AU FY period vs Sydney calendar day keys, accepted/wontfix
 * still in store but out of incremental deep re-check.
 */

import type { AgentSectorId } from '../sectors'

export type SiteReviewFindingStatus =
  | 'open'
  | 'fixed'
  | 'accepted'
  | 'wontfix'
  | 'regressed'

export type SiteReviewTrigger = 'quarterly' | 'manual' | 'error_recheck'

export type SiteReviewSeverity = 'info' | 'warn' | 'error'

/** Storefront smoke, sector health, or catalog heuristic (Performance reuse later). */
export type SiteReviewFindingKind =
  | 'storefront_smoke'
  | 'sector_health'
  | 'catalog_heuristic'
  | 'other'

export type SiteReviewSector =
  | AgentSectorId
  | 'storefront'
  | 'products'
  | 'other'

export type SiteReviewFinding = {
  id: string
  /** Stable id for incremental re-check across periods. */
  fingerprint: string
  sector: SiteReviewSector
  kind: SiteReviewFindingKind
  severity: SiteReviewSeverity
  status: SiteReviewFindingStatus
  title: string
  detail?: string
  /** Admin deep-link (HITL); never auto-mutate. */
  deepLink?: string
  evidence?: string
  trigger: SiteReviewTrigger
  createdAt: string
  updatedAt: string
}

export type SiteReviewReport = {
  id: string
  /** e.g. FY2025-26-Q1 — AU FY quarter label for Site Review cadence. */
  periodKey: string
  trigger: SiteReviewTrigger
  createdAt: string
  updatedAt: string
  /** When true, deep work targets open/regressed only (plus cheap smokes in S1+). */
  incremental: boolean
  findings: SiteReviewFinding[]
  summary?: string
}

export type SiteReviewStoreSnapshot = {
  updatedAt: string
  /** Newest first. Cap applied by store layer in S1. */
  reports: SiteReviewReport[]
}
