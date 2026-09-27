import type { Metadata } from 'next'

/** Private commerce — keep out of search (also Disallow in robots.ts). */
export const metadata: Metadata = {
  title: { absolute: 'Cart | Selpic' },
  robots: { index: false, follow: false },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
