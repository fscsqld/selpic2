# 고객 등급 상승/하락 가이드

## 📋 개요

고객의 구매 금액에 따라 VIP 등급이 자동으로 업데이트되어야 하는데 반영이 안 될 때, 관리자가 수동으로 등급을 변경하거나 자동 업데이트를 재개할 수 있는 방법을 설명합니다.

---

## 🔄 자동 등급 업데이트 메커니즘

### 자동 업데이트가 발생하는 시점:
1. **주문 생성 시** (`createOrder`)
   - 고객이 주문을 완료하면 자동으로 등급이 재계산됩니다
   - 취소되지 않은 주문의 총 금액을 기준으로 등급이 결정됩니다

2. **주문 취소 시** (`updateOrderStatus` → `cancelled`)
   - 주문이 취소되면 해당 주문 금액이 총 구매 금액에서 제외됩니다
   - 등급이 자동으로 재계산됩니다

3. **주문 배송 완료 시** (`updateOrderStatus` → `shipped`)
   - 배송 완료 시에도 등급이 재계산됩니다

### 자동 업데이트가 작동하지 않는 경우:
- `manualGradeOverride: true`로 설정된 고객은 자동 업데이트가 건너뜁니다
- 주문 데이터와 사용자 이메일/전화번호가 일치하지 않는 경우
- 주문 생성 시 `updateUserGrade` 함수가 실행되지 않은 경우

---

## 🛠️ 수동 등급 변경 방법

### 방법 1: User Management 페이지에서 개별 변경

**위치**: `/admin/users`

**절차**:
1. 관리자 페이지 → **User Management** 메뉴 접속
2. 등급을 변경할 고객을 검색하거나 목록에서 찾기
3. 고객 행의 **"Edit"** 버튼 클릭 (또는 고객 정보 보기)
4. VIP 등급 섹션에서 **"Edit"** 버튼 클릭
5. **"New Grade"** 드롭다운에서 원하는 등급 선택
   - Basic (0)
   - Silver (1)
   - Gold (2)
   - Black (3)
   - VVIP (4)
6. **"Reason for Manual Grade Change"** 필드에 변경 사유 입력 (선택사항)
7. **"Save Changes"** 버튼 클릭

**결과**:
- 고객의 등급이 즉시 변경됩니다
- `manualGradeOverride: true`로 설정되어 자동 업데이트가 비활성화됩니다
- 이후 주문이 생성되어도 등급이 자동으로 변경되지 않습니다

### 방법 2: VIP Grade Status Monitoring 페이지에서 변경

**위치**: `/admin/users/grades`

**절차**:
1. 관리자 페이지 → **VIP Grade Status Monitoring** 메뉴 접속
2. **"Borderline Customers"** 섹션 또는 **"Grade Distribution"** 섹션에서 고객 찾기
3. 고객 행의 **"Edit"** 버튼 클릭
4. 등급 변경 모달에서:
   - **"New Grade"** 드롭다운에서 등급 선택
   - **"Reason"** 필드에 변경 사유 입력
5. **"Save"** 버튼 클릭

---

## 🔓 자동 업데이트 재개 방법

수동으로 등급을 변경한 고객의 경우, 자동 업데이트를 다시 활성화할 수 있습니다.

### 방법: 수동 등급 변경 해제

**위치**: `/admin/users` 또는 `/admin/users/grades`

**절차**:
1. 수동 등급 변경이 설정된 고객 찾기 (🔒 아이콘 표시)
2. 고객 정보 보기 또는 등급 편집 모달 열기
3. **"Remove Override"** 또는 **"Enable Auto Update"** 버튼 클릭
   - 또는 등급 편집 모달에서 현재 등급과 동일한 등급으로 다시 설정

**결과**:
- `manualGradeOverride: false`로 변경됩니다
- `gradeOverrideReason`이 삭제됩니다
- 이후 주문 생성/취소 시 등급이 자동으로 업데이트됩니다

---

## 📊 등급 기준 확인

