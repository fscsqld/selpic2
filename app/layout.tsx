import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { getAllGoogleFontsUrls } from '@/lib/fontList'
import { COMPANY_CONTACT, COMPANY_LEGAL } from '@/lib/companyLegal'
import ClientSwCacheReset from '@/components/ClientSwCacheReset'

const inter = Inter({ subsets: ['latin'] })
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au'
const siteName = 'Selpic'
const siteTitle = 'Custom Stickers & Name Labels Australia | Selpic'
const siteDescription =
  'Order custom stickers and waterproof name labels in Australia with Selpic. Fast turnaround, premium print quality, and easy online personalization for school, home, and business.'
const defaultOgImage = `${siteUrl.replace(/\/$/, '')}/images/logo.png`

/** Ensures phones/tablets use device width; viewportFit helps safe-area on notched iOS; theme for browser chrome. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#34aadc',
}

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: '%s | Selpic',
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    'custom stickers',
    'name labels',
    'waterproof name labels',
    'school name labels',
    'waterproof stickers',
    'personalized labels',
    'custom labels australia',
    'Selpic',
    'Australia',
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    // Resolve canonical to each current route instead of forcing every page to "/".
    canonical: './',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName,
    locale: 'en_AU',
    type: 'website',
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: 'Selpic custom sticker storefront',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [defaultOgImage],
  },
  verification: {
    google: 'FW1UlAfZluDdHCWqsZZwHvUyLwizz9NgVEMvFaXKpkE',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: 'default',
  },
}

function withDeployCacheBust(href: string): string {
  const v = (process.env.NEXT_PUBLIC_DEPLOY_VERSION || '').trim()
  if (!v) return href
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}v=${encodeURIComponent(v)}`
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  /**
   * Deploy token for stale-flash prevention.
   * - Prefer explicit NEXT_PUBLIC_DEPLOY_VERSION if you manage it.
   * - Otherwise use Vercel-provided values that change per deploy/commit.
   *
   * IMPORTANT: Do not gate UX-critical rendering on this token (no visibility-hiding).
   * We only use it to decide whether to clear stale local snapshots and reload early.
   */
  const deployVersion =
    (process.env.NEXT_PUBLIC_DEPLOY_VERSION || '').trim() ||
    (process.env.VERCEL_GIT_COMMIT_SHA || '').trim() ||
    (process.env.VERCEL_DEPLOYMENT_ID || '').trim()
  // Stampzone machine: load Google Fonts for label printer
  const googleFontsUrls = getAllGoogleFontsUrls().map(withDeployCacheBust)
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY_LEGAL.companyName,
    url: siteUrl,
    email: COMPANY_CONTACT.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: COMPANY_CONTACT.address,
      addressCountry: 'AU'
    }
  }
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Selpic',
    url: siteUrl
  }
  return (
    <html lang="en">
      <head>
        {/* Meta no-cache is not authoritative like HTTP headers, but helps older/embedded browsers. */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* Prevent "Flash of Stale Content" after deploy by checking version BEFORE hydration. */}
        {deployVersion && deployVersion !== 'dev-local' ? (
          <Script
            id="selpic-inline-deploy-version-guard"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(){
  try {
    var current = ${JSON.stringify(deployVersion)};
    if (!current) return;

    function shouldSkipPath(path){
      // Never interfere with admin/auth flows.
      if (path === '/login' || path.indexOf('/register') === 0 || path.indexOf('/auth/') === 0 || path === '/forgot-password' || path.indexOf('/reset-password') === 0) return true;
      if (path === '/admin' || path.indexOf('/admin/') === 0) return true;
      return false;
    }

    function readCookieVersion(key){
      try {
        var c = document.cookie.split(';').map(function(v){ return v.trim(); }).find(function(v){ return v.indexOf(key+'=') === 0; });
        return c ? decodeURIComponent(c.slice(key.length + 1)) : null;
      } catch (e) { return null; }
    }

    function applyGuard(){
      var path = String(location && location.pathname || '');
      if (shouldSkipPath(path)) return;

      var VERSION_KEY = 'selpic-deploy-version';
      var VERSION_COOKIE_KEY = 'selpic_deploy_version';
      var APPLIED_KEY = 'selpic-inline-version-applied';

      // Avoid infinite reload loops: if we already applied this version in this tab, do nothing.
      try {
        var applied = sessionStorage.getItem(APPLIED_KEY);
        if (applied === current) return;
      } catch (e) {}

      var previous = null;
      try { previous = localStorage.getItem(VERSION_KEY); } catch (e) {}
      if (!previous) previous = readCookieVersion(VERSION_COOKIE_KEY);

      if (!previous || previous === current) {
        try { localStorage.setItem(VERSION_KEY, current); } catch (e) {}
        try { sessionStorage.setItem(APPLIED_KEY, current); } catch (e) {}
        try { document.cookie = VERSION_COOKIE_KEY+'='+encodeURIComponent(current)+'; path=/; max-age=31536000; samesite=lax'; } catch (e) {}
        return;
      }

      // Version changed: clear Selpic storefront snapshots only (do NOT localStorage.clear()).
      try {
        localStorage.removeItem('content-store');
        localStorage.removeItem('selpic-store');
        localStorage.setItem(VERSION_KEY, current);
      } catch (e) {}
      try {
        sessionStorage.removeItem('selpic-cms-build-applied');
        sessionStorage.setItem(APPLIED_KEY, current);
      } catch (e) {}
      try { document.cookie = VERSION_COOKIE_KEY+'='+encodeURIComponent(current)+'; path=/; max-age=31536000; samesite=lax'; } catch (e) {}

      // Hard reload BEFORE hydration so stale HTML is less likely to paint.
      location.replace(location.href);
    }

    var path = String(location && location.pathname || '');
    if (shouldSkipPath(path)) return;

    // Run once before hydration.
    applyGuard();

    // BFCache restore (Safari / Google → back/forward) can re-show stale DOM.
    // On pageshow persisted, re-check and reload if version changed.
    try {
      window.addEventListener('pageshow', function(e){
        try {
          if (e && e.persisted) applyGuard();
        } catch (err) {}
      });
    } catch (e) {}
  } catch (e) {}
})();`,
            }}
          />
        ) : null}
        {/* ✅ Google Fonts CDN 로드 */}
        {googleFontsUrls.map((url) => (
          <link key={url} rel="stylesheet" href={url} />
        ))}
        {/* ✅ 한글 폰트 추가 로드 (Google Fonts에 있는 실제 한글 폰트들) */}
        <link key="preconnect-googleapis" rel="preconnect" href="https://fonts.googleapis.com" />
        <link key="preconnect-gstatic" rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          key="stylesheet-ko-bundle"
          href={withDeployCacheBust(
            'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Jua&family=Do+Hyeon&family=Nanum+Gothic:wght@400;700;800&family=Nanum+Brush+Script&family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap'
          )}
          rel="stylesheet"
        />
        <script
          key="jsonld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          key="jsonld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <ClientSwCacheReset />
        {children}
      </body>
    </html>
  )
}