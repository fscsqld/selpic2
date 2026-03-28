'use client'

import Header from '@/components/Header'
import { useStore } from '@/lib/store'

type QAItem = { category: string; q: string; a: string }

const faqKo: QAItem[] = [
  // 1. Ordering and Production Process
  { category: '주문/제작', q: '디자인 요청: 스티커/스템프 디자인을 어떻게 요청하나요?', a: '이미지를 직접 업로드할 필요 없습니다. 제공된 디자인 템플릿 중 하나를 선택하고 원하는 텍스트/옵션만 입력하면 커스터마이징이 완료됩니다.' },
  { category: '주문/제작', q: '프루프 제공: 제작 전 최종 디자인을 볼 수 있나요?', a: '네. 커스터마이징 페이지에서 최종 디자인을 실시간으로 확인할 수 있으며, 최종 승인 단계에서 확정 후에만 제작이 시작됩니다.' },
  { category: '주문/제작', q: '제품 가격 산정: 가격은 어떻게 결정되나요?', a: '상품 카테고리(스티커/스템프/폰케이스), 수량, 최종 사이즈에 따라 결정되며, 견적 페이지에서 옵션 선택 시 실시간으로 확인할 수 있습니다.' },
  // 2. Payments and Accounts
  { category: '결제/계정', q: '통화/세금: 결제 통화와 GST는 어떻게 되나요?', a: '모든 금액은 AUD이며, 표시된 경우 GST(부가가치세)가 포함됩니다.' },
  { category: '결제/계정', q: '결제 수단: 어떤 결제 수단을 사용할 수 있나요?', a: '체크아웃 단계에서 가능한 모든 결제 수단(신용/직불카드, PayPal, 은행 이체 등)을 확인할 수 있습니다.' },
  { category: '결제/계정', q: '주문 내역: 주문 내역은 어디서 확인하나요?', a: '로그인 후 Order History에서 현재 주문 상태와 과거 주문 내역을 확인할 수 있습니다.' },
  // 3. Shipping and Delivery
  { category: '배송', q: '배송 기간: 배송은 얼마나 걸리나요?', a: '호주 전역 배송. 체크아웃에 표시되는 예상 배송일은 참고용이며, 커스터마이징/택배사/공휴일 등에 따라 달라질 수 있습니다.' },
  { category: '배송', q: '배송 추적: 어떻게 추적하나요?', a: '발송 시 이메일로 Tracking Number가 전달됩니다. 선택한 배송 옵션에 추적이 포함되지 않은 경우(예: 일반우편)에는 추적이 불가합니다.' },
  { category: '배송', q: '해외 배송: 호주 외 국가로도 배송하나요?', a: '현재는 호주 내 배송만 제공합니다.' },
  // 4. Order Changes and Issues
  { category: '변경/이슈', q: '변경/취소: 프루프 승인 후 변경이나 취소가 가능한가요?', a: '프루프 승인 후 제작이 시작되면 변경/취소가 어려울 수 있습니다. 도움이 필요하면 가능한 빨리 고객센터로 문의해 주세요.' },
  { category: '변경/이슈', q: '불량/파손/오배송: 문제가 생기면 어떻게 하나요?', a: '사진과 주문번호를 첨부해 즉시 문의해 주세요. 호주 소비자법(ACL)에 따라 적절히 처리해 드립니다.' },
  { category: '변경/이슈', q: '단순 변심: 단순 변심으로 교환/환불이 가능한가요?', a: '맞춤 제작 상품 특성상 승인된 디자인 기반으로 제작되므로 단순 변심 교환/환불은 일반적으로 불가합니다.' }
]

const faqEn: QAItem[] = [
  // 1. Ordering and Production Process
  { category: 'Ordering & Production', q: 'Design Request: How do I request a design for Stickers/Stamps?', a: 'You don’t need to upload your own image files. Select one of our design templates and simply enter your text/options to complete customization.' },
  { category: 'Ordering & Production', q: 'Proof Provided: Do you provide a proof before production?', a: 'Yes. The final design is shown live on the customization page. You confirm the finished design at the approval stage, and production starts only after your approval.' },
  { category: 'Ordering & Production', q: 'Product Pricing: How is the product price determined?', a: 'Pricing depends on category (Sticker/Stamp/Phonecase), quantity, and final size. Check real-time pricing on the quote page as you select options.' },
  // 2. Payments and Accounts
  { category: 'Payments & Accounts', q: 'Currency & Tax: What currency and tax (GST) do you use?', a: 'All prices are in AUD. Where indicated, GST is included.' },
  { category: 'Payments & Accounts', q: 'Payment Methods: What payment methods are accepted?', a: 'All available methods (Credit/Debit Card, PayPal, Bank Transfer, etc.) are shown during checkout.' },
  { category: 'Payments & Accounts', q: 'Order History: Where can I check my order history?', a: 'After logging in, you can view current status and past orders in Order History.' },
  // 3. Shipping and Delivery
  { category: 'Shipping & Delivery', q: 'Shipping Time: How long does shipping take?', a: 'We ship Australia-wide. Checkout delivery estimates are indicative; timelines can vary with customization, carriers, and public holidays.' },
  { category: 'Shipping & Delivery', q: 'Tracking: How do I track my shipment?', a: 'When shipped, a Tracking Number is emailed. If your chosen option lacks tracking (e.g., standard mail), tracking won’t be available.' },
  { category: 'Shipping & Delivery', q: 'International: Do you ship outside Australia?', a: 'Currently, we only ship within Australia.' },
  // 4. Order Changes and Issues
  { category: 'Changes & Issues', q: 'Change/Cancel: Can I change or cancel after proof approval?', a: 'Changes/cancellations may not be possible once production starts. Contact support as soon as possible if you need help.' },
  { category: 'Changes & Issues', q: 'Faulty/Damaged: What if my order is faulty, damaged, or incorrect?', a: 'Contact us promptly with photos and your Order ID. We will assist in line with Australian Consumer Law (ACL).' },
  { category: 'Changes & Issues', q: 'Change of Mind: Can I exchange or refund for change of mind?', a: 'Because products are custom-made after your approval, change-of-mind exchanges/refunds are generally not possible.' }
]

export default function HelpCenterPage() {
  const { language } = useStore()
  const isKo = language === 'ko'

  const title = isKo ? '고객센터' : 'SELPIC Help Centre (Frequently Asked Questions)'
  const intro = isKo
    ? 'SELPIC 이용에 도움이 되는 자주 묻는 질문(FAQ)을 모았습니다.'
    : 'Find answers to common questions about using SELPIC and placing your custom order.'

  const faqs = isKo ? faqKo : faqEn

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-playfair font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600 mb-8">{intro}</p>

        <div className="divide-y divide-gray-200">
          {faqs.map((item, idx) => (
            <div key={`${item.category}-${idx}`} className="py-4">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">{item.category}</p>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">{item.q}</h2>
              <p className="text-slate-700">{item.a}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}


