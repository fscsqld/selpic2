# 대시보드 Product & Content Management 이미지/동영상 관리 기능 전체 정리

## 📋 개요
대시보드의 Product Management와 Content Management에서 이미지/동영상을 수정/변경할 수 있는 모든 기능을 정리한 문서입니다.

---

## 🛍️ Product Management (`/admin/products`)

### **1. 상품 이미지 업로드 및 변경**

#### **위치**: `app/admin/products/page.tsx`
#### **컴포넌트**: `ProductImageUpload` (`components/ProductImageUpload.tsx`)

#### **기능**:
- ✅ **드래그 앤 드롭 업로드**: 이미지를 드래그하여 업로드 영역에 드롭
- ✅ **파일 선택 업로드**: "Select Image" 버튼 클릭하여 파일 선택
- ✅ **Media Library에서 선택**: "Media Library" 버튼으로 기존 이미지 선택
- ✅ **URL 직접 입력**: 이미지 URL을 직접 입력하여 설정
- ✅ **이미지 제거**: X 버튼으로 현재 이미지 제거
- ✅ **이미지 미리보기**: 업로드된 이미지 실시간 미리보기

#### **지원 형식**:
- 이미지: PNG, JPG, GIF, WebP
- 최대 크기: 5MB

#### **사용 위치**:
- 상품 추가 모달
- 상품 수정 모달
- 상품 목록 (이미지 표시)

#### **코드 위치**:
```typescript
// app/admin/products/page.tsx (라인 1274-1278)
<ProductImageUpload
  currentImage={formData.image}
  onImageChange={(imageUrl) => setFormData(prev => ({ ...prev, image: imageUrl }))}
/>
```

---

## 📝 Content Management (`/admin/content`)

### **1. Hero Slides (메인 배너 슬라이드)**

#### **위치**: `app/admin/content/page.tsx` → Hero Slides 섹션
#### **컴포넌트**: `HeroSlideManager` (`app/admin/content/components/HeroSlideManager.tsx`)

#### **이미지/동영상 관리 기능**:

##### **A. 슬라이드 추가/수정**:
- ✅ **미디어 타입 선택**: Image 또는 Video 선택
- ✅ **이미지 업로드**: `MediaUpload` 컴포넌트 사용
  - 드래그 앤 드롭
  - 파일 선택
  - Media Library에서 선택
  - URL 직접 입력
- ✅ **동영상 업로드**: `MediaUpload` 컴포넌트 사용
  - 동일한 업로드 방식 지원
- ✅ **Fallback 이미지**: 동영상의 경우 Fallback 이미지 설정 필수
- ✅ **실시간 미리보기**: 슬라이드 미리보기 모달

##### **B. 슬라이드 관리**:
- ✅ **드래그 앤 드롭 순서 변경**: GripVertical 아이콘으로 순서 변경
- ✅ **활성화/비활성화**: Eye/EyeOff 아이콘으로 토글
- ✅ **편집**: Edit 버튼으로 수정
- ✅ **삭제**: Trash2 버튼으로 삭제
- ✅ **미리보기**: Monitor 아이콘으로 미리보기

##### **C. 템플릿 기능**:
- ✅ **템플릿 저장**: 슬라이드를 템플릿으로 저장
- ✅ **템플릿 불러오기**: 저장된 템플릿으로 슬라이드 생성

#### **코드 위치**:
```typescript
// app/admin/content/components/HeroSlideManager.tsx (라인 810-833)
<MediaUpload
  type={formData.type}
  currentUrl={formData.src}
  onUpload={(file: File, url: string) => {
    setFormData(prev => ({ ...prev, src: url }))
  }}
  onRemove={() => setFormData(prev => ({ ...prev, src: '' }))}
/>

// Fallback 이미지 (라인 874-880)
<MediaUpload
  type="image"
  currentUrl={formData.fallbackImage}
  onUpload={(file, url) => {
    setFormData(prev => ({ ...prev, fallbackImage: url }))
  }}
  onRemove={() => setFormData(prev => ({ ...prev, fallbackImage: '' }))}
/>
```

---

### **2. Category Hero Slides (카테고리 페이지 배경)**

