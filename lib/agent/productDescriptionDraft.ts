/**
 * Free product description templates for Admin HITL.
 * Output is customer-facing storefront copy only — no developer / HITL meta.
 *
 * Cousins: short listing vs PDP detail, empty name/category, AU English,
 * invent rules live in LLM prompt + UI microcopy (never in Apply text),
 * substantial existing copy must NOT be concatenated with a second generic
 * template (duplicate Highlights/Size/Specs — learned 2026-09).
 */

export type ProductDescriptionField = 'description' | 'detailDescription'

export type ProductDescriptionDraftInput = {
  field: ProductDescriptionField
  name: string
  category?: string
  existingText?: string
}

export type ProductDescriptionDraftResult = {
  field: ProductDescriptionField
  text: string
}

/** True if text looks like leaked admin/dev instructions (must not publish). */
export function productDescriptionLooksLikeInternalMeta(text: string): boolean {
  return /Do not invent|Draft only|Keep these verified details|Template note\)|Apply to the form|HITL|prompt-engineering/i.test(
    text
  )
}

/** Full PDP copy already — Generate must not append another skeleton. */
export function productDescriptionIsSubstantialCopy(text: string): boolean {
  const t = text.trim()
  if (t.length >= 280) return true
  return /Key Highlights|Size Guide|Product Specifications|Versatile Use Cases/i.test(t)
}

function buildDetailSkeleton(opts: {
  name: string
  category: string
  introParagraph: string
}): string {
  const { name, category, introParagraph } = opts
  return [
    name,
    '',
    'Clear labels. Everyday gear. Ready for school and daycare.',
    introParagraph,
    '',
    '✨ Key Highlights',
    '- Easy to read: Bold, simple personalisation that stands out on busy bags and bottles.',
    '- Built for daily life: Suited to school runs, kinder bags, and lunchbox routines.',
    '- Gift-ready: A practical option for birthdays, term starts, and class gifts.',
    '',
    '📏 Size Guide & Best Uses',
    '1. Standard — Everyday bags, pencil cases, and lunchboxes.',
    '2. Larger format — Bigger surfaces, sport bags, or statement placements (edit to match your listing).',
    '',
    '📋 Product Specifications',
    `- Product Name: ${name}`,
    `- Category: ${category}`,
    '- Included Sizes: Edit to match your product options',
    '- Material: Edit to match finish (e.g. waterproof vinyl, fabric iron-on)',
    '- Key Features: Durable personalisation for home, school, and early learning',
    '',
    '💡 Versatile Use Cases',
    '- School & daycare: Name bags, bottles, hats, and cubby gear',
    '- Home & gifts: Lunchboxes, water bottles, and thoughtful presents',
  ].join('\n')
}

export function buildProductDescriptionDraft(
  input: ProductDescriptionDraftInput
): ProductDescriptionDraftResult {
  const name = (input.name || '').trim() || 'SELPIC Product'
  const category = (input.category || '').trim() || 'print product'
  const existing = (input.existingText || '').trim()
  // Never re-inject old meta into a new template.
  const cleanExisting =
    existing && !productDescriptionLooksLikeInternalMeta(existing) ? existing : ''

  if (input.field === 'detailDescription') {
    // Admin already has production-ready (or Polish) copy — do not append generics.
    if (cleanExisting && productDescriptionIsSubstantialCopy(cleanExisting)) {
      return { field: 'detailDescription', text: cleanExisting }
    }

    const intro =
      cleanExisting ||
      `${name} brings clear, durable personalisation to everyday bags, bottles, lunchboxes, and centre gear — made for Australian families, schools, kindergarten, and daycare.`

    return {
      field: 'detailDescription',
      text: buildDetailSkeleton({ name, category, introParagraph: intro }),
    }
  }

  // Short listing description — card/summary copy only.
  const text = cleanExisting
    ? cleanExisting
    : [
        `${name} — ${category} from SELPIC.`,
        'Clear, durable personalisation for home, school, kinder, and daycare.',
      ].join(' ')

  return { field: 'description', text }
}
