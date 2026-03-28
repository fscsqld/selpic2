# 상품 이미지 링크 문제 분석

## 학습: 사진으로 관련 상품 상세페이지에 링크를 걸려고 하는데 안 되는 이유

**의도:** 관리자가 Image Management에서 "Link to Product"로 사진(미디어 파일)을 특정 상품에 연결하면, 그 사진이 해당 상품 상세 페이지(`/products/[id]`)에 갤러리로 노출되고, 필요 시 사진 클릭으로 상세 페이지로 이동하거나 최소한 상세 페이지에서 보이기를 기대함.

**안 되는 이유 요약:**

1. **갤러리 노출 자체가 안 될 수 있음**
   - 상품 상세 페이지의 갤러리는 `ProductGallery`가 `getMediaFilesByProduct(productId)`로 **같은 productId로 연결된 미디어만** 가져와서 표시함.
   - 링크한 사진이 상세에 안 보이는 경우:
     - **URL 복원 문제:** 미디어가 blob/IndexedDB에만 있으면 새로고침 후 blob URL이 만료되어 이미지 로드 실패 → 갤러리에서 비어 보이거나 깨짐.
     - **저장소 동기화:** `media-store`(localStorage)와 상품 상세 페이지가 다른 탭/창이면, 링크 직후 상세 페이지가 갱신되지 않아서 새로 링크한 사진이 당장 안 보일 수 있음.
     - **productId 불일치:** `updateMediaFile` 시 저장되는 `productId`와 상세 페이지의 `params.id`가 다르면(예: 문자열/숫자 차이) `getMediaFilesByProduct` 결과에 포함되지 않음.

2. **사진 클릭 시 상세 페이지로의 “링크” 동작이 없음**
   - 현재 `ProductGallery`는 **상품 상세 페이지 안**에서만 사용됨. 갤러리 사진은 이미 해당 상품 페이지에 있으므로, 클릭 시 “상세로 이동”이 아니라 확대/풀스크린 등 갤러리 전용 동작만 함.
   - **다른 페이지**(예: 홈 히어로, 카테고리 배너, 콘텐츠 슬라이더)에서 `productId`가 있는 미디어를 노출하는 경우, 그쪽에서 `<Link href={/products/${file.productId}}>` 등으로 감싸지 않으면 “사진 클릭 → 상품 상세” 링크가 동작하지 않음. 현재 그런 노출 지점이 있으면 해당 컴포넌트에 링크가 구현되어 있는지 확인 필요.

3. **정리**
   - “사진으로 상세페이지에 링크를 건다”는 (1) **그 상품 상세 페이지에 그 사진이 갤러리로 보이는 것**과 (2) **다른 페이지에서 그 사진을 클릭하면 상세로 이동하는 것** 두 가지로 나뉨.
   - (1)이 안 되면: URL 복원, media-store 동기화, productId 일치 여부를 아래 “잠재적 문제점”대로 점검.
   - (2)가 안 되면: 사진을 노출하는 컴포넌트에서 `file.productId`로 `/products/[id]` 링크를 걸었는지 확인.

---

## 문제 상황
관리자가 "Link to Product"에서 이미지를 링크했는데, 고객이 상품 상세 페이지에서 확인할 때 관련 이미지가 링크되지 않는 문제

## 현재 구현 흐름

### 1. 이미지 링크 과정 (관리자)

#### 파일: `app/admin/images/page.tsx`
```typescript
// 상품에 미디어 파일 연결
const handleLinkToProduct = (fileId: string, productId: string) => {
  const product = categoryProducts.find(p => p.id === productId)
  updateMediaFile(fileId, { productId, productName: product?.name })
  showNotification('success', `File linked to product "${product?.name}" successfully!`)
  setIsLinkingModalOpen(false)
  setLinkingFileId(null)
}
```

**동작:**
- `updateMediaFile`을 호출하여 파일의 `productId`와 `productName`을 업데이트
- 성공 메시지 표시

### 2. 미디어 파일 업데이트

