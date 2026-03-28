# GST 정산 기능 완성 - 중복 제거 및 정리된 다음 단계

> **작업 기간**: 4-5일  
> **우선순위**: 🔴 높음 (BAS 신고 필수)  
> **현재 완료율**: 40% → 목표: 100%

---

## ✅ 현재 완료된 GST 관련 작업 (중복 방지)

### 1. 기본 GST 계산 함수 ✅
**위치**: `apps/accounting-sandbox/lib/excel-export/index.ts`

```typescript
// 이미 구현됨
export function calculateGST(amount: number, isInclusive: boolean = true): number {
  if (isInclusive) {
    return Math.round((amount / 11) * 100) / 100  // GST 포함 금액에서 계산
  } else {
    return Math.round((amount * 0.1) * 100) / 100  // GST 제외 금액에서 계산
  }
}
```

**용도**: 
- Excel 내보내기 시 각 거래의 GST 계산
- Financial Summary의 GST 계산

**중복 방지**: ✅ 이 함수는 재사용 (수정 불필요)

---

### 2. 카테고리 기반 GST 포함 여부 판별 ✅
**위치**: `apps/accounting-sandbox/lib/excel-export/index.ts`

```typescript
// 이미 구현됨
export function hasGST(category: string): boolean {
  // 카테고리 기반 판별 (간단한 규칙)
  const gstCategories = [...]
  const noGSTCategories = [...]
  // ...
}
```

**용도**:
- Excel 내보내기 시 카테고리 기반 GST 포함 여부 판별
- Financial Summary 계산 시 사용

**한계**:
- 카테고리만으로 판별 (거래별 정확도 낮음)
- AI 기반 판별 없음

**중복 방지**: ✅ 이 함수는 유지하되, AI 판별 결과로 대체/보완

---

### 3. Excel 내보내기 GST 포함 ✅
**위치**: `apps/accounting-sandbox/lib/excel-export/index.ts`

```typescript
// 이미 구현됨
const gst = hasGST(tx.category) ? calculateGST(Math.abs(amount)) : 0
const netAmount = Math.abs(amount) - gst
```

**용도**: Excel 내보내기 시 각 거래의 GST 및 Net Amount 표시

**중복 방지**: ✅ 기존 로직 유지, AI 판별 결과 반영만 추가

---

### 4. Financial Summary GST 표시 ✅
**위치**: 
- `apps/accounting-sandbox/lib/utils/financial-summary.ts`
- `apps/accounting-sandbox/app/page.tsx`

```typescript
// 이미 구현됨
totalGSTPayable: number    // 수입에서 GST 계산
totalGSTClaimable: number  // 지출에서 GST 계산
```

**용도**: 대시보드에 GST Payable/Claimable 표시

**한계**:
- 모든 수입/지출에 GST 포함 가정
- GST Collected/Paid 분리 없음
- GST Net 계산 없음

**중복 방지**: ✅ 기존 표시 유지, 새로운 GST Summary 컴포넌트 추가

---

## 🎯 다음 단계: 중복 제거된 작업 목록

### 작업 1: GST 포함 여부 AI 판별 (1-2일) ⭐ 신규

#### 목표
거래별로 AI 기반 정확한 GST 포함 여부 판별 (기존 카테고리 기반 판별 보완)

#### 구현 내용

**1. 새로 생성할 파일**:
```
apps/accounting-sandbox/lib/gst-settlement/
├── types.ts              # 타입 정의 (신규)
├── gst-detector.ts       # GST 감지 엔진 (신규)
└── index.ts              # Export (신규)
```

**2. 주요 기능**:
- AI 프롬프트 설계: 호주 GST 규칙 학습
- 거래별 판별: `INCLUDED`, `EXCLUDED`, `FREE`
- 판별 근거 제공: AI가 판별 이유 설명
- 신뢰도 점수: 0-1 사이의 confidence 값

**3. 기존 코드와의 통합**:
- `app/api/analyze/route.ts`: AI 분류 후 GST 판별 추가
- 각 거래에 `gstInfo` 필드 추가
- **기존 `hasGST()` 함수는 유지** (하위 호환성, 기본 판별용)

**4. 판별 결과 저장**:
```typescript
interface ClassifiedTransaction {
  // ... 기존 필드들
  gstInfo?: {
    isGSTIncluded: boolean
    gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
    confidence: number
    reasoning?: string
  }
}
```

---

### 작업 2: GST Collected/Paid 분리 계산 (1일) ⭐ 신규

#### 목표
GST Collected (수입)와 GST Paid (지출)를 분리하여 Net 계산

