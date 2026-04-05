'use client'

import Header from '@/components/Header'

type QAItem = { category: string; q: string; a: string }

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
  { category: 'Changes & Issues', q: 'Faulty/Damaged: What if my order is faulty, damaged, or incorrect?', a: 'Please notify us within 7 days of delivery with photos and your Order ID. We will assist in line with the Australian Consumer Law (ACL).' },
  { category: 'Changes & Issues', q: 'Change of Mind: Can I exchange or refund for change of mind?', a: 'Since our stickers are personalised/customised, we do not accept returns for change of mind. Where the ACL allows a non-faulty return for your order, contact us within 14 days of delivery before sending anything back. See our Refund Policy for details.' }
]

export default function HelpCenterPage() {
  const title = 'SELPIC Help Centre (Frequently Asked Questions)'
  const intro = 'Find answers to common questions about using SELPIC and placing your custom order.'

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-playfair font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600 mb-8">{intro}</p>

        <div className="divide-y divide-gray-200">
          {faqEn.map((item, idx) => (
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
