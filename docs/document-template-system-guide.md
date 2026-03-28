# Document Template System 가이드

## 📋 현재 상태

### 완료된 작업

#### Phase 1: 템플릿 스토어 구축 ✅
- **파일**: `lib/documentTemplateStore.ts`
- **기능**:
  - 6가지 Document Type 지원 (Order Confirmation, Receipt, Invoice, Shipping Notification, Contract, Other)
  - 각 템플릿별 독립적인 설정 (Email Settings, Content Settings)
  - `localStorage`를 통한 영구 저장
  - Invoice 템플릿과 `useInvoiceStore` 자동 동기화

#### Phase 2: 템플릿 관리 UI ✅
- **파일**: `app/admin/documents/page.tsx`
- **위치**: Document Settings 탭
- **기능**:
  - 각 Document Type별 템플릿 카드 (Edit Template, Preview 버튼)
  - 템플릿 편집 모달 (Email Settings, Content Settings)
  - Company & Payment 정보 통합 관리
  - 실시간 저장 (수정 즉시 반영)

#### Phase 3: 자동 발송 시스템 연결 ✅
- **파일**: `lib/store.ts`
- **기능**:
  - `sendOrderConfirmationEmail()` 함수가 템플릿 스토어 사용
  - `resendOrderConfirmationEmail()` 함수도 템플릿 스토어 사용
  - 템플릿 placeholder 치환 (`{orderId}`, `{customerName}`, `{companyName}` 등)
  - 이메일 본문 자동 생성 (템플릿 + 주문 데이터)

---

## 🏗️ 시스템 구조

### 1. 템플릿 스토어 (`lib/documentTemplateStore.ts`)

```typescript
// 6가지 Document Type
type DocumentType = 
  | 'order_confirmation'  // 주문 확인서
  | 'receipt'            // 영수증
  | 'invoice'            // 인보이스
  | 'shipping_notification' // 배송 알림
  | 'contract'           // 계약서
  | 'other'              // 기타 문서

// 각 템플릿 구조
interface DocumentTemplate {
  type: DocumentType
  company: CompanyInfo      // 회사 정보
  email: EmailSettings       // 이메일 설정
  content: ContentSettings  // 타입별 콘텐츠 설정
  lastModified: string
  version: number
}
```

### 2. 템플릿 관리 UI (`app/admin/documents/page.tsx`)

**Document Settings 탭 구조:**
```
Document Settings
├── Company & Payment Information
│   └── Edit Company & Payment Info 버튼
│       ├── Company Name, ABN, Phone, Email, Address
│       └── Bank, BSB, Account, Payment Note
│
└── Document Templates
    ├── Order Confirmation (Edit Template, Preview)
    ├── Receipt (Edit Template, Preview)
    ├── Invoice (Edit Template, Preview)
    ├── Shipping Notification (Edit Template, Preview)
    ├── Contract (Edit Template, Preview)
    └── Other Document (Edit Template, Preview)
```

### 3. 자동 발송 시스템 (`lib/store.ts`)

**자동 발송 시점:**
1. **주문 생성 시** (`app/checkout/page.tsx`)
   - 고객이 주문 완료 → 자동으로 Order Confirmation 이메일 발송

2. **주문 상태 변경 시** (`lib/store.ts`의 `updateOrderStatus`)
   - 관리자가 주문 상태를 'paid'로 변경 → 자동으로 Order Confirmation 이메일 발송

**작동 흐름:**
```
주문 생성/상태 변경
    ↓
sendOrderConfirmationEmail() 호출
    ↓
템플릿 스토어에서 Order Confirmation 템플릿 가져오기
    ↓
주문 데이터와 템플릿 병합
    ↓
이메일 본문 생성 (generateEmailContent)
    ↓
Placeholder 치환 ({orderId}, {customerName} 등)
    ↓
emailService.sendResponse() 호출
    ↓
이메일 발송 완료
```

---

## 🎯 사용 방법

### 1. 템플릿 편집하기

