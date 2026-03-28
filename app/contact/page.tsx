'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { useTranslation } from '@/lib/useTranslation'
import { useMessageStore } from '@/lib/messageStore'
import { 
  MessageSquare, Send, CheckCircle, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { COMPANY_LEGAL_LINE } from '@/lib/companyLegal'

export default function ContactPage() {
  const { t } = useTranslation()
  const { addMessage } = useMessageStore()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    show: boolean
  }>({ type: 'info', message: '', show: false })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // 폼 검증
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setNotification({
        type: 'error',
        message: 'All fields are required.',
        show: true
      })
      setIsLoading(false)
      return
    }

    try {
      // 메시지를 store에 저장
      addMessage({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        category: formData.category as any
      })
      
      // 시뮬레이션 지연
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setNotification({
        type: 'success',
        message: t('admin.products.contactForm.success'),
        show: true
      })
      
      // 폼 초기화
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
      })
    } catch (error) {
      setNotification({
        type: 'error',
        message: t('admin.products.contactForm.error'),
        show: true
      })
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }))
      }, 5000)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-8 lg:py-11 bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 text-white overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516387938699-a93567ec168e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2571&q=80')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-300/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-purple-300/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl lg:text-7xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-100">
            {t('admin.products.contactTitle')}
          </h1>
          <p className="text-xl lg:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
            {t('admin.products.contactSubtitle')}
          </p>
          
          {/* CTA Button */}
          <div className="flex justify-center">
            <button 
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              {t('admin.products.contactForm.title')}
            </button>
          </div>
        </div>
      </section>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 
          notification.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 
          'bg-blue-100 text-blue-700 border border-blue-300'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}


      {/* Contact Form Section */}
      <section id="contact-form" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 lg:p-10 rounded-2xl shadow-xl border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {t('admin.products.contactForm.title')}
              </h2>
              <p className="text-gray-600 mb-8">
                {t('admin.products.contactForm.subtitle')}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.contactForm.name')} *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={t('admin.products.contactForm.namePlaceholder')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.contactForm.email')} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={t('admin.products.contactForm.emailPlaceholder')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.products.contactForm.category')}
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="general">{t('admin.products.contactForm.categoryGeneral')}</option>
                    <option value="order">{t('admin.products.contactForm.categoryOrder')}</option>
                    <option value="technical">{t('admin.products.contactForm.categoryTechnical')}</option>
                    <option value="business">{t('admin.products.contactForm.categoryBusiness')}</option>
                    <option value="complaint">{t('admin.products.contactForm.categoryComplaint')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.products.contactForm.subject')} *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder={t('admin.products.contactForm.subjectPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.products.contactForm.message')} *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder={t('admin.products.contactForm.messagePlaceholder')}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {t('admin.products.contactForm.sending')}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Send className="w-5 h-5 mr-2" />
                      {t('admin.products.contactForm.submit')}
                    </div>
                  )}
                </button>
              </form>
          </div>
        </div>
      </section>

      {/* Satisfaction Guarantee Section */}
      <section className="py-2 bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              {t('admin.products.satisfaction.title')}
            </h2>
            <p className="text-xl text-blue-100 mb-12">
              {t('admin.products.satisfaction.subtitle')}
            </p>
            <p className="text-blue-200/90 text-[11px] whitespace-pre-line">{COMPANY_LEGAL_LINE}</p>
          </div>

        </div>
      </section>

    </div>
  )
}
