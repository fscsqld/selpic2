/**
 * Storefront URL for logout redirects from Selpic A back to admin dashboard.
 * Production: set NEXT_PUBLIC_STOREFRONT_URL to https://selpic.com.au (or your host).
 */
export function getStorefrontBaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).trim()
  return raw.replace(/\/$/, '')
}

export function getStorefrontAdminDashboardUrl(): string {
  return `${getStorefrontBaseUrl()}/admin/dashboard`
}
