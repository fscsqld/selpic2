'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useContentStore } from '@/lib/contentStore'
import NewsletterForm from '@/components/NewsletterForm'
import { COMPANY_LEGAL_LINE } from '@/lib/companyLegal'

export default function Footer() {
  const { language } = useStore()
  const isKo = language === 'ko'

  // CMS content
  const {
    contentItems,
    _hasHydrated: contentHydrated,
  } = useContentStore()

  // Safe helper to read content/link with fallback
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
    isKo
      ? '명확한 시안 검수, 원활한 셋업, 신속한 호주 전역 배송으로 고품질 맞춤형 제품을 제공합니다.'
      : 'We deliver premium custom products with clear proofs, seamless setup, and fast Australia-wide shipping.'
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

      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-gray-500">
          <p>{copyrightText}</p>
        </div>
      </div>
    </footer>
  )
}
