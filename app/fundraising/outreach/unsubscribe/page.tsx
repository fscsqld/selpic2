import Link from 'next/link'
import { markFundraisingOutreachTargetOptedOut } from '@/lib/fundraising/persistence'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import { COMPANY_CONTACT, COMPANY_WEBSITE_URL } from '@/lib/companyLegal'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function pickToken(sp: Record<string, string | string[] | undefined> | undefined): string {
  const raw = sp?.token
  if (Array.isArray(raw)) return String(raw[0] || '').trim()
  return String(raw || '').trim()
}

export default async function FundraisingOutreachUnsubscribePage({ searchParams }: PageProps) {
  const resolved = searchParams ? await searchParams : undefined
  const token = pickToken(resolved)

  let title = 'Unsubscribe'
  let message = 'We could not process this request.'
  let ok = false

  if (!token) {
    message = 'This unsubscribe link is missing a token. Please use the link from your email, or reply with “unsubscribe”.'
  } else if (!isSupabaseConfigured()) {
    message = 'Unsubscribe is temporarily unavailable. Please reply to the email with the word “unsubscribe”.'
  } else {
    const result = await markFundraisingOutreachTargetOptedOut({
      unsubscribeToken: token,
      source: 'link',
    })
    if (result.ok) {
      ok = true
      title = result.already ? 'Already unsubscribed' : 'You have been unsubscribed'
      message = result.already
        ? `We already had ${result.target.organizationName || 'this address'} marked as opted out. You will not receive further SELPIC fundraising partnership introduction emails on this list.`
        : `You have been opted out of SELPIC fundraising partnership introduction emails for ${result.target.organizationName || 'this contact'}. We will not send further messages about this programme to this address from this list.`
    } else if (result.notFound) {
      message =
        'This unsubscribe link is invalid or has expired. If you still receive emails, reply with the single word “unsubscribe”.'
    } else {
      message = 'Something went wrong while updating your preference. Please reply with “unsubscribe” or contact us.'
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">SELPIC</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{message}</p>
        {!ok && (
          <p className="mt-3 text-sm text-slate-500">
            Contact:{' '}
            <a className="text-indigo-600 underline" href={`mailto:${COMPANY_CONTACT.email}`}>
              {COMPANY_CONTACT.email}
            </a>
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/fundraising"
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Community fundraising
          </Link>
          <a
            href={COMPANY_WEBSITE_URL}
            className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            selpic.com.au
          </a>
        </div>
      </div>
    </main>
  )
}