#### 파일: `lib/mediaStore.ts`
```typescript
updateMediaFile: (id, updates) => {
  const file = get().mediaFiles.find(f => f.id === id)
  
  set((state) => ({
    mediaFiles: state.mediaFiles.map(file =>
      file.id === id ? { ...file, ...updates } : file
    )
  }))
  
  // Custom Event 발생
  if (typeof window !== 'undefined') {
    const updatedFile = get().mediaFiles.find(f => f.id === id)
    const event = new CustomEvent('media-files-updated', {
      detail: {
        action: 'updated',
        fileId: id,
        fileName: updatedFile?.name || file?.name,
        category: updatedFile?.category || file?.category,
        productId: updatedFile?.productId || file?.productId,
        updates
      }
    })
    window.dispatchEvent(event)
  }
}
```

**동작:**
- Zustand store의 `mediaFiles` 배열에서 해당 파일을 찾아 업데이트
- `productId`와 `productName`이 파일 객체에 저장됨
- Custom Event를 발생시켜 다른 컴포넌트에 알림

### 3. 상품 상세 페이지에서 이미지 가져오기

#### 파일: `app/products/[id]/page.tsx`
```typescript
<ProductGallery
  productId={productId}
  showThumbnails={true}
  showFullscreenButton={true}
  showPlayButton={false}
  showBullets={false}
  autoPlay={false}
  fallbackImage={product.image} // 이미지가 없을 때 fallback으로 사용
/>
```

**동작:**
- `ProductGallery` 컴포넌트에 `productId` 전달
- `fallbackImage`로 상품의 기본 이미지 전달

### 4. ProductGallery 컴포넌트

#### 파일: `components/ProductGallery.tsx`
```typescript
const { getMediaFilesByProduct } = useMediaStore()
const [galleryImages, setGalleryImages] = useState<any[]>([])
const [isLoading, setIsLoading] = useState(true)

// productId로 연결된 이미지 가져오기
const productImages = useMemo(() => {
  if (!productId) return []
  
  const images = getMediaFilesByProduct(productId)
  // 이미지 타입만 필터링
  return images.filter(file => file.type === 'image')
}, [productId, getMediaFilesByProduct])
```

**동작:**
- `useMediaStore`에서 `getMediaFilesByProduct` 함수 가져오기
- `useMemo`를 사용하여 `productId`가 변경될 때마다 이미지 목록 재계산
- 이미지 타입만 필터링

### 5. getMediaFilesByProduct 함수

#### 파일: `lib/mediaStore.ts`
```typescript
getMediaFilesByProduct: (productId) => {
  const files = get().mediaFiles.filter(file => file.productId === productId)
  // order 기준으로 정렬
  return files.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order
    }
    if (a.order !== undefined) return -1
    if (b.order !== undefined) return 1
    // 둘 다 order가 없으면 uploadedAt 기준
    const dateA = typeof a.uploadedAt === 'string' ? new Date(a.uploadedAt).getTime() : a.uploadedAt.getTime()
    const dateB = typeof b.uploadedAt === 'string' ? new Date(b.uploadedAt).getTime() : b.uploadedAt.getTime()
    return dateB - dateA // 최신순
  })
}
```

**동작:**
- `mediaFiles` 배열에서 `file.productId === productId`인 파일만 필터링
- `order` 기준으로 정렬 (없으면 `uploadedAt` 기준)

## 잠재적 문제점

### 1. **URL 복원 문제**
- 새로고침 후 blob URL이 무효화됨
- `ProductGallery`에서 IndexedDB에서 URL을 복원하는 로직이 없음
- `MediaLibraryModal`에는 복원 로직이 있지만 `ProductGallery`에는 없음

### 2. **상태 동기화 문제**
- `updateMediaFile` 후 `ProductGallery`가 즉시 업데이트되지 않을 수 있음
- `useMemo`의 의존성 배열에 `getMediaFilesByProduct`가 포함되어 있지만, 함수 참조가 변경되지 않으면 재계산되지 않을 수 있음

### 3. **이벤트 리스너 누락**
- `ProductGallery`에서 `media-files-updated` 이벤트를 듣지 않음
- 상품 상세 페이지(`app/products/[id]/page.tsx`)에는 이벤트 리스너가 있지만, `ProductGallery` 자체에는 없음

