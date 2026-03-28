# 홈페이지 이미지/동영상 관리 영역 전체 분석

## 📋 개요
홈페이지에서 관리자가 이미지와 동영상을 수정/변경할 수 있는 모든 영역을 정리한 문서입니다.

---

## 🏠 홈페이지 구조 및 관리 영역

### 1. **Hero Section (메인 배너 슬라이드)**
**위치**: `app/page.tsx` (라인 883-1036)
**관리 페이지**: `app/admin/content/page.tsx` → Hero Slides 섹션
**관리 컴포넌트**: `app/admin/content/components/HeroSlideManager.tsx`

#### 관리 가능한 요소:
- ✅ **이미지/동영상**: `src` (이미지 URL 또는 동영상 URL)
- ✅ **Fallback 이미지**: `fallbackImage` (동영상 로딩 실패 시 표시)
- ✅ **제목**: `title`
- ✅ **부제목**: `subtitle`
- ✅ **색상 테마**: `color` (pink, blue, yellow, purple, green)
- ✅ **링크 URL**: `linkUrl`
- ✅ **이벤트 배너 여부**: `isEventBanner`
- ✅ **이벤트 기간**: `eventStartDate`, `eventEndDate`
- ✅ **순서**: `order` (드래그 앤 드롭)
- ✅ **활성화 여부**: `isActive`

#### Hero Slider 설정:
- ✅ **애니메이션 효과**: `effect` (fade, cube, coverflow, flip)
- ✅ **전환 속도**: `speed` (ms)
- ✅ **자동 재생 지연**: `autoplayDelay` (ms)
- ✅ **루프 여부**: `loop`

---

### 2. **Shop by Category Section (카테고리 섹션)**
**위치**: `app/page.tsx` (라인 1040-1150)
**관리 페이지**: `app/admin/content/page.tsx` → Shop by Category 섹션
**관리 컴포넌트**: `app/admin/content/components/CategoryManager.tsx`

#### 관리 가능한 요소:
- ✅ **배경 이미지**: `backgroundImage` (카테고리 카드 배경)
- ✅ **이모지**: `emoji` (카테고리 아이콘)
- ✅ **제목**: `title`
- ✅ **설명**: `description`
- ✅ **그래디언트 색상**: `gradientFrom`, `gradientTo` (배경 이미지 없을 때)
- ✅ **링크 URL**: `linkUrl`
- ✅ **태그**: `tags` (배열)
- ✅ **카테고리 타입**: `categoryType` (stickers, stamps, phone-cases, hot-goods, etc.)
- ✅ **순서**: `order` (드래그 앤 드롭)
- ✅ **활성화 여부**: `isActive`

#### 특수 카테고리:
- **SELPIC N**: 특별한 배경 이미지 처리 (`SELPICNBackgroundImage` 컴포넌트)

---

### 3. **Category Hero Slides (카테고리 페이지 배경)**
**위치**: 각 카테고리 페이지 (`app/stickers/page.tsx`, `app/stamp/page.tsx`, `app/phone-cases/page.tsx`, `app/hot-goods/page.tsx`)
**컴포넌트**: `components/SlidingBackground.tsx`
**관리 페이지**: `app/admin/content/page.tsx` → Category Backgrounds 섹션
**관리 컴포넌트**: `app/admin/content/components/CategoryHeroSlideManager.tsx`

#### 관리 가능한 요소 (카테고리별):
- ✅ **이미지/동영상**: `src` (슬라이딩 배경)
- ✅ **Fallback 이미지**: `fallbackImage`
- ✅ **제목**: `title` (선택사항)
- ✅ **부제목**: `subtitle` (선택사항)
- ✅ **애니메이션 속도**: `speed` (1-10)
- ✅ **슬라이딩 방향**: `direction` (left, right, up, down)
- ✅ **애니메이션 효과**: `effect` (slide, fade, zoom, rotate, blend)
- ✅ **투명도**: `opacity` (0-1)
- ✅ **반응형 설정**: `responsive` (mobile, tablet, desktop)
  - 모바일: `speed`, `opacity`, `pauseVideoOnMobile`
  - 태블릿: `speed`, `opacity`
  - 데스크톱: `speed`, `opacity`
- ✅ **순서**: `order` (드래그 앤 드롭)
- ✅ **활성화 여부**: `isActive`

#### 지원 카테고리:
- Stickers (`stickers`)
- Stamps (`stamps`)
- Phone Cases (`phone-cases`)
- Market S (`hot-goods`)

---

### 4. **Subcategory Items (서브카테고리 카드)**
**위치**: 각 카테고리 페이지 (`app/stickers/page.tsx`, `app/stamp/page.tsx`, etc.)
**관리 페이지**: `app/admin/content/page.tsx` → Subcategories 섹션
**관리 컴포넌트**: `app/admin/content/components/SubcategoryManager.tsx`

