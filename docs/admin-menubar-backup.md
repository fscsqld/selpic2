# Admin Dashboard 메뉴바 구성 백업

## 개요
- **파일**: `app/admin/dashboard/page.tsx`
- **컴포넌트**: `components/DynamicSidebar.tsx`
- **제거 이유**: 로딩 문제 해결을 위해 일시적 제거
- **백업 날짜**: 2025-09-09

## 메뉴바 구성 요소

### 1. 헤더의 메뉴 버튼
**위치**: `app/admin/dashboard/page.tsx` 231-237번째 줄

```tsx
<button
  onClick={() => setSidebarOpen(!sidebarOpen)}
  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
  aria-label="메뉴 열기/닫기"
>
  <Menu className="h-6 w-6" />
</button>
```

### 2. 상태 관리
```tsx
const [sidebarOpen, setSidebarOpen] = useState(false)
```

### 3. 사이드바 Escape 키 처리
```tsx
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && sidebarOpen) {
      setSidebarOpen(false)
    }
  }

  if (sidebarOpen) {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }
}, [sidebarOpen])
```

### 4. DynamicSidebar 컴포넌트 사용
```tsx
<DynamicSidebar
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
```

## DynamicSidebar 컴포넌트 구성

### 주요 기능
1. **동적 메뉴 로딩**: contentStore에서 메뉴 아이템 가져오기
2. **아이콘 동적 로딩**: lucide-react 아이콘들 비동기 로딩
3. **기본 메뉴**: 메뉴 아이템이 없을 때 사용할 기본 메뉴
4. **현재 페이지 표시**: 활성 메뉴 아이템 하이라이트

### 기본 메뉴 아이템
```tsx
const defaultMenuItems = [
  {
    id: 'dashboard',
    title: '대시보드',
    url: '/admin/dashboard',
    icon: 'BarChart3',
    order: 1,
    isActive: true
  },
  {
    id: 'products',
    title: '상품 관리',
    url: '/admin/products',
    icon: 'Package',
    order: 2,
    isActive: true
  },
  {
    id: 'content',
    title: '콘텐츠 관리',
    url: '/admin/content',
    icon: 'FileText',
    order: 3,
    isActive: true
  }
]
```

### 지원하는 아이콘들
- BarChart3 (대시보드)
- Package (상품 관리)
- FileText (콘텐츠 관리)
- Users (사용자 관리)
- Settings (설정)
- 이모지 지원
- 기타 lucide-react 아이콘들 (동적 로딩)

## 필요한 Import들

### dashboard/page.tsx
```tsx
import { Menu } from 'lucide-react'
import DynamicSidebar from '@/components/DynamicSidebar'
```

### DynamicSidebar.tsx
```tsx
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useContentStore } from '@/lib/contentStore'
import { getIconComponent } from '@/lib/sidebarIcons'
```

## 스타일링 클래스들

### 메뉴 버튼
```css
p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500
```

### 사이드바 컨테이너
```css
fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r-2 border-gray-300 transform translate-x-0/-translate-x-full transition-transform duration-300 ease-in-out flex flex-col
```

### 메뉴 아이템 (활성)
```css
text-blue-600 bg-blue-50
```

### 메뉴 아이템 (비활성)
```css
text-gray-700 hover:text-gray-900 hover:bg-gray-100
```

## 복원 시 필요한 작업

1. **상태 변수 추가**
   ```tsx
   const [sidebarOpen, setSidebarOpen] = useState(false)
   ```

2. **useEffect 추가** (Escape 키 처리)

3. **헤더에 메뉴 버튼 추가**

4. **DynamicSidebar 컴포넌트 추가**

5. **Import 문 추가**
   - Menu 아이콘
   - DynamicSidebar 컴포넌트

## 주의사항
- DynamicSidebar는 contentStore와 연동되어 있음
- 아이콘 로딩이 비동기로 처리됨
- 메뉴 아이템이 없을 때 기본 메뉴가 표시됨
- z-index 값들이 겹치지 않도록 주의 (sidebar: z-50, header: z-30)

## 로딩 이슈
- 아이콘 동적 로딩으로 인한 성능 문제 가능성
- contentStore 의존성으로 인한 초기화 문제
- Promise.allSettled 사용으로 인한 렌더링 지연