### 4. **URL 유효성 검사**
- `file.url`이 빈 문자열이거나 유효하지 않을 수 있음
- `file.webpUrl`, `file.dataUrl`도 확인해야 함

## 해결 방안

### 1. ProductGallery에 URL 복원 로직 추가
- IndexedDB에서 blob URL 복원
- `MediaLibraryModal`의 복원 로직 참고

### 2. 이벤트 리스너 추가
- `media-files-updated` 이벤트를 듣고 `productId`가 일치하면 갤러리 업데이트

### 3. URL 우선순위 개선
- `webpUrl` → `url` → `dataUrl` 순서로 확인
- 각 URL의 유효성 검사 추가

### 4. 상태 동기화 개선
- `useMediaStore`의 `mediaFiles`를 직접 구독하여 변경 감지
- `useMemo`의 의존성 배열에 `mediaFiles` 추가

## Link to Product 페이지(모달) 학습 — 이미지 링크가 안 될 때

**Link to Product**는 별도 페이지가 아니라 **Media Management(Admin → Media Management)** 안에서 **이미지/동영상 썸네일을 클릭하거나 Link 아이콘을 누르면 열리는 모달**입니다.

### 1. 모달 여는 방법

| 위치 | 동작 |
|------|------|
| **그리드 뷰** | 미디어 **썸네일 이미지**를 클릭 → Link to Product 모달 열림 |
| **리스트 뷰** | **Link 아이콘(🔗)** 버튼 클릭 → 모달 열림 |

- `handleLinkToProduct(file.id)`는 **한 번만** 호출될 때(인자 1개) “이 파일을 연결할 대상 선택” 모달을 여는 용도입니다.
- **실제 연결**은 모달 안에서 상품을 선택할 때 일어납니다.

### 2. 모달에서 연결하는 방법

- **Quick Link (All Products)** 드롭다운에서 상품을 **선택** → 선택한 순간 연결됨. (모달을 열 때 스토어에서 상품 목록을 한 번 갱신하므로, 등록된 상품이 있어야 드롭다운에 표시됨.)
- **Link by product ID**: 상품 ID 입력란에 **정확한 상품 ID**를 입력하고 **Link** 버튼을 클릭하면 해당 상품에 연결됨. (입력만 하고 버튼을 누르지 않으면 저장되지 않음.)
- 아래 **상품 목록**에서 원하는 상품 **행을 클릭** → 즉시 연결.
- **검색창**(Search products by name, ID…)은 **목록 필터용**이며, 검색 후 목록에서 행을 클릭해야 연결됨. 검색어만 입력하고 버튼을 누르는 동작은 없음.

### 3. 기술 흐름

1. 모달에서 상품 선택  
   → `handleLinkToProduct(linkingFileId, productId)`  
   → `updateMediaFile(fileId, { productId, productName })`  
   → `media-store`(Zustand)의 해당 파일에 `productId`·`productName` 반영  
   → persist로 **localStorage**에 저장  
   → `media-files-updated` 이벤트 발생.

2. 상품 상세 페이지  
   → `ProductGallery`가 `getMediaFilesByProduct(productId)`로 **`file.productId === productId`** 인 미디어만 사용  
   → 여기서 연결된 이미지/동영상만 갤러리에 표시됩니다.

### 4. “이미지 링크가 안 된다”고 느껴질 때 확인할 것

| 확인 항목 | 설명 |
|-----------|------|
| **모달을 열었는지** | 썸네일 또는 Link 아이콘 클릭으로 **Link to Product 모달**이 떴는지 확인. |
| **상품을 선택했는지** | 모달에서 **드롭다운 또는 목록에서 상품을 한 번 선택**했는지 확인. 선택만 하면 연결됨. |
| **상품이 있는지** | Admin → Products에 상품이 없으면 Quick Link가 비어 있음. 상품을 먼저 등록해야 함. |
| **성공 메시지** | 연결되면 `File linked to product "상품명" successfully!` 토스트가 뜸. 안 뜨면 선택이 안 된 것일 수 있음. |
| **상세 페이지 반영** | 연결 직후 상품 상세(`/products/[id]`)는 **같은 탭에서 이동**하거나 **새로고침**하면 갤러리에 반영됨. |
| **productId 일치** | 상세 페이지 URL의 `[id]`와 미디어에 저장된 `productId`가 **완전히 같은 문자열**이어야 갤러리에 나옴. |

