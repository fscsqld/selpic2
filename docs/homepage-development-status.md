# 🏠 SELPIC 홈페이지 개발 현황 및 개시 전 체크리스트

**작성일**: 2024년  
**버전**: 1.0  
**상태**: 개발 완료 → 개시 준비 단계

---

## 📊 현재까지 진행된 개발 내용

### 1. **홈페이지 구조** (`app/page.tsx`)

#### ✅ 완료된 주요 기능

1. **Hero Section (메인 슬라이더)**
   - Swiper.js 기반 슬라이딩 배너
   - 이미지/동영상 슬라이드 지원
   - 다양한 애니메이션 효과 (fade, cube, coverflow, flip)
   - 자동 재생, 루프, 네비게이션, 페이지네이션
   - IndexedDB를 통한 미디어 파일 관리
   - Fallback 이미지 지원

2. **Shop by Category Section**
   - 카테고리별 상품 분류
   - 배경 이미지/동영상 지원
   - 드래그 앤 드롭 순서 변경
   - 활성화/비활성화 토글

3. **SELPIC N Section**
   - 커뮤니티 섹션
   - 배경 이미지/동영상 지원
   - IndexedDB 미디어 관리

4. **Newsletter Section**
   - 이메일 구독 폼
   - Footer 연동

5. **반응형 디자인**
   - 모바일/태블릿/데스크톱 최적화
   - Framer Motion 애니메이션

---

## ⚠️ 발견된 오류 및 문제점

### 🔴 **심각한 오류 (즉시 수정 필요)**

#### 1. **비디오 재생 오류**
**위치**: `app/page.tsx` - `VideoSlide` 컴포넌트 (라인 108-516)

**문제점**:
- `MEDIA_ERR_NETWORK` (에러 코드 2): 파일을 찾을 수 없음
- 첫 번째 슬라이드는 정상 작동하지만, 다른 슬라이드에서 비디오 로딩 실패
- 파일 접근성 확인 로직이 있으나 여전히 실패하는 경우 발생

**원인 분석**:
```typescript
// 문제가 되는 부분
- 상대 경로(/videos/V2.mp4)의 경우 파일 존재 여부 확인 후 로드
- 하지만 실제 파일이 public/videos/ 폴더에 없을 수 있음
- IndexedDB에서 로드한 blob URL이 세션 간 유지되지 않을 수 있음
```

**해결 방안**:
1. ✅ 파일 접근성 사전 확인 로직 추가 (완료)
2. ⚠️ 실제 파일 존재 여부 확인 필요
3. ⚠️ IndexedDB blob URL 관리 개선 필요

#### 2. **과도한 콘솔 로그**
**위치**: `app/page.tsx` 전체 (88개 console.log/warn/error)

**문제점**:
- 개발 환경에서만 필요한 로그가 프로덕션에도 출력됨
- 성능 저하 및 메모리 사용량 증가 가능성
- 브라우저 콘솔이 지저분해짐

**해결 방안**:
```typescript
// 프로덕션 환경에서 로그 제거
if (process.env.NODE_ENV === 'development') {
  console.log('...')
}
```

#### 3. **메모리 누수 가능성**
**위치**: `app/page.tsx` - `useEffect` 훅들

**문제점**:
- 일부 `useEffect`에 cleanup 함수가 없음
- 타이머(`setTimeout`) 정리 누락 가능성
- 이벤트 리스너 해제 누락

**해결 방안**:
```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    // 작업
  }, 100)
  
  return () => {
    clearTimeout(timeout) // ✅ cleanup 추가
  }
}, [dependencies])
```

---

### 🟡 **중간 수준 오류 (개시 전 수정 권장)**

#### 4. **IndexedDB 파일 로딩 실패**
**위치**: `app/page.tsx` - `ImageSlide`, `VideoSlide` 컴포넌트

**문제점**:
- `indexeddb://` 형식의 URL에서 파일을 찾을 수 없는 경우
- IndexedDB 스토리지가 비어있거나 손상된 경우

**해결 방안**:
- IndexedDB 초기화 검증 로직 추가
- 파일이 없을 때 기본 이미지로 fallback

#### 5. **Swiper 인스턴스 업데이트 실패**
**위치**: `app/page.tsx` - Swiper 관련 `useEffect` (라인 880-1001)

**문제점**:
- `updateSlides` 메서드가 없을 때 `update`만 사용
- Swiper 인스턴스가 null일 때 업데이트 실패

**해결 방안**:
- Swiper 인스턴스 존재 여부 확인 강화
- 에러 핸들링 개선

---

### 🟢 **경미한 오류 (개시 후 개선 가능)**

#### 6. **외부 리소스 의존성**
**위치**: `lib/contentStore.ts`

**문제점**:
- 일부 기본 데이터에 외부 URL 사용 (Unsplash, sample-videos.com)
- 외부 서비스 장애 시 콘텐츠 표시 실패

**해결 방안**:
- 모든 외부 리소스를 로컬 파일로 교체
- `/public/videos/`, `/public/images/` 폴더에 파일 배치

#### 7. **Hydration 타임아웃**
**위치**: `app/page.tsx` - 라인 826

**문제점**:
- 5초 후 강제 렌더링 (타임아웃)
- 초기 로딩이 느릴 수 있음

**해결 방안**:
- 로딩 상태 개선
- 초기 데이터 최적화

---

## 🚀 홈페이지 개시 전 필수 체크리스트

### 1. **기능 검증**

#### ✅ 필수 기능 테스트
- [ ] Hero 슬라이더 정상 작동 (이미지/동영상)
- [ ] 카테고리 섹션 클릭 시 정상 이동
- [ ] Newsletter 구독 폼 작동
- [ ] 반응형 디자인 (모바일/태블릿/데스크톱)
- [ ] 모든 링크 정상 작동
- [ ] 이미지/동영상 로딩 성공률 95% 이상

