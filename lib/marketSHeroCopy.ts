export function resolveCategoryHubHeroCopy(opts: {
  slideTitle?: string | null
  slideSubtitle?: string | null
  categoryTitle?: string | null
  categoryDescription?: string | null
  fallbackTitle: string
}): { title: string; subtitle: string } {
  const slideTitle = (opts.slideTitle || '').trim()
  const slideSubtitle = (opts.slideSubtitle || '').trim()
  const fallbackTitle = (opts.fallbackTitle || '').trim() || 'Untitled'
  const categoryTitle = (opts.categoryTitle || '').trim() || fallbackTitle
  const categoryDescription = (opts.categoryDescription || '').trim()

  return {
    title: slideTitle || categoryTitle,
    subtitle: slideSubtitle || categoryDescription,
  }
}

export function resolveMarketSHeroCopy(opts: {
  slideTitle?: string | null
  slideSubtitle?: string | null
  categoryTitle?: string | null
  categoryDescription?: string | null
}): { title: string; subtitle: string } {
  return resolveCategoryHubHeroCopy({ ...opts, fallbackTitle: 'Market S' })
}
