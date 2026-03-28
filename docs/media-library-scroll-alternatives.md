# Media Library 모달 스크롤바 대체 방법 가이드

## 📋 현재 상황

`MediaLibraryModal` 컴포넌트에서 199번 줄에 `overflow-y-auto`를 사용하여 스크롤바를 표시하고 있습니다.

```199:199:components/MediaLibraryModal.tsx
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 min-h-0">
```

## 🎯 스크롤바 대체 방법 옵션

### 1. **페이지네이션 (Pagination)** ⭐ 추천

**장점:**
- 구현이 간단하고 직관적
- 성능이 우수 (한 번에 일부만 렌더링)
- 사용자가 현재 위치를 명확히 알 수 있음
- 모바일에서도 사용하기 편함

**단점:**
- 페이지 이동이 필요
- 전체 항목 수가 적으면 오히려 불편할 수 있음

**구현 방법:**
```typescript
const [currentPage, setCurrentPage] = useState(1)
const itemsPerPage = 20 // 그리드: 20개, 리스트: 10개

const paginatedFiles = useMemo(() => {
  const start = (currentPage - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredFiles.slice(start, end)
}, [filteredFiles, currentPage, itemsPerPage])

const totalPages = Math.ceil(filteredFiles.length / itemsPerPage)
```

**UI 예시:**
```tsx
{/* 페이지네이션 컨트롤 */}
<div className="flex items-center justify-between px-6 py-4 border-t">
  <div className="text-sm text-gray-600">
    Showing {start + 1}-{Math.min(end, filteredFiles.length)} of {filteredFiles.length}
  </div>
  <div className="flex items-center gap-2">
    <button 
      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
      disabled={currentPage === 1}
      className="px-3 py-1 border rounded disabled:opacity-50"
    >
      Previous
    </button>
    <span className="px-3 py-1 bg-blue-600 text-white rounded">
      {currentPage} / {totalPages}
    </span>
    <button 
      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
      disabled={currentPage === totalPages}
      className="px-3 py-1 border rounded disabled:opacity-50"
    >
      Next
    </button>
  </div>
</div>
```

---

### 2. **무한 스크롤 (Infinite Scroll)** ⭐⭐ 현대적

**장점:**
- 사용자 경험이 부드러움
- 스크롤바 없이 자연스러운 탐색
- 모바일에서 매우 직관적
- 추가 로딩이 자동으로 이루어짐

**단점:**
- 구현이 조금 더 복잡
- Intersection Observer API 필요
- 성능 최적화 필요 (이미지 lazy loading)

**구현 방법:**
```typescript
const [displayedCount, setDisplayedCount] = useState(20)
const loadMoreRef = useRef<HTMLDivElement>(null)

const displayedFiles = useMemo(() => {
  return filteredFiles.slice(0, displayedCount)
}, [filteredFiles, displayedCount])

// Intersection Observer로 자동 로딩
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && displayedCount < filteredFiles.length) {
        setDisplayedCount(prev => Math.min(prev + 20, filteredFiles.length))
      }
    },
    { threshold: 0.1 }
  )

  if (loadMoreRef.current) {
    observer.observe(loadMoreRef.current)
  }

  return () => observer.disconnect()
}, [displayedCount, filteredFiles.length])
```

**UI 예시:**
```tsx
{/* 무한 스크롤 트리거 */}
{displayedFiles.map((file) => (
  // ... 파일 아이템
))}

{displayedCount < filteredFiles.length && (
  <div ref={loadMoreRef} className="py-8 text-center">
    <div className="inline-flex items-center gap-2 text-gray-600">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span>Loading more...</span>
    </div>
  </div>
)}
```

---

### 3. **가상 스크롤 (Virtual Scrolling)** ⭐⭐⭐ 대량 데이터용

**장점:**
- 수천 개의 항목도 부드럽게 처리
- 메모리 사용량 최소화
- 매우 빠른 렌더링

**단점:**
- 구현이 복잡
- 라이브러리 필요 (react-window, react-virtual 등)
- 높이가 다른 항목 처리 어려움

**라이브러리 옵션:**
- `react-window` (가벼움, 추천)
- `react-virtual` (최신, 유연함)
- `@tanstack/react-virtual` (TanStack, 강력함)

**구현 예시 (react-window):**
```bash
npm install react-window
```

```typescript
import { FixedSizeGrid } from 'react-window'

// 그리드 뷰용
<FixedSizeGrid
  columnCount={5}
  columnWidth={200}
  height={600}
  rowCount={Math.ceil(filteredFiles.length / 5)}
  rowHeight={250}
  width={1000}
>
  {({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * 5 + columnIndex
    const file = filteredFiles[index]
    if (!file) return null
    
    return (
      <div style={style}>
        {/* 파일 아이템 */}
      </div>
    )
  }}
</FixedSizeGrid>
```

---

### 4. **스크롤 인디케이터 (Scroll Indicator)** - 스크롤바 스타일링

**장점:**
- 스크롤 기능 유지
- 시각적으로 더 깔끔
- 구현이 매우 간단

**단점:**
- 여전히 스크롤바 개념
- 완전한 대체는 아님

