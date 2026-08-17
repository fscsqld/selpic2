import type { FundraisingDocumentType } from '@/lib/fundraising/types'

/**
 * Official grant / remittance records that partners should file.
 * Everything else (registration, welcome, OTP, alerts) stays HTML-only email — no PDF.
 */
export const FUNDRAISING_PDF_ATTACHMENT_TYPES = [
  'D9',
  'D10',
  'D11',
  'D13',
] as const satisfies readonly FundraisingDocumentType[]

export type FundraisingPdfAttachmentType = (typeof FUNDRAISING_PDF_ATTACHMENT_TYPES)[number]

export function fundraisingDocNeedsPdfAttachment(
  type: FundraisingDocumentType | string
): boolean {
  return (FUNDRAISING_PDF_ATTACHMENT_TYPES as readonly string[]).includes(type)
}
