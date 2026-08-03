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

const ORG_OPTIONS = FUNDRAISING_ORG_TYPE_OPTIONS.map(
  (value) => [value, FUNDRAISING_ORG_TYPE_LABELS[value]] as const
)

const FAQ_ITEMS = [
  {
    q: 'Is there any cost or contract period for our organisation?',
    a: 'No, it is 100% free with no minimum sales or lock-in contract.',
  },
  {
    q: 'When and how do we get paid?',
    a: 'We calculate Net Sales at the end of each month and transfer the cashback directly to your official organisation bank account.',
  },
  {
    q: 'How do we track our fundraising progress?',
    a: "You will receive an automated monthly Sales & Cashback Statement (PDF) via email after each month's close.",
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
    () => `${donation}% Cashback for Your Organisation + ${parentOff}% OFF for Families`,
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
            Raise Funds for Your Community with SELPIC
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">{subHeader}</p>
          <p className="mt-3 text-sm text-slate-500 max-w-2xl mx-auto">
            Open to schools, early learning centres, clubs, charities, and community groups. Custom name labels
            families love — waterproof, dishwasher safe, printed in QLD.
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
                title: 'Apply & Get Your Unique Promo Code',
                body: 'Submit the form below. After approval we email your unique fundraising code.',
              },
              {
                icon: Share2,
                title: `Share with Families (${parentOff}% OFF on all name labels)`,
                body: 'Share the code in newsletters, apps, or group chats — supporters get a discount on every order.',
              },
              {
                icon: Package,
                title: `Earn ${donation}% Cashback for Your Organisation every month`,
                body: 'We calculate Net Sales for your code and pay your organisation monthly.',
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
            *Cashback is calculated monthly on Net Product Sales (subtotal excluding shipping and refunds) generated by
            your code. Paid directly to your official bank account.
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
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Partner Application</h2>
          <p className="text-sm text-slate-600 mb-6">
            Apply for a fundraising partnership. We will email your unique code after approval.
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
          <p className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">{COMPANY_LEGAL_LINE}</p>
        </div>
      </footer>
    </div>
  )
}
