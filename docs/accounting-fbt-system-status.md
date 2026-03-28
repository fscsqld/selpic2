# FBT (복리후생세) 감지 시스템 현재 상태 및 계획

> **작성일**: 2026년 1월  
> **현재 진행률**: 약 **20%** 완료

---

## 📊 현재 구현 상태

### ✅ 완료된 부분 (20%)

#### 1. FBT 등록 설정 ✅
- **위치**: `components/Settings/BusinessProfileForm.tsx`
- **기능**: FBT Registered 토글 스위치
- **상태**: 완전 구현
- **설명**: 사용자가 FBT 등록 여부를 설정할 수 있음

```typescript
// BusinessProfileForm.tsx
<label htmlFor="fbt-registered">
  FBT Registered
  <input
    id="fbt-registered"
    type="checkbox"
    checked={profile.fbtRegistered || false}
    onChange={(e) => setProfile({ ...profile, fbtRegistered: e.target.checked })}
  />
</label>
```

#### 2. FBT 마감일 추적 (부분) ✅
- **위치**: `lib/tax-deadlines/tracker.ts`, `components/TaxDeadlineTracker.tsx`
- **기능**: FBT 마감일 타입 정의 및 UI 표시
- **상태**: 부분 구현 (타입 정의만, 실제 계산 로직 없음)
- **설명**: FBT 마감일 타입은 정의되어 있으나 실제 계산 로직은 미구현

```typescript
// tracker.ts
export interface TaxDeadline {
  type: 'BAS' | 'PAYG' | 'INCOME_TAX' | 'FBT'  // FBT 타입 정의됨
  // ...
}

// TaxDeadlineTracker.tsx
case 'FBT':
  return 'FBT Return'  // UI 표시만 구현
```

#### 3. FBT Risk 배지 표시 (부분) ✅
- **위치**: `components/TransactionTable.tsx` (추정)
- **기능**: $300 이상 Meals & Entertainment 거래에 FBT Risk 배지 표시
- **상태**: 부분 구현 (배지 표시만, 실제 FBT 감지 로직 없음)
- **설명**: 거래 금액이 $300 이상이고 카테고리가 `EXPENSE_MEALS_ENTERTAINMENT`인 경우 "⚠️ FBT Risk" 배지 표시

---

## ❌ 미구현 부분 (80%)

### 1. FBT 감지 엔진 (0%)

**계획안 요구사항**:
- AI 기반 FBT 대상 거래 감지
- FBT 카테고리 분류 (meal, entertainment, travel, vehicle, other)
- FBT 위험도 평가 (low, medium, high)
- FBT 금액 계산

**현재 상태**: 미구현

**필요한 파일**:
- `lib/fbt-monitoring/fbt-detector.ts` ❌
- `lib/fbt-monitoring/types.ts` ❌
- `lib/fbt-monitoring/index.ts` ❌

**예상 구현 내용**:
```typescript
// lib/fbt-monitoring/fbt-detector.ts
export interface FBTTransaction {
  transactionId: string
  date: string
  description: string
  amount: number
  fbtCategory: 'meal' | 'entertainment' | 'travel' | 'vehicle' | 'other'
  fbtRisk: 'low' | 'medium' | 'high'
  isFBTReportable: boolean
  fbtAmount?: number
  employeeName?: string
}

export class FBTDetector {
  async detectFBT(
    transaction: BankTransaction,
    context?: string[]
  ): Promise<FBTTransaction | null> {
    // AI 기반 FBT 감지 로직
  }
}
```

---

### 2. FBT 보고서 생성 (0%)

**계획안 요구사항**:
- 연간 FBT 보고서 생성
- 카테고리별/위험도별 집계
- Excel 내보내기

**현재 상태**: 미구현

**필요한 파일**:
- `lib/fbt-monitoring/fbt-reporter.ts` ❌