#### ✅ 성능 테스트
- [ ] 페이지 로딩 속도 3초 이내
- [ ] Lighthouse 성능 점수 80점 이상
- [ ] 메모리 누수 없음 (Chrome DevTools Memory Profiler)
- [ ] 네트워크 요청 최적화 (불필요한 요청 제거)

---

### 2. **콘텐츠 준비**

#### ✅ 미디어 파일
- [ ] Hero 슬라이드 이미지/동영상 준비 (최소 3개)
- [ ] 카테고리 배경 이미지 준비
- [ ] Fallback 이미지 준비 (`/public/logo.svg`)
- [ ] 모든 미디어 파일이 `/public/videos/`, `/public/images/` 폴더에 존재
- [ ] 이미지 최적화 (WebP 형식 권장)
- [ ] 동영상 최적화 (MP4, 적절한 해상도)

#### ✅ 텍스트 콘텐츠
- [ ] Hero 슬라이드 제목/부제목 작성
- [ ] 카테고리 설명 작성
- [ ] Footer 정보 작성 (연락처, 주소 등)
- [ ] SEO 메타 태그 작성

---

### 3. **기술적 준비**

#### ✅ 환경 설정
- [ ] `.env.local` 파일 설정 (필요한 경우)
- [ ] `next.config.js` 프로덕션 설정 확인
- [ ] 빌드 테스트 (`npm run build`)
- [ ] 프로덕션 서버 테스트 (`npm run start`)

#### ✅ 에러 처리
- [ ] 모든 console.log를 개발 환경에서만 출력하도록 수정
- [ ] 에러 바운더리 추가 (선택사항)
- [ ] 404 페이지 준비
- [ ] 에러 페이지 준비

#### ✅ 보안
- [ ] 환경 변수 보안 확인
- [ ] XSS 방지 확인
- [ ] CSRF 방지 확인 (필요한 경우)
- [ ] HTTPS 설정 (프로덕션)

---

### 4. **SEO 및 접근성**

#### ✅ SEO 최적화
- [ ] 메타 태그 설정 (`app/layout.tsx`)
- [ ] Open Graph 태그 설정
- [ ] 구조화된 데이터 (JSON-LD) 추가
- [ ] sitemap.xml 생성
- [ ] robots.txt 설정

#### ✅ 접근성
- [ ] 키보드 네비게이션 가능
- [ ] 스크린 리더 호환성
- [ ] 색상 대비 비율 확인 (WCAG AA 이상)
- [ ] 이미지 alt 텍스트 추가

---

### 5. **브라우저 호환성**

#### ✅ 테스트 브라우저
- [ ] Chrome (최신 버전)
- [ ] Firefox (최신 버전)
- [ ] Safari (최신 버전)
- [ ] Edge (최신 버전)
- [ ] 모바일 브라우저 (iOS Safari, Chrome Mobile)

---

### 6. **모니터링 및 분석**

#### ✅ 분석 도구 설정
- [ ] Google Analytics 설정 (선택사항)
- [ ] 에러 모니터링 도구 설정 (Sentry 등, 선택사항)
- [ ] 성능 모니터링 설정

---

## 📝 개시 전 우선순위 작업

### 🔴 **최우선 (개시 전 필수)**

1. **비디오 파일 확인**
   ```bash
   # public/videos/ 폴더에 모든 비디오 파일이 존재하는지 확인
   ls public/videos/
   ```

2. **콘솔 로그 정리**
   - 모든 `console.log`를 개발 환경에서만 출력하도록 수정
   - 프로덕션 빌드에서 로그 제거

3. **빌드 테스트**
   ```bash
   npm run build
   npm run start
   ```

4. **실제 미디어 파일 배치**
   - Hero 슬라이드 이미지/동영상
   - 카테고리 배경 이미지
   - Fallback 이미지

---

### 🟡 **중요 (개시 전 권장)**

1. **메모리 누수 수정**
   - 모든 `useEffect`에 cleanup 함수 추가
   - 타이머 정리

2. **에러 핸들링 개선**
   - IndexedDB 로딩 실패 시 fallback
   - Swiper 인스턴스 null 체크 강화

3. **성능 최적화**
   - 이미지 lazy loading
   - 동영상 preload 최적화

---

### 🟢 **선택사항 (개시 후 개선)**

1. **SEO 최적화**
2. **접근성 개선**
3. **분석 도구 연동**

---

## 🔧 개시 전 실행할 명령어

```bash
# 1. 빌드 테스트
npm run build

# 2. 프로덕션 서버 테스트
npm run start

# 3. 타입 체크
npm run type-check

# 4. 린트 체크
npm run lint

# 5. 캐시 정리 후 재빌드
npm run clean
npm run build
```

---

## 📊 현재 코드 통계

- **총 라인 수**: 1,838 라인 (`app/page.tsx`)
- **콘솔 로그**: 88개 (개발 환경 전용으로 변경 필요)
- **컴포넌트**: 3개 (ImageSlide, VideoSlide, HomePage)
- **의존성**: Next.js 15.5.0, React 18, Swiper.js, Framer Motion

---

## 🎯 개시 후 모니터링 항목

1. **에러 로그 모니터링**
   - 비디오 로딩 실패율
   - IndexedDB 접근 실패율
   - Swiper 업데이트 실패율

2. **성능 모니터링**
   - 페이지 로딩 시간
   - 메모리 사용량
   - 네트워크 요청 수

3. **사용자 피드백**
   - 비디오 재생 문제
   - 이미지 로딩 문제
   - 모바일 호환성 문제

---

**작성자**: AI Assistant  
**최종 업데이트**: 2024년