### 5. 요약

- **Link to Product** = Media Management에서 **썸네일/Link 아이콘 클릭 → 모달 → 상품 선택** 한 번으로 연결.
- 연결은 **상품 선택 시점에 바로 저장**되며, 별도 “연결” 버튼은 없음.
- 상품 상세 갤러리는 **이미 연결된 미디어만** 표시하므로, “링크가 안 된다”면 위 표의 항목을 순서대로 확인하면 됨.

---

## Link to Product 모달 학습: Close만 보이고 사진 연결이 안 되는 이유

**현상**
- 모달에 **Close 버튼만** 있어서, 사진을 연결하고 싶어도 할 수 없다고 느껴짐.
- 상품 ID를 입력하면 **"No products available" / "No products found in this category"**만 보이고, 다른 버튼이 없어 막힌 느낌.

**이유**

1. **모달에 “연결” 전용 버튼이 없는 이유**
   - 연결 동작은 **상품을 하나 고르는 것**으로만 이루어짐. 즉, (1) 상단 **Quick Link (All Products)** 드롭다운에서 선택하거나, (2) 아래 **상품 목록**에서 한 행을 클릭하면 곧바로 `handleLinkToProduct`가 호출되어 연결됨.
   - 따라서 “Link”, “Confirm” 같은 별도 버튼은 없고, **Close**는 모달만 닫는 용도임. 연결은 “상품 선택” 한 번으로 완료되는 구조임.

2. **"No products available" / "No products found in this category"가 나오는 이유**
   - 모달 안의 **상품 목록**은 현재 이미지 관리에서 선택한 **카테고리**에 해당하는 상품만 사용함 (`categoryProducts`).
   - **Product** 탭에서 카테고리가 Stickers, Stamps 등이면 해당 카테고리 상품만, **Content** 탭(히어로 배너, 카테고리 배경 등)이면 “이 카테고리”에 매핑된 상품이 없어서 `categoryProducts`가 **빈 배열**이 됨.
   - 그 결과:
     - **상품 목록 영역**에 아무것도 안 나오고,
     - **"No products available"** / **"No products found in this category"** 메시지만 보이며,
     - 상품 ID를 **검색창**에 입력해도, 검색은 **같은 `categoryProducts`** 안에서만 되기 때문에 목록이 비어 있으면 “No products found”만 반복됨.
   - 즉, **상품 ID를 입력해도** 그 ID가 “현재 카테고리” 목록에 없으면(또는 카테고리 자체가 비어 있으면) 목록이 비어 있어서, 연결할 수 있는 버튼/행이 없는 것처럼 보임.

3. **실제로 연결하는 방법**
   - **Quick Link (All Products)** 드롭다운은 **전체 상품**을 쓰므로, 카테고리와 상관없이 여기서 상품을 선택하면 연결 가능함. 이 드롭다운이 눈에 잘 안 띄거나, 상품 목록이 비어 있어서 “연결을 못 한다”고 느낄 수 있음.
   - 개선: 카테고리에 상품이 없을 때(`categoryProducts`가 비어 있을 때)도 **전체 상품 목록**을 보여 주고, 검색(상품 ID 포함)을 전체 상품 기준으로 하면, 상품 ID 입력만으로도 목록에서 찾아 클릭해 연결할 수 있음.

---

## Quick Link (All Products) 활성화가 안 되는 이유

**현상:** Quick Link 드롭다운을 써서 상품을 연결하려는데, 선택이 안 되거나 비활성처럼 보임.

**가능한 원인과 동작:**