#### 관리 가능한 요소:
- ✅ **이미지**: `imageUrl` (서브카테고리 카드 이미지)
- ✅ **이모지**: `emoji` (이미지 대체용)
- ✅ **제목**: `title`
- ✅ **설명**: `description`
- ✅ **링크 URL**: `linkUrl`
- ✅ **페이지 제목**: `pageTitle`
- ✅ **페이지 부제목**: `pageSubtitle`
- ✅ **카테고리**: `category` (stickers, stamps, phone-cases, hot-goods)
- ✅ **순서**: `order` (드래그 앤 드롭)
- ✅ **활성화 여부**: `isActive`

---

### 5. **Header Logo (로고 이미지)**
**위치**: `components/Header.tsx`
**관리 페이지**: `app/admin/content/page.tsx` → Header 섹션 → Logo Image Management

#### 관리 가능한 요소:
- ✅ **로고 이미지 URL**: `mediaUrl`
- ✅ **로고 링크 URL**: `linkUrl` (클릭 시 이동)
- ✅ **활성화 여부**: `isActive`

---

### 6. **Product Images (상품 이미지)**
**위치**: 
- 상품 목록: `components/ProductCard.tsx`
- 상품 상세: `app/products/[id]/page.tsx` → `components/ProductGallery.tsx`
**관리 페이지**: `app/admin/images/page.tsx`

#### 관리 가능한 요소:
- ✅ **상품 이미지 업로드**: Image Management에서 업로드
- ✅ **상품 연결**: "Link to Product" 기능으로 상품에 이미지 연결
- ✅ **카테고리 분류**: Stickers, Stamps, Phone Cases, Market S, General
- ✅ **태그**: `tags` (배열)
- ✅ **설명**: `description`
- ✅ **순서**: `order` (드래그 앤 드롭)
- ✅ **WebP 최적화**: 자동 WebP 변환 및 저장

#### 상품 상세 페이지 갤러리:
- ✅ **이미지 갤러리**: `ProductGallery` 컴포넌트
- ✅ **자동 복구**: 이미지 로딩 실패 시 IndexedDB에서 자동 복원
- ✅ **WebP 우선 사용**: WebP 이미지 우선 표시

---

### 7. **Content Items (일반 콘텐츠)**
**위치**: 홈페이지 각 섹션
**관리 페이지**: `app/admin/content/page.tsx` → 각 섹션별 관리
**관리 컴포넌트**: `app/admin/content/components/ContentModal.tsx`

#### 관리 가능한 섹션:
- ✅ **Header**: 헤더 콘텐츠
- ✅ **Hero**: 히어로 섹션 텍스트
- ✅ **How It Works**: 작동 방식 설명
- ✅ **Footer**: 푸터 콘텐츠
- ✅ **기타 섹션**: 커스텀 섹션

#### 관리 가능한 요소:
- ✅ **이미지/동영상**: `mediaUrl` (이미지 또는 동영상 URL)
- ✅ **텍스트 콘텐츠**: `content`
- ✅ **제목**: `title`
- ✅ **링크 URL**: `linkUrl`
- ✅ **순서**: `order`
- ✅ **활성화 여부**: `isActive`

---

## 📂 관리 페이지 구조

### **메인 관리 페이지**: `app/admin/content/page.tsx`

#### 섹션별 관리 영역:

1. **Hero Slides** (라인 860-896)
   - HeroSlideManager 컴포넌트
   - 슬라이드 추가/수정/삭제
   - 템플릿 저장/불러오기

2. **Category Backgrounds** (라인 1022-1113)
   - CategoryHeroSlideManager 컴포넌트
   - 카테고리별 배경 슬라이드 관리
   - Stickers, Stamps, Phone Cases, Market S 각각 관리

3. **Shop by Category** (라인 898-1020)
   - CategoryManager 컴포넌트
   - 카테고리 카드 관리

4. **Subcategories** (라인 1115-1200)
   - SubcategoryManager 컴포넌트
   - 서브카테고리 카드 관리

5. **Header Logo** (라인 1772-1910)
   - 로고 이미지 업로드 및 관리

6. **Content Items** (라인 1200-1770)
   - ContentModal 컴포넌트
   - 각 섹션별 콘텐츠 관리

---

## 🖼️ 이미지/동영상 관리 시스템

### **Image Management**: `app/admin/images/page.tsx`