#### 구현 내용

**1. 새로 생성할 파일**:
```
apps/accounting-sandbox/lib/gst-settlement/
└── gst-calculator.ts    # GST Net 계산 엔진 (신규)
```

**2. 계산 로직**:
```
GST Collected = 수입 거래 중 GST 포함 거래의 GST 합계
GST Paid = 지출 거래 중 GST 포함 거래의 GST 합계
GST Net = GST Collected - GST Paid
```

**3. 기존 코드와의 차이점**:
- **기존**: `totalGSTPayable = totalIncome / 11` (모든 수입에 GST 포함 가정)
- **신규**: AI 판별 결과를 기반으로 GST 포함 거래만 집계

**4. 기간별 집계**:
- 분기별 집계 (BAS 신고용)
- 월별 집계 (월별 모니터링용)

**5. 결과 데이터 구조**:
```typescript
interface GSTSummary {
  period: { startDate, endDate, type, label }
  gstCollected: { total, transactionCount, transactions[] }
  gstPaid: { total, transactionCount, transactions[] }
  gstNet: number
  gstRefund: boolean
}
```

---

### 작업 3: BAS 리포트에 GST 섹션 추가 (1일) ⭐ 신규

#### 목표
기존 PAYG BAS 리포트에 GST 섹션 추가

#### 구현 내용

**1. 수정할 파일**:
```
apps/accounting-sandbox/lib/payg-withholding/
└── bas-reporter.ts    # BAS 리포트 인터페이스 및 Excel 내보내기 수정
```

**2. 추가할 내용**:
- `BASReport` 인터페이스에 `gstSummary` 필드 추가
- `generateBASReport` 함수에 GST 계산 추가
- `exportBASToExcel` 함수에 GST 섹션 추가

**3. Excel 내보내기 구조**:
```
Business Activity Statement (BAS)
├── Period Information
├── PAYG Withholding Summary (기존)
│   ├── Total Gross Pay
│   ├── Total Withholding Tax
│   └── Breakdown by Recipient Type
└── GST Summary (신규)
    ├── GST Collected (G1)
    ├── GST Paid (G11)
    └── GST Net (1A)
```

**4. 기존 코드와의 통합**:
- 기존 PAYG BAS 리포트 로직 유지
- GST 섹션만 추가 (기존 로직 수정 최소화)

---

### 작업 4: GST 요약 대시보드 컴포넌트 (1일) ⭐ 신규

#### 목표
독립적인 GST 요약 컴포넌트 생성 (기존 Financial Summary와 별도)

#### 구현 내용

**1. 새로 생성할 파일**:
```
apps/accounting-sandbox/components/
└── GSTSummary.tsx    # GST 요약 컴포넌트 (신규)
```

**2. UI 구성**:
- GST Collected 카드: 수입에서 징수한 GST
- GST Paid 카드: 지출에서 납부한 GST
- GST Net 카드: 납부/환급 금액
- 기간별 필터: 분기별/월별 토글
- BAS 리포트 내보내기 버튼

**3. 기존 코드와의 차이점**:
- **기존**: Financial Summary에 간단한 GST Payable/Claimable 표시
- **신규**: 독립적인 컴포넌트로 상세한 GST 정보 표시
- **통합**: 두 컴포넌트 모두 표시 (기존 유지 + 신규 추가)

**4. 대시보드 통합**:
```typescript
// app/page.tsx
{transactions.length > 0 && (
  <div className="space-y-6">
    <FinancialSummary transactions={transactions} />  {/* 기존 유지 */}
    <PAYGSummary transactions={transactions} />
    <GSTSummary transactions={transactions} />      {/* 신규 추가 */}
    <TransactionTable ... />
  </div>
)}
```

---

## 📋 중복 제거 체크리스트

### ✅ 유지할 기존 기능 (수정 불필요)
- [x] `calculateGST()` 함수 - 재사용
- [x] `hasGST()` 함수 - 기본 판별용으로 유지
- [x] Excel 내보내기 GST 계산 - AI 결과 반영만 추가
- [x] Financial Summary GST 표시 - 기존 유지

### ⭐ 새로 구현할 기능 (중복 없음)
- [ ] GST 포함 여부 AI 판별 엔진
- [ ] GST Collected/Paid 분리 계산
- [ ] BAS 리포트 GST 섹션
- [ ] 독립적인 GST 요약 대시보드

---

## 🔄 구현 순서 (중복 방지)

