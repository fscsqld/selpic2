'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useContentStore } from '@/lib/contentStore'
import NewsletterForm from '@/components/NewsletterForm'
import { HeaderLogoImage } from '@/components/Header'
import { pickLogoImageItem } from '@/lib/pickLogoImageItem'
import { TRANSACTIONAL_EMAIL_SIGNATURE_NAME } from '@/lib/transactionalEmailBranding'
import { COMPANY_LEGAL_LINE, EMAIL_CONFIDENTIALITY_NOTICE } from '@/lib/companyLegal'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au'

export default function Footer() {
  const {
    contentItems,
    _hasHydrated: contentHydrated,
  } = useContentStore()

  const getContent = (title: string, fallback: string) => {
    if (!contentHydrated) return fallback
    const found = contentItems.find(item => item.section === 'footer' && item.title === title)
    return found?.content?.trim() || fallback
  }

  const getLink = (title: string, fallbackUrl: string, fallbackLabel: string) => {
    if (!contentHydrated) return { label: fallbackLabel, url: fallbackUrl }
    const labelItem = contentItems.find(item => item.section === 'footer' && item.title === `${title} Label`)
    const urlItem = contentItems.find(item => item.section === 'footer' && item.title === `${title} URL`)
    return {
      label: labelItem?.content?.trim() || fallbackLabel,
      url: urlItem?.linkUrl?.trim() || fallbackUrl,
    }
  }

  const companyName = getContent('Company Name', 'SELPIC')
  const companyDescription = getContent(
    'Company Description',
    'We deliver premium custom products with clear proofs, seamless setup, and fast Australia-wide shipping.'
  )
  const newsletterTitle = getContent('Newsletter Title', 'Newsletter')
  const newsletterDescription = getContent('Newsletter Description', 'Subscribe to our newsletter for updates.')
  const copyrightText = getContent('Copyright Information', '© 2025 SELPIC. All rights reserved.')

  const quickLinksTitle = getContent('Quick Links Title', 'Quick Links')
  const helpLinksTitle = getContent('Help/Useful Links Title', 'Resources')

  const quickLinks = useMemo(() => ([
    getLink('Quick Links Item 1', '/terms', 'Terms & Conditions'),
    getLink('Quick Links Item 2', '/privacy', 'Privacy'),
    getLink('Quick Links Item 3', '/refund', 'Refund Policy'),
    getLink('Quick Links Item 4', '', ''),
    getLink('Quick Links Item 5', '', ''),
  ].filter(link => link.label && link.url)), [contentHydrated, contentItems])

  const helpLinks = useMemo(() => ([
    getLink('Help Links Item 1', '/help', 'Help Centre'),
    getLink('Help Links Item 2', '/benefits', 'Benefits & Promo Codes'),
    getLink('Help Links Item 3', '/about', 'About Us'),
  ]), [contentHydrated, contentItems])

  const logoItem = pickLogoImageItem(contentItems)
  const logoMediaSrc = (logoItem?.mediaUrl ?? '').trim()
  const useLogoImage = !!logoItem?.isActive
  const headerCompanyName =
    contentItems.find((i) => i.section === 'header' && i.title === 'Company Name')?.content?.trim() || 'SELPIC'

  return (
    <footer className="mt-8 border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-5 gap-x-6 gap-y-4 text-xs sm:text-sm font-sans text-gray-700">
        <div>
          <h3 className="text-base font-playfair font-bold text-gray-900 mb-2">{companyName}</h3>
          <p className="mb-2 text-xs sm:text-sm text-gray-700">
            {companyDescription}
          </p>
          <p className="text-[11px] text-gray-600 whitespace-pre-line">{COMPANY_LEGAL_LINE}</p>
        </div>

        <div className="md:pl-14">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Service Hours</h4>
          <ul className="space-y-1 text-gray-700 text-xs sm:text-sm">
            <li>
              <div className="font-medium text-gray-800">Mon - Fri</div>
              <div className="text-gray-700 text-xs sm:text-sm">10am to 5pm</div>
            </li>
            <li>
              <div className="font-medium text-gray-800">Sat - Sun</div>
              <div className="text-gray-700 text-sm">Closed</div>
            </li>
            <li>
              <div className="font-medium text-gray-800">Public Holidays</div>
              <div className="text-gray-700 text-sm">Closed</div>
            </li>
          </ul>
        </div>

        <div className="md:pl-14">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{helpLinksTitle}</h4>
          <ul className="space-y-1">
            {helpLinks.map((link, idx) => (
              <li key={`help-link-${idx}`}>
                <Link href={link.url} className="hover:text-purple-600 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:pl-14">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{quickLinksTitle}</h4>
          <ul className="space-y-1">
            {quickLinks.map((link, idx) => (
              <li key={`quick-link-${idx}`}>
                <Link href={link.url} className="hover:text-purple-600 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:pl-14">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{newsletterTitle}</h4>
          <p className="text-gray-700 text-xs sm:text-sm mb-2">
            {newsletterDescription}
          </p>
          <NewsletterForm variant="light" />
        </div>
      </div>

      {/* Signature + confidentiality (English documents / site branding) */}
      <div className="border-t border-gray-200 bg-gray-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="max-w-xl">
            <div className="mb-3 flex justify-start">
              {useLogoImage ? (
                <HeaderLogoImage
                  src={logoMediaSrc}
                  alt={headerCompanyName}
                  className="h-8 lg:h-10 object-contain max-w-[min(280px,85vw)] w-auto"
                />
              ) : (
                <div className="text-lg lg:text-xl font-playfair font-bold text-gray-800 tracking-wider">
                  {headerCompanyName}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-800 mb-1">Kind Regards,</p>
            <p className="text-sm font-bold tracking-wide text-gray-900 mb-4">{TRANSACTIONAL_EMAIL_SIGNATURE_NAME}</p>
            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <p>M: 0466 894 279</p>
              <p>A: 7 Harvest St, Mansfield QLD 4122, Australia</p>
              <p>
                E:{' '}
                <a href="mailto:info@selpic.com.au" className="text-indigo-600 hover:underline break-all">
                  info@selpic.com.au
                </a>
                {' '}
                | W:{' '}
                <a
                  href={SITE_URL}
                  className="text-indigo-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {SITE_URL.replace(/^https?:\/\//, '')}
                </a>
              </p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed mt-8 max-w-4xl">
            {EMAIL_CONFIDENTIALITY_NOTICE}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
          <p>{copyrightText}</p>
        </div>
      </div>
    </footer>
  )
}
