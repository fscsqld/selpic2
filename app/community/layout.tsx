import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  path: '/community',
  title: 'Selpic N — Community for AU families, schools & early learning',
  description:
    'Join Selpic N to share name-label tips, custom sticker ideas, and respectful conversation for Australian families, schools, kindergarten/kinder, daycare, and early learning.',
  keywords: [
    'selpic n',
    'selpic community',
    'name labels australia',
    'school daycare kinder stickers',
    'parent tips',
  ],
})

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children
}