1. **상품이 하나도 없을 때**
   - Quick Link의 옵션은 **스토어의 `products`**에서 옵니다. `products`가 빈 배열이면 "Select product to link..." 한 개만 있고, 고를 상품이 없어서 **사실상 사용할 수 없음** (이걸 "활성화가 안 된다"고 느낄 수 있음).
   - `products`는 전역 스토어(localStorage persist)에서 로드됩니다. Admin > Products에서 상품을 아직 추가하지 않았거나, 다른 탭/초기화로 스토어가 비어 있으면 Image Management에서만 열어도 `products`가 []일 수 있습니다.
   - **대응:** Admin > Products에서 상품을 먼저 추가한 뒤, Image Management에서 Quick Link를 사용합니다. 상품이 없을 때는 드롭다운 옆/위에 "No products in store. Add products in Admin > Products first." 같은 안내를 띄우면 원인 파악에 도움이 됩니다.

2. **코드상 비활성(disabled)이 아님**
   - `<select>`에는 `disabled`가 없어서, 상품이 있으면 항상 클릭·선택 가능합니다. "활성화가 안 된다"가 **클릭 자체가 안 된다**라면, 상품이 없어서 선택지가 없는 경우일 가능성이 큽니다.

3. **선택 후 드롭다운이 그대로 유지됨**
   - Quick Link는 `defaultValue=""`인 **비제어 컴포넌트**입니다. 상품을 한 번 선택하면 그 값이 DOM에 남습니다. 모달을 닫으면 `linkingFileId`가 null이 되어 모달이 unmount되므로, 다음에 열 때는 다시 "Select product to link..."로 보입니다. 같은 모달을 닫지 않고 다른 파일로만 바꾸는 플로우가 없다면 보통은 리셋된 것처럼 보입니다.

4. **연결이 되려면 `linkingFileId`가 있어야 함**
   - `onChange`에서 `if (e.target.value && linkingFileId)`일 때만 `handleLinkToProduct`를 호출합니다. 모달은 `isLinkingModalOpen && linkingFileId`일 때만 렌더되므로, 모달이 보이는 동안에는 `linkingFileId`가 있는 상태입니다. 따라서 **드롭다운에서 상품만 선택하면** 곧바로 연결 동작이 일어나야 합니다.

**정리:** Quick Link가 "활성화가 안 된다"고 느껴지는 주된 이유는 **스토어에 상품이 없어서 선택 가능한 옵션이 없는 경우**입니다. 상품을 추가한 뒤에는 드롭다운에서 선택만 하면 연결되며, 별도의 "연결" 버튼은 없습니다.

---

## Media Management 페이지 학습 · 상품 상세페이지와 이미지 연결 방법

### Media Management 페이지가 하는 일

- **위치:** Admin → **Media Management** (또는 Image Management)
- **역할:** 업로드한 이미지/동영상(미디어 파일)을 한곳에서 관리하고, **어떤 상품에 연결할지** 지정하는 곳입니다.
- **저장:** 미디어 메타데이터는 **localStorage** (`media-store`)에, 실제 파일 바이너리는 **IndexedDB**에 저장됩니다. “Link to Product”로 연결하면 해당 파일의 `productId`·`productName`만 메타데이터에 저장됩니다.

### 상품 상세페이지에서 이미지를 보는 흐름

1. **상품 상세 페이지** (`/products/[id]`)는 `ProductGallery` 컴포넌트를 사용합니다.
2. `ProductGallery`는 **`getMediaFilesByProduct(productId)`**로 **해당 상품 ID에 연결된 미디어만** 가져옵니다. (`lib/mediaStore.ts`: `file.productId === productId`인 파일만 반환)
3. 따라서 **Media Management에서 “Link to Product”로 특정 상품을 지정한 이미지만** 상품 상세 갤러리에 나타납니다.

### Media Management에서 상품 상세 이미지를 “추가”하는 방법

