'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import {
  ChevronDown,
  Copy,
  Check,
  CreditCard,
  Mail,
  Package,
  Phone,
  Search,
  Tag,
  Truck,
} from 'lucide-react'
import { COMPANY_CONTACT } from '@/lib/companyLegal'

type FaqCategoryId =
  | 'market-s-masks'
  | 'name-stickers'
  | 'payments-accounts'
  | 'shipping-delivery-issues'

type FaqItem = {
  id: string
  categoryId: FaqCategoryId
  q: string
  a: ReactNode
  /** Plain text for search (question + answer keywords). */
  searchText: string
}

const CATEGORIES: Array<{
  id: FaqCategoryId
  label: string
  Icon: typeof Package
}> = [
  { id: 'market-s-masks', label: 'Market S & Masks', Icon: Package },
  { id: 'name-stickers', label: 'Name Stickers & Custom', Icon: Tag },
  { id: 'payments-accounts', label: 'Payments & Accounts', Icon: CreditCard },
  { id: 'shipping-delivery-issues', label: 'Shipping, Delivery & Issues', Icon: Truck },
]

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-market-s',
    categoryId: 'market-s-masks',
    q: 'What is Market S?',
    searchText: 'what is market s k-beauty mask packs hot-goods care products',
    a: (
      <>
        Market S is Selpic&apos;s Australian range of K-beauty and everyday care products. Sheet mask
        packs are a core focus. Browse the range on{' '}
        <Link href="/hot-goods" className="font-medium text-emerald-700 underline">
          Market S
        </Link>
        .
      </>
    ),
  },
  {
    id: 'market-s-authentic',
    categoryId: 'market-s-masks',
    q: 'Are Market S mask packs authentic?',
    searchText: 'authentic genuine authorised supplier brand dermafix masks',
    a: 'We source Market S products through authorised supplier arrangements. What you see on the product page is what we pack and dispatch from Mansfield, QLD.',
  },
  {
    id: 'ingredients-usage',
    categoryId: 'market-s-masks',
    q: 'Where can I see ingredients and usage information?',
    searchText: 'ingredients inci usage packaging product page allergy',
    a: 'Ingredient and usage details appear on the product packaging. Where helpful, we also show information on the product page. Contact us before ordering if you need clarification.',
  },
  {
    id: 'opened-masks-return',
    categoryId: 'market-s-masks',
    q: 'Can I return opened mask packs or other Market S personal-care items?',
    searchText: 'return opened masks hygiene seal refund personal-care cosmetics acl',
    a: (
      <>
        Opened personal-care items are not accepted for change of mind for hygiene reasons (including
        broken seals or opened outer packaging). Faulty, damaged, or incorrectly supplied goods are
        still covered under the Australian Consumer Law. See our{' '}
        <Link href="/refund" className="font-medium text-emerald-700 underline">
          Refund Policy
        </Link>
        .
      </>
    ),
  },
  {
    id: 'aicis-registration',
    categoryId: 'market-s-masks',
    q: 'Is Selpic “AICIS approved” or are products AICIS certified?',
    searchText: 'aicis approved certified registration introducer import cosmetics government',
    a: 'Selpic is registered with AICIS as an industrial chemicals introducer for cosmetics we import and sell in Australia. That is a business registration requirement for importers—it is not a government endorsement or safety certification of individual products.',
  },
  {
    id: 'market-s-shipping-letter-parcel',
    categoryId: 'market-s-masks',
    q: 'How does shipping work for Market S (letter vs parcel)?',
    searchText: 'shipping letter parcel tracked untracked family bundle single item postage',
    a: 'Eligible Single Item packs (typically 1–3 thin packs within letter size/weight limits) may offer an untracked letter or Tracked Letter at checkout. Higher-value Single Item carts often default to Tracked Letter. Family Bundle SKUs (for example multi-packs registered as Family Bundle) require Parcel Post or another parcel option. Untracked letters cannot be tracked; choose Tracked Letter or Parcel if you need tracking.',
  },
  {
    id: 'sticker-customise',
    categoryId: 'name-stickers',
    q: 'How do I customise name stickers?',
    searchText: 'customise customize name stickers labels template proof text',
    a: 'You do not need to upload your own artwork for standard name labels. Choose a template, enter your text and options on the customise page, then approve the on-screen proof before production.',
  },
  {
    id: 'sticker-proof',
    categoryId: 'name-stickers',
    q: 'Do you provide a proof before printing stickers?',
    searchText: 'proof before printing stickers customisation approval production',
    a: 'Yes. The final design is shown live on the customisation page. Production starts only after you confirm the design.',
  },
  {
    id: 'sticker-change-cancel',
    categoryId: 'name-stickers',
    q: 'Can I change or cancel a sticker order after proof approval?',
    searchText: 'change cancel sticker order after proof production started',
    a: 'Changes or cancellations may not be possible once production has started. Contact support as soon as possible if you need help.',
  },
  {
    id: 'currency-gst',
    categoryId: 'payments-accounts',
    q: 'What currency and tax (GST) do you use?',
    searchText: 'currency aud gst tax prices australia',
    a: 'All prices are in AUD. Where indicated, GST is included.',
  },
  {
    id: 'payment-methods',
    categoryId: 'payments-accounts',
    q: 'What payment methods are accepted?',
    searchText: 'payment methods card bank transfer checkout paypal stripe',
    a: 'Available methods (for example card, bank transfer, and others enabled in checkout) are shown when you place an order.',
  },
  {
    id: 'order-history',
    categoryId: 'payments-accounts',
    q: 'Where can I check my order history?',
    searchText: 'order history account login past orders',
    a: 'After signing in, open Order History to view current and past orders.',
  },
  {
    id: 'shipping-time',
    categoryId: 'shipping-delivery-issues',
    q: 'How long does shipping take?',
    searchText: 'shipping time delivery mansfield qld australia-wide holidays',
    a: 'We ship Australia-wide from Mansfield, QLD. Checkout delivery estimates are indicative and can vary with carriers, public holidays, and (for stickers) production time.',
  },
  {
    id: 'tracking-number',
    categoryId: 'shipping-delivery-issues',
    q: 'How do I track my shipment?',
    searchText: 'track tracking number email untracked letter',
    a: 'When your order ships with a tracked service, we email a tracking number. If you chose an untracked letter option, tracking is not available.',
  },
  {
    id: 'international-shipping',
    categoryId: 'shipping-delivery-issues',
    q: 'Do you ship outside Australia?',
    searchText: 'international shipping overseas outside australia',
    a: 'Currently we only ship within Australia.',
  },
  {
    id: 'faulty-damaged-incorrect',
    categoryId: 'shipping-delivery-issues',
    q: 'What if my order is faulty, damaged, or incorrect?',
    searchText: 'faulty damaged incorrect acl refund photos order id',
    a: (
      <>
        Please notify us within 7 days of delivery with photos and your Order ID. We will assist in
        line with the Australian Consumer Law (ACL). See the{' '}
        <Link href="/refund" className="font-medium text-emerald-700 underline">
          Refund Policy
        </Link>
        .
      </>
    ),
  },
  {
    id: 'change-of-mind-refund',
    categoryId: 'shipping-delivery-issues',
    q: 'Can I get a refund for change of mind?',
    searchText: 'change of mind refund return personalised stickers opened market s hygiene',
    a: (
      <>
        Personalised stickers are not accepted for change of mind. Opened Market S personal-care
        items are not accepted for change of mind for hygiene reasons. Where the ACL allows a
        non-faulty return for your order type, contact us within 14 days of delivery before sending
        anything back. Full details are in our{' '}
        <Link href="/refund" className="font-medium text-emerald-700 underline">
          Refund Policy
        </Link>
        .
      </>
    ),
  },
]

