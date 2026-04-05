/**
 * Admin CMS stores policy rows with English `title` fields; older page code used Korean labels.
 * Maps UI/legacy keys → canonical `contentStore` titles so `getContent()` resolves persisted data.
 */

export function createPolicyContentGetter(
  items: { title: string; content?: string }[],
  aliases: Record<string, string>
) {
  return (title: string): string => {
    const canonical = aliases[title] ?? title
    const fromCanonical = items.find((i) => i.title === canonical)?.content
    if (fromCanonical != null && String(fromCanonical).trim() !== '') return String(fromCanonical)
    const fromRaw = items.find((i) => i.title === title)?.content
    return fromRaw != null ? String(fromRaw) : ''
  }
}

/** app/privacy/page.tsx */
export const PRIVACY_TITLE_ALIASES: Record<string, string> = {
  'Privacy Policy 제목': 'Privacy Policy Title',
  'Privacy Policy 부제목': 'Privacy Policy Subtitle',
  'Introduction 제목': 'Introduction Title',
  'Introduction 내용': 'Introduction Content',
  'Information We Collect 제목': 'Information We Collect Title',
  'Information We Collect 설명': 'Information We Collect Description',
  'How We Collect Information 제목': 'How We Collect Information Title',
  'How We Collect Information 설명': 'How We Collect Information Description',
  'How We Collect Information 목록': 'How We Collect Information List',
  'How We Collect Information 설명2': 'How We Collect Information Description 2',
  'Purpose of Collection and Use 제목': 'Purpose of Collection and Use Title',
  'Purpose of Collection and Use 설명': 'Purpose of Collection and Use Description',
  'How We Use Information 목록': 'How We Use Information List',
  'Direct Marketing 제목': 'Direct Marketing Title',
  'Direct Marketing 설명': 'Direct Marketing Description',
  'Direct Marketing 목록': 'Direct Marketing List',
  'Disclosure to Third Parties 제목': 'Disclosure to Third Parties Title',
  'Disclosure to Third Parties 설명': 'Disclosure to Third Parties Description',
  'Disclosure to Third Parties 목록': 'Disclosure to Third Parties List',
  'Disclosure to Third Parties 설명2': 'Disclosure to Third Parties Description 2',
  'Data Security 제목': 'Data Security Title',
  'Data Security 설명': 'Data Security Description',
  'Data Security 목록': 'Data Security List',
  'Access and Correction 제목': 'Access and Correction Title',
  'Your Rights 설명': 'Access and Correction Description',
  'Your Rights 목록': 'Access and Correction List',
  'Making a Complaint 제목': 'Making a Complaint Title',
  'Making a Complaint 설명': 'Making a Complaint Description',
  'Making a Complaint 목록': 'Making a Complaint List',
  'Contact Information 제목': 'Contact Information Title',
  'Contact Information 설명': 'Contact Information Description',
}

/** app/terms/page.tsx */
export const TERMS_TITLE_ALIASES: Record<string, string> = {
  'Terms and Conditions 제목': 'Terms and Conditions Title',
  'Terms and Conditions 부제목': 'Terms and Conditions Subtitle',
  'Agreement to Terms 제목': 'Agreement to Terms Title',
  'Agreement to Terms 내용': 'Agreement to Terms Content',
  'Use of Service 제목': 'Use of Service Title',
  'Permitted Uses 제목': 'Permitted Uses Title',
  'Permitted Uses 목록': 'Permitted Uses List',
  'Prohibited Uses 제목': 'Prohibited Uses Title',
  'Prohibited Uses 내용': 'Prohibited Uses Content',
  'Prohibited Uses 목록': 'Prohibited Uses List',
  'Orders and Payment 제목': 'Orders and Payment Title',
  'Order Processing 제목': 'Order Processing Title',
  'Order Processing 목록': 'Order Processing List',
  'Payment Terms 제목': 'Payment Terms Title',
  'Payment Terms 목록': 'Payment Terms List',
  'Intellectual Property 제목': 'Intellectual Property Title',
  'SELPIC Rights 제목': 'SELPIC Rights Title',
  'SELPIC Rights 내용': 'SELPIC Rights Content',
  'User Content 제목': 'User Content Title',
  'User Content 목록': 'User Content List',
  'Limitation of Liability 제목': 'Limitation of Liability Title',
  'Limitation of Liability 내용': 'Limitation of Liability Content',
  'Limitation of Liability 목록': 'Limitation of Liability List',
  'Limitation of Liability 내용2': 'Limitation of Liability Content 2',
  'Limitation of Liability 목록2': 'Limitation of Liability List 2',
  'Returns and Refunds 제목': 'Returns and Refunds Title',
  'Return Policy 제목': 'Return Policy Title',
  'Return Policy 목록': 'Return Policy List',
  'Refund Process 제목': 'Refund Process Title',
  'Refund Process 목록': 'Refund Process List',
  'Changes to Terms 제목': 'Changes to Terms Title',
  'Changes to Terms 내용': 'Changes to Terms Content',
  'Governing Law 제목': 'Governing Law Title',
  'Governing Law 내용': 'Governing Law Content',
  'Governing Law 목록': 'Governing Law List',
  'Contact Information 제목': 'Contact Information Title',
  'Contact Information 설명': 'Contact Information Description',
}

/** app/refund/page.tsx */
export const REFUND_TITLE_ALIASES: Record<string, string> = {
  'Section 1 내용': 'Section 1 Content',
  'Section 1 목록': 'Section 1 List',
  'Section 2 내용': 'Section 2 Content',
  'Section 2 목록': 'Section 2 List',
  'Section 3 내용': 'Section 3 Content',
  'Section 3 목록': 'Section 3 List',
}
