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

export { resolvePublicSiteOrigin } from './publicOrigin'

export {
  parseSiteReviewSnapshot,
  sanitizeSiteReviewFinding,
  sanitizeSiteReviewReport,
  SITE_REVIEW_REPORTS_MAX,
} from './normalize'

export {
  getSiteReviewQuarterWindow,
  hasQuarterlyReportForPeriod,
  isSiteReviewCronEnabled,
  isSiteReviewCronEmailEnabled,
} from './quarterlyCron'

export { runQuarterlySiteReviewCron } from './runQuarterlySiteReview'

export {
  applyFindingStatus,
  canMarkFindingStatus,
  isMarkableFindingStatus,
  sortSiteReviewFindings,
  findingSortRank,
  resolveRecheckStatus,
} from './findingStatus'

export {
  recheckSiteReviewFinding,
} from './recheckFinding'

export {
  runSiteReview,
} from './runSiteReview'

export {
  parseSiteReviewRunSectors,
  ALL_RUN_SECTORS,
  type SiteReviewRunSector,
} from './runSectors'