function matchesQuery(item: FaqItem, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return `${item.q} ${item.searchText}`.toLowerCase().includes(q)
}

function CopyLinkButton({ faqId }: { faqId: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = useCallback(async () => {
    const url = `${window.location.origin}/help#${faqId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Fallback for older browsers
      window.prompt('Copy this help link:', url)
    }
  }, [faqId])

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void onCopy()
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
      aria-label={`Copy direct link to ${faqId}`}
      title="Copy direct link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

export default function HelpCenterPage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<FaqCategoryId | 'all'>('all')
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())

  const filtered = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      if (activeCategory !== 'all' && item.categoryId !== activeCategory) return false
      return matchesQuery(item, query)
    })
  }, [activeCategory, query])

  const grouped = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: filtered.filter((item) => item.categoryId === cat.id),
    })).filter((cat) => cat.items.length > 0)
  }, [filtered])

  const openFaqFromHash = useCallback((hash: string) => {
    const id = hash.replace(/^#/, '').trim()
    if (!id || !FAQ_ITEMS.some((f) => f.id === id)) return
    const item = FAQ_ITEMS.find((f) => f.id === id)
    if (item) setActiveCategory(item.categoryId)
    setOpenIds((prev) => new Set(prev).add(id))
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash) openFaqFromHash(window.location.hash)
    const onHash = () => openFaqFromHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [openFaqFromHash])

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const jumpCategory = (id: FaqCategoryId | 'all') => {
    setActiveCategory(id)
    setQuery('')
    if (id === 'all') return
    window.requestAnimationFrame(() => {
      document.getElementById(`help-cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-2 font-playfair text-3xl font-bold text-slate-900">
          Selpic Help Centre
        </h1>
        <p className="mb-6 text-slate-600">
          Answers about Market S mask packs and care products, shipping, returns, payments, and
          custom name stickers.
        </p>

        <div className="mb-4">
          <label htmlFor="help-search" className="sr-only">
            Search help topics
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveCategory('all')
              }}
              placeholder="Search help topics… (e.g. AICIS, tracking, refund)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none ring-emerald-500/30 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => jumpCategory('all')}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === 'all'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
            }`}
          >
            All topics
          </button>
          {CATEGORIES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => jumpCategory(id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === id
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
            No topics matched “{query}”. Try another keyword, or email{' '}
            <a className="font-semibold underline" href={`mailto:${COMPANY_CONTACT.email}`}>
              {COMPANY_CONTACT.email}
            </a>
            .
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(({ id, label, Icon, items }) => (
              <section key={id} id={`help-cat-${id}`} className="scroll-mt-24">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
                </div>
                <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
                  {items.map((item) => {
                    const open = openIds.has(item.id)
                    return (
                      <div key={item.id} id={item.id} className="scroll-mt-28 bg-white">
                        <div className="flex items-start gap-2 px-3 py-2 sm:px-4">
                          <button
                            type="button"
                            onClick={() => toggle(item.id)}
                            className="flex min-w-0 flex-1 items-start gap-2 py-2 text-left"
                            aria-expanded={open}
                            aria-controls={`${item.id}-panel`}
                          >
                            <ChevronDown
                              className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                                open ? 'rotate-180' : ''
                              }`}
                              aria-hidden
                            />
                            <span className="text-base font-semibold text-slate-900">{item.q}</span>
                          </button>
                          <div className="pt-2">
                            <CopyLinkButton faqId={item.id} />
                          </div>
                        </div>
                        {open ? (
                          <div
                            id={`${item.id}-panel`}
                            className="border-t border-slate-100 px-4 pb-4 pl-10 text-sm leading-relaxed text-slate-700 sm:pl-11"
                          >
                            {item.a}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <aside className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6">
          <h2 className="text-lg font-semibold text-emerald-950">Still need help?</h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">
            Reach out to our Mansfield, QLD team. We ship Australia-wide and can help with Market S
            orders, stickers, shipping, and returns.
          </p>
          <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <a
              href={`mailto:${COMPANY_CONTACT.email}`}
              className="inline-flex items-center gap-2 font-semibold text-emerald-900 underline"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {COMPANY_CONTACT.email}
            </a>
            <a
              href={`tel:${COMPANY_CONTACT.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 font-semibold text-emerald-900 underline"
            >
              <Phone className="h-4 w-4" aria-hidden />
              {COMPANY_CONTACT.phone}
            </a>
            <Link href="/contact" className="font-semibold text-emerald-800 underline">
              Contact page
            </Link>
          </div>
          <p className="mt-3 text-xs text-emerald-800/80">{COMPANY_CONTACT.address}</p>
        </aside>
      </main>
    </div>
  )
}