**예상 구현 내용**:
```typescript
// lib/fbt-monitoring/fbt-reporter.ts
export interface FBTReport {
  period: {
    startDate: string
    endDate: string
    financialYear: string
  }
  summary: {
    totalFBTAmount: number
    transactionCount: number
    byCategory: {
      meal: number
      entertainment: number
      travel: number
      vehicle: number
      other: number
    }
    byRisk: {
      low: number
      medium: number
      high: number
    }
  }
  transactions: FBTTransaction[]
}

export class FBTReporter {
  generateFBTReport(
    transactions: FBTTransaction[],
    startDate: string,
    endDate: string
  ): FBTReport {
    // FBT 보고서 생성 로직
  }
  
  exportFBTToExcel(report: FBTReport, filename: string): void {
    // Excel 내보내기
  }
}
```

---

### 3. FBT 모니터링 컴포넌트 (0%)

**계획안 요구사항**:
- FBT 거래 실시간 모니터링
- 위험도별 경고 표시
- 대시보드 통합

**현재 상태**: 미구현

**필요한 파일**:
- `components/FBTMonitor.tsx` ❌

**예상 구현 내용**:
```typescript
// components/FBTMonitor.tsx
export function FBTMonitor({ transactions }: { transactions: ClassifiedTransaction[] }) {
  // FBT 거래 필터링
  // 위험도별 그룹화
  // 경고 표시
  // 대시보드 통합
}
```

---

### 4. FBT API 엔드포인트 (0%)

**계획안 요구사항**:
- FBT 감지 API
- FBT 보고서 생성 API

**현재 상태**: 미구현

**필요한 파일**:
- `app/api/fbt-detect/route.ts` ❌
- `app/api/fbt-report/route.ts` ❌

---

### 5. FBT 마감일 계산 로직 (0%)

**계획안 요구사항**:
- FBT 연간 신고 마감일 계산 (3월 31일)
- TaxDeadlineTracker에 통합

**현재 상태**: 타입만 정의, 실제 계산 로직 없음

**필요한 수정**:
- `lib/tax-deadlines/tracker.ts`에 FBT 마감일 계산 로직 추가

**예상 구현 내용**:
```typescript
// lib/tax-deadlines/tracker.ts
export function calculateFBTDeadline(financialYearEnd: Date): Date {
  // FBT 마감일: 재정연도 종료 후 다음 해 3월 31일
  const deadline = new Date(financialYearEnd)
  deadline.setFullYear(deadline.getFullYear() + 1)
  deadline.setMonth(2) // March (0-indexed)
  deadline.setDate(31)
  return deadline
}
```

---

## 📋 계획안 대비 현재 상태

### 계획안: `accounting-module-blueprint.md`

| 기능 | 계획안 | 현재 상태 | 완료율 |
|------|--------|----------|--------|
| **FBT 감지 엔진** | AI 기반 감지 | ❌ 미구현 | 0% |
| **FBT 보고서** | 연간 보고서 생성 | ❌ 미구현 | 0% |
| **FBT 모니터링 컴포넌트** | 실시간 모니터링 | ❌ 미구현 | 0% |
| **FBT API 엔드포인트** | 감지/보고서 API | ❌ 미구현 | 0% |
| **FBT 마감일 계산** | 3월 31일 마감일 | ❌ 부분 구현 | 10% |
| **FBT 등록 설정** | Settings 토글 | ✅ 완료 | 100% |
| **FBT Risk 배지** | $300 이상 경고 | ✅ 부분 완료 | 50% |

**전체 진행률**: 약 **20%**

---

## 🎯 구현 계획

### Step 1: FBT 감지 엔진 구현 (2-3일)

**파일**: `lib/fbt-monitoring/fbt-detector.ts`

**기능**:
1. AI 기반 FBT 대상 거래 감지
2. FBT 카테고리 분류 (meal, entertainment, travel, vehicle, other)
3. FBT 위험도 평가 (low, medium, high)
4. FBT 금액 계산

