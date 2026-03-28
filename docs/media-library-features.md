# Media Library 모달 - 이미지/동영상 기능 상세 설명

## 📋 개요

Media Library 모달은 사용자가 저장된 이미지와 동영상 파일을 선택할 수 있는 인터페이스를 제공합니다. 다양한 필터링, 검색, 뷰 모드 전환 등의 기능이 구현되어 있습니다.

---

## 🖼️ 이미지 관련 기능

### 1. **이미지 표시 및 로딩**

#### URL 우선순위
```typescript
const imageUrl = restoredUrl || file.dataUrl || file.url || file.webpUrl
```
- **복원된 URL** (IndexedDB에서 복원): 최우선
- **dataUrl**: Base64 인코딩된 이미지 데이터
- **url**: 일반 URL
- **webpUrl**: WebP 최적화된 이미지 (있는 경우)

#### 에러 처리
```typescript
onError={(e) => {
  e.currentTarget.style.display = 'none'
  const placeholder = e.currentTarget.nextElementSibling as HTMLElement
  if (placeholder) {
    placeholder.style.display = 'flex'
  }
}}
```
- 이미지 로딩 실패 시 자동으로 플레이스홀더 표시
- "No Image" 아이콘과 텍스트로 대체

#### 이미지 최적화
- **WebP 지원**: WebP 변환된 이미지가 있으면 우선 사용
- **object-contain**: 이미지 비율 유지하며 컨테이너에 맞춤
- **반응형 크기**: 화면 크기에 따라 자동 조정
  - `h-20 sm:h-24 md:h-28 lg:h-32`

---

## 🎥 동영상 관련 기능

### 1. **동영상 썸네일 생성**

#### 자동 썸네일
```typescript
onLoadedMetadata={(e) => {
  const video = e.currentTarget
  video.currentTime = 0.1
}}
```
- 동영상 메타데이터 로드 시 **0.1초 지점의 프레임**을 썸네일로 사용
- 자동 재생 없이 정지된 상태로 표시

#### 동영상 오버레이
```typescript
<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
  <Video className="w-7 h-7 text-white" />
</div>
```
- 동영상 위에 반투명 오버레이와 비디오 아이콘 표시
- 동영상임을 명확히 표시

#### 에러 처리
```typescript
onError={(e) => {
  e.currentTarget.style.display = 'none'
}}
```
- 동영상 로딩 실패 시 숨김 처리

---

## 🎨 인터랙션 기능

### 1. **호버 효과 (Hover)**

#### 그리드 뷰
```typescript
className="relative group cursor-pointer bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all"
```
- **호버 시**:
  - 테두리 색상: `border-gray-200` → `border-blue-500`
  - 그림자 효과: `hover:shadow-lg`
  - 체크 아이콘 표시: `opacity-0` → `opacity-100`
  - 배경 오버레이: `bg-opacity-0` → `bg-opacity-60`

#### 리스트 뷰
```typescript
className="group cursor-pointer bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
```
- 호버 시 테두리와 그림자 효과
- 오른쪽에 체크 아이콘 표시

### 2. **클릭 선택**

```typescript
onClick={() => handleSelect(file)}
```
- 이미지/동영상 클릭 시 `handleSelect` 함수 호출
- 선택된 파일의 URL을 부모 컴포넌트로 전달
- 모달 자동 닫기

### 3. **선택 시 URL 처리**

```typescript
const handleSelect = (file: MediaFile) => {
  const restoredUrl = restoredUrls[file.id]
  const selectedUrl = restoredUrl || file.dataUrl || file.url
  
  if (!selectedUrl || !selectedUrl.trim()) {
    alert('Error: No URL available for this file.')
    return
  }
  
  onSelect(selectedUrl)
  onClose()
}
```
- URL 우선순위: 복원된 URL > dataUrl > url
- URL 유효성 검사
- 에러 시 알림 표시

---

## 🔄 IndexedDB 복원 기능

### 1. **자동 URL 복원**

```typescript
useEffect(() => {
  const restoreFiles = async () => {
    const filesToRestore = mediaFiles.filter(file => {
      if (!file.storedInIndexedDB) return false
      if (restoredFileIdsRef.current.has(file.id)) return false
      if (!file.url || file.url === '' || !file.url.startsWith('blob:')) {
        return true
      }
      return false
    })
    
    // IndexedDB에서 파일 가져오기
    const fileUrl = await indexedDBStorage.getFile(file.id)
    updateMediaFile(file.id, { url: fileUrl })
    setRestoredUrls(prev => ({ ...prev, [file.id]: fileUrl }))
  }
  
  restoreFiles()
}, [isOpen, mediaFiles, updateMediaFile])
```

