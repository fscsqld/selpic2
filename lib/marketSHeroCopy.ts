export function resolveMarketSHeroCopy(opts: {
  slideTitle?: string | null
  slideSubtitle?: string | null
  categoryTitle?: string | null
  categoryDescription?: string | null
}): { title: string; subtitle: string } {
  const slideTitle = (opts.slideTitle || '').trim()
  const slideSubtitle = (opts.slideSubtitle || '').trim()
  const categoryTitle = (opts.categoryTitle || '').trim() || 'Market S'
  const categoryDescription = (opts.categoryDescription || '').trim()

  return {
    title: slideTitle || categoryTitle,
    subtitle: slideSubtitle || categoryDescription,
  }
}
