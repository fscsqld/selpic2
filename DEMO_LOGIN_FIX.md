# Demo Login Failure - Root Cause Analysis and Fix

## 문제 원인 (Root Cause)

"Demo login failed" 오류가 반복적으로 발생하는 주요 원인들:

### 1. 상태 지속성 문제 (State Persistence Issues)
- Zustand의 `persist` 미들웨어가 서버와 클라이언트 간의 hydration 불일치를 일으킬 수 있음
- 브라우저 새로고침 시 저장된 상태가 올바르게 복원되지 않을 수 있음

### 2. 초기화 타이밍 문제 (Initialization Timing Issues)
- 데모 사용자 데이터가 스토어 초기화 전에 접근되려고 할 때 발생
- 컴포넌트 마운트 시점에 데모 사용자가 아직 생성되지 않은 상태

### 3. 순환 의존성 문제 (Circular Dependencies)
- `useUserAuth`와 `useStore` 간의 순환 참조 가능성
- 스토어 간의 의존성이 초기화 순서에 영향을 줄 수 있음

### 4. 에러 처리 부족 (Lack of Error Handling)
- 로그인 함수에서 예외가 발생했을 때 적절한 처리가 없음
- 디버깅을 위한 로그가 부족하여 문제 진단이 어려움

## 구현된 해결책 (Implemented Solution)

### 1. 데모 사용자 초기화 강화 (Enhanced Demo User Initialization)

```typescript
// 기본 데모 사용자 데이터를 상수로 정의
const DEFAULT_DEMO_USER: User = {
  id: '1',
  email: 'user@example.com',
  name: 'SELPIC', // 사용자가 직접 입력할 수 있도록 기본값 설정
  phone: '', // 빈 값으로 설정하여 사용자가 입력하도록 함
  address: '', // 빈 값으로 설정하여 사용자가 입력하도록 함
  password: 'password123'
}

// 초기화 함수 추가
initializeDemoUser: () => {
  const { users } = get()
  const demoUserExists = users.find(u => u.email === 'user@example.com')
  
  if (!demoUserExists) {
    set({
      users: [...users, DEFAULT_DEMO_USER]
    })
  }
}
```

### 2. 로그인 함수 개선 (Improved Login Function)

```typescript
login: async (email: string, password: string, keepLoggedIn: boolean = false) => {
  try {
    // 데모 사용자 초기화 확인
    get().initializeDemoUser()
    
    const { users } = get()
    const user = users.find(u => u.email === email)
    
    if (!user) {
      console.log('User not found:', email)
      return false
    }
    
    if (user.password !== password) {
      console.log('Password mismatch for user:', email)
      return false
    }
    
    // 로그인 성공
    set({
      isLoggedIn: true,
      user,
      keepLoggedIn,
      lastActivity: Date.now()
    })
    
    console.log('Login successful for:', email)
    return true
  } catch (error) {
    console.error('Login error:', error)
    return false
  }
}
```

### 3. 스토어 재수화 시 초기화 (Store Rehydration Initialization)

```typescript
persist(
  // ... store configuration
  {
    name: 'user-auth-store',
    partialize: (state) => ({
      isLoggedIn: state.isLoggedIn,
      user: state.user,
      keepLoggedIn: state.keepLoggedIn,
      lastActivity: state.lastActivity,
      users: state.users
    }),
    onRehydrateStorage: () => (state) => {
      // 스토어가 재수화될 때 데모 사용자 초기화
      if (state) {
        state.initializeDemoUser()
      }
    }
  }
)
```

### 4. 로그인 페이지 개선 (Enhanced Login Page)

```typescript
// 컴포넌트 마운트 시 데모 사용자 초기화
useEffect(() => {
  initializeDemoUser()
}, [initializeDemoUser])

// 전용 데모 로그인 핸들러
const handleDemoLogin = async () => {
  setIsLoading(true)
  
  try {
    // 데모 사용자 초기화 확인
    initializeDemoUser()
    
    console.log('Attempting demo login...')
    const success = await login('user@example.com', 'password123', keepLoggedIn)
    
    if (success) {
      console.log('Demo login successful')
      clearCart(true)
      router.push('/')
    } else {
      console.error('Demo login failed')
      alert(t('login.demoLoginFailed'))
    }
  } catch (error) {
    console.error('Demo login error:', error)
    alert(t('login.demoLoginFailed'))
  } finally {
    setIsLoading(false)
  }
}
```

## 데모 사용자 정보 설정 (Demo User Information Setup)

### 기본 정보 (Basic Information)
- **이름**: SELPIC (기본 설정)
- **이메일**: user@example.com (로그인용, 고정)
- **전화번호**: 빈 값 (사용자가 직접 입력)
- **주소**: 빈 값 (사용자가 직접 입력)
- **비밀번호**: password123 (고정)

### 사용자 정보 수정 방법 (How to Update User Information)
1. 데모 로그인 후 프로필 페이지(`/profile`) 방문
2. "Edit Profile" 버튼 클릭
3. 이름, 전화번호, 주소 정보 수정
4. "Save Changes" 버튼 클릭하여 저장

## 방지 조치 (Prevention Measures)

### 1. 자동 테스트 페이지 생성
- `/test-demo` 페이지에서 데모 로그인 기능을 자동으로 테스트
- 사용자 배열 상태와 로그인 성공 여부를 실시간으로 확인

### 2. 포괄적인 에러 처리
- 모든 비동기 함수에 try-catch 블록 추가
- 상세한 로그 메시지로 디버깅 지원

### 3. 상태 초기화 보장
- 컴포넌트 마운트 시점에 데모 사용자 초기화
- 스토어 재수화 시점에 데모 사용자 확인

### 4. 사용자 경험 개선
- 로딩 상태 표시
- 버튼 비활성화로 중복 클릭 방지
- 명확한 에러 메시지 제공

## 테스트 방법 (Testing Method)

1. **자동 테스트**: `/test-demo` 페이지 방문
2. **수동 테스트**: `/login` 페이지에서 "Demo Login" 버튼 클릭
3. **프로필 수정 테스트**: 로그인 후 `/profile` 페이지에서 정보 수정
4. **브라우저 콘솔**: 개발자 도구에서 로그 메시지 확인
5. **새로고침 테스트**: 페이지 새로고침 후 데모 로그인 재시도

## 향후 유지보수 (Future Maintenance)

### 1. 정기적인 테스트
- 새로운 기능 추가 시 데모 로그인 테스트 수행
- 브라우저 호환성 테스트

### 2. 모니터링
- 콘솔 로그를 통한 오류 추적
- 사용자 피드백 수집

### 3. 코드 리뷰
- 데모 사용자 관련 변경사항 검토
- 상태 관리 로직 점검

이 해결책을 통해 "Demo login failed" 오류가 반복적으로 발생하지 않도록 방지하고, 안정적인 데모 로그인 기능을 제공합니다. 또한 데모 사용자가 로그인 후 프로필 페이지에서 개인 정보를 직접 수정할 수 있도록 개선되었습니다. 