# 비밀번호 재설정 기능 설정 가이드

## 📋 개요

비밀번호 찾기 기능이 Resend를 사용하여 실제로 구현되었습니다. 이 가이드는 설정 방법을 안내합니다.

## ✅ 구현 완료 사항

1. ✅ Resend 라이브러리 설치
2. ✅ User 인터페이스에 `resetPasswordToken`, `resetPasswordExpires` 필드 추가
3. ✅ 비밀번호 재설정 토큰 생성 API (`/api/auth/forgot-password`)
4. ✅ 비밀번호 재설정 페이지 (`/reset-password`)
5. ✅ 비밀번호 찾기 페이지 수정 (실제 API 호출)

## 🔧 설정 방법

### 1단계: Resend 계정 생성 및 API 키 발급

1. **Resend 웹사이트 접속**
   - https://resend.com 접속
   - 무료 계정 생성 (월 3,000개 이메일 무료)

2. **API 키 발급**
   - Dashboard → API Keys → Create API Key
   - API 키 복사 (한 번만 표시되므로 안전하게 보관)

3. **도메인 인증 (선택사항, 권장)**
   - Dashboard → Domains → Add Domain
   - DNS 레코드 추가 (SPF, DKIM)
   - 인증 완료 후 발신자 이메일로 사용 가능

### 2단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 변수를 추가하세요:

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# 발신자 이메일 (도메인 인증 후 사용)
# 형식: "Display Name <email@domain.com>" 또는 "email@domain.com"
RESEND_FROM_EMAIL="SELPIC <noreply@selpic.com.au>"

# 애플리케이션 기본 URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**프로덕션 환경:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL="SELPIC <noreply@selpic.com.au>"
NEXT_PUBLIC_BASE_URL=https://www.selpic.com.au
```

### 3단계: 개발 환경 테스트

**환경 변수가 설정되지 않은 경우:**
- 토큰은 생성되지만 이메일은 전송되지 않습니다
- 개발 환경에서는 콘솔에 재설정 링크가 출력됩니다
- 실제 이메일 전송 없이도 기능을 테스트할 수 있습니다

**환경 변수가 설정된 경우:**
- 실제 이메일이 전송됩니다
- Resend 대시보드에서 전송 내역을 확인할 수 있습니다

## 🔄 작동 흐름

### 1. 비밀번호 찾기 요청
```
사용자 → /forgot-password 페이지
      → 이메일 입력
      → "Send Reset Link" 클릭
      → /api/auth/forgot-password API 호출
```

### 2. 토큰 생성 및 이메일 전송
```
API → 사용자 이메일 확인
   → 32바이트 랜덤 토큰 생성
   → 토큰을 사용자 데이터에 저장 (1시간 만료)
   → Resend로 이메일 전송
   → 재설정 링크 포함
```

### 3. 비밀번호 재설정
```
사용자 → 이메일에서 링크 클릭
      → /reset-password?token=xxx&email=xxx
      → 토큰 유효성 검사
      → 새 비밀번호 입력
      → 비밀번호 업데이트
      → 토큰 제거
      → /login?reset=success로 리다이렉트
```

## 🔒 보안 기능

1. **토큰 만료 시간**: 1시간 후 자동 만료
2. **이메일 열거 방지**: 존재하지 않는 이메일이어도 성공 메시지 반환
3. **토큰 일회용**: 비밀번호 재설정 후 토큰 자동 제거
4. **HTTPS 필수**: 프로덕션 환경에서는 반드시 HTTPS 사용

## 📧 이메일 템플릿

이메일은 HTML 형식으로 전송되며 다음 내용을 포함합니다:
- SELPIC 브랜딩
- 재설정 버튼
- 재설정 링크 (텍스트)
- 만료 시간 안내 (1시간)
- 보안 안내

## 🧪 테스트 방법

### 1. 개발 환경 테스트 (이메일 없이)

1. `.env.local` 파일에 `RESEND_API_KEY`를 설정하지 않음
2. `/forgot-password` 페이지 접속
3. 이메일 입력 후 "Send Reset Link" 클릭
4. 브라우저 콘솔에서 재설정 링크 확인
5. 링크를 복사하여 `/reset-password` 페이지에서 테스트

### 2. 실제 이메일 테스트

1. `.env.local` 파일에 `RESEND_API_KEY` 설정
2. Resend 대시보드에서 도메인 인증 (또는 테스트 도메인 사용)
3. `/forgot-password` 페이지에서 이메일 입력
4. 실제 이메일 수신 확인
5. 이메일의 링크 클릭하여 비밀번호 재설정

## ⚠️ 주의사항

1. **API 키 보안**
   - `.env.local` 파일은 `.gitignore`에 포함되어 있는지 확인
   - 절대 GitHub에 커밋하지 않기
   - 프로덕션 환경에서는 환경 변수로 설정

2. **도메인 인증**
   - 프로덕션에서는 반드시 도메인 인증 필요
   - 인증되지 않은 도메인은 스팸으로 분류될 수 있음

3. **전송량 제한**
   - 무료 플랜: 월 3,000개
   - 초과 시 유료 플랜 필요

## 🐛 문제 해결

### 이메일이 전송되지 않는 경우

1. **API 키 확인**
   ```bash
   # .env.local 파일 확인
   cat .env.local
   ```

2. **Resend 대시보드 확인**
   - Dashboard → Logs에서 전송 실패 원인 확인
   - API 키가 활성화되어 있는지 확인

3. **도메인 인증 확인**
   - 인증되지 않은 도메인 사용 시 제한될 수 있음
   - 테스트 도메인 사용 권장

### 토큰이 유효하지 않은 경우

1. **만료 시간 확인**: 토큰은 1시간 후 만료
2. **이미 사용된 토큰**: 한 번 사용 후 자동 제거
3. **브라우저 캐시**: 새로고침 또는 시크릿 모드로 테스트

## 📚 참고 자료

- [Resend 공식 문서](https://resend.com/docs)
- [Resend API 레퍼런스](https://resend.com/docs/api-reference)
- [도메인 인증 가이드](https://resend.com/docs/dashboard/domains/introduction)

## 🎉 완료!

이제 비밀번호 찾기 기능이 완전히 작동합니다. 사용자는 이메일을 통해 비밀번호를 안전하게 재설정할 수 있습니다.