#### **위치**: `app/admin/content/page.tsx` → Category Backgrounds 섹션
#### **컴포넌트**: `CategoryHeroSlideManager` (`app/admin/content/components/CategoryHeroSlideManager.tsx`)

#### **이미지/동영상 관리 기능**:

##### **A. 슬라이드 추가/수정**:
- ✅ **미디어 타입 선택**: Image 또는 Video 라디오 버튼
- ✅ **이미지/동영상 업로드**: `MediaUpload` 컴포넌트
  - 드래그 앤 드롭
  - 파일 선택
  - Media Library에서 선택
  - URL 직접 입력
- ✅ **Fallback 이미지**: 동영상의 경우 Fallback 이미지 설정
- ✅ **애니메이션 설정**: 
  - Speed (1-10)
  - Direction (left, right, up, down)
  - Effect (slide, fade, zoom, rotate, blend)
  - Opacity (0-1)
- ✅ **반응형 설정**: Mobile, Tablet, Desktop별 설정

##### **B. 슬라이드 관리**:
- ✅ **드래그 앤 드롭 순서 변경**
- ✅ **활성화/비활성화 토글**
- ✅ **편집**
- ✅ **삭제**

#### **지원 카테고리**:
- Stickers
- Stamps
- Phone Cases
- Market S (Hot Goods)

#### **코드 위치**:
```typescript
// app/admin/content/components/CategoryHeroSlideManager.tsx (라인 410-430)
<MediaUpload
  type={formData.type}
  currentUrl={formData.src}
  onUpload={(file: File, url: string) => {
    setFormData(prev => ({ ...prev, src: url }))
  }}
  onRemove={() => setFormData(prev => ({ ...prev, src: '' }))}
/>

// Fallback 이미지 (라인 456-465)
<MediaUpload
  type="image"
  currentUrl={formData.fallbackImage}
  onUpload={(file: File, url: string) => {
    setFormData(prev => ({ ...prev, fallbackImage: url }))
  }}
  onRemove={() => setFormData(prev => ({ ...prev, fallbackImage: '' }))}
/>
```

---

### **3. Category Items (Shop by Category)**

#### **위치**: `app/admin/content/page.tsx` → Shop by Category 섹션
#### **컴포넌트**: `CategoryManager` (`app/admin/content/components/CategoryManager.tsx`)

#### **이미지 관리 기능**:

##### **A. 카테고리 추가/수정**:
- ✅ **배경 이미지 업로드**: `MediaUpload` 컴포넌트
  - 드래그 앤 드롭
  - 파일 선택
  - Media Library에서 선택
  - URL 직접 입력
- ✅ **이모지 선택**: 이모지로 아이콘 설정 (이미지 대체)
- ✅ **그래디언트 색상**: 배경 이미지 없을 때 사용할 그래디언트 설정

##### **B. 카테고리 관리**:
- ✅ **드래그 앤 드롭 순서 변경**
- ✅ **활성화/비활성화 토글**
- ✅ **편집**
- ✅ **삭제**

#### **코드 위치**:
```typescript
// app/admin/content/components/CategoryManager.tsx (라인 376-386)
<MediaUpload
  type="image"
  currentUrl={newCategory.backgroundImage}
  onUpload={(file: File, url: string) => {
    if (url && url.trim()) {
      setNewCategory({ ...newCategory, backgroundImage: url })
    }
  }}
  onRemove={() => setNewCategory({ ...newCategory, backgroundImage: '' })}
/>

// 수정 시 (라인 675-685)
<MediaUpload
  type="image"
  currentUrl={editForm.backgroundImage}
  onUpload={(file: File, url: string) => {
    if (url && url.trim()) {
      setEditForm({ ...editForm, backgroundImage: url })
    }
  }}
  onRemove={() => setEditForm({ ...editForm, backgroundImage: '' })}
/>
```

---

### **4. Subcategory Items (서브카테고리)**

#### **위치**: `app/admin/content/page.tsx` → Subcategories 섹션
#### **컴포넌트**: `SubcategoryManager` (`app/admin/content/components/SubcategoryManager.tsx`)

#### **이미지 관리 기능**:

##### **A. 서브카테고리 추가/수정**:
- ✅ **아이콘 타입 선택**: Emoji 또는 Image 라디오 버튼
- ✅ **이미지 업로드**: Image 선택 시 `MediaUpload` 컴포넌트
  - 드래그 앤 드롭
  - 파일 선택
  - Media Library에서 선택
  - URL 직접 입력
