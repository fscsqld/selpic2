/**
 * Route-scoped Google Fonts <link> tags (customize / stamp only).
 * Do not mount from root layout — homepage must stay free of machine font CDN loads.
 */

function withDeployCacheBust(href: string): string {
  const v = (process.env.NEXT_PUBLIC_DEPLOY_VERSION || '').trim()
  if (!v) return href
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}v=${encodeURIComponent(v)}`
}

type Props = {
  /** Deduped Google Fonts CSS URLs (https://fonts.googleapis.com/...). */
  hrefs: string[]
  /** Extra combined CSS URLs (e.g. compact Korean stack fallbacks). */
  extraHrefs?: string[]
}

export default function GoogleFontsLinks({ hrefs, extraHrefs = [] }: Props) {
  const all = Array.from(
    new Set(
      [...hrefs, ...extraHrefs]
        .map((u) => String(u || '').trim())
        .filter((u) => u.startsWith('https://fonts.googleapis.com/'))
        .map(withDeployCacheBust)
    )
  )
  if (!all.length) return null

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {all.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
    </>
  )
}
