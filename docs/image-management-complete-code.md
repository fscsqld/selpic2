# Image Management 전체 코드 문서

이 문서는 Image Management와 관련된 모든 코드 파일을 포함합니다.

**작성일**: 2024년
**버전**: 1.0

---

## 📁 파일 구조

```
app/admin/images/page.tsx          - 메인 Image Management 페이지
components/SortableFileItem.tsx    - 드래그 앤 드롭 가능한 파일 아이템 컴포넌트
components/EditStageModal.tsx      - 업로드 전 편집 모달
components/MediaLibraryModal.tsx   - 미디어 라이브러리 선택 모달
lib/mediaStore.ts                  - 미디어 파일 상태 관리 (Zustand)
lib/indexedDBStorage.ts           - IndexedDB 저장소 유틸리티
```

---

## 📄 1. app/admin/images/page.tsx

**전체 라인 수**: 2,198줄

이 파일은 Image Management의 메인 페이지로, 다음 기능을 포함합니다:
- 카테고리별 미디어 관리
- 파일 업로드 및 검증
- 드래그 앤 드롭 순서 변경
- 벌크 액션 (카테고리 변경, 상품 연결, 태그 변경, 삭제)
- Orphaned Files 관리
- 고급 필터링 및 정렬
- 비디오 UX 개선
- 다이렉트 상품 연결

**주요 섹션**:
- 임포트 및 타입 정의 (1-66줄)
- 상태 관리 (76-163줄)
- 데이터 처리 로직 (172-935줄)
- UI 렌더링 (937-2197줄)

---

## 📄 2. components/SortableFileItem.tsx

**전체 라인 수**: 475줄

드래그 앤 드롭 가능한 파일 아이템 컴포넌트입니다.

**주요 기능**:
- 그리드/리스트 뷰 지원
- 드래그 앤 드롭 (DnD Kit)
- 비디오 썸네일 (재생 아이콘 + 호버 프리뷰)
- 파일 선택 체크박스
- 액션 버튼 (미리보기, 다운로드, 상품 연결, 삭제)

**VideoThumbnail 컴포넌트**:
- 재생 아이콘 항상 표시
- 호버 시 프리뷰 자동 재생
- 마우스 떠나면 일시정지

---

## 📄 3. components/EditStageModal.tsx

**전체 라인 수**: 777줄

업로드 전 파일 편집 모달입니다.

**주요 기능**:
- 파일명 편집
- 카테고리 선택
- 태그 추가/삭제
- 설명 입력
- 이미지 크롭 (1:1 비율)
- 이미지 줌/드래그
- 워터마크 적용
- 동영상 썸네일 시간 선택
- WebP 변환 진행률 표시

---

## 📄 4. components/MediaLibraryModal.tsx

**전체 라인 수**: 약 756줄

기존 미디어 파일을 선택할 수 있는 모달입니다.

**주요 기능**:
- 태그별 필터링 (Hero_Banner, Product_Media 등)
- 카테고리별 필터링
- 타입별 필터링 (Image, Video)
- 검색 기능
- 그리드/리스트 뷰
- 페이지네이션
- IndexedDB URL 복원
- usage prop 기반 우선순위 정렬

---

## 📄 5. lib/mediaStore.ts

**전체 라인 수**: 약 988줄

미디어 파일 상태 관리 (Zustand Store)입니다.

**주요 기능**:
- MediaFile 인터페이스 정의
- 표준 태그 시스템 (STANDARD_MEDIA_TAGS)
- 파일 확장자 기반 자동 분류 (detectMediaType)
- 동영상 썸네일 생성 (generateVideoThumbnail)
- WebP 변환 (convertToWebP)
- IndexedDB 저장 (addMediaFileWithData)
- 파일 검색 및 필터링
- Orphaned Files 감지
- 드래그 앤 드롭 순서 관리 (reorderFiles)

**주요 함수**:
- `addMediaFileWithData`: 파일 업로드 및 저장
- `updateMediaFile`: 파일 메타데이터 업데이트
- `deleteMediaFile`: 파일 삭제
- `getMediaFilesByCategory`: 카테고리별 파일 조회
- `getMediaFilesByProduct`: 상품별 파일 조회
- `reorderFiles`: 여러 파일 순서 일괄 업데이트

---

## 📄 6. lib/indexedDBStorage.ts

**전체 라인 수**: 247줄

IndexedDB를 사용한 대용량 파일 저장 유틸리티입니다.

**주요 기능**:
- 데이터베이스 초기화 (init)
- 파일 저장 (saveFile) - ArrayBuffer 지원
- 파일 조회 (getFile, getFileAsBlob)
- 파일 삭제 (deleteFile)
- 모든 파일 ID 조회 (getAllFileIds)
- 전체 삭제 (clearAll)

**저장 형식**:
- 이미지: ArrayBuffer (원본) + WebP (별도 저장)
- 동영상: ArrayBuffer (원본)
- MIME 타입 자동 감지 및 저장

---

## 🔗 파일 간 의존성

```
app/admin/images/page.tsx
  ├── components/SortableFileItem.tsx
  ├── components/EditStageModal.tsx
  ├── lib/mediaStore.ts
  └── lib/indexedDBStorage.ts (간접)

components/MediaLibraryModal.tsx
  ├── lib/mediaStore.ts
  └── lib/indexedDBStorage.ts

lib/mediaStore.ts
  └── lib/indexedDBStorage.ts
```

---

## 📊 코드 통계

- **총 파일 수**: 6개
- **총 라인 수**: 약 5,441줄
- **주요 컴포넌트**: 3개
- **유틸리티 파일**: 2개
- **메인 페이지**: 1개

---

## 🎯 주요 기능 요약

### 1. 파일 업로드 및 관리
- 드래그 앤 드롭 업로드
- 파일 검증 (타입, 크기)
- WebP 자동 변환
- IndexedDB 저장

### 2. 카테고리 및 필터링
- 5개 카테고리 (Stickers, Stamps, Phone Cases, Market S, General)
- 태그별 필터 (7개 표준 태그)
- 타입별 필터 (Image, Video)
- 고급 정렬 (최신순, 오래된순, 크기순, 이름순)

### 3. 벌크 액션
- Change Category
- Link to Product
- Change Tag
- Delete

### 4. 드래그 앤 드롭
- 순서 변경
- order 필드 자동 업데이트
- 카테고리/상품별 그룹화

### 5. Orphaned Files 관리
- 미연결 파일 감지
- 일괄 선택 및 삭제
- 태그 일괄 변경

### 6. 비디오 UX
- 재생 아이콘 표시
- 호버 시 프리뷰 재생
- 썸네일 자동 생성

### 7. 상품 연결
- 다이렉트 연결 (Quick Link 드롭다운)
- 상세 상품 목록
- 검색 기능

---

**참고**: 각 파일의 전체 코드는 위에서 읽은 내용을 참고하세요.

