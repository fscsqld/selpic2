/**
 * Site Review public barrel (S0) — types + helpers only; runners in S1.
 */

export type {
  SiteReviewFinding,
  SiteReviewFindingKind,
  SiteReviewFindingStatus,
  SiteReviewReport,
  SiteReviewSector,
  SiteReviewSeverity,
  SiteReviewStoreSnapshot,
  SiteReviewTrigger,
} from './types'

export {
  STOREFRONT_SMOKE_CHECKS,
  storefrontSmokeFingerprint,
  buildSiteReviewFingerprint,
  type StorefrontSmokeCheck,
} from './storefrontSmokeChecklist'

export {
  selectFindingsForIncrementalDeepRecheck,
  isDeepRecheckStatus,
  mergeFindingByFingerprint,
  markFindingRegressed,
  fingerprintsEqual,
} from './findings'

export { siteReviewPeriodKey, isSiteReviewPeriodKey } from './periodKey'
