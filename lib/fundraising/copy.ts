/**
 * Partner-facing English labels for Community Cashback Partnership.
 * Keep DB/engine fields (netSales, commissionAmount, linkedPromoCode) unchanged —
 * use these strings only in UI, emails, and document templates.
 */

export const FUNDRAISING_COPY = {
  brandLine: 'Thank you for partnering with SELPIC. Together for Our School & Community.',
  brandTrust: 'SELPIC puts trust and transparency with our community partners first.',
  grantAccountTitle: 'Official Grant Account',
  grantAccountHelp:
    'This is the official school or organisation account SELPIC uses for Fundraising Cashback Grant transfers and D9/D10 statements. Details are registered and updated by SELPIC after verification — they cannot be edited directly in this portal.',
  grantAccountRequestHelp:
    'Need to register or change these details? Submit a short request below. SELPIC will email a form for you to complete and upload — you cannot edit bank details directly here.',
  grantAccountRequestCta: 'Request update from SELPIC',
  grantAccountRequestNoteLabel: 'Message to SELPIC',
  grantAccountRequestIntakeHint:
    'Describe what needs to change only. Do not enter BSB or account numbers here — SELPIC will send a secure form, then you attach the completed files when you reply.',
  grantAccountRequestSubmit: 'Send request to SELPIC',
  grantAccountNotRegistered:
    'Official Grant Account is not registered yet. SELPIC will set this after verifying your organisation, or you can request registration below.',
  grantAccountRequired: 'Grant Account Required',
  grantAccountMissingAdmin:
    'This partner has no Official Grant Account yet. Register ABN/BSB/account in Partner Registry before Mark Paid.',
  totalCommunitySupport: 'Total Community Support',
  fundraisingCashbackGrant: 'Fundraising Cashback Grant',
  partnerCommunityCode: 'Partner Community Code',
  communityImpact: 'Community Impact & Contribution',
  communityPartner: 'Community Partner',
  settlementArchive: 'Grant transfer history',
  settlementArchiveHint:
    'Quarterly figures lock 7 calendar days after the Australian financial-year quarter ends (cancellations/refunds window), when SELPIC generates the settlement. They may differ slightly from all-time Impact totals until a period is regenerated. Ready / Paid rows are the amounts used for bank transfer and D9/D10. Target payout date: the 15th of the month after the quarter ends (or the next business day if that date falls on a weekend).',
  documentsTitle: 'Partnership documents',
  marketingHub: 'Share with families',
  verifyAccessTitle: 'Secure partner access',
  verifyAccessBody:
    'Enter the one-time code sent to your organisation contact email to open your private partnership dashboard.',
  sessionDurationNote:
    'After verification, your session stays active for 2 hours on this browser. Bookmark your access link for next time.',
  otpSentTrust:
    'For transparent and secure grant delivery, we sent a verification code to your organisation email.',
  lookupPortalEyebrow: 'Community partnership portal',
  lookupPortalSecureBadge: 'Secure session',
  lookupAllTimeHint:
    'All-time totals for your Partner Community Code. Total Community Support is product totals after the family community discount (shipping, cancelled, and refunded orders excluded).',
  lookupCurrentQuarterHint:
    'Orders in the current Australian financial-year quarter only. After a quarter ends, new sales start here for the next quarter while the previous quarter finalises (7-day freeze) and pays out.',
  lookupTransfersHint:
    'Quarterly figures lock 7 calendar days after the quarter ends so cancellations and refunds can settle. Ready / Paid rows are used for bank transfer and D9/D10. Target payout: the 15th of the month after the quarter ends (next business day if weekend).',
  lookupPrivacyNote:
    'Purchaser details stay with SELPIC. This portal shows contribution totals only — not customer names or order lists. Families check out as their own SELPIC customer accounts (register/login to pay). Ending your organisation partnership does not close or change those personal accounts — each customer manages their own login, orders, and any account closure.',
  lookupGrantAccountAlert:
    'Official Grant Account is not on file yet. Request registration below (or reply to your partnership email) so SELPIC can transfer grants and issue D9/D10.',
  lookupVisitWebsite: 'Visit selpic.com.au',
  lookupEndSession: 'End session',
  lookupNavImpact: 'Impact',
  lookupNavAccount: 'Grant account',
  lookupNavShare: 'Share',
  lookupNavTransfers: 'Transfers',
  lookupNavDocuments: 'Documents',
  lookupFooterSupport:
    'Questions about your partnership or a transfer? Reply to your SELPIC partnership email and our team will help.',
  landingHeroEyebrow: 'Community fundraising partnerships',
  adminGrantTracker: 'Community Cashback Grant Tracker',
  adminPartnersSubtitle:
    'Review applications, assign a Partner Community Code, and support quarterly Fundraising Cashback Grant transfers (Australian financial-year quarters). Checkout discount engine stays read-only.',
  adminPayoutSubtitle:
    'Prepare quarterly Fundraising Cashback Grant transfers (AU FY quarters). Lock figures 7 days after quarter end, then copy Official Grant Account details, export CSV, and confirm paid (D9/D10). Target payout: 15th of the month after quarter end.',
  adminReportSubtitle:
    'Orders matched by Partner Community Code for the selected Australian financial-year quarter. Total Community Support = product totals after the family community discount (shipping and cancelled/refunded orders excluded).',
  nextGrantTransfer: 'Next grant transfer',
  nextGrantTransferHint:
    'Dates follow Australian financial-year quarters. After quarter end, totals finalise over 7 calendar days (Sydney), then target payout is the 15th of the following month (next business day if weekend). Final amounts appear after SELPIC generates the quarterly settlement.',
  completedGrants: 'Completed grant transfers',
  editGrantAccount: 'Request Official Grant Account update',
  saveGrantAccount: 'Send request to SELPIC',
  revealAccount: 'Reveal',
  hideAccount: 'Hide',
  copyBankTransfer: 'Copy Bank Transfer Info',
  exportCsv: 'Export Bank Transfer CSV',
  markPaid: 'Mark as Paid',
  generateSettlement: 'Generate Settlement',

  /**
   * AU-aligned partnership-end data handling (APP 11.2 + tax/company retention).
   * Do not claim that “all organisation records are automatically deleted”.
   * Customer retail accounts (register/login to pay) are independent of the org partnership.
   */
  customerAccountIndependence:
    'Families and supporters shop on selpic.com.au as ordinary SELPIC customers: they register or log in to place and pay for orders. Your Partner Community Code only applies a community discount at checkout and attributes Total Community Support to your organisation. Fundraising is a relationship between SELPIC and your organisation — it does not create or control a customer’s personal account. If the partnership later ends, customer logins, order history, and account choices are unaffected. A customer who wants to close their SELPIC account does so themselves, the same way as any other retail customer.',
  customerAccountIndependenceFaqQ:
    'Does our Partner Community Code create family accounts, or end them when we leave?',
  customerAccountIndependenceFaqA:
    'No. Supporters must register or log in to their own SELPIC customer account to pay for products. The Partner Community Code only gives the community discount and tracks support for your organisation. Community Fundraising is an organisation-level partnership with SELPIC. After that, each customer decides how to use their own account — including staying active or closing it later — just like any other SELPIC shopper. Ending or not renewing your partnership does not delete, suspend, or take over family logins.',
  partnershipEndDataShort:
    'When a partnership ends, we close organisation operational access and destroy or de-identify organisation personal information that is no longer needed (Privacy Act APP 11.2). Grant, remittance, and tax/business records are retained for the periods Australian law requires (generally at least 5 years; longer where company record-keeping applies, commonly up to 7 years). Family customer accounts and logins are separate and are not closed by ending the partnership.',
  partnershipEndDataFaqQ: 'What happens to our organisation’s information if we stop or do not renew?',
  partnershipEndDataFaqA:
    'When your partnership ends (suspension, termination, or non-renewal), we deactivate your Partner Community Code for new fundraising orders and close Lookup access for ongoing partnership management. Personal information that is no longer needed is destroyed or de-identified under Australian Privacy Principle APP 11.2 (Privacy Act 1988). Where Australian law requires retention — including tax and business records (ATO guidance: generally at least 5 years) and, where applicable, company financial records (commonly up to 7 years) — we keep grant payment evidence and related statements (e.g. D9/D10). This applies to the organisation partnership only. Families who ordered with your code already shop as their own SELPIC customer accounts (register/login to pay); ending the partnership does not close those logins or force account deletion. Customers who want to leave SELPIC close their own accounts like any other retail customer.',
  partnershipEndDeclineConfirm:
    'Confirm that you prefer not to renew?\n\nWe will email an acknowledgement explaining access closure and how organisation records are handled under Australian privacy and tax record-keeping laws (needed personal information may be destroyed or de-identified; grant/tax records are retained for the periods the law requires). Your current term stays active until it ends (or until suspended).\n\nFamily customer accounts are separate — ending the partnership does not close their SELPIC logins.',
  partnershipEndLookupHint:
    'If you do not renew, organisation operational access closes when the partnership ends. Needed organisation personal information is destroyed or de-identified (APP 11.2); grant and tax records are retained as Australian law requires. Family customer accounts remain under each customer’s own control.',
  adminDeletePartnerWarning:
    'Permanently delete this partner from the app?\n\nThis removes the partner row and related documents, settlements, lookup sessions, and Official Grant Account history from the cloud and this browser. Promo codes in Content are not deleted. Customer retail accounts are never deleted by this action.\n\nImportant: Australian tax and company record-keeping may still require SELPIC to keep grant remittance and financial evidence outside this delete (typically at least 5 years, and longer where company rules apply). Do not use Delete to destroy legally required business records.',
  adminSuspendConfirm:
    'Suspend this partnership and email D12?\n\nD12 explains that organisation operational access closes and that organisation personal information no longer needed is destroyed or de-identified (APP 11.2), while grant/tax records are retained for the periods Australian law requires. Family customer accounts are unaffected.',
  adminTerminateConfirm:
    'Terminate this partnership and email D12 + D13?\n\nD12 includes the Australian privacy and record-retention notice for the organisation partnership (family customer accounts are separate). D13 is the final grant statement for your files.',
  applyPrivacyNote:
    'By applying, you agree that SELPIC may collect and use your organisation contact details to run the Community Fundraising Partnership. Families who buy with your code use their own SELPIC customer accounts. If the partnership later ends, we handle organisation information under the Privacy Act (APP 11.2) and retain grant/tax records as Australian law requires — without closing customer logins. See our Privacy Policy.',
  sampleRequestFaqQ: 'Can we request sample products for evaluation?',
  sampleRequestFaqA:
    'SELPIC name labels are custom-printed with a child’s (or staff) name — there is no generic blank sample pack. If you would like a sample, tick the optional box on the application, enter one name to print (same 9-character limit as our name stickers), and use the delivery address and contact on the form. We only post a sample when you ask; it is not sent automatically with every application. After approval, email your SELPIC partnership contact with a name and address if you decide later.',
  sampleRequestCheckboxLabel: 'Request a personalised name-sticker sample (optional)',
  sampleRequestCheckboxHelp:
    'We print one waterproof name label with a name you nominate and post it to this application address after we review your partnership. We do not send a generic kit, because every SELPIC name sticker is custom.',
  sampleRequestPrintNameLabel: 'Name to print on the sample',
  sampleRequestPrintNameHelp: 'One line, up to 9 characters — the same limit as our name stickers (e.g. Chloe).',
} as const

/** Display mapping helpers for settlement status badges */
export function grantSettlementStatusLabel(status: string): string {
  switch (status) {
    case 'Paid':
      return 'Grant transferred'
    case 'Ready':
      return 'Ready to transfer'
    case 'Draft':
      return 'Draft'
    case 'Void':
      return 'Void'
    default:
      return status
  }
}
