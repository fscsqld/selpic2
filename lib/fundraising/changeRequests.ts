import type {
  FundraisingChangeRequestKind,
  FundraisingChangeRequestStatus,
} from '@/lib/fundraising/types'
import { FUNDRAISING_CHANGE_REQUEST_OPEN_STATUSES } from '@/lib/fundraising/types'

export function isOpenFundraisingChangeRequestStatus(
  status: FundraisingChangeRequestStatus
): boolean {
  return FUNDRAISING_CHANGE_REQUEST_OPEN_STATUSES.includes(status)
}

export function formatChangeRequestKind(kind: FundraisingChangeRequestKind): string {
  switch (kind) {
    case 'grant_account':
      return 'Official Grant Account'
    case 'contact':
      return 'Contact details'
    default:
      return 'Other'
  }
}

export function formatChangeRequestStatus(status: FundraisingChangeRequestStatus): string {
  switch (status) {
    case 'submitted':
      return 'Submitted'
    case 'under_review':
      return 'Under review'
    case 'awaiting_partner':
      return 'Awaiting your reply'
    case 'partner_replied':
      return 'Reply received'
    case 'applied':
      return 'Applied'
    case 'declined':
      return 'Declined'
    case 'closed':
      return 'Closed'
    default:
      return status
  }
}

export function partnerFacingChangeRequestHint(req: {
  status: FundraisingChangeRequestStatus
}): string {
  switch (req.status) {
    case 'submitted':
    case 'under_review':
      return 'SELPIC has received your request and will review it.'
    case 'awaiting_partner':
      return 'SELPIC sent form D22 — download it from Documents (or your email PDF), complete it, then reply here with the filled file attached.'
    case 'partner_replied':
      return 'Your reply and files are with SELPIC. After verification you will receive a confirmation email (D16) if grant account details change.'
    case 'applied':
      return 'SELPIC applied this change. Check Official Grant Account or contact details above.'
    case 'declined':
      return 'SELPIC could not apply this request. Check your email or contact support.'
    case 'closed':
      return 'This request is closed.'
    default:
      return ''
  }
}
