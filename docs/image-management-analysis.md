# Image Management 섹션 상세 분석

## 📋 개요

**페이지 경로**: `app/admin/images/page.tsx`  
**헤더**: "Image Management" - "Manage product images and gallery"  
**목적**: 상품 이미지와 동영상 파일을 카테고리별로 관리하고, 상품에 연결하는 기능 제공

---

## 🏗️ 페이지 구조

### 1. 헤더 섹션
```tsx
<AdminPageHeader
  title="Image Management"
  icon={<ImageIcon className="w-6 h-6" />}
  showBackButton={true}
  backUrl="/admin/dashboard"
  backLabel="Dashboard"
/>
```

**설명 섹션**:
- 제목: "Product Media Management"
- 설명: "Manage images and videos by product category. Organize media files and link them to specific products for efficient workflow."

---

## ✅ 정상 작동하는 기능들

### 1. **카테고리 탭 시스템**
**위치**: 라인 794-830
- **기능**: 5개 카테고리 탭 (Stickers, Stamps, Phone Cases, HOT GOODS, General)
- **상태**: ✅ 정상 작동
- **특징**:
  - 각 카테고리별 파일 개수 표시
  - 활성 카테고리 하이라이트
  - 카테고리 변경 시 상품 필터 초기화

### 2. **검색 기능**
**위치**: 라인 836-846
- **기능**: 파일명, 태그, 설명, 상품명으로 검색
- **상태**: ✅ 정상 작동
- **검색 범위**:
  ```typescript
  file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
  (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
  (file.productName && file.productName.toLowerCase().includes(searchTerm.toLowerCase()))
  ```

### 3. **상품 필터링**
**위치**: 라인 848-861
- **기능**: 카테고리 내 특정 상품으로 필터링
- **상태**: ✅ 정상 작동
- **특징**: 카테고리별 상품 목록 동적 생성

### 4. **뷰 모드 전환 (Grid/List)**
**위치**: 라인 866-879
- **기능**: 그리드 뷰와 리스트 뷰 전환
- **상태**: ✅ 정상 작동
- **특징**: 사용자 선호도에 따라 선택 가능

### 5. **파일 업로드 (EditStage 통합)**
**위치**: 라인 307-367, 370-603
- **기능**: 
  - 드래그 앤 드롭 업로드
  - 파일 선택 업로드
  - EditStage 모달을 통한 메타데이터 편집
- **상태**: ✅ 정상 작동
- **프로세스**:
  1. 파일 선택/드롭
  2. 파일 유효성 검사 (형식, 크기)
  3. EditStage 모달 열기
  4. 메타데이터 입력 (이름, 카테고리, 태그, 설명)
  5. WebP 변환 (이미지)
  6. IndexedDB 저장
  7. Zustand store 업데이트

### 6. **파일 삭제**
**위치**: 라인 649-659
- **기능**: 개별 파일 삭제
- **상태**: ✅ 정상 작동
- **특징**: 확인 다이얼로그 포함

### 7. **파일 다운로드**
**위치**: 라인 662-668
- **기능**: 파일 다운로드
- **상태**: ✅ 정상 작동
- **URL 우선순위**: `file.dataUrl || file.url`

### 8. **상품 연결/해제**
**위치**: 라인 671-683
- **기능**: 
  - 파일을 상품에 연결 (`handleLinkToProduct`)
  - 연결 해제 (`handleUnlinkFromProduct`)
- **상태**: ✅ 정상 작동

### 9. **파일 정렬**
**위치**: 라인 686-729
- **기능**: 날짜, 이름, 크기로 정렬
- **상태**: ✅ 정상 작동
- **정렬 옵션**:
  - `date`: 최신순 (기본값)
  - `name`: 이름순
  - `size`: 크기순
- **특징**: 드래그 앤 드롭 순서(`order`) 우선 적용

### 10. **페이지네이션**
**위치**: 라인 732-737, 1161-1217
- **기능**: 파일 목록 페이지 분할
- **상태**: ✅ 정상 작동
- **옵션**: 12, 24, 48, 96개/페이지

### 11. **드래그 앤 드롭 재정렬**
**위치**: 라인 754-773
- **기능**: 파일 순서 변경
- **상태**: ✅ 정상 작동
- **라이브러리**: `@dnd-kit/core`, `@dnd-kit/sortable`

### 12. **미리보기 모달**
**위치**: 라인 1263-1447
- **기능**: 파일 미리보기 (이미지/동영상)
- **상태**: ✅ 정상 작동
- **특징**:
  - WebP Optimization 정보 표시
  - 파일 정보 표시
  - 다운로드/연결 버튼