### Step 1: GST 감지 엔진 구현
1. 타입 정의 파일 생성 (`lib/gst-settlement/types.ts`)
2. GST 감지 엔진 구현 (`lib/gst-settlement/gst-detector.ts`)
3. API Route에 통합 (`app/api/analyze/route.ts`)
   - AI 분류 후 GST 판별 추가
   - 각 거래에 `gstInfo` 필드 저장
4. **기존 `hasGST()` 함수는 유지** (하위 호환성)

### Step 2: GST 계산 엔진 구현
1. GST 계산 엔진 구현 (`lib/gst-settlement/gst-calculator.ts`)
2. AI 판별 결과를 기반으로 GST Collected/Paid 계산
3. **기존 `calculateGST()` 함수는 재사용** (GST 금액 계산)

### Step 3: BAS 리포트 확장
1. BAS 리포트 인터페이스 확장 (`lib/payg-withholding/bas-reporter.ts`)
2. `generateBASReport` 함수에 GST 계산 추가
3. Excel 내보내기에 GST 섹션 추가
4. **기존 PAYG 섹션은 유지**

### Step 4: 대시보드 통합
1. GST 요약 컴포넌트 생성 (`components/GSTSummary.tsx`)
2. 대시보드에 통합 (`app/page.tsx`)
3. **기존 Financial Summary는 유지** (별도 표시)

---

## 📊 기존 vs 신규 비교

### GST 계산 방식

| 항목 | 기존 방식 | 신규 방식 |
|------|----------|----------|
| **판별 방법** | 카테고리 기반 (`hasGST()`) | AI 기반 거래별 판별 |
| **정확도** | 낮음 (카테고리만 확인) | 높음 (거래 설명 분석) |
| **GST Collected** | 없음 (모든 수입에 GST 포함 가정) | AI 판별 결과 기반 정확한 계산 |
| **GST Paid** | 없음 (모든 지출에 GST 포함 가정) | AI 판별 결과 기반 정확한 계산 |
| **GST Net** | 없음 | GST Collected - GST Paid |

### 대시보드 표시

| 항목 | 기존 | 신규 |
|------|------|------|
| **Financial Summary** | GST Payable/Claimable 간단 표시 | 유지 (기존 표시) |
| **GST Summary** | 없음 | 독립적인 상세 컴포넌트 추가 |

### Excel 내보내기

| 항목 | 기존 | 신규 |
|------|------|------|
| **각 거래 GST** | 카테고리 기반 계산 | AI 판별 결과 반영 |
| **BAS 리포트** | PAYG만 포함 | PAYG + GST 통합 |

---

## 🎯 최종 정리된 다음 단계

### 작업 1: GST 포함 여부 AI 판별 (1-2일) ⭐ 신규
- **목적**: 거래별 정확한 GST 포함 여부 판별
- **기존 코드 활용**: `calculateGST()` 함수 재사용
- **신규 구현**: AI 기반 판별 엔진
- **통합 위치**: `app/api/analyze/route.ts`

### 작업 2: GST Collected/Paid 분리 계산 (1일) ⭐ 신규
- **목적**: GST Collected와 GST Paid 분리 계산
- **기존 코드 활용**: `calculateGST()` 함수 재사용
- **신규 구현**: GST Net 계산 엔진
- **차이점**: AI 판별 결과 기반 정확한 계산 (기존은 모든 거래에 GST 포함 가정)

### 작업 3: BAS 리포트에 GST 섹션 추가 (1일) ⭐ 신규
- **목적**: BAS 리포트에 GST 정보 추가
- **기존 코드 활용**: 기존 PAYG BAS 리포트 로직 유지
- **신규 구현**: GST 섹션 추가
- **통합**: PAYG와 GST 통합 리포트

### 작업 4: GST 요약 대시보드 (1일) ⭐ 신규
- **목적**: 독립적인 GST 요약 컴포넌트
- **기존 코드 활용**: 기존 Financial Summary 유지
- **신규 구현**: 상세한 GST 요약 컴포넌트
- **통합**: 두 컴포넌트 모두 표시

---

## ✅ 중복 방지 원칙

1. **기존 함수 재사용**: `calculateGST()`, `hasGST()` 함수는 수정하지 않고 재사용
2. **기존 표시 유지**: Financial Summary의 GST 표시는 그대로 유지
3. **기존 로직 보완**: AI 판별 결과로 기존 판별 로직 보완
4. **신규 기능 추가**: 중복 없이 새로운 기능만 추가

---

**예상 소요 시간**: 4-5일  
**우선순위**: 🔴 높음 (BAS 신고 필수)