#### 작동 방식
1. **모달이 열릴 때** 자동 실행
2. **IndexedDB에 저장된 파일** 중 URL이 없는 파일만 복원
3. **이미 복원한 파일**은 제외 (중복 방지)
4. **blob URL 생성**하여 표시
5. **상태 업데이트**: `restoredUrls`에 저장하여 즉시 반영

#### WebP 우선 처리
```typescript
if (file.type === 'image' && file.webpUrl) {
  if (file.webpUrl.startsWith('blob:')) {
    restoredFileIdsRef.current.add(file.id)
    setRestoredUrls(prev => ({ ...prev, [file.id]: file.webpUrl! }))
    return
  }
}
```
- 이미지인 경우 WebP URL이 있으면 우선 사용
- 성능 최적화를 위한 자동 선택

---

## 📊 뷰 모드 기능

### 1. **그리드 뷰 (Grid View)**

#### 특징
- **썸네일 중심**: 이미지/동영상 썸네일을 그리드로 표시
- **반응형 그리드**: 화면 크기에 따라 컬럼 수 자동 조정
  - 모바일: 2열
  - 태블릿: 3-4열
  - 데스크톱: 5-6열
  - 대형 화면: 8열
- **하단 정보 표시**: 파일명과 카테고리
- **호버 효과**: 체크 아이콘과 오버레이

#### 표시 정보
- 이미지/동영상 썸네일
- 파일명 (하단)
- 카테고리 (하단)

### 2. **리스트 뷰 (List View)**

#### 특징
- **상세 정보 중심**: 썸네일과 함께 상세 정보 표시
- **더 많은 정보**: 파일명, 카테고리, 타입, 크기, 상품명, 설명, 태그, 업로드 날짜

#### 표시 정보
- 썸네일 (왼쪽)
- 파일명
- 카테고리
- 파일 타입 (image/video)
- 파일 크기
- 연결된 상품명 (있는 경우)
- 설명 (있는 경우)
- 태그 (최대 3개 + 나머지 개수)
- 업로드 날짜
- 호버 시 체크 아이콘

---

## 🔍 필터링 및 검색 기능

### 1. **검색 기능**

```typescript
if (searchTerm) {
  const lowerSearchTerm = searchTerm.toLowerCase()
  files = files.filter(file => {
    return file.name.toLowerCase().includes(lowerSearchTerm) ||
           file.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)) ||
           (file.description && file.description.toLowerCase().includes(lowerSearchTerm)) ||
           (file.productName && file.productName.toLowerCase().includes(lowerSearchTerm))
  })
}
```

#### 검색 범위
- **파일명**: 파일 이름 전체 검색
- **태그**: 파일에 연결된 모든 태그
- **설명**: 파일 설명 텍스트
- **상품명**: 연결된 상품 이름

#### 검색 특징
- **대소문자 무시**: `toLowerCase()` 사용
- **부분 일치**: `includes()` 사용
- **실시간 검색**: 입력 즉시 필터링

### 2. **카테고리 필터**

```typescript
const categories = [
  { id: 'all', name: 'All Categories' },
  { id: 'stickers', name: 'Stickers' },
  { id: 'stamps', name: 'Stamps' },
  { id: 'phonecases', name: 'Phone Cases' },
  { id: 'hotgoods', name: 'HOT GOODS' },
  { id: 'general', name: 'General' }
]
```

#### 필터 동작
- 카테고리 버튼 클릭 시 해당 카테고리만 표시
- "All Categories" 선택 시 전체 표시
- 선택된 카테고리는 파란색으로 하이라이트

### 3. **타입 필터**

```typescript
if (type !== 'all') {
  files = files.filter(file => file.type === type)
}
```

#### 지원 타입
- `'image'`: 이미지만 표시
- `'video'`: 동영상만 표시
- `'all'`: 모두 표시

---

## 📄 페이지네이션 기능

### 1. **페이지 설정**

```typescript
const itemsPerPage = viewMode === 'grid' ? 20 : 10
const totalPages = Math.max(1, Math.ceil(filteredFiles.length / itemsPerPage))
```