### 13. **Orphaned Files 관리**
**위치**: 라인 268-272, 904-916, 1222-1261
- **기능**: 상품에 연결되지 않은 파일 표시 및 일괄 삭제
- **상태**: ✅ 정상 작동
- **특징**: 연결되지 않은 파일 자동 감지

### 14. **IndexedDB 복원**
**위치**: 라인 168-261
- **기능**: 페이지 로드 시 IndexedDB에서 파일 URL 복원
- **상태**: ✅ 정상 작동
- **특징**: 
  - Blob URL 무효화 대응
  - 무한 루프 방지 메커니즘
  - 복원 중 로딩 표시

### 15. **WebP 최적화**
**위치**: `lib/mediaStore.ts` (convertToWebP)
- **기능**: 이미지 자동 WebP 변환
- **상태**: ✅ 정상 작동
- **특징**:
  - 진행률 표시
  - 원본과 WebP 모두 저장
  - 크기 감소 정보 표시

---

## ❌ 오류 발생 기능들

### 1. **Bulk Action 핸들러 누락** ⚠️ **심각한 오류**

**위치**: 라인 1721, 1740, 1772
- **문제**: 
  - `handleBulkCategoryChange` 함수가 정의되지 않음
  - `handleBulkProductLink` 함수가 정의되지 않음
  - `handleBulkDelete` 함수가 정의되지 않음
- **영향**: 
  - Bulk Action 모달이 열리지만 기능이 작동하지 않음
  - 콘솔에 `ReferenceError` 발생
- **증상**:
  - 여러 파일 선택 후 Bulk Action 실행 시 오류
  - 카테고리 변경, 상품 연결, 일괄 삭제 불가

**코드 위치**:
```tsx
// 라인 1721 - 정의되지 않은 함수 호출
onChange={(e) => handleBulkCategoryChange(e.target.value)}

// 라인 1740 - 정의되지 않은 함수 호출
onChange={(e) => handleBulkProductLink(e.target.value)}

// 라인 1772 - 정의되지 않은 함수 호출
onClick={handleBulkDelete}
```

### 2. **Bulk Action 모달 트리거 누락** ⚠️

**위치**: 전체 파일 검색 결과
- **문제**: Bulk Action 모달을 여는 버튼/트리거가 보이지 않음
- **영향**: 사용자가 Bulk Action 기능에 접근할 수 없음
- **가능성**: 
  - UI에서 제거되었거나
  - 다른 위치에 숨겨져 있거나
  - 구현되지 않았을 수 있음

### 3. **파일 다운로드 URL 문제** ⚠️

**위치**: 라인 662-668
- **문제**: 
  - `dataUrl`이 없고 `url`이 blob URL인 경우, 페이지 새로고침 후 다운로드 실패 가능
  - IndexedDB에서 복원되지 않은 파일은 다운로드 불가
- **영향**: 일부 파일 다운로드 실패

**현재 코드**:
```typescript
const handleDownloadFile = (file: MediaFile) => {
  const link = document.createElement('a')
  link.href = file.dataUrl || file.url  // blob URL이 무효화될 수 있음
  link.download = file.name
  link.click()
}
```

### 4. **SortableFileItem의 이미지 표시 문제** ⚠️

**위치**: `components/SortableFileItem.tsx` 라인 88
- **문제**: 
  - `file.dataUrl || file.url`만 사용
  - `webpUrl`이 우선순위에 없음
  - IndexedDB 복원 URL이 반영되지 않음
- **영향**: 
  - WebP 이미지가 표시되지 않을 수 있음
  - 페이지 새로고침 후 이미지가 사라질 수 있음

---

## 🔍 상세 기능 분석

### 파일 업로드 프로세스

1. **파일 선택/드롭** (라인 307-367)
   - ✅ 정상 작동
   - 파일 유효성 검사 (형식, 크기)
   - 최대 크기: 100MB

2. **EditStage 모달** (라인 370-603)
   - ✅ 정상 작동
   - 메타데이터 입력
   - WebP 변환 진행률 표시

3. **IndexedDB 저장** (`lib/mediaStore.ts`)
   - ✅ 정상 작동
   - 원본 파일 저장
   - WebP 파일 저장 (이미지인 경우)

4. **Zustand Store 업데이트**
   - ✅ 정상 작동
   - localStorage 자동 동기화

### 필터링 및 검색 로직

**위치**: 라인 686-729
- **필터 조건**:
  1. 카테고리 일치
  2. 검색어 일치 (파일명, 태그, 설명, 상품명)
  3. 상품 ID 일치 (선택된 경우)