- ✅ **이모지 입력**: Emoji 선택 시 텍스트 입력

##### **B. 서브카테고리 관리**:
- ✅ **드래그 앤 드롭 순서 변경**
- ✅ **활성화/비활성화 토글**
- ✅ **편집**
- ✅ **삭제**

#### **코드 위치**:
```typescript
// app/admin/content/components/SubcategoryManager.tsx (라인 298-307)
<MediaUpload
  type="image"
  currentUrl={newSubcategory.imageUrl}
  onUpload={(file, url) => {
    setNewSubcategory({ ...newSubcategory, imageUrl: url, emoji: '' })
  }}
  onRemove={() => {
    setNewSubcategory({ ...newSubcategory, imageUrl: '' })
  }}
/>

// 수정 시 (라인 513-522)
<MediaUpload
  type="image"
  currentUrl={editForm.imageUrl}
  onUpload={(file, url) => {
    setEditForm({ ...editForm, imageUrl: url, emoji: '' })
  }}
  onRemove={() => {
    setEditForm({ ...editForm, imageUrl: '' })
  }}
/>
```

---

### **5. Content Items (일반 콘텐츠)**

#### **위치**: `app/admin/content/page.tsx` → 각 섹션별 Content Items
#### **컴포넌트**: `ContentModal` (`app/admin/content/components/ContentModal.tsx`)

#### **이미지/동영상 관리 기능**:

##### **A. 콘텐츠 추가/수정**:
- ✅ **콘텐츠 타입 선택**: Text, Image, Video, Link, Button
- ✅ **이미지 업로드**: Image 타입 선택 시 `MediaUpload` 컴포넌트
  - 드래그 앤 드롭
  - 파일 선택
  - Media Library에서 선택
  - URL 직접 입력
- ✅ **동영상 업로드**: Video 타입 선택 시 `MediaUpload` 컴포넌트
  - 동일한 업로드 방식 지원

##### **B. 콘텐츠 관리**:
- ✅ **순서 변경**: Order 필드로 순서 설정
- ✅ **활성화/비활성화 토글**
- ✅ **편집**
- ✅ **삭제**

#### **코드 위치**:
```typescript
// app/admin/content/components/ContentModal.tsx (라인 190-196)
<MediaUpload
  type={formData.type === 'image' ? 'image' : 'video'}
  currentUrl={formData.mediaUrl}
  onUpload={(file, url) => handleInputChange('mediaUrl', url)}
  onRemove={() => handleInputChange('mediaUrl', '')}
  className="w-full"
/>
```

---

### **6. Header Logo (로고 이미지)**

#### **위치**: `app/admin/content/page.tsx` → Header 섹션 → Logo Image Management
#### **컴포넌트**: 직접 구현 (라인 1772-1910)

#### **이미지 관리 기능**:

##### **A. 로고 이미지 관리**:
- ✅ **로고 활성화/비활성화**: 토글 스위치
- ✅ **로고 이미지 업로드**: `MediaUpload` 컴포넌트
  - 드래그 앤 드롭
  - 파일 선택
  - Media Library에서 선택
  - URL 직접 입력
- ✅ **로고 링크 URL**: 클릭 시 이동할 URL 설정
- ✅ **이미지 미리보기**: 업로드된 로고 실시간 미리보기

#### **코드 위치**:
```typescript
// app/admin/content/page.tsx (라인 1840-1858)
<MediaUpload
  type="image"
  currentUrl={contentItems.find(item => item.section === 'header' && item.title === 'Logo Image')?.mediaUrl}
  onUpload={(file, url) => {
    const logoItem = contentItems.find(item => item.section === 'header' && item.title === 'Logo Image')
    if (logoItem) {
      updateContent(logoItem.id, { mediaUrl: url })
      showNotificationToast('success', 'Logo image uploaded successfully')
    }
  }}
  onRemove={() => {
    const logoItem = contentItems.find(item => item.section === 'header' && item.title === 'Logo Image')
    if (logoItem) {
      updateContent(logoItem.id, { mediaUrl: '' })
      showNotificationToast('success', 'Logo image removed')
    }
  }}
/>
```

