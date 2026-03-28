import { ContentItem } from '@/lib/contentStore'

// URL 검증 및 수정 함수
export const validateAndFixUrl = (url: string): string => {
  let validatedUrl = url.trim()
  if (validatedUrl.includes('#app/')) {
    validatedUrl = validatedUrl.replace('#app/', '/')
  }
  if (validatedUrl.includes('/page.tsx')) {
    validatedUrl = validatedUrl.replace('/page.tsx', '')
  }
  return validatedUrl
}

// 섹션별 색상 반환 함수
export const getSectionColor = (section: string): string => {
  switch (section) {
    case 'header': return 'bg-indigo-100 text-indigo-800'
    case 'hero': return 'bg-blue-100 text-blue-800'
    case 'how-it-works': return 'bg-green-100 text-green-800'
    case 'cta': return 'bg-orange-100 text-orange-800'
    case 'categories': return 'bg-pink-100 text-pink-800'
    case 'footer': return 'bg-gray-100 text-gray-800'
    case 'about': return 'bg-blue-100 text-blue-800'
    case 'privacy': return 'bg-purple-100 text-purple-800'
    case 'terms': return 'bg-orange-100 text-orange-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// 빠른 편집 데이터 타입
export interface QuickEditData {
  title: string
  content: string
  linkUrl?: string
  type: 'text' | 'link'
  order: number
}

// 빠른 편집 데이터 생성 함수
export const createQuickEditData = (
  title: string, 
  content: string, 
  type: 'text' | 'link' = 'text',
  linkUrl?: string,
  order: number = 1
): QuickEditData => ({
  title,
  content,
  linkUrl,
  type,
  order
})

// 콘텐츠 찾기 함수
export const findContentByTitle = (
  contentItems: ContentItem[], 
  section: string, 
  title: string
): ContentItem | undefined => {
  return contentItems.find(item => item.section === section && item.title === title)
}

// 섹션 정보
export const sections = [
  { id: 'header', name: 'Header 섹션', description: '네비게이션 메뉴, 로고, 버튼, 링크' },
  { id: 'hero', name: 'Hero 섹션', description: '메인 타이틀, 배지, 서브 타이틀, 배경 이미지, 카테고리 관리' },
  { id: 'how-it-works', name: 'How It Works 섹션', description: '3단계 제작 프로세스 설명, 아이콘, 텍스트' },
  { id: 'cta', name: 'CTA 섹션', description: '행동 유도 텍스트, 배경 이미지, 버튼' },
  { id: 'footer', name: 'Footer 섹션', description: '회사 정보, 연락처, 소셜 미디어 링크, 저작권 정보' },
  { id: 'about', name: 'About Us 섹션', description: 'About Us 페이지의 텍스트 내용 관리' },
  { id: 'privacy', name: 'Privacy Policy 섹션', description: 'Privacy Policy 페이지의 텍스트 내용 관리' },
  { id: 'terms', name: 'Terms and Conditions 섹션', description: 'Terms and Conditions 페이지의 텍스트 내용 관리' }
] as const

export const contentTypes = ['text', 'image', 'video', 'link', 'button'] as const
