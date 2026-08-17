import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Forgot Password',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function AuthForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
