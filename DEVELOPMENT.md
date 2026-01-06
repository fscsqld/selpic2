ㄷㅔㅔ# SELPIC 개발 환경 안정화 가이드

## 🚀 빠른 시작

### 1. 개발 서버 시작
```bash
npm run dev
```

### 2. 문제 발생 시 해결 방법
  
#### 홈페이지가 로드되지 않는 경우
```bash
# 1. 캐시 정리
npm run clean

# 2. 의존성 재설치
npm install

# 3. 개발 서버 재시작
npm run dev
```

#### 포트 충돌이 발생하는 경우
```bash
# 포트 3003이 사용 중인지 확인
netstat -ano | findstr :3003

# 사용 중이라면 프로세스 종료
taskkill /PID [프로세스ID] /F
```

## 🔧 안정화된 구조

### 1. 에러 처리
- **ErrorBoundary**: 각 컴포넌트에 에러 바운더리 적용
- **Suspense**: 로딩 상태 관리
- **Try-Catch**: 모든 비동기 작업에 예외 처리

### 2. 상태 관리
- **Zustand**: 안전한 상태 관리
- **순환 의존성 방지**: 훅 사용 시 안전한 값 추출
- **로딩 상태**: 모든 컴포넌트에 로딩 상태 추가

### 3. 라우팅
- **useRouter**: 안정적인 클라이언트 사이드 라우팅
- **fallback**: 라우팅 실패 시 window.location.href 사용

## 📁 파일 구조

```
selpic2/
├── app/
│   ├── page.tsx              # 홈페이지 (안정화됨)
│   ├── layout.tsx            # 루트 레이아웃
│   └── ...
├── components/
│   ├── Header.tsx            # 헤더 (안정화됨)
│   ├── ProductCard.tsx       # 상품 카드
│   └── ...
├── lib/
│   ├── store.ts              # 상태 관리
│   ├── userAuth.ts           # 사용자 인증
│   └── ...
├── next.config.js            # Next.js 설정 (안정화됨)
├── package.json              # 의존성 관리 (안정화됨)
└── DEVELOPMENT.md            # 이 파일
```

## 🛠️ 개발 팁

### 1. 컴포넌트 작성 시 주의사항
```typescript
// ✅ 안전한 훅 사용
const store = useStore()
const cart = store?.cart || []

// ❌ 직접 구조분해 할당 (위험)
const { cart } = useStore()
```

### 2. 에러 처리 패턴
```typescript
// ✅ 안전한 함수 호출
const handleNavigation = (path: string) => {
  try {
    router.push(path)
  } catch (error) {
    console.error('Navigation error:', error)
    window.location.href = path
  }
}
```

### 3. 로딩 상태 관리
```typescript
// ✅ 로딩 상태 추가
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const timer = setTimeout(() => {
    setIsLoading(false)
  }, 1000)
  
  return () => clearTimeout(timer)
}, [])
```

## 🔍 문제 진단

### 1. 콘솔 에러 확인
- 브라우저 개발자 도구에서 에러 확인
- 네트워크 탭에서 요청 실패 확인

### 2. 서버 로그 확인
- 터미널에서 서버 로그 확인
- 포트 충돌 여부 확인

### 3. 캐시 문제 해결
```bash
# 브라우저 캐시 삭제
# 개발자 도구 → Network 탭 → Disable cache 체크

# Next.js 캐시 삭제
npm run clean
```

## 🚨 자주 발생하는 문제

### 1. 홈페이지가 반복적으로 실행되지 않는 문제
**원인**: 순환 의존성, 메모리 누수, 포트 충돌
**해결**: 
- `npm run reset` 실행
- 포트 확인 및 프로세스 종료
- 브라우저 캐시 삭제

### 2. 사이드 메뉴 클릭 시 이동 안됨
**원인**: 라우팅 로직 문제
**해결**: `handleNavigation` 함수 사용

### 3. 이미지 로딩 실패
**원인**: Next.js 이미지 최적화 문제
**해결**: `unoptimized` 속성 추가

## 📝 개발 체크리스트

- [ ] 에러 바운더리 적용
- [ ] 로딩 상태 추가
- [ ] 안전한 훅 사용
- [ ] 예외 처리 추가
- [ ] 콘솔 에러 확인
- [ ] 브라우저 캐시 삭제
- [ ] 포트 충돌 확인

## 🎯 미래 개발 시 주의사항

1. **새 컴포넌트 추가 시**: ErrorBoundary와 로딩 상태 필수
2. **새 훅 사용 시**: 안전한 값 추출 패턴 사용
3. **새 라우팅 추가 시**: handleNavigation 함수 사용
4. **새 상태 관리 시**: 순환 의존성 주의
5. **빌드 시**: `npm run type-check` 실행

## 📞 문제 해결 순서

1. **즉시 해결**: `npm run reset`
2. **포트 확인**: `netstat -ano | findstr :3003`
3. **캐시 삭제**: 브라우저 캐시 + `npm run clean`
4. **의존성 재설치**: `npm install`
5. **서버 재시작**: `npm run dev`

이 가이드를 따라하면 홈페이지가 안정적으로 작동하며, 미래에 빠르게 개발할 수 있습니다. 