**구현 내용**:
```typescript
// lib/fbt-monitoring/fbt-detector.ts
export class FBTDetector {
  private openai: OpenAI | null = null

  async detectFBT(
    transaction: BankTransaction,
    category?: string,
    apiKey?: string
  ): Promise<FBTTransaction | null> {
    // 1. FBT 대상 여부 확인 (카테고리 기반)
    if (!this.isFBTRelevantCategory(category)) {
      return null
    }

    // 2. AI 기반 FBT 감지
    const prompt = this.buildFBTDetectionPrompt(transaction, category)
    const response = await this.callOpenAI(prompt, apiKey)
    
    // 3. FBT 정보 파싱
    return this.parseFBTResponse(transaction, response)
  }

  private isFBTRelevantCategory(category?: string): boolean {
    const fbtCategories = [
      'EXPENSE_MEALS_ENTERTAINMENT',
      'EXPENSE_TRAVEL_ACCOMMODATION',
      'EXPENSE_MOTOR_VEHICLE',
      // ...
    ]
    return fbtCategories.includes(category || '')
  }

  private buildFBTDetectionPrompt(
    transaction: BankTransaction,
    category?: string
  ): string {
    return `Analyze the following Australian bank transaction for FBT (Fringe Benefits Tax) implications.

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${transaction.debit ? `-$${transaction.debit}` : `+$${transaction.credit}`}
- Category: ${category || 'UNCATEGORIZED'}

Australian FBT Rules:
FBT applies to benefits provided to employees (not contractors):
- Meals & Entertainment: Business meals, client entertainment (if over $300, high risk)
- Travel: Employee travel, accommodation
- Vehicle: Company car for private use
- Other: Gifts, memberships, etc.

FBT Risk Levels:
- Low: Under $300, clearly business-related
- Medium: $300-$500, may require FBT reporting
- High: Over $500, or luxury items, likely FBT reportable

Respond in JSON format:
{
  "isFBTRelevant": true/false,
  "fbtCategory": "meal" | "entertainment" | "travel" | "vehicle" | "other",
  "fbtRisk": "low" | "medium" | "high",
  "isFBTReportable": true/false,
  "fbtAmount": number (if reportable),
  "reasoning": "Brief explanation"
}`
  }
}
```

---

### Step 2: FBT 보고서 생성 (1일)

**파일**: `lib/fbt-monitoring/fbt-reporter.ts`

**기능**:
1. 연간 FBT 보고서 생성
2. 카테고리별/위험도별 집계
3. Excel 내보내기

**구현 내용**:
```typescript
// lib/fbt-monitoring/fbt-reporter.ts
export class FBTReporter {
  generateFBTReport(
    transactions: FBTTransaction[],
    startDate: string,
    endDate: string
  ): FBTReport {
    // 기간 내 거래 필터링
    // 카테고리별 집계
    // 위험도별 집계
    // 총 FBT 금액 계산
  }

  exportFBTToExcel(report: FBTReport, filename: string): void {
    // Excel 내보내기
  }
}
```

---

### Step 3: FBT 모니터링 컴포넌트 (1일)

**파일**: `components/FBTMonitor.tsx`

**기능**:
1. FBT 거래 실시간 모니터링
2. 위험도별 경고 표시
3. 대시보드 통합

**구현 내용**:
```typescript
// components/FBTMonitor.tsx
export function FBTMonitor({ transactions }: { transactions: ClassifiedTransaction[] }) {
  const fbtTransactions = useMemo(() => {
    return transactions.filter(tx => tx.fbtInfo?.isFBTRelevant)
  }, [transactions])

  const byRisk = useMemo(() => {
    return {
      high: fbtTransactions.filter(tx => tx.fbtInfo?.fbtRisk === 'high'),
      medium: fbtTransactions.filter(tx => tx.fbtInfo?.fbtRisk === 'medium'),
      low: fbtTransactions.filter(tx => tx.fbtInfo?.fbtRisk === 'low'),
    }
  }, [fbtTransactions])

  return (
    <div className="fbt-monitor">
      {/* 위험도별 경고 표시 */}
      {/* FBT 거래 목록 */}
      {/* FBT 보고서 내보내기 버튼 */}
    </div>
  )
}
```

---

### Step 4: API 통합 (0.5일)

**파일**: `app/api/analyze/route.ts`

**기능**:
1. 거래 분석 시 FBT 감지 통합
2. FBT 정보를 `ClassifiedTransaction`에 추가