- **정렬 우선순위**:
  1. `order` 필드 (드래그 앤 드롭 순서)
  2. 선택된 정렬 옵션 (date/name/size)

### 상품 연결 모달

**위치**: 라인 1449-1620
- **기능**: 
  - 상품 검색
  - 상품 목록 표시
  - 연결 상태 표시
- **상태**: ✅ 정상 작동
- **특징**: 
  - 상품 이미지 표시
  - 재고 상태 표시
  - 가격 정보 표시

---

## 🐛 발견된 오류 요약

### 심각도: 높음

1. **Bulk Action 핸들러 누락**
   - `handleBulkCategoryChange` 미정의
   - `handleBulkProductLink` 미정의
   - `handleBulkDelete` 미정의
   - **해결 필요**: 함수 구현 필요

### 심각도: 중간

2. **Bulk Action UI 트리거 누락**
   - 모달을 여는 버튼이 보이지 않음
   - **해결 필요**: UI에 버튼 추가 필요

3. **파일 다운로드 URL 처리**
   - Blob URL 무효화 대응 부족
   - **해결 필요**: IndexedDB에서 복원 후 다운로드

4. **SortableFileItem 이미지 표시**
   - WebP URL 우선순위 누락
   - IndexedDB 복원 URL 미반영
   - **해결 필요**: URL 우선순위 수정

---

## 📊 기능 작동 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| 카테고리 탭 | ✅ 정상 | 5개 카테고리 지원 |
| 검색 | ✅ 정상 | 파일명, 태그, 설명, 상품명 |
| 상품 필터 | ✅ 정상 | 카테고리별 상품 필터링 |
| 뷰 모드 | ✅ 정상 | Grid/List 전환 |
| 파일 업로드 | ✅ 정상 | 드래그 앤 드롭, EditStage |
| 파일 삭제 | ✅ 정상 | 개별 삭제 |
| 파일 다운로드 | ⚠️ 부분 | Blob URL 무효화 시 실패 가능 |
| 상품 연결 | ✅ 정상 | 연결/해제 기능 |
| 파일 정렬 | ✅ 정상 | 날짜/이름/크기 |
| 페이지네이션 | ✅ 정상 | 12/24/48/96개 옵션 |
| 드래그 앤 드롭 | ✅ 정상 | 순서 변경 |
| 미리보기 | ✅ 정상 | 이미지/동영상 |
| Orphaned Files | ✅ 정상 | 미연결 파일 관리 |
| IndexedDB 복원 | ✅ 정상 | 자동 복원 |
| WebP 최적화 | ✅ 정상 | 자동 변환 |
| Bulk Actions | ❌ 오류 | 핸들러 미정의 |

---

## 🔧 수정 권장 사항

### 1. Bulk Action 핸들러 구현 (우선순위: 높음)

```typescript
// 추가 필요
const handleBulkCategoryChange = (newCategory: string) => {
  selectedFiles.forEach(fileId => {
    updateMediaFile(fileId, { category: newCategory })
  })
  setSelectedFiles(new Set())
  setIsBulkActionModalOpen(false)
  setBulkAction(null)
  showNotification('success', `Moved ${selectedFiles.size} file(s) to ${newCategory}`)
}

const handleBulkProductLink = (productId: string) => {
  if (!productId) return
  const product = categoryProducts.find(p => p.id === productId)
  selectedFiles.forEach(fileId => {
    updateMediaFile(fileId, { productId, productName: product?.name })
  })
  setSelectedFiles(new Set())
  setIsBulkActionModalOpen(false)
  setBulkAction(null)
  showNotification('success', `Linked ${selectedFiles.size} file(s) to ${product?.name}`)
}

const handleBulkDelete = () => {
  selectedFiles.forEach(fileId => {
    deleteMediaFileFromStore(fileId)
  })
  setSelectedFiles(new Set())
  setIsBulkActionModalOpen(false)
  setBulkAction(null)
  showNotification('success', `Deleted ${selectedFiles.size} file(s)`)
}
```

### 2. Bulk Action UI 추가 (우선순위: 중간)

파일 목록 상단에 Bulk Action 버튼 추가 필요

### 3. 파일 다운로드 개선 (우선순위: 중간)

IndexedDB에서 파일 복원 후 다운로드하도록 수정

### 4. SortableFileItem 이미지 표시 개선 (우선순위: 중간)

WebP URL과 복원된 URL을 우선순위에 추가

---

## 📝 결론

**정상 작동 기능**: 14개  
**오류 발생 기능**: 4개 (Bulk Actions 관련 3개, 다운로드/표시 관련 1개)

**주요 문제**: Bulk Action 기능이 완전히 구현되지 않아 일괄 작업이 불가능함

