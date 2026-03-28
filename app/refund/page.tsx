'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { useContentStore } from '@/lib/contentStore'
import { COMPANY_LEGAL_LINE } from '@/lib/companyLegal'

export default function RefundPage() {
	const { getActiveContentBySection, _hasHydrated } = useContentStore()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	// Refund Policy 섹션의 콘텐츠 가져오기
	const refundContent = getActiveContentBySection('refund')
	
	// 각 콘텐츠 항목을 쉽게 접근할 수 있도록 함수 생성
	const getContent = (title: string) => {
		return refundContent.find(item => item.title === title)?.content || ''
	}

	const title = getContent('Refund Policy Title') || 'Refund Policy'
	const intro = getContent('Refund Policy Intro') || 'SELPIC\'s refund/returns process complies with Australian Consumer Law (ACL). The following policy applies to online orders and may be updated as needed.'

	// 하이드레이션 완료 전에는 기본값 표시
	if (!mounted || !_hasHydrated) {
		return (
			<div className="min-h-screen bg-white">
				<Header />
				<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
					<h1 className="text-3xl font-playfair font-bold text-slate-900 mb-6">Refund Policy</h1>
					<p className="text-slate-600 mb-6">Loading...</p>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-white">
			<Header />
			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<h1 className="text-3xl font-playfair font-bold text-slate-900 mb-6">{title}</h1>
				<p className="text-slate-600 mb-6">{intro}</p>
				<section className="space-y-6 text-slate-700 mb-8">
					<div>
						<h2 className="text-xl font-semibold text-slate-900 mb-2">{getContent('Section 1 Title') || '1. Change of Mind Returns (Non-Faulty Items)'}</h2>
						{getContent('Section 1 내용') && (
							<p className="text-slate-700 mb-3">{getContent('Section 1 내용')}</p>
						)}
						{getContent('Section 1 목록') && (
							<ul className="list-disc pl-6 space-y-1">
								{(getContent('Section 1 목록').includes('\n') 
									? getContent('Section 1 목록').split('\n')
									: getContent('Section 1 목록').split(/,\s*(?=\S)/)
								).filter(item => item.trim()).map((item, index) => (
									<li key={index}>{item.trim()}</li>
								))}
							</ul>
						)}
					</div>

					<div>
						<h2 className="text-xl font-semibold text-slate-900 mb-2">{getContent('Section 2 Title') || '2. Faulty, Damaged, or Incorrect Items (ACL Consumer Guarantee)'}</h2>
						{getContent('Section 2 내용') && (
							<p className="text-slate-700 mb-3">{getContent('Section 2 내용')}</p>
						)}
						{getContent('Section 2 목록') && (
							<ul className="list-disc pl-6 space-y-1">
								{(getContent('Section 2 목록').includes('\n') 
									? getContent('Section 2 목록').split('\n')
									: getContent('Section 2 목록').split(/,\s*(?=\S)/)
								).filter(item => item.trim()).map((item, index) => (
									<li key={index}>{item.trim()}</li>
								))}
							</ul>
						)}
					</div>

					<div>
						<h2 className="text-xl font-semibold text-slate-900 mb-2">{getContent('Section 3 Title') || '3. General Return Conditions & Process'}</h2>
						{getContent('Section 3 내용') && (
							<p className="text-slate-700 mb-3">{getContent('Section 3 내용')}</p>
						)}
						{getContent('Section 3 목록') && (
							<ul className="list-disc pl-6 space-y-1">
								{(getContent('Section 3 목록').includes('\n') 
									? getContent('Section 3 목록').split('\n')
									: getContent('Section 3 목록').split(/,\s*(?=\S)/)
								).filter(item => item.trim()).map((item, index) => (
									<li key={index}>{item.trim()}</li>
								))}
							</ul>
						)}
					</div>

				</section>
				<div className="rounded-lg border border-gray-200 p-4 bg-gray-50 text-sm text-slate-700">
					<h2 className="font-semibold text-slate-900 mb-2">{getContent('Contact Title') || 'Contact'}</h2>
					<p>Email: {getContent('Contact Email') || 'support@selpic.com.au'}</p>
					<p>{getContent('Contact Hours') || 'Customer Service Hours: Mon–Fri 10am–5pm (Closed on weekends/public holidays)'}</p>
					<p className="text-slate-600 text-[11px] mt-2 whitespace-pre-line">{COMPANY_LEGAL_LINE}</p>
				</div>
			</main>
		</div>
	)
}


