  # 실제 이메일 전송 설정 가이드

## 🚨 현재 상태
현재는 **시뮬레이션 모드**로 작동하며, 실제 이메일이 전송되지 않습니다.
성공률을 98%로 설정했으므로 대부분의 경우 성공할 것입니다.

## 📧 실제 이메일 전송을 위한 설정

### 옵션 1: EmailJS 사용 (권장)

#### 1. EmailJS 계정 생성
1. https://emailjs.com 접속
2. 무료 계정 생성 (월 200개 이메일 무료)
3. Service 생성 (Gmail, Outlook 등)
4. Template 생성

#### 2. EmailJS 라이브러리 설치
```bash
npm install @emailjs/browser
```

#### 3. 설정 값 입력
`lib/emailService.ts` 파일에서 다음 값들을 실제 값으로 변경:

```typescript
// EmailJS configuration
private serviceId = 'your_actual_service_id'      // EmailJS에서 제공
private templateId = 'your_actual_template_id'    // EmailJS에서 제공  
private publicKey = 'your_actual_public_key'      // EmailJS에서 제공
```

#### 4. 코드 활성화
`l있도로로ib/emailService.ts`에서 주석 해제:

```typescript
// 현재 주석된 부분을 활성화
const result = await emailjs.send(
  this.serviceId,
  this.templateId,
  {
    to_email: params.customerEmail,
    to_name: params.customerName,
    subject: params.subject,
    message: trackedContent,
    from_name: params.adminName || 'SELPIC Support Team',
    reply_to: 'info@selpic.com.au'
  }
)
```

### 옵션 2: Resend 사용

#### 1. Resend 계정 생성
1. https://resend.com 접속
2. API 키 발급

#### 2. Resend 라이브러리 설치
```bash
npm install resend
```

#### 3. 환경 변수 설정
`.env.local` 파일 생성:
```
RESEND_API_KEY=your_resend_api_key
```

#### 4. API 라우트 생성
`app/api/send-email/route.ts`:
```typescript
import { Resend } from 'resend'
import { NextRequest } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { to, subject, html } = await request.json()
  
  try {
    const data = await resend.emails.send({
      from: 'SELPIC Support <support@yourdomain.com>',
      to: [to],
      subject: subject,
      html: html,
    })
    
    return Response.json(data)
  } catch (error) {
    return Response.json({ error }, { status: 500 })
  }
}
```

### 옵션 3: Nodemailer 사용

#### 1. Nodemailer 설치
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

#### 2. SMTP 설정
```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransporter({
  service: 'gmail', // 또는 다른 이메일 서비스
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
})
```

## 🔧 빠른 해결책 (시뮬레이션 모드)

현재 오류를 빠르게 해결하려면:

### 1. 성공률 100%로 설정
`lib/emailService.ts`:
```typescript
// 항상 성공하도록 설정
const isSuccess = true // Math.random() > 0.02
```

### 2. 오류 처리 개선
더 친화적인 오류 메시지:
```typescript
if (!isSuccess) {
  throw new Error('네트워크 연결을 확인하고 다시 시도해주세요.')
}
```

## 📋 현재 설정으로 테스트

현재 설정(98% 성공률)에서 몇 번 더 시도해보세요:

1. Admin Messages 페이지 접속
2. 메시지 선택
3. Reply 버튼 클릭
4. 이메일 작성 후 Send Email 클릭

2% 확률로 실패하므로 대부분 성공할 것입니다.

## 🚀 프로덕션 배포 시 권장사항

1. **EmailJS 또는 Resend 사용**: 안정적이고 사용하기 쉬움
2. **도메인 인증**: 스팸 폴더에 들어가지 않도록
3. **DKIM/SPF 설정**: 이메일 신뢰도 향상
4. **이메일 템플릿**: 브랜딩된 HTML 템플릿 사용
5. **전송량 모니터링**: API 사용량 추적

## 📞 추가 지원

실제 이메일 설정에 어려움이 있다면:
1. EmailJS 공식 문서: https://www.emailjs.com/docs/
2. Resend 공식 문서: https://resend.com/docs
3. 이 프로젝트의 이슈 트래커에 문의
