'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Scale, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useContentStore } from '@/lib/contentStore'
import { COMPANY_LEGAL_LINE } from '@/lib/companyLegal'
import { createPolicyContentGetter, TERMS_TITLE_ALIASES } from '@/lib/policyPageContent'

export default function TermsAndConditions() {
  const { getActiveContentBySection, _hasHydrated } = useContentStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Terms and Conditions 섹션의 콘텐츠 가져오기
  const termsContent = getActiveContentBySection('terms')
  
  const getContent = createPolicyContentGetter(termsContent, TERMS_TITLE_ALIASES)

  function splitReturnPolicyList(raw: string): string[] {
    const t = raw.trim()
    if (!t) return []
    if (t.includes('|')) return t.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean)
    return t.split(', ').map((s) => s.trim()).filter(Boolean)
  }

  // 하이드레이션 완료 전에는 기본값 표시
  if (!mounted || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900">Terms and Conditions</h1>
              <p className="text-gray-600 mt-2">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900">{getContent('Terms and Conditions 제목') || 'Terms and Conditions'}</h1>
            <p className="text-gray-600 mt-2">{getContent('Terms and Conditions 부제목') || 'Last updated: September 3, 2025'}</p>
          </div>

          {/* Introduction */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FileText className="w-8 h-8 text-emerald-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{getContent('Agreement to Terms 제목') || 'Agreement to Terms'}</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {getContent('Agreement to Terms 내용') || 'By accessing and using SELPIC\'s services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.'}
            </p>
          </div>

          {/* Use of Service */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{getContent('Use of Service 제목') || 'Use of Service'}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{getContent('Permitted Uses 제목') || 'Permitted Uses'}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {getContent('Permitted Uses 목록')?.split(', ').map((item, index) => (
                    <li key={index}>{item}</li>
                  )) || [
                    <li key={1}>Browse and purchase our products</li>,
                    <li key={2}>Create custom sticker designs</li>,
                    <li key={3}>Access customer support</li>,
                    <li key={4}>Participate in our community</li>
                  ]}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{getContent('Prohibited Uses 제목') || 'Prohibited Uses'}</h3>
                {getContent('Prohibited Uses 내용') && (
                  <p className="text-gray-700 mb-3">
                    {getContent('Prohibited Uses 내용')}
                  </p>
                )}
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {getContent('Prohibited Uses 목록')?.split(', ').map((item, index) => (
                    <li key={index}>{item}</li>
                  )) || [
                    <li key={1}>Violate any applicable laws or regulations</li>,
                    <li key={2}>Infringe on intellectual property rights</li>,
                    <li key={3}>Upload malicious content or viruses</li>,
                    <li key={4}>Attempt to gain unauthorized access</li>
                  ]}
                </ul>
              </div>
            </div>
          </div>

          {/* Orders and Payment */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Scale className="w-8 h-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{getContent('Orders and Payment 제목') || 'Orders and Payment'}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{getContent('Order Processing 제목') || 'Order Processing'}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {getContent('Order Processing 목록')?.split(', ').map((item, index) => (
                    <li key={index}>{item}</li>
                  )) || [
                    <li key={1}>All orders are subject to acceptance and availability</li>,
                    <li key={2}>We reserve the right to refuse or cancel orders</li>,
                    <li key={3}>Order confirmation will be sent via email</li>,
                    <li key={4}>Processing time: 1-3 business days</li>
                  ]}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{getContent('Payment Terms 제목') || 'Payment Terms'}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {getContent('Payment Terms 목록')?.split(', ').map((item, index) => (
                    <li key={index}>{item}</li>
                  )) || [
                    <li key={1}>Payment is required at the time of order</li>,
                    <li key={2}>We accept major credit cards and PayPal</li>,
                    <li key={3}>All prices are in AUD and include applicable taxes</li>,
                    <li key={4}>Refunds processed within 5-10 business days</li>
                  ]}
                </ul>
              </div>
            </div>
          </div>

          {/* Intellectual Property */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FileText className="w-8 h-8 text-purple-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{getContent('Intellectual Property 제목') || 'Intellectual Property'}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{getContent('SELPIC Rights 제목') || 'SELPIC\'s Rights'}</h3>
                <p className="text-gray-700">
                  {getContent('SELPIC Rights 내용') || 'All content, designs, and materials on our platform are owned by SELPIC or our licensors. This includes but is not limited to logos, graphics, text, and software.'}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{getContent('User Content 제목') || 'User Content'}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {getContent('User Content 목록')?.split(', ').map((item, index) => (
                    <li key={index}>{item}</li>
                  )) || [
                    <li key={1}>By uploading content, you grant SELPIC a non-exclusive license to use, modify, and display your content for the purpose of providing our services.</li>
                  ]}
                </ul>
              </div>
            </div>
          </div>

          {/* Limitation of Liability */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{getContent('Limitation of Liability 제목') || 'Limitation of Liability'}</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-3">
              {getContent('Limitation of Liability 내용') || 'To the maximum extent permitted by law, SELPIC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.'}
            </p>
            {getContent('Limitation of Liability 목록') && (
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
                {getContent('Limitation of Liability 목록')?.split(', ').map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
            {getContent('Limitation of Liability 내용2') && (
              <p className="text-gray-700 leading-relaxed mb-3">
                {getContent('Limitation of Liability 내용2')}
              </p>
            )}
            {getContent('Limitation of Liability 목록2') && (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {getContent('Limitation of Liability 목록2')?.split(', ').map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Returns and Refunds */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <XCircle className="w-8 h-8 text-red-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{getContent('Returns and Refunds 제목') || 'Returns and Refunds'}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{getContent('Return Policy 제목') || 'Return Policy'}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {(getContent('Return Policy 목록')
                    ? splitReturnPolicyList(getContent('Return Policy 목록'))
                    : [
                        'Where the ACL allows a non-faulty return for your order type, contact us within 14 days of delivery before sending anything back',
                        'Since our stickers are personalised/customised, we do not accept returns for change of mind',
                        'If the product is faulty or incorrect, please notify us within 7 days of delivery with photos',
                        'Eligible returns must be in original condition unless we agree otherwise for inspection',
                        'Return shipping costs may apply as advised when you contact us',
                      ]
                  ).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{getContent('Refund Process 제목') || 'Refund Process'}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {getContent('Refund Process 목록')?.split(', ').map((item, index) => (
                    <li key={index}>{item}</li>
                  )) || [
                    <li key={1}>Refunds processed within 5-10 business days</li>,
                    <li key={2}>Original payment method will be credited</li>,
                    <li key={3}>Processing fees may apply</li>,
                    <li key={4}>Contact customer service for assistance</li>
                  ]}
                </ul>
              </div>
            </div>
          </div>

          {/* Changes to Terms */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FileText className="w-8 h-8 text-indigo-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{getContent('Changes to Terms 제목') || 'Changes to Terms'}</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {getContent('Changes to Terms 내용') || 'We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of our services constitutes acceptance of the modified terms.'}
            </p>
          </div>

          {/* Governing Law */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Scale className="w-8 h-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{getContent('Governing Law 제목') || '8. Governing Law'}</h2>
            </div>
            {getContent('Governing Law 내용') && (
              <p className="text-gray-700 leading-relaxed mb-3">
                {getContent('Governing Law 내용')}
              </p>
            )}
            {getContent('Governing Law 목록') && (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {getContent('Governing Law 목록')?.split(', ').map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{getContent('Contact Information 제목') || 'Contact Us'}</h2>
            <p className="text-gray-700 mb-4">
              {getContent('Contact Information 설명') || 'If you have any questions about these Terms and Conditions, please contact us:'}
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> {getContent('Contact Email') || 'info@selpic.com.au'}</p>
              <p><strong>Phone:</strong> {getContent('Contact Phone') || '(61) 0466-894-279'}</p>
              <p><strong>Address:</strong> {getContent('Contact Address') || '123 Sticker Street, Design City, DC 12345'}</p>
              <p className="text-[11px] text-gray-600 pt-2 whitespace-pre-line">{COMPANY_LEGAL_LINE}</p>
            </div>
          </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
