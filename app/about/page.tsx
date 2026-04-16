'use client'

import { useEffect } from 'react'
import Header from '../../components/Header'
import { useContentStore } from '@/lib/contentStore'
import { Package, Star, Heart, Users, Award, Globe, ArrowRight, Zap, Target, Shield } from 'lucide-react'
import Link from 'next/link'
import { COMPANY_LEGAL_LINE } from '@/lib/companyLegal'

export default function AboutPage() {
  const { getActiveContentBySection, _hasHydrated: contentHydrated, setHasHydrated: setContentHydrated } = useContentStore()
  
  // Load content for the About Us section.
  const aboutContent = getActiveContentBySection('about')
  
  // Helper to access each content entry more easily.
  const getContent = (title: string) => {
    return aboutContent.find(item => item.title === title)?.content || ''
  }
  
  // Helper to resolve link URLs.
  const getLinkUrl = (title: string, defaultUrl: string) => {
    const linkItem = aboutContent.find(item => item.title === title && item.type === 'link')
    return linkItem?.linkUrl || defaultUrl
  }

  // Ensure the content store is hydrated before rendering.
  useEffect(() => {
    if (!contentHydrated) {
      setContentHydrated(true)
    }
  }, [contentHydrated, setContentHydrated])

  // Show loading if hydration is not complete
  if (!contentHydrated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-emerald-900 via-teal-800 to-green-900 text-white overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2574&q=80')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-300/16 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-teal-300/16 rounded-full blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <h1 className="text-5xl lg:text-7xl font-light text-white tracking-wide mb-6 font-playfair">
              {getContent('Hero 제목') || 'About Us'}
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-emerald-600 to-teal-600 mx-auto rounded-full mb-8"></div>
          </div>
          
          <p className="text-xl lg:text-2xl text-emerald-100 mb-8 max-w-4xl mx-auto font-light leading-relaxed">
            {getContent('Hero 부제목') || 'Your digital sticker journey starts here. Customize and print your own stickers with ease.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              href={getLinkUrl('Hero Browse 버튼 링크', '/stickers')} 
              className="group relative bg-gradient-to-r from-white to-emerald-50 text-emerald-900 px-8 py-4 rounded-full font-medium text-lg hover:from-emerald-50 hover:to-white transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105"
            >
              <span className="relative z-10">{getContent('Hero Browse 버튼') || 'Sticker Products'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </Link>
          </div>
        </div>
      </section>

      {/* Company Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-light text-slate-900 tracking-wide text-center font-playfair mb-4">
                {getContent('Company Story 제목') || 'Our Story'}
              </h2>
              <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                <p>
                  {getContent('Company Story 첫 번째 문단') || 'SELPIC was born from a simple idea: everyone deserves to express their creativity through high-quality, personalized stickers. We started as a small team of designers and developers who were passionate about making custom printing accessible to everyone.'}
                </p>
                <p>
                  {getContent('Company Story 두 번째 문단') || 'Today, we have grown into a trusted platform that serves thousands of customers worldwide. Our commitment to quality, innovation, and customer satisfaction has made us a leader in the custom sticker industry.'}
                </p>
                <p>
                  {getContent('Company Story 세 번째 문단') || 'We believe that every idea deserves to be brought to life, and we are here to help you turn your creative visions into beautiful, durable stickers that you can be proud of.'}
                </p>
              </div>
            </div>
            
            
          </div>
        </div>
      </section>

      {/* Why SELPIC Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {getContent('Why SELPIC 제목') || 'Why SELPIC?'}
            </h2>
            <p className="text-xl text-gray-600">
              {getContent('Why SELPIC 부제목') || 'We deliver outstanding quality and service to keep every customer satisfied.'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{getContent('최고 품질 제목') || 'Premium Quality'}</h3>
                  <p className="text-gray-600">{getContent('최고 품질 설명') || 'We use advanced technology to deliver premium results. Every product goes through strict quality checks before it reaches you.'}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{getContent('고객 만족 제목') || 'Customer Satisfaction'}</h3>
                  <p className="text-gray-600">{getContent('고객 만족 설명') || 'If you are not fully satisfied, we stand behind our work. Your satisfaction is always our highest priority.'}</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-xl">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Star className="text-white" size={32} />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-4">{getContent('SELPIC의 약속 제목') || 'The SELPIC Promise'}</h4>
                  <p className="text-gray-600 leading-relaxed">
                    {getContent('SELPIC의 약속 설명') || 'We are more than a store. We are your creative partner, helping turn your ideas into real products with quality craftsmanship and dependable service.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-light text-emerald-900 mb-6 tracking-wide text-center font-playfair">
              {getContent('Values 섹션 제목') || 'Our Values'}
            </h2>
            <p className="text-xl text-emerald-700 max-w-3xl mx-auto">
              {getContent('Values 섹션 부제목') || 'What drives us every day'}
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-8 items-stretch">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 hover:scale-105 h-full flex flex-col">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-4">{getContent('Innovation 제목') || 'Innovation'}</h3>
              <p className="text-emerald-700">{getContent('Innovation 설명') || 'We constantly push the boundaries of what\'s possible in custom printing technology.'}</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 hover:scale-105 h-full flex flex-col">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-4">{getContent('Quality Values 제목') || 'Quality'}</h3>
              <p className="text-emerald-700">{getContent('Quality Values 설명') || 'Every product meets our strict quality standards before reaching our customers.'}</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 hover:scale-105 h-full flex flex-col">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-4">{getContent('Customer Values 제목') || 'Customer First'}</h3>
              <p className="text-emerald-700">{getContent('Customer Values 설명') || 'Your satisfaction is our top priority, and we go above and beyond to exceed your expectations.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-light text-emerald-900 mb-6 tracking-wide text-center font-playfair">
              {getContent('Team 섹션 제목') || 'Meet Our Team'}
            </h2>
            <p className="text-xl text-emerald-700 max-w-3xl mx-auto">
              {getContent('Team 섹션 부제목') || 'The passionate people behind SELPIC'}
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-12 items-stretch">
            <div className="text-center group h-full flex flex-col">
              <div className="relative mb-6">
                <div className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="text-white" size={48} />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">{getContent('Design Team 제목') || 'Design Team'}</h3>
              <p className="text-emerald-700">{getContent('Design Team 설명') || 'Creative minds who bring your ideas to life'}</p>
            </div>
            
            <div className="text-center group h-full flex flex-col">
              <div className="relative mb-6">
                <div className="w-32 h-32 bg-gradient-to-br from-teal-400 to-green-500 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="text-white" size={48} />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">{getContent('Production Team 제목') || 'Production Team'}</h3>
              <p className="text-emerald-700">{getContent('Production Team 설명') || 'Experts who ensure every product meets our quality standards'}</p>
            </div>
            
            <div className="text-center group h-full flex flex-col">
              <div className="relative mb-6">
                <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Award className="text-white" size={48} />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">{getContent('Support Team 제목') || 'Support Team'}</h3>
              <p className="text-emerald-700">{getContent('Support Team 설명') || 'Dedicated professionals who are here to help you succeed'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-700 via-teal-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-light mb-8 tracking-wide text-center font-playfair">
            {getContent('Mission 섹션 제목') || 'Our Mission'}
          </h2>
          <p className="text-xl lg:text-2xl text-emerald-100 mb-12 max-w-4xl mx-auto font-light leading-relaxed">
            {getContent('Mission 섹션 설명') || 'To empower creativity and self-expression through high-quality, personalized stickers that bring your ideas to life.'}
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/15 transition-all duration-300">
              <Globe className="mx-auto mb-4 text-emerald-300" size={48} />
              <h3 className="text-xl font-semibold mb-4">{getContent('Global Reach 제목') || 'Global Reach'}</h3>
              <p className="text-emerald-100">{getContent('Global Reach 설명') || 'Serving customers worldwide with fast, reliable shipping and exceptional quality.'}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/15 transition-all duration-300">
              <Star className="mx-auto mb-4 text-emerald-300" size={48} />
              <h3 className="text-xl font-semibold mb-4">{getContent('Mission Innovation 제목') || 'Innovation'}</h3>
              <p className="text-emerald-100">{getContent('Mission Innovation 설명') || 'Continuously improving our technology and processes to deliver the best possible results.'}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/15 transition-all duration-300">
              <Package className="mx-auto mb-4 text-emerald-300" size={48} />
              <h3 className="text-xl font-semibold mb-4">{getContent('Sustainability 제목') || 'Sustainability'}</h3>
              <p className="text-emerald-100">{getContent('Sustainability 설명') || 'Committed to eco-friendly materials and sustainable business practices.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-br from-emerald-900 via-teal-800 to-green-900 text-white overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-teal-300/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-green-400/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-light text-white mb-8 tracking-wide text-center font-playfair">
            {getContent('CTA 섹션 제목') || 'Ready to Create?'}
          </h2>
          <p className="text-xl text-emerald-100 mb-12 max-w-2xl mx-auto">
            {getContent('CTA 섹션 설명') || 'Start your creative journey today and bring your ideas to life with our premium custom stickers.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              href={getLinkUrl('CTA Browse Products 버튼 링크', '/hot-goods')} 
              className="border-2 border-emerald-400 border-opacity-80 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-400/10 font-medium py-4 px-8 rounded-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
            >
              {getContent('CTA Browse Products 버튼') || 'Hot Products'}
            </Link>
          </div>
          <p className="text-emerald-200/90 text-[11px] mt-8 whitespace-pre-line">{COMPANY_LEGAL_LINE}</p>
        </div>
      </section>
    </div>
  )
}