---

## 🔧 공통 컴포넌트

### **1. MediaUpload 컴포넌트**

#### **위치**: `components/MediaUpload.tsx`

#### **주요 기능**:
- ✅ **드래그 앤 드롭 업로드**
- ✅ **파일 선택 업로드**
- ✅ **Media Library 모달 연동**
- ✅ **이미지/동영상 타입 지원**
- ✅ **파일 크기 검증** (최대 500MB)
- ✅ **파일 타입 검증** (확장자 및 MIME 타입)
- ✅ **IndexedDB 저장**: 업로드된 파일을 IndexedDB에 영구 저장
- ✅ **영구 URL 생성**: `indexeddb://{fileId}` 형식으로 URL 생성
- ✅ **WebP 자동 변환**: 이미지 자동 WebP 변환
- ✅ **업로드 상태 표시**: 성공/에러 메시지 표시
- ✅ **현재 미디어 미리보기**: 이미지/동영상 미리보기
- ✅ **미디어 제거**: Remove 버튼

#### **사용 위치**:
- HeroSlideManager
- CategoryHeroSlideManager
- CategoryManager
- SubcategoryManager
- ContentModal
- Header Logo Management

---

### **2. ProductImageUpload 컴포넌트**

#### **위치**: `components/ProductImageUpload.tsx`

#### **주요 기능**:
- ✅ **드래그 앤 드롭 업로드**
- ✅ **파일 선택 업로드**
- ✅ **Media Library 모달 연동**
- ✅ **URL 직접 입력**
- ✅ **파일 크기 제한**: 5MB
- ✅ **이미지 미리보기**
- ✅ **이미지 제거**

#### **사용 위치**:
- Product Management (상품 추가/수정)

---

### **3. MediaLibraryModal 컴포넌트**

#### **위치**: `components/MediaLibraryModal.tsx`

#### **주요 기능**:
- ✅ **이미지/동영상 목록 표시**
- ✅ **카테고리 필터링**
- ✅ **검색 기능**
- ✅ **그리드/리스트 뷰 전환**
- ✅ **페이지네이션**
- ✅ **IndexedDB에서 파일 복원**
- ✅ **WebP 우선 표시**
- ✅ **파일 선택**: 선택한 파일 URL 반환

#### **사용 위치**:
- MediaUpload 컴포넌트
- ProductImageUpload 컴포넌트

---

## 📊 기능 비교표

| 기능 | Product Management | Content Management |
|------|-------------------|-------------------|
| **이미지 업로드** | ✅ | ✅ |
| **동영상 업로드** | ❌ | ✅ |
| **드래그 앤 드롭** | ✅ | ✅ |
| **Media Library** | ✅ | ✅ |
| **URL 직접 입력** | ✅ | ✅ |
| **Fallback 이미지** | ❌ | ✅ (동영상) |
| **IndexedDB 저장** | ❌ | ✅ |
| **WebP 변환** | ❌ | ✅ |
| **실시간 미리보기** | ✅ | ✅ |
| **순서 변경** | ❌ | ✅ (드래그 앤 드롭) |
| **활성화/비활성화** | ❌ | ✅ |

---

## 🎯 요약

### **Product Management**:
- ✅ 상품 이미지 업로드/변경
- ✅ 드래그 앤 드롭 지원
- ✅ Media Library 연동
- ✅ URL 직접 입력

### **Content Management**:
- ✅ Hero Slides: 이미지/동영상 업로드, Fallback 이미지
- ✅ Category Hero Slides: 이미지/동영상 업로드, 애니메이션 설정, Fallback 이미지
- ✅ Category Items: 배경 이미지 업로드
- ✅ Subcategory Items: 이미지 업로드 (이모지 대체 가능)
- ✅ Content Items: 이미지/동영상 업로드
- ✅ Header Logo: 로고 이미지 업로드

### **공통 기능**:
- ✅ 드래그 앤 드롭 업로드
- ✅ 파일 선택 업로드
- ✅ Media Library에서 선택
- ✅ URL 직접 입력
- ✅ 실시간 미리보기
- ✅ IndexedDB 영구 저장 (Content Management)
- ✅ WebP 자동 변환 (Content Management)

---

**작성일**: 2024년
**버전**: 1.0