#### Step 1: Document Settings 탭 접근
1. Admin Dashboard → **Document Sender** 메뉴 클릭
2. **Document Settings** 탭 클릭

#### Step 2: 템플릿 선택 및 편집
1. 원하는 Document Type의 **"Edit Template"** 버튼 클릭
   - 예: Order Confirmation 템플릿 편집
2. 템플릿 편집 모달에서 설정 변경:

   **Email Settings:**
   - **Email Subject**: `Order Confirmation - Order #{orderId}`
   - **Greeting**: `Dear {customerName},`
   - **Custom Message**: 추가 메시지 입력
   - **Closing**: `Best regards,`

   **Content Settings** (타입별):
   - **Order Confirmation**: 
     - ☑ Show Order Details
     - ☑ Show Order Items
     - Additional Message
   - **Receipt**:
     - ☑ Show Payment Method
     - ☑ Show Order Items
     - Additional Message
   - **Invoice**:
     - Notes (인보이스 하단에 표시)
     - Additional Message
   - **Shipping Notification**:
     - ☑ Show Tracking Information
     - ☑ Show Estimated Delivery Date
     - Additional Message

3. **"Save Template"** 버튼 클릭
   - 변경사항이 즉시 템플릿 스토어에 저장됨
   - 다음 자동 발송부터 새 템플릿이 사용됨

### 2. Company & Payment 정보 수정하기

1. Document Settings 탭에서 **"Edit Company & Payment Info"** 버튼 클릭
2. Company Information 수정:
   - Company Name, ABN, Phone, Email, Address
3. Payment Details 수정:
   - Bank, BSB, Account Number, Payment Note
4. **"Save Changes"** 버튼 클릭
   - 모든 Document Type의 템플릿에 자동 반영됨

### 3. 템플릿 Preview 확인하기

1. Document Settings 탭에서 원하는 템플릿의 **👁️ Preview** 버튼 클릭
2. 현재 템플릿의 Subject와 설명 확인

---

## 🔧 Placeholder 사용법

템플릿에서 사용 가능한 Placeholder:

### Email Subject & Message에서 사용:
- `{orderId}` - 주문 ID
- `{customerName}` - 고객 이름
- `{companyName}` - 회사 이름
- `{orderDate}` - 주문 날짜
- `{orderTotal}` - 주문 총액
- `{orderStatus}` - 주문 상태
- `{itemCount}` - 주문 항목 수
- `{shippingAddress}` - 배송 주소
- `{paymentMethod}` - 결제 방법

### 사용 예시:

**Email Subject:**
```
Order Confirmation - Order #{orderId} from {companyName}
```

**Greeting:**
```
Dear {customerName},
```

**Custom Message:**
```
Thank you for your order! Your order #{orderId} has been confirmed.
Order Date: {orderDate}
Total: {orderTotal}
```

---

## 📊 데이터 흐름

### 템플릿 저장 흐름:
```
관리자가 템플릿 편집
    ↓
템플릿 편집 모달에서 수정
    ↓
"Save Template" 클릭
    ↓
documentTemplates.updateTemplate() 호출
    ↓
템플릿 스토어에 저장 (localStorage)
    ↓
다음 자동 발송부터 새 템플릿 사용
```

### 자동 발송 흐름:
```
주문 생성 또는 상태 변경
    ↓
sendOrderConfirmationEmail(orderId) 호출
    ↓
템플릿 스토어에서 템플릿 가져오기
    getTemplate('order_confirmation')
    ↓
주문 데이터 가져오기
    orders.find(o => o.id === orderId)
    ↓
이메일 본문 생성
    generateEmailContent(template, order, companyName)
    ↓
Placeholder 치환
    replaceTemplatePlaceholders(text, variables)
    ↓
이메일 발송
    emailService.sendResponse({...})
    ↓
이메일 발송 완료
```

---

## 🔄 동기화 시스템