#### 주요 기능:
- ✅ **파일 업로드**: 이미지/동영상 업로드
- ✅ **카테고리 분류**: 5개 카테고리 (Stickers, Stamps, Phone Cases, Market S, General)
- ✅ **상품 연결**: "Link to Product" 기능
- ✅ **Bulk Actions**: 일괄 카테고리 변경, 상품 연결, 삭제
- ✅ **WebP 최적화**: 자동 WebP 변환 및 저장
- ✅ **IndexedDB 저장**: 대용량 파일 IndexedDB 저장
- ✅ **드래그 앤 드롭**: 순서 변경
- ✅ **검색 및 필터**: 파일명, 태그, 설명, 상품명으로 검색

#### 저장 위치:
- **메타데이터**: localStorage (`media-store`)
- **파일 데이터**: IndexedDB (`selpic-media-db`)

---

## 🔄 데이터 흐름

### 1. **Hero Slides**
```
관리자 수정 (HeroSlideManager)
  ↓
contentStore (localStorage)
  ↓
홈페이지 (app/page.tsx) - heroSlides 사용
```

### 2. **Category Items**
```
관리자 수정 (CategoryManager)
  ↓
contentStore (localStorage)
  ↓
홈페이지 (app/page.tsx) - categoryItems 사용
```

### 3. **Category Hero Slides**
```
관리자 수정 (CategoryHeroSlideManager)
  ↓
contentStore (localStorage)
  ↓
카테고리 페이지 (app/stickers/page.tsx, etc.) - SlidingBackground 컴포넌트
```

### 4. **Product Images**
```
관리자 업로드 (Image Management)
  ↓
mediaStore (localStorage + IndexedDB)
  ↓
상품 상세 페이지 (app/products/[id]/page.tsx) - ProductGallery 컴포넌트
```

---

## 📝 관리 가능한 미디어 타입

### **이미지 (Image)**
- ✅ JPG, PNG, GIF, WebP
- ✅ 자동 WebP 변환
- ✅ IndexedDB 저장
- ✅ Blob URL 생성

### **동영상 (Video)**
- ✅ MP4, WebM, OGV
- ✅ IndexedDB 저장
- ✅ Blob URL 생성
- ✅ Fallback 이미지 지원

---

## 🎯 관리 페이지 접근 경로

1. **Content Management**: `/admin/content`
   - Hero Slides
   - Category Backgrounds
   - Shop by Category
   - Subcategories
   - Header Logo
   - Content Items

2. **Image Management**: `/admin/images`
   - 이미지/동영상 업로드
   - 상품 연결
   - 카테고리 분류
   - Bulk Actions

---

## 🔍 주요 컴포넌트 위치

### **관리 컴포넌트**:
- `app/admin/content/components/HeroSlideManager.tsx`
- `app/admin/content/components/CategoryHeroSlideManager.tsx`
- `app/admin/content/components/CategoryManager.tsx`
- `app/admin/content/components/SubcategoryManager.tsx`
- `app/admin/content/components/ContentModal.tsx`
- `app/admin/images/page.tsx`

### **표시 컴포넌트**:
- `app/page.tsx` (홈페이지)
- `components/SlidingBackground.tsx` (카테고리 배경)
- `components/ProductGallery.tsx` (상품 갤러리)
- `components/Header.tsx` (헤더 로고)
- `components/ProductCard.tsx` (상품 카드)

---

## 📊 데이터 저장 구조

### **contentStore** (localStorage):
- Hero Slides
- Category Hero Slides
- Category Items
- Subcategory Items
- Content Items
- Sidebar Menu Items

### **mediaStore** (localStorage + IndexedDB):
- Media Files (이미지/동영상 메타데이터)
- IndexedDB (실제 파일 데이터)

---

## ✅ 요약

### **관리자가 수정 가능한 이미지/동영상 영역**:

1. ✅ **Hero Section 배너** (이미지/동영상)
2. ✅ **카테고리 카드 배경** (이미지)
3. ✅ **카테고리 페이지 슬라이딩 배경** (이미지/동영상)
4. ✅ **서브카테고리 카드 이미지** (이미지)
5. ✅ **헤더 로고** (이미지)
6. ✅ **상품 이미지** (이미지/동영상)
7. ✅ **일반 콘텐츠 이미지/동영상** (각 섹션별)

### **관리 페이지**:
- `/admin/content` - 콘텐츠 관리
- `/admin/images` - 이미지/동영상 관리

### **주요 기능**:
- ✅ 드래그 앤 드롭 순서 변경
- ✅ 활성화/비활성화 토글
- ✅ 실시간 미리보기
- ✅ WebP 자동 최적화
- ✅ IndexedDB 저장 (대용량 파일)
- ✅ 상품 연결 기능
- ✅ Bulk Actions

---

**작성일**: 2024년
**버전**: 1.0