**구현 내용**:
```typescript
// app/api/analyze/route.ts
import { FBTDetector } from '@/lib/fbt-monitoring/fbt-detector'

const fbtDetector = new FBTDetector()

// 거래 분석 루프 내에서
const fbtInfo = await fbtDetector.detectFBT(
  transaction,
  classification.category,
  apiKey
)

classifiedTransactions.push({
  ...transaction,
  ...classification,
  fbtInfo: fbtInfo ? {
    isFBTRelevant: fbtInfo.isFBTRelevant,
    fbtCategory: fbtInfo.fbtCategory,
    fbtRisk: fbtInfo.fbtRisk,
    isFBTReportable: fbtInfo.isFBTReportable,
    fbtAmount: fbtInfo.fbtAmount,
  } : undefined,
})
```

---

### Step 5: FBT 마감일 계산 로직 (0.5일)

**파일**: `lib/tax-deadlines/tracker.ts`

**기능**:
1. FBT 마감일 계산 (재정연도 종료 후 다음 해 3월 31일)
2. TaxDeadlineTracker에 통합

**구현 내용**:
```typescript
// lib/tax-deadlines/tracker.ts
export function calculateFBTDeadline(financialYearEnd: Date): Date {
  // FBT 마감일: 재정연도 종료 후 다음 해 3월 31일
  const deadline = new Date(financialYearEnd)
  deadline.setFullYear(deadline.getFullYear() + 1)
  deadline.setMonth(2) // March (0-indexed)
  deadline.setDate(31)
  return deadline
}

export function getFBTDeadlines(
  businessProfile: BusinessProfile
): TaxDeadline[] {
  if (!businessProfile.fbtRegistered) {
    return []
  }

  const financialYearEnd = new Date(businessProfile.financialYearEnd || '2025-06-30')
  const deadline = calculateFBTDeadline(financialYearEnd)
  
  return [{
    type: 'FBT',
    dueDate: deadline,
    description: 'FBT Return',
    period: `${financialYearEnd.getFullYear()}-${financialYearEnd.getFullYear() + 1}`,
  }]
}
```

---

## 📊 예상 소요 시간

| 작업 | 소요 시간 | 우선순위 |
|------|----------|---------|
| FBT 감지 엔진 구현 | 2-3일 | 🔴 높음 |
| FBT 보고서 생성 | 1일 | 🔴 높음 |
| FBT 모니터링 컴포넌트 | 1일 | 🔴 높음 |
| API 통합 | 0.5일 | 🔴 높음 |
| FBT 마감일 계산 | 0.5일 | 🟡 중간 |
| **총 예상 시간** | **4-5일** | |

---

## 🎯 우선순위

### 🔴 높은 우선순위 (법인 설립 후 즉시 필요)

1. **FBT 감지 엔진 구현** (2-3일)
   - 법인 설립 후 직원 고용 시 FBT 신고 필요
   - 가장 핵심 기능

2. **FBT 보고서 생성** (1일)
   - 연간 FBT 신고 시 필요
   - Excel 내보내기 필수

3. **FBT 모니터링 컴포넌트** (1일)
   - 실시간 FBT 거래 모니터링
   - 위험도별 경고 표시

### 🟡 중간 우선순위

4. **FBT 마감일 계산** (0.5일)
   - TaxDeadlineTracker에 통합
   - FBT 신고 마감일 알림

---

## 📝 결론

### 현재 상태
- **FBT 감지 시스템 진행률**: 약 **20%**
- **완료된 기능**: FBT 등록 설정, FBT Risk 배지 (부분)
- **미구현 기능**: FBT 감지 엔진, 보고서, 모니터링 컴포넌트

### 다음 단계
1. **FBT 감지 엔진 구현** (2-3일) - 가장 높은 우선순위
2. **FBT 보고서 생성** (1일)
3. **FBT 모니터링 컴포넌트** (1일)

### 목표
- **FBT 감지 시스템 진행률**: 20% → **100%**
- **예상 소요 시간**: 4-5일

---

**마지막 업데이트**: 2026년 1월  
**다음 업데이트 예정**: FBT 감지 엔진 구현 후