- **이미 업로드된 이미지**를 상품에 연결하려면:
  1. Media Management에서 해당 **이미지(썸네일)를 클릭** → **Link to Product** 모달이 열립니다. (또는 리스트 뷰에서 Link 아이콘 클릭)
  2. **Quick Link (All Products)** 드롭다운에서 원하는 상품을 선택하거나, 아래 목록/검색에서 상품을 선택합니다. **선택하는 순간 바로 연결**됩니다. (별도 “연결” 버튼 없음)
  3. 연결이 되면 `updateMediaFile(fileId, { productId, productName })`가 호출되어, 해당 파일의 `productId`가 저장됩니다.
- **새 이미지를 올리면서** 상품에 연결하려면: 업로드 시 **Product** 탭에서 카테고리와 상품을 선택한 뒤 업로드하면, 해당 상품에 바로 연결됩니다.

### 현재 등록된 상품 상세페이지에 이미지가 안 보이는 이유 (Media Management에서 연결했는데도)

가능한 원인을 정리하면 아래와 같습니다.

1. **연결 절차를 거치지 않은 경우**
   - 이미지를 **업로드만** 하고 **Link to Product**에서 상품을 **선택하지 않으면** `productId`가 비어 있어 갤러리에 나오지 않습니다. 반드시 **썸네일 클릭 → 모달에서 상품 선택**까지 해야 합니다.

2. **productId 불일치**
   - 상품 상세 URL의 `[id]`와 미디어 파일에 저장된 `productId`가 **완전히 같은 문자열**이어야 합니다. (대소문자, 공백, 타입 차이 없어야 함) 다르면 `getMediaFilesByProduct(productId)` 결과에 포함되지 않아 갤러리에 안 나옵니다.

3. **저장소/탭 동기화**
   - Media Management와 상품 상세 페이지가 **다른 탭**이면, 링크 직후 상품 상세 쪽이 이전 상태로 남아 있을 수 있습니다. **같은 탭에서 상세 페이지로 이동**하거나, **새로고침**하면 반영됩니다. 상품 페이지는 `media-files-updated`·`storage` 이벤트를 구독해 갱신하도록 되어 있습니다.

4. **Blob URL 만료 (새로고침 후 이미지 깨짐)**
   - 미디어 파일의 `url`·`webpUrl`이 **blob URL**이면, **페이지 새로고침 후**에는 blob이 무효화되어 이미지가 깨질 수 있습니다. `ProductGallery`는 **IndexedDB에 저장된 파일**에 대해 URL을 다시 복원하는 로직이 있지만, “url이 blob으로 남아 있는” 경우는 복원 대상에서 빠질 수 있어, 새로고침 후 일부 이미지만 안 나오는 현상이 생길 수 있습니다.

5. **갤러리는 “이미지 타입”만 표시**
   - `ProductGallery`는 `getMediaFilesByProduct` 결과 중 **이미지·동영상**만 사용합니다. (`file.type === 'image' || file.type === 'video'`) 타입이 다르면 상세 갤러리에 포함되지 않습니다.

6. **스토어에 상품이 없어 Quick Link가 비어 있는 경우**
   - Admin → Products에서 **상품을 먼저 등록**해야 Quick Link 드롭다운에 상품이 보입니다. 상품이 없으면 연결할 대상이 없어, “등록된 상품에 이미지를 추가”할 수 없습니다.

### 요약

- **Media Management**에서 “등록된 상품 상세에 보이는 이미지”를 추가하려면, **반드시 해당 이미지에 대해 Link to Product를 열고 상품을 선택**해야 합니다.
- 연결 후에도 안 보이면: **같은 탭에서 상세 페이지 이동/새로고침**, **productId 일치 여부**, **새로고침 후 blob 만료** 여부를 순서대로 확인하면 됩니다.

---

## 확인 사항

1. **관리자 페이지에서 링크 후:**
   - 브라우저 개발자 도구에서 `localStorage.getItem('media-store')` 확인
   - 해당 파일의 `productId`가 올바르게 설정되었는지 확인

2. **상품 상세 페이지에서:**
   - 콘솔에서 `getMediaFilesByProduct(productId)` 결과 확인
   - 반환된 파일들의 `url`, `webpUrl`, `dataUrl` 확인

3. **URL 복원:**
   - 새로고침 후 blob URL이 무효화되었는지 확인
   - IndexedDB에서 복원이 필요한지 확인

