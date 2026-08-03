'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { useContentStore } from '@/lib/contentStore'
import NewsletterForm from '@/components/NewsletterForm'
import { HeaderLogoImage } from '@/components/Header'
import { pickLogoImageItem } from '@/lib/pickLogoImageItem'
import { COMPANY_CONTACT, COMPANY_LEGAL_LINE } from '@/lib/companyLegal'

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

  const companyName = getContent('Company Name', 'Selpic')
  const companyDescription = getContent(
    'Company Description',
    'We deliver premium custom products with clear proofs, seamless setup, and fast Australia-wide shipping.'
  )
  const newsletterTitle = getContent('Newsletter Title', 'Newsletter')
  const newsletterDescription = getContent('Newsletter Description', 'Subscribe to our newsletter for updates.')
  const copyrightText = getContent('Copyright Information', '© 2025 Selpic. All rights reserved.')

  const quickLinksTitle = getContent('Quick Links Title', 'Quick Links')
  const helpLinksTitle = getContent('Help/Useful Links Title', 'Useful Links')

  const quickLinks = useMemo(() => ([
    getLink('Quick Links Item 1', '/terms', 'Terms & Conditions'),
    getLink('Quick Links Item 2', '/privacy', 'Privacy'),
    getLink('Quick Links Item 3', '/refund', 'Refund Policy'),
    getLink('Quick Links Item 4', '', ''),
    getLink('Quick Links Item 5', '', ''),
  ].filter(link => link.label && link.url)), [contentHydrated, contentItems])

  const helpLinks = useMemo(() => {
    const links = [
      getLink('Help Links Item 1', '/help', 'Help Centre'),
      getLink('Help Links Item 2', '/about', 'About Us'),
      getLink('Help Links Item 3', '/about', 'About Us'),
    ]
    // Keep School Fundraising only under Community / Partnerships (avoid duplicate)
    const seen = new Set<string>()
    return links.filter((link) => {
      if (!link.label || !link.url) return false
      if (link.url === '/fundraising' || /fundraising|benefits|promo codes/i.test(link.label)) return false
      const key = `${link.label}|${link.url}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [contentHydrated, contentItems])

  const logoItem = pickLogoImageItem(contentItems)
  const logoMediaSrc = (logoItem?.mediaUrl ?? '').trim()
  const useLogoImage = !!logoItem?.isActive
  const headerCompanyName =
    contentItems.find((i) => i.section === 'header' && i.title === 'Company Name')?.content?.trim() || 'Selpic'

  return (
    <footer className="mt-8 border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-xs sm:text-sm font-sans text-gray-700">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="mb-3">
            {useLogoImage ? (
              <HeaderLogoImage
                src={logoMediaSrc}
                alt={headerCompanyName}
                className="h-8 object-contain max-w-[200px] w-auto"
              />
            ) : (
              <h3 className="text-base font-playfair font-bold text-gray-900">{companyName}</h3>
            )}
          </div>
          <p className="mb-2 text-xs sm:text-sm text-gray-700">{companyDescription}</p>
          <p className="text-[11px] text-gray-500 whitespace-pre-line">{COMPANY_LEGAL_LINE}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact</h4>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" aria-hidden />
              <span>Address: {COMPANY_CONTACT.address}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" aria-hidden />
              <a href={`tel:${COMPANY_CONTACT.phone.replace(/\s/g, '')}`} className="hover:text-gray-900">
                Phone: {COMPANY_CONTACT.phone}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" aria-hidden />
              <a href={`mailto:${COMPANY_CONTACT.email}`} className="hover:text-gray-900 break-all">
                Email: {COMPANY_CONTACT.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" aria-hidden />
              <span>Hours: Mon - Fri: 10am - 5pm AEST (Weekends &amp; Public Holidays Closed)</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{helpLinksTitle}</h4>
          <ul className="space-y-2">
            {helpLinks.map((link, idx) => (
              <li key={`help-link-${idx}`}>
                <Link href={link.url} className="hover:text-gray-900 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <h4 className="text-sm font-semibold text-gray-900 mt-5 mb-3">Community / Partnerships</h4>
          <ul className="space-y-2">
            <li>
              <Link href="/community" className="hover:text-gray-900 transition-colors">
                Community Board
              </Link>
            </li>
            <li>
              <Link href="/fundraising" className="hover:text-gray-900 transition-colors">
                Fundraising
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{quickLinksTitle}</h4>
          <ul className="space-y-2">
            {quickLinks.map((link, idx) => (
              <li key={`quick-link-${idx}`}>
                <Link href={link.url} className="hover:text-gray-900 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{newsletterTitle}</h4>
          <p className="text-gray-700 text-xs sm:text-sm mb-2">{newsletterDescription}</p>
          <NewsletterForm variant="light" />
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-gray-500">
          <p>{copyrightText}</p>
        </div>
      </div>
    </footer>
  )
}