**구현 방법:**
```css
/* 커스텀 스크롤바 스타일 */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

```tsx
<div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-gray-50 min-h-0">
```

---

### 5. **탭/카테고리 기반 분할**

**장점:**
- 카테고리가 이미 있으므로 자연스러움
- 각 카테고리별로 항목 수가 적어짐
- 스크롤이 필요 없거나 최소화됨

**단점:**
- 카테고리 간 이동이 필요
- 전체 보기가 어려움

**구현 방법:**
```typescript
// 카테고리별로 그룹화
const filesByCategory = useMemo(() => {
  const grouped: Record<string, MediaFile[]> = {}
  filteredFiles.forEach(file => {
    const cat = file.category || 'general'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(file)
  })
  return grouped
}, [filteredFiles])

// 탭으로 표시
<div className="flex border-b">
  {Object.keys(filesByCategory).map(cat => (
    <button
      key={cat}
      onClick={() => setActiveCategory(cat)}
      className="px-4 py-2 border-b-2 border-blue-600"
    >
      {cat} ({filesByCategory[cat].length})
    </button>
  ))}
</div>
```

---

### 6. **키보드 네비게이션 + 스크롤 인디케이터**

**장점:**
- 접근성 향상
- 키보드 사용자에게 유용
- 스크롤바는 숨기고 키보드로 제어

**구현 방법:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return
    
    if (e.key === 'ArrowDown') {
      // 다음 항목으로 스크롤
      e.preventDefault()
      // 스크롤 로직
    } else if (e.key === 'ArrowUp') {
      // 이전 항목으로 스크롤
      e.preventDefault()
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isOpen])
```

---

## 🎨 추천 조합

### **옵션 A: 페이지네이션 (간단하고 효과적)**
- 구현 난이도: ⭐ (쉬움)
- 사용자 경험: ⭐⭐⭐⭐ (좋음)
- 성능: ⭐⭐⭐⭐⭐ (우수)
- **추천 대상**: 모든 경우

### **옵션 B: 무한 스크롤 (현대적)**
- 구현 난이도: ⭐⭐ (보통)
- 사용자 경험: ⭐⭐⭐⭐⭐ (매우 좋음)
- 성능: ⭐⭐⭐⭐ (좋음)
- **추천 대상**: 모바일 중심, 현대적인 느낌 원할 때

### **옵션 C: 페이지네이션 + 커스텀 스크롤바**
- 구현 난이도: ⭐ (쉬움)
- 사용자 경험: ⭐⭐⭐⭐ (좋음)
- 성능: ⭐⭐⭐⭐⭐ (우수)
- **추천 대상**: 스크롤바를 완전히 제거하고 싶지 않을 때

---

## 📊 비교표

| 방법 | 구현 난이도 | UX | 성능 | 모바일 | 추천도 |
|------|------------|-----|------|--------|--------|
| 페이지네이션 | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 무한 스크롤 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 가상 스크롤 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 커스텀 스크롤바 | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 탭 분할 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🚀 빠른 구현 가이드

### 페이지네이션 구현 (가장 추천)

1. **상태 추가:**
```typescript
const [currentPage, setCurrentPage] = useState(1)
const itemsPerPage = viewMode === 'grid' ? 20 : 10
```

2. **필터 변경 시 페이지 리셋:**
```typescript
useEffect(() => {
  setCurrentPage(1)
}, [searchTerm, selectedCategory, type])
```

3. **페이지네이션된 데이터:**
```typescript
const paginatedFiles = useMemo(() => {
  const start = (currentPage - 1) * itemsPerPage
  return filteredFiles.slice(start, start + itemsPerPage)
}, [filteredFiles, currentPage, itemsPerPage])
```

4. **스크롤바 제거:**
```tsx
// overflow-y-auto 제거
<div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-0">
```

5. **페이지네이션 UI 추가:**
```tsx
{/* Footer에 추가 */}
<div className="flex items-center justify-between px-6 py-4 border-t">
  <div className="text-sm text-gray-600">
    Page {currentPage} of {Math.ceil(filteredFiles.length / itemsPerPage)}
  </div>
  <div className="flex items-center gap-2">
    {/* Previous/Next 버튼 */}
  </div>
</div>
```

---

## 💡 추가 개선 아이디어

1. **페이지 크기 선택기:**
```tsx
<select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
  <option value={10}>10 per page</option>
  <option value={20}>20 per page</option>
  <option value={50}>50 per page</option>
</select>
```

2. **페이지 번호 직접 입력:**
```tsx
<input 
  type="number" 
  min={1} 
  max={totalPages}
  value={currentPage}
  onChange={(e) => setCurrentPage(Number(e.target.value))}
  className="w-16 px-2 py-1 border rounded"
/>
```

3. **키보드 단축키:**
- `←` / `→`: 이전/다음 페이지
- `Home` / `End`: 첫/마지막 페이지

---

## 🎯 최종 추천

**Media Library 모달의 경우:**
1. **1순위: 페이지네이션** - 구현이 간단하고 모든 환경에서 잘 작동
2. **2순위: 무한 스크롤** - 더 현대적인 느낌을 원할 때
3. **3순위: 페이지네이션 + 커스텀 스크롤바** - 스크롤 기능도 유지하고 싶을 때

**구현 우선순위:**
1. 페이지네이션 구현 (30분)
2. 테스트 및 피드백 수집
3. 필요시 무한 스크롤로 업그레이드

