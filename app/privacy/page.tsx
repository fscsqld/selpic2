'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import { useContentStore } from '@/lib/contentStore'
import { COMPANY_LEGAL_LINE } from '@/lib/companyLegal'

export default function PrivacyPolicy() {
  const { getActiveContentBySection, _hasHydrated } = useContentStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Privacy Policy 섹션의 콘텐츠 가져오기
  const privacyContent = getActiveContentBySection('privacy')

  // 각 콘텐츠 항목을 쉽게 접근할 수 있도록 함수 생성
  const getContent = (title: string) => {
    return privacyContent.find(item => item.title === title)?.content || ''
  }

  // 하이드레이션 완료 전에는 기본값 표시
  if (!mounted || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900">SELPIC Privacy Policy</h1>
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
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900">{getContent('Privacy Policy 제목') || 'SELPIC Privacy Policy'}</h1>
            <p className="text-gray-600 mt-2">{getContent('Privacy Policy 부제목') || 'Effective Date: December 2025 (Last Updated: December 2025)'}</p>
          </div>

          {/* 1. Introduction and Commitment */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('Introduction 제목') || '1. Introduction and Commitment'}</h2>
            <p className="text-gray-700 leading-relaxed">
              {getContent('Introduction 내용') || 'At SELPIC, we are committed to protecting your privacy and ensuring the security of your personal information in accordance with the Australian Privacy Principles (APPs) set out in the Privacy Act 1988 (Cth). This Privacy Policy explains how we manage your personal information when you use our services.'}
            </p>
          </div>

          {/* 2. Personal Information We Collect */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('Information We Collect 제목') || '2. Personal Information We Collect'}</h2>
            {getContent('Information We Collect 설명') && (
              <p className="text-gray-700 leading-relaxed mb-3">
                {getContent('Information We Collect 설명')}
              </p>
            )}
            {getContent('FIRST LIST') && (
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
                {getContent('FIRST LIST').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            )}
            {getContent('SECOND LIST') && (
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
                {getContent('SECOND LIST').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            )}
            {getContent('THIRD LIST') && (
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
                {getContent('THIRD LIST').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            )}
            {getContent('FOURTH LIST') && (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {getContent('FOURTH LIST').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            )}
          </div>

          {/* 3. How We Collect Information */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('How We Collect Information 제목') || '3. How We Collect Information'}</h2>
            {getContent('How We Collect Information 설명') && (
              <p className="text-gray-700 leading-relaxed mb-3">
                {getContent('How We Collect Information 설명')}
              </p>
            )}
            {getContent('How We Collect Information 목록') ? (
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
                {getContent('How We Collect Information 목록').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
                <li>Place an order through our website.</li>
                <li>Create an account on our website.</li>
                <li>Contact us for customer support or inquiries.</li>
                <li>Subscribe to our newsletter or marketing communications.</li>
                <li>We may also collect non-personal information automatically through cookies and similar tracking technologies as you browse our website.</li>
              </ul>
            )}
            {getContent('How We Collect Information 설명2') && (
              <p className="text-gray-700 leading-relaxed">
                {getContent('How We Collect Information 설명2')}
              </p>
            )}
          </div>

          {/* 4. Purpose of Collection and Use */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('Purpose of Collection and Use 제목') || '4. Purpose of Collection and Use (Why We Need Your Data)'}</h2>
            {getContent('Purpose of Collection and Use 설명') && (
              <p className="text-gray-700 leading-relaxed mb-3">
                {getContent('Purpose of Collection and Use 설명')}
              </p>
            )}
            {getContent('How We Use Information 목록') ? (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {getContent('How We Use Information 목록').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>To process and fulfill your orders and manage payment transactions.</li>
                <li>To provide necessary customer support and send essential order updates and notifications.</li>
                <li>To improve our products, services, and website experience (e.g., through analytics).</li>
                <li>To personalize your shopping experience and recommend products relevant to your preferences.</li>
                <li>To comply with legal obligations and prevent fraudulent activity.</li>
              </ul>
            )}
          </div>

          {/* 5. Direct Marketing */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('Direct Marketing 제목') || '5. Direct Marketing (APP 7)'}</h2>
            {getContent('Direct Marketing 설명') && (
              <p className="text-gray-700 leading-relaxed mb-3">
                {getContent('Direct Marketing 설명')}
              </p>
            )}
            {getContent('Direct Marketing 목록') ? (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {getContent('Direct Marketing 목록').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>We may use your personal information (such as your email address) to send you information about new products, special offers, and services we believe may be of interest to you.</li>
                <li>Opting Out: You can opt-out of receiving these marketing communications at any time by clicking the 'Unsubscribe' link provided in the email or by contacting us directly (see Section 10).</li>
              </ul>
            )}
          </div>

          {/* 6. Disclosure to Third Parties */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('Disclosure to Third Parties 제목') || '6. Disclosure to Third Parties'}</h2>
            {getContent('Disclosure to Third Parties 설명') && (
              <p className="text-gray-700 leading-relaxed mb-3">
                {getContent('Disclosure to Third Parties 설명')}
              </p>
            )}
            {getContent('Disclosure to Third Parties 목록') ? (
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
                {getContent('Disclosure to Third Parties 목록').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
                <li>Shipping and Logistics Providers (to deliver your orders).</li>
                <li>Payment Processors (to handle secure transactions).</li>
                <li>IT Service Providers (for data storage and website hosting).</li>
                <li>Overseas Disclosure: We may use third-party service providers located overseas (e.g., cloud hosting services) for data storage and processing. By providing your personal information, you consent to the disclosure of your information to these overseas recipients. We take reasonable steps to ensure that these overseas recipients comply with the APPs.</li>
              </ul>
            )}
            {getContent('Disclosure to Third Parties 설명2') && (
              <p className="text-gray-700 leading-relaxed">
                {getContent('Disclosure to Third Parties 설명2')}
              </p>
            )}
          </div>

          {/* 7. Data Quality and Security */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('Data Security 제목') || '7. Data Quality and Security (APPs 10 & 11)'}</h2>
            {getContent('Data Security 설명') && (
              <p className="text-gray-700 leading-relaxed mb-3">{getContent('Data Security 설명')}</p>
            )}
            {getContent('Data Security 목록') ? (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {getContent('Data Security 목록').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Security Measures: We implement industry-standard security measures, including SSL encryption for all data transmission, secure payment processing, and regular security audits.</li>
                <li>Data Retention: We only retain personal information for as long as necessary to fulfil the purposes outlined in this policy or as required by law.</li>
                <li>Accuracy: We take reasonable steps to ensure that the personal information we collect and use is accurate, complete, and up-to-date.</li>
              </ul>
            )}
          </div>

          {/* 8. Access and Correction */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('Access and Correction 제목') || '8. Access and Correction (APPs 12 & 13)'}</h2>
            {getContent('Your Rights 설명') ? (
              <>
                <p className="text-gray-700 leading-relaxed">
                  {getContent('Your Rights 설명')}
                </p>
                {getContent('Your Rights 목록') && (
                  <ul className="list-disc list-inside text-gray-700 space-y-1 mt-3">
                    {getContent('Your Rights 목록').split(/,\s*(?=[A-Z])/).map((item, index) => (
                      <li key={index}>{item.trim()}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-gray-700 leading-relaxed">
                You have the right to request access to the personal information we hold about you and request corrections to any inaccurate or incomplete information. To access or correct, please contact us using the details below. We will respond within a reasonable time and may charge a reasonable fee for complex retrieval.
              </p>
            )}
          </div>

          {/* 9. Making a Complaint */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('Making a Complaint 제목') || '9. Making a Complaint'}</h2>
            {getContent('Making a Complaint 설명') && (
              <p className="text-gray-700 leading-relaxed mb-3">
                {getContent('Making a Complaint 설명')}
              </p>
            )}
            {getContent('Making a Complaint 목록') ? (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {getContent('Making a Complaint 목록').split(/,\s*(?=[A-Z])/).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Complaint Procedure: Please contact us in writing, detailing the nature of your complaint. We will investigate and respond within 30 days.</li>
                <li>External Complaint: If you are not satisfied with our response, you may refer your complaint to the Office of the Australian Information Commissioner (OAIC).</li>
              </ul>
            )}
          </div>

          {/* 10. Contact Us */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{getContent('Contact Information 제목') || '10. Contact Us'}</h2>
            {getContent('Contact Information 설명') && (
              <p className="text-gray-700 mb-3">
                {getContent('Contact Information 설명')}
              </p>
            )}
            <div className="space-y-1 text-gray-700">
              <p><strong>Email:</strong> {getContent('Contact Email') || 'info@selpic.com.au'}</p>
              <p><strong>Phone:</strong> {getContent('Contact Phone') || '+61 0466894279'}</p>
              <p><strong>Address:</strong> {getContent('Contact Address') || 'Harvest St, Mansfield QLD 4122'}</p>
              <p className="text-[11px] text-gray-600 pt-2 whitespace-pre-line">{COMPANY_LEGAL_LINE}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}