### Invoice 템플릿 동기화:
- `useInvoiceStore`의 `defaultTemplate`과 `documentTemplateStore`의 Invoice 템플릿이 자동 동기화됨
- Document Settings에서 Company/Payment 정보 수정 시:
  - 모든 Document Type의 `company` 정보 업데이트
  - Invoice 템플릿의 `payment` 정보 업데이트

### 초기화:
- `app/admin/documents/page.tsx`에서 `initializeDocumentTemplates()` 호출
- Invoice 템플릿이 없거나 `useInvoiceStore`의 템플릿이 더 최신이면 자동 동기화

---

## 🎨 템플릿 타입별 설정

### 1. Order Confirmation
- **Email Settings**: Subject, Greeting, Custom Message, Closing
- **Content Settings**:
  - `showOrderDetails`: 주문 상세 정보 표시 여부
  - `showItems`: 주문 항목 목록 표시 여부
  - `customMessage`: 추가 안내 메시지

### 2. Receipt
- **Email Settings**: Subject, Greeting, Custom Message, Closing
- **Content Settings**:
  - `showPaymentMethod`: 결제 방법 표시 여부
  - `showItems`: 주문 항목 목록 표시 여부
  - `customMessage`: 추가 안내 메시지

### 3. Invoice
- **Email Settings**: Subject, Greeting, Custom Message, Closing
- **Content Settings**:
  - `notes`: 인보이스 하단에 표시될 노트
  - `customMessage`: 추가 메시지

### 4. Shipping Notification
- **Email Settings**: Subject, Greeting, Custom Message, Closing
- **Content Settings**:
  - `showTrackingInfo`: 추적 정보 표시 여부
  - `showEstimatedDelivery`: 예상 배송일 표시 여부
  - `customMessage`: 추가 안내 메시지

### 5. Contract
- **Email Settings**: Subject, Greeting, Custom Message, Closing
- **Content Settings**:
  - `contractText`: 계약서 본문
  - `customMessage`: 추가 메시지

### 6. Other Document
- **Email Settings**: Subject, Greeting, Custom Message, Closing
- **Content Settings**:
  - `documentText`: 문서 본문
  - `customMessage`: 추가 메시지

---

## 🚀 향후 확장 가능성

### 추가 가능한 기능:
1. **Receipt 자동 발송**
   - 결제 완료 시 자동으로 Receipt 템플릿 사용

2. **Shipping Notification 자동 발송**
   - 배송 시작 시 자동으로 Shipping Notification 템플릿 사용

3. **Invoice 자동 발송**
   - Invoice 생성 시 자동으로 Invoice 템플릿 사용

4. **템플릿 버전 관리**
   - 템플릿 변경 이력 추적
   - 이전 버전으로 롤백 기능

5. **템플릿 미리보기**
   - 실제 주문 데이터로 템플릿 미리보기
   - PDF 다운로드 기능

---

## 📝 주요 파일 위치

- **템플릿 스토어**: `lib/documentTemplateStore.ts`
- **템플릿 관리 UI**: `app/admin/documents/page.tsx` (Document Settings 탭)
- **자동 발송 로직**: `lib/store.ts` (`sendOrderConfirmationEmail`, `resendOrderConfirmationEmail`)
- **이메일 서비스**: `lib/emailService.ts`
- **Invoice 스토어**: `lib/invoiceStore.ts`

---

## ✅ 체크리스트

### 관리자가 할 일:
- [ ] Document Settings에서 각 템플릿 편집
- [ ] Company & Payment 정보 업데이트
- [ ] Placeholder 사용하여 개인화된 메시지 작성
- [ ] 템플릿 Preview로 확인

### 개발자가 할 일 (향후):
- [ ] Receipt 자동 발송 구현
- [ ] Shipping Notification 자동 발송 구현
- [ ] Invoice 자동 발송 구현
- [ ] 템플릿 버전 관리 기능 추가

---

**현재 시스템은 완전히 작동하며, 관리자가 템플릿을 수정하면 자동 발송 이메일에 즉시 반영됩니다!** 🎉