#### 페이지당 항목 수
- **그리드 뷰**: 20개
- **리스트 뷰**: 10개

### 2. **페이지네이션 UI**

#### 기능
- **이전/다음 버튼**: ChevronLeft/Right 아이콘
- **페이지 번호**: 최대 5개 표시
  - 총 페이지 ≤ 5: 모두 표시
  - 현재 페이지 앞쪽: 처음 5개
  - 현재 페이지 뒤쪽: 마지막 5개
  - 중간: 현재 페이지 중심으로 5개
- **현재 페이지 하이라이트**: 파란색 배경
- **비활성화 상태**: 첫/마지막 페이지에서 버튼 비활성화

### 3. **자동 페이지 리셋**

```typescript
useEffect(() => {
  setCurrentPage(1)
}, [searchTerm, selectedCategory, type, viewMode])
```

- 필터나 검색어 변경 시 자동으로 첫 페이지로 이동

---

## 🎯 추가 기능

### 1. **정렬 기능**

```typescript
return files.sort((a, b) => {
  const dateA = typeof a.uploadedAt === 'string' ? new Date(a.uploadedAt).getTime() : a.uploadedAt.getTime()
  const dateB = typeof b.uploadedAt === 'string' ? new Date(b.uploadedAt).getTime() : b.uploadedAt.getTime()
  return dateB - dateA
})
```

- **기본 정렬**: 업로드 날짜 기준 **최신순**
- Date 객체와 ISO 문자열 모두 지원

### 2. **파일 크기 포맷팅**

```typescript
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
```

- 바이트를 읽기 쉬운 형식으로 변환
- 예: `1048576` → `1 MB`

### 3. **Sticky Header/Footer**

```typescript
className="sticky top-0 bg-white z-10"  // Header
className="sticky bottom-0 bg-white z-10"  // Footer
```

- 스크롤 시에도 Header와 Footer가 항상 보임
- 필터도 sticky로 설정되어 항상 접근 가능

### 4. **반응형 디자인**

- **모달 크기**: `max-w-[98vw] max-h-[98vh]`
- **그리드 컬럼**: 화면 크기에 따라 자동 조정
- **패딩/간격**: 모바일과 데스크톱에 최적화

---

## 🚀 성능 최적화

### 1. **메모이제이션**

```typescript
const filteredFiles = useMemo(() => { ... }, [mediaFiles, type, selectedCategory, searchTerm])
const paginatedFiles = useMemo(() => { ... }, [filteredFiles, currentPage, itemsPerPage])
```

- 필터링과 페이지네이션 결과를 메모이제이션
- 불필요한 재계산 방지

### 2. **지연 로딩**

- IndexedDB에서 파일을 필요할 때만 로드
- 복원된 URL을 상태로 관리하여 즉시 표시

### 3. **에러 복구**

- 이미지/동영상 로딩 실패 시 자동으로 플레이스홀더 표시
- URL이 없을 때 사용자에게 명확한 에러 메시지

---

## 📝 요약

### 이미지 기능
✅ WebP 최적화 지원  
✅ 자동 에러 처리 및 플레이스홀더  
✅ IndexedDB 자동 복원  
✅ 반응형 크기 조정  

### 동영상 기능
✅ 자동 썸네일 생성 (0.1초 지점)  
✅ 오버레이로 동영상 표시  
✅ 에러 처리  

### 인터랙션
✅ 호버 효과 (테두리, 그림자, 체크 아이콘)  
✅ 클릭 선택  
✅ URL 우선순위 처리  

### 필터링
✅ 실시간 검색 (파일명, 태그, 설명, 상품명)  
✅ 카테고리 필터  
✅ 타입 필터 (image/video/all)  

### 뷰 모드
✅ 그리드 뷰 (썸네일 중심)  
✅ 리스트 뷰 (상세 정보)  
✅ 뷰 모드 전환 버튼  

### 페이지네이션
✅ 페이지당 항목 수 조정  
✅ 스마트 페이지 번호 표시  
✅ 자동 페이지 리셋  

### 성능
✅ 메모이제이션  
✅ 지연 로딩  
✅ 에러 복구  

---

**이 기능들을 통해 사용자는 효율적으로 미디어 파일을 검색하고 선택할 수 있습니다!**

