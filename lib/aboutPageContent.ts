/**
 * Maps legacy Korean `title` values in persisted CMS rows to canonical English titles
 * (see `lib/contentStore.ts` `section: 'about'` defaults and Admin).
 */
import { createPolicyContentGetter } from '@/lib/policyPageContent'

type AboutCmsItem = { title: string; type?: string; content?: string; linkUrl?: string }

export const ABOUT_TITLE_ALIASES: Record<string, string> = {
  'Hero 제목': 'Hero Title',
  'Hero 부제목': 'Hero Subtitle',
  'Hero Browse 버튼': 'Hero Browse Button',
  'Hero Browse 버튼 링크': 'Hero Browse Button Link',
  'Company Story 제목': 'Company Story Title',
  'Company Story 첫 번째 문단': 'Company Story First Paragraph',
  'Company Story 두 번째 문단': 'Company Story Second Paragraph',
  'Company Story 세 번째 문단': 'Company Story Third Paragraph',
  'Why Selpic 제목': 'Why Selpic Title',
  'Why Selpic 부제목': 'Why Selpic Subtitle',
  '최고 품질 제목': 'Superior Quality Title',
  '최고 품질 설명': 'Superior Quality Description',
  '고객 만족 제목': 'Customer Satisfaction Title',
  '고객 만족 설명': 'Customer Satisfaction Description',
  "Selpic의 약속 제목": "Selpic's Promise Title",
  "Selpic의 약속 설명": "Selpic's Promise Description",
  'Values 섹션 제목': 'Values Section Title',
  'Values 섹션 부제목': 'Values Section Subtitle',
  'Innovation 제목': 'Innovation Title',
  'Innovation 설명': 'Innovation Description',
  'Quality Values 제목': 'Quality Values Title',
  'Quality Values 설명': 'Quality Values Description',
  'Customer Values 제목': 'Customer Values Title',
  'Customer Values 설명': 'Customer Values Description',
  'Team 섹션 제목': 'Team Section Title',
  'Team 섹션 부제목': 'Team Section Subtitle',
  'Design Team 제목': 'Design Team Title',
  'Design Team 설명': 'Design Team Description',
  'Production Team 제목': 'Production Team Title',
  'Production Team 설명': 'Production Team Description',
  'Support Team 제목': 'Support Team Title',
  'Support Team 설명': 'Support Team Description',
  'Mission 섹션 제목': 'Mission Section Title',
  'Mission 섹션 설명': 'Mission Section Description',
  'Global Reach 제목': 'Global Reach Title',
  'Global Reach 설명': 'Global Reach Description',
  'Mission Innovation 제목': 'Mission Innovation Title',
  'Mission Innovation 설명': 'Mission Innovation Description',
  'Sustainability 제목': 'Sustainability Title',
  'Sustainability 설명': 'Sustainability Description',
  'CTA 섹션 제목': 'CTA Section Title',
  'CTA 섹션 설명': 'CTA Section Description',
  'CTA Browse Products 버튼': 'CTA Browse Products Button',
  'CTA Browse Products 버튼 링크': 'CTA Browse Products Button Link',
}

export function createAboutContentGetter(items: Pick<AboutCmsItem, 'title' | 'content'>[]) {
  return createPolicyContentGetter(items, ABOUT_TITLE_ALIASES)
}

export function resolveAboutLinkUrl(
  items: AboutCmsItem[],
  title: string,
  defaultUrl: string
): string {
  const canonical = ABOUT_TITLE_ALIASES[title] ?? title
  const fromCanonical = items.find((i) => i.title === canonical && i.type === 'link')
  if (fromCanonical?.linkUrl?.trim()) return fromCanonical.linkUrl.trim()
  const fromRaw = items.find((i) => i.title === title && i.type === 'link')
  return fromRaw?.linkUrl?.trim() || defaultUrl
}