등급 기준은 **VIP Grade Management** 페이지에서 확인 및 수정할 수 있습니다.

**위치**: `/admin/content` → **VIP Grade Management**

**현재 등급 기준** (기본값):
- **Basic (0)**: $0 ~ $100
- **Silver (1)**: $100 ~ $300
- **Gold (2)**: $300 ~ $1,000
- **Black (3)**: $1,000 ~ $3,000
- **VVIP (4)**: $3,000 이상

**참고**: 관리자가 등급 기준을 변경하면, 자동 업데이트 시 새로운 기준이 적용됩니다.

---

## 🔍 등급이 반영되지 않는 원인 진단

### 1. 수동 등급 변경 확인
- 고객 정보에 🔒 아이콘이 있는지 확인
- `manualGradeOverride: true`인 경우 자동 업데이트가 비활성화되어 있습니다

### 2. 주문 데이터 확인
- 고객의 이메일/전화번호와 주문의 이메일/전화번호가 일치하는지 확인
- 취소된 주문은 총 구매 금액에서 제외됩니다

### 3. 총 구매 금액 확인
- 프로필 페이지의 "Total Purchase Amount" 확인
- Order History의 총합과 비교
- 두 값이 다르면 주문 매칭 문제일 수 있습니다

### 4. 등급 기준 확인
- VIP Grade Management에서 등급 기준 확인
- 고객의 총 구매 금액이 어느 등급 범위에 해당하는지 확인

---

## 💡 권장 사항

1. **일반적인 경우**: 자동 업데이트를 사용하세요
   - 대부분의 경우 주문 생성/취소 시 자동으로 등급이 업데이트됩니다

2. **특별한 경우에만 수동 변경**: 
   - 프로모션으로 등급을 일시적으로 상승시킬 때
   - 특별한 고객 서비스를 제공할 때
   - 시스템 오류로 등급이 잘못 계산된 경우

3. **수동 변경 후**: 
   - 변경 사유를 명확히 기록하세요
   - 필요시 자동 업데이트를 재개하세요

---

## 📝 참고 사항

- 수동 등급 변경은 `gradeUpdatedAt` 필드에 타임스탬프가 기록됩니다
- 수동 등급 변경 사유는 `gradeOverrideReason` 필드에 저장됩니다
- 수동 등급 변경이 설정된 고객은 `recalculateAllUserGrades` 함수에서 제외됩니다

---

## Customer VIP Benefits & Promo Codes (English-first notice)

Use these concise notices to inform customers about their discounts and promo code rules. Place them where purchase intent is highest (cart/checkout) and where customers review their status (profile / promo code history / FAQ).

- **Where to show**
  - **Cart → Order Summary**: show estimated VIP discount (already implemented) with a short link “See all benefits”.
  - **Checkout → Your VIP Grade**: show applied discount, free-shipping status, stacking rule, and minimum purchase if any.
  - **Profile → VIP Grade card**: show current grade, base discount, category-specific discount (Market S/Phonecase), free shipping, and progress to next grade.
  - **Game Promo Code History**: explain how game promo codes are earned, their usage limit, and expiry.
  - **FAQ/Help** (footer/header link): one page that lists all grade benefits and promo code rules.

- **What to say (short format)**
  - *Example*: “Your grade: Silver — Stickers/Stamps 5% off (min $10), Market S 0%, Free shipping: No. Promo codes: Min order applies; per-user limits; stacking depends on settings.”
  - Include: current grade, per-category discount, free-shipping flag, minimum purchase, stacking rule (VIP vs Promo), and usage limits for promo codes.

- **Promo code rules to surface**
  - Minimum purchase amount (if set)
  - Per-user usage limit and total usage limit
  - Applicable categories/products
  - Stacking: VIP `allowPromoCodeStacking` + promo code `allowVIPStacking`
  - Expiry dates (start/end)

- **Tone**: Keep all notices in English by default. Use one-line summaries with a “Learn more” link to the FAQ.

