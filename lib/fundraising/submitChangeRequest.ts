import 'server-only'

import {
  listFundraisingChangeRequestsFromDb,
  upsertFundraisingChangeRequest,
} from '@/lib/fundraising/persistence'
import { newFundraisingId } from '@/lib/fundraising/ids'
import { partnerHasOfficialGrantAccount } from '@/lib/fundraising/partnerRegistryUi'
import type {
  FundraisingChangeRequest,
  FundraisingChangeRequestKind,
  FundraisingPartner,
} from '@/lib/fundraising/types'
import { notifyAdminsOfFundraisingChangeRequest } from '@/lib/server/adminInboundNotify'

/** Intake only: kind + message. Bank/ABN fields are collected later via admin form pack + partner reply attachments. */
export async function submitPartnerChangeRequest(input: {
  partner: FundraisingPartner
  kind?: FundraisingChangeRequestKind
  message?: string
}): Promise<
  | { ok: true; request: FundraisingChangeRequest; notified: boolean; message: string }
  | { ok: false; error: string; status: number }
> {
  const kind: FundraisingChangeRequestKind =
    input.kind === 'contact' || input.kind === 'other' || input.kind === 'grant_account'
      ? input.kind
      : 'grant_account'

  const message = String(input.message || '').trim().slice(0, 2000)
  if (!message) {
    return {
      ok: false,
      status: 400,
      error: 'Add a short message describing what you need SELPIC to update, then submit.',
    }
  }

  const open = await listFundraisingChangeRequestsFromDb({
    partnerId: input.partner.id,
    openOnly: true,
  })
  if (open.length >= 5) {
    return {
      ok: false,
      status: 429,
      error:
        'You already have several open requests. Please wait for SELPIC to respond, or reply on an existing request.',
    }
  }

  const now = new Date().toISOString()
  const request: FundraisingChangeRequest = {
    id: newFundraisingId('fcr'),
    partnerId: input.partner.id,
    organizationName: input.partner.organizationName,
    kind,
    status: 'submitted',
    message,
    submittedBy: 'partner_lookup',
    createdAt: now,
    updatedAt: now,
  }

  // Default message helper only if somehow empty after trim (already guarded)
  if (!request.message) {
    request.message = partnerHasOfficialGrantAccount(input.partner)
      ? 'Please update our Official Grant Account.'
      : 'Please register our Official Grant Account.'
  }

  const saved = await upsertFundraisingChangeRequest(request)
  if (!saved.ok) {
    return {
      ok: false,
      status: 500,
      error:
        saved.error.includes('not configured') || /relation|does not exist/i.test(saved.error)
          ? 'Change request storage is not ready yet. Please reply to your partnership email instead.'
          : saved.error,
    }
  }

  const notify = await notifyAdminsOfFundraisingChangeRequest({
    partner: input.partner,
    request,
  })
  if (!notify.ok) {
    console.warn('[fundraising] change request notify failed:', notify.logMessage)
  }

  return {
    ok: true,
    request,
    notified: notify.ok,
    message:
      'Request submitted. SELPIC will review it and may email a form for you to complete and upload.',
  }
}
