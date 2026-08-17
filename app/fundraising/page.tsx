'use client'

import { FormEvent, useMemo, useState } from 'react'
import Header from '@/components/Header'
import {
  CheckCircle,
  ChevronDown,
  HeartHandshake,
  Mail,
  Package,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react'
import { COMPANY_CONTACT, COMPANY_LEGAL_LINE } from '@/lib/companyLegal'
import { useFundraisingStore } from '@/lib/fundraising/store'
import {
  FUNDRAISING_ORG_TYPE_LABELS,
  FUNDRAISING_ORG_TYPE_OPTIONS,
  type FundraisingOrganizationType,
  type FundraisingPartner,
  type FundraisingDocument,
} from '@/lib/fundraising/types'
import { FUNDRAISING_COPY } from '@/lib/fundraising/copy'

const ORG_OPTIONS = FUNDRAISING_ORG_TYPE_OPTIONS.map(
  (value) => [value, FUNDRAISING_ORG_TYPE_LABELS[value]] as const
)

const FAQ_ITEMS = [
  {
    q: 'Is there any cost or contract period for our organisation?',
    a: 'Participation is free. Partnerships run in 12-month terms after approval. Near the end of each term we email a renewal notice; confirm in your Lookup portal to extend another year, or decline if you wish to pause. There is no lock-in beyond the current term. If you decline or the partnership ends, we email how access and organisation information are handled under Australian privacy and record-keeping laws.',
  },
  {
    q: 'When and how do we receive our Fundraising Cashback Grant?',
    a: 'Grants are calculated once per Australian financial-year quarter (Q1 Jul–Sep, Q2 Oct–Dec, Q3 Jan–Mar, Q4 Apr–Jun) on Total Community Support — product totals after the family community discount (e.g. 5% OFF), excluding shipping and cancelled orders. Inclusion uses confirmed payment time (bank deposits confirmed by noon Sydney the day after quarter end still count). After each quarter ends, SELPIC waits 7 calendar days so cancellations can settle, then locks the final amount. There is no minimum payout amount. Once SELPIC has registered your Official Grant Account (BSB, Account Number, and ABN) — partners request registration or updates from Lookup; SELPIC verifies and saves them — funds are transferred by bank by the 15th of the month after the quarter ends (or the next business day if that date falls on a weekend), with official quarterly statements (D9 & D10). New orders after quarter end count toward the next quarter immediately. Family checkout and payment are unchanged — these rules apply only to organisation grant settlements.',
  },
  {
    q: 'How do we track Community Impact?',
    a: 'After approval, we email you a secure private Lookup link. You can log in anytime using a One-Time Passcode (OTP) to view real-time community contributions, cashback grant totals, and download account statements.',
  },
  {
    q: 'Do we need an ABN, and is GST applicable to the grant?',
    a: "SELPIC registers your organisation's ABN on the Official Grant Account after verification (you can request registration or updates from Lookup). Grants are transferred as non-taxable community support (GST-free), making audit and accounting straightforward for your treasurer.",
  },
  {
    q: FUNDRAISING_COPY.partnershipEndDataFaqQ,
    a: FUNDRAISING_COPY.partnershipEndDataFaqA,
  },
  {
    q: FUNDRAISING_COPY.customerAccountIndependenceFaqQ,
    a: FUNDRAISING_COPY.customerAccountIndependenceFaqA,
  },
  {
    q: 'How do we share and promote this with our families?',
    a: 'We provide ready-to-use copy, text snippets, and digital graphics (D6 Family Share Kit) after approval. You can easily copy and paste them into school newsletters, parent apps (e.g. Compass), or group chats. Remind families that they check out with their own SELPIC customer account — your code is only for the community discount.',
  },
  {
    q: 'Can we request sample products for evaluation?',
    a: 'Yes! During application or post-enrolment, eligible partners can request a complimentary Educator Sample Kit (D5) to evaluate our premium waterproof name labels firsthand.',
  },
] as const

export default function FundraisingLandingPage() {
  const settings = useFundraisingStore((s) => s.settings)
  const upsertPartner = useFundraisingStore((s) => s.upsertPartner)
  const addDocument = useFundraisingStore((s) => s.addDocument)
  const donation = settings.donationRate
  const parentOff = settings.parentDisplayRate

  const [form, setForm] = useState({
    organizationName: '',
    organizationType: '' as '' | FundraisingOrganizationType,
    contactName: '',
    email: '',
    phone: '',
    streetAddress: '',
    suburb: '',
    state: '',
    postcode: '',
  })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const subHeader = useMemo(
    () =>
      `${donation}% Fundraising Cashback Grant for your organisation + ${parentOff}% OFF for families`,
    [donation, parentOff]
  )

  const scrollToForm = () => {
    document.getElementById('partner-application')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNotice(null)
    try {
      const res = await fetch('/api/fundraising/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: form.organizationName.trim(),
          organizationType: form.organizationType,
          contactName: form.contactName.trim(),
          contactEmail: form.email.trim(),
          phone: form.phone.trim(),
          streetAddress: form.streetAddress.trim(),
          suburb: form.suburb.trim(),
          state: form.state.trim(),
          postcode: form.postcode.trim(),
          sampleKitRequested: false,
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        message?: string
        partner?: FundraisingPartner
        document?: FundraisingDocument
      } | null

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Failed to submit application')
      }

      // Mirror into local store so admin on this browser sees pending apps immediately
      if (json.partner) {
        upsertPartner({
          ...json.partner,
          id: json.partner.id,
        })
      }
      if (json.document) {
        addDocument({
          ...json.document,
          id: json.document.id,
        })
      }

      setNotice({
        type: 'success',
        message:
          json.message ||
          `Thank you for applying! We've sent a confirmation email to ${form.email.trim()}. Our team will review your application and send your code shortly.`,
      })
      setForm({
        organizationName: '',
        organizationType: '',
        contactName: '',
        email: '',
        phone: '',
        streetAddress: '',
        suburb: '',
        state: '',
        postcode: '',
      })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Submission failed',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <section className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-semibold mb-4">
            <HeartHandshake className="w-3.5 h-3.5" />
            Community fundraising partnerships
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Thank you for partnering with SELPIC. Together for Our School &amp; Community.
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">{subHeader}</p>
          <p className="mt-3 text-sm text-slate-500 max-w-2xl mx-auto">
            A sustainable community fundraising partnership — not a sales tool. Open to schools, early learning
            centres, clubs, charities, and community groups. Custom name labels families love — waterproof,
            dishwasher safe, printed in QLD.
          </p>
          <button
            type="button"
            onClick={scrollToForm}
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 shadow-sm"
          >
            Apply to Become a Partner
          </button>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: Mail,
                title: 'Apply & receive your Partner Community Code',
                body: 'Submit the form below. After approval we email your Partner Community Code and private Lookup link.',
              },
              {
                icon: Share2,
                title: `Share with families (${parentOff}% OFF on name labels)`,
                body: 'Share the code in newsletters, apps, or group chats — supporters get a discount and help raise your grant.',
              },
              {
                icon: Package,
                title: `Receive a ${donation}% Fundraising Cashback Grant each quarter`,
                body: 'We calculate Total Community Support (after the family discount) once per Australian financial-year quarter and transfer your grant to your Official Grant Account by the 15th of the following month.',
              },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <step.icon className="w-8 h-8 text-emerald-600 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs sm:text-sm text-slate-500 text-center max-w-3xl mx-auto leading-relaxed">
            *The Fundraising Cashback Grant is calculated once per Australian financial-year quarter on Total Community
            Support (product totals after the family community discount, excluding shipping and refunds) for orders using
            your Partner Community Code. After each quarter ends, figures lock after 7 calendar days (cancellations/refunds
            window). There is no minimum payout. Funds are transferred to your Official Grant Account by the 15th of the
            month after the quarter ends (or the next business day if that date falls on a weekend), once SELPIC has
            registered your Official Grant Account (request registration or updates from your Lookup portal). New orders after quarter end count toward the next quarter.
          </p>
        </section>

        <section className="mb-14">
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, label: 'High quality waterproof name labels' },
              { icon: Sparkles, label: 'Easy setup — we handle the rest' },
              { icon: Truck, label: 'Zero cost for partner organisations' },
            ].map((b) => (
              <div
                key={b.label}
                className="flex items-start gap-2 rounded-xl bg-white/80 border border-slate-200 px-3 py-3 text-sm text-slate-700"
              >
                <b.icon className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          id="partner-application"
          className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8"
        >
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm sm:text-base text-emerald-900 font-medium leading-snug">
            After approval, we email ready-to-share copy for newsletters and group chats.
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Community Partner Application</h2>
          <p className="text-sm text-slate-600 mb-6">
            Apply for a community fundraising partnership. We will email your Partner Community Code after approval.
          </p>

          {notice && (
            <div
              role="status"
              className={`mb-4 rounded-lg border px-3 py-3 text-sm ${
                notice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {notice.message}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Organization Name</span>
                <input
                  required
                  placeholder="e.g. Sunshine Community Group / Local Club / Primary School P&C"
                  value={form.organizationName}
                  onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Organization Type</span>
                <select
                  required
                  value={form.organizationType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      organizationType: e.target.value as FundraisingOrganizationType,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="" disabled>
                    Select type…
                  </option>
                  {ORG_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Contact Person Name</span>
                <input
                  required
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Contact Email Address</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Contact Phone Number</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Street Address</span>
                <input
                  required
                  value={form.streetAddress}
                  onChange={(e) => setForm((f) => ({ ...f, streetAddress: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Suburb</span>
                <input
                  required
                  value={form.suburb}
                  onChange={(e) => setForm((f) => ({ ...f, suburb: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">State</span>
                <input
                  required
                  placeholder="e.g. QLD"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Postcode</span>
                <input
                  required
                  value={form.postcode}
                  onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {FUNDRAISING_COPY.applyPrivacyNote}{' '}
              <a href="/privacy" className="underline hover:text-emerald-700">
                Privacy Policy
              </a>
              .
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                'Submitting…'
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Application
                </>
              )}
            </button>
          </form>
        </section>

        <section className="mt-10 sm:mt-12 mb-4">
          <h2 className="text-xl font-semibold text-slate-900 mb-4 text-center">Frequently Asked Questions</h2>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
            {FAQ_ITEMS.map((item, idx) => {
              const open = openFaq === idx
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900 text-sm sm:text-base">{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {open && (
                    <div className="px-4 sm:px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* Compact partnership footer — not the full storefront footer */}
      <footer className="border-t border-slate-200 bg-white/80 mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-center">
          <div>
            <p className="text-sm font-semibold text-slate-900">SELPIC Fundraising Partnerships</p>
            <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
              Questions about partnership or your application? Our team is happy to help.
            </p>
            <div className="mt-3 space-y-1.5 text-sm text-slate-700 inline-flex flex-col items-center">
              <a
                href={`mailto:${COMPANY_CONTACT.email}?subject=Fundraising%20Partnership`}
                className="flex items-center gap-2 hover:text-emerald-700"
              >
                <Mail className="w-4 h-4 shrink-0 text-slate-500" aria-hidden />
                {COMPANY_CONTACT.email}
              </a>
              <a
                href={`tel:${COMPANY_CONTACT.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 hover:text-emerald-700"
              >
                <Phone className="w-4 h-4 shrink-0 text-slate-500" aria-hidden />
                {COMPANY_CONTACT.phone}
              </a>
            </div>
          </div>
          <p className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <span className="block">{COMPANY_LEGAL_LINE}</span>
            <span className="block">
              <a href="/privacy" className="underline hover:text-emerald-700">
                Privacy Policy
              </a>
              {' · '}
              Families shop with their own SELPIC customer accounts; your organisation partnership does not control those logins.
            </span>
          </p>
        </div>
      </footer>
    </div>
  )
}
