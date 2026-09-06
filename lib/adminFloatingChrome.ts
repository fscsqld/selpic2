/**
 * Shared insets for admin fixed chrome (sound FAB, CMS save badge).
 * Keep positions + content pad in sync so last page rows do not sit under FABs.
 *
 * Cousins: short viewports, safe-area notches, long “Enable sound alerts” label,
 * SiteConfig badge (opposite corner), mobile zoom, scroll-to-end vs content that
 * already fits the viewport without scrolling.
 */
export const ADMIN_FLOATING_CHROME = {
  /** Scroll/end padding so last activity / footnote lines clear the sound FAB. */
  contentPadClass: 'pb-20',
  /**
   * Bottom-left sound control. Prefer left so it never stacks under the CMS
   * save pill (bottom-right). Raise with safe-area so home-indicator devices clear.
   */
  soundFabClass:
    'fixed bottom-4 left-4 z-[60] mb-[max(0px,env(safe-area-inset-bottom,0px))]',
  /** Transient CMS write status — opposite corner from the sound FAB. */
  siteConfigBadgeClass:
    'fixed bottom-3 right-3 z-[9999] mb-[max(0px,env(safe-area-inset-bottom,0px))] max-w-[85vw]',
} as const
