import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Checkout | Selpic' },
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
