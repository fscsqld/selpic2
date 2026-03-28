# Department 필드 분석 및 중복 확인

## 📋 정의된 Department 값들

### 타입 정의
- **파일**: `apps/accounting-sandbox/lib/pdf-parser/types.ts`
- **타입**: `DepartmentType = 'cleaning' | 'sticker' | 'personal' | 'general' | 'unknown'`

### UI 표시 매핑
- **파일**: `apps/accounting-sandbox/lib/i18n/strings.ts`
```typescript
departments: {
  cleaning: 'Company',    // ⚠️ 'sticker'와 동일한 표시
  sticker: 'Company',     // ⚠️ 'cleaning'와 동일한 표시
  personal: 'Personal',
  general: 'General',
  unknown: 'Unknown',
}
```

## 🔍 실제 사용 현황

### 1. **'cleaning'** ✅ 많이 사용됨
- `app/api/analyze/route.ts`: 16곳에서 사용
- 모든 사업 거래에 기본값으로 사용
- UI 표시: 'Company'

### 2. **'personal'** ✅ 많이 사용됨
- `app/api/analyze/route.ts`: 10곳 이상에서 사용
- 개인 거래에 사용
- UI 표시: 'Personal'

### 3. **'sticker'** ⚠️ 거의 사용되지 않음
- 정의는 있지만 실제 코드에서 거의 사용되지 않음
- UI 표시: 'Company' (cleaning과 동일)
- **문제**: cleaning과 동일한 의미로 사용됨

### 4. **'general'** ⚠️ 일관성 없음
- `lib/department-classifier/index.ts`: 반환 가능
- `lib/ai-classifier/openai-classifier.ts`: 유효한 값으로 인정
- `components/TransactionTable.tsx`: **옵션에 없음** ❌
- **문제**: 정의는 있지만 UI에서 선택할 수 없음

### 5. **'unknown'** ⚠️ 거의 사용되지 않음
- `components/TransactionTable.tsx`: 옵션에 있음
- 실제 코드에서 거의 사용되지 않음
- UI 표시: 'Unknown'

## ❌ 발견된 문제점

### 1. **중복된 의미**
- `'cleaning'`과 `'sticker'` 모두 UI에서 'Company'로 표시됨
- 실제로는 `'cleaning'`만 사용되고 `'sticker'`는 거의 사용되지 않음

### 2. **일관성 없는 옵션**
- `TransactionTable.tsx`의 Department 드롭다운:
  - ✅ `cleaning` (Company)
  - ✅ `personal` (Personal)
  - ✅ `sticker` (Company)
  - ❌ `general` **없음** (하지만 AI 분류기는 반환 가능)
  - ✅ `unknown` (Unknown)

### 3. **비즈니스 로직 불일치**
- `lib/utils/business-calculations.ts`:
  ```typescript
  const isBusiness = tx.department !== 'unknown' &&
                    (tx.department === 'cleaning' || 
                     tx.department === 'sticker' || 
                     !tx.department)
  ```
  - `'general'`은 business로 간주되지 않음
  - `'unknown'`은 business로 간주되지 않음

## 💡 권장 수정 사항

### 옵션 1: 'general' 옵션 추가
- `TransactionTable.tsx`에 `'general'` 옵션 추가
- 일관성 유지

### 옵션 2: 'general' 제거 및 'unknown'으로 통합
- `'general'`을 완전히 제거
- 모든 `'general'` 반환을 `'unknown'`으로 변경

### 옵션 3: 'cleaning'과 'sticker' 통합
- `'sticker'` 제거
- 모든 `'sticker'`를 `'cleaning'`으로 변경
- 단순화

## 📊 현재 상태 요약

| Department | UI 표시 | 실제 사용 | TransactionTable 옵션 | 비즈니스 로직 |
|------------|---------|-----------|----------------------|--------------|
| `cleaning` | Company | ✅ 많이 사용 | ✅ 있음 | ✅ Business |
| `sticker` | Company | ❌ 거의 안 씀 | ✅ 있음 | ✅ Business |
| `personal` | Personal | ✅ 많이 사용 | ✅ 있음 | ❌ 제외 |
| `general` | General | ⚠️ 일부 사용 | ❌ **없음** | ❌ 제외 |
| `unknown` | Unknown | ⚠️ 거의 안 씀 | ✅ 있음 | ❌ 제외 |

## 🎯 결론

**주요 문제:**
1. `'general'`이 정의되어 있지만 UI에서 선택할 수 없음
2. `'cleaning'`과 `'sticker'`가 중복된 의미 (둘 다 'Company')
3. `'sticker'`가 거의 사용되지 않음

**권장 조치:**
- `TransactionTable.tsx`에 `'general'` 옵션 추가 (일관성 유지)
- 또는 `'general'`을 `'unknown'`으로 통합 (단순화)
