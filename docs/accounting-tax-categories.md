# SELPIC Accounting: Tax Category 전체 목록

## 개요

SELPIC Accounting: Bank AI Analyzer에서 사용하는 모든 Tax Category 목록입니다.

**총 카테고리 수: 31개**
- 수입 (Income): 4개
- 지출 (Expenses): 28개
- 이체 및 기타: 2개

---

## 수입 (Income) - 4개

### 1. Trading Revenue (사업 수입)
- **코드**: `INCOME_SALES_CLEANING`, `INCOME_SALES_STICKER`
- **UI 표시**: "Trading Revenue"
- **설명**: 청소 서비스 수입과 스티커 판매 수입을 통합한 사업 수입
- **용도**: 모든 사업적 입금 내역
- **참고**: 두 코드 모두 UI에서는 "Trading Revenue"로 통합 표시

### 2. Non-Taxable cash deposit (비과세 현금 입금)
- **코드**: `NON_TAXABLE_CASH_DEPOSIT`
- **UI 표시**: "Non-Taxable cash deposit"
- **설명**: 개인 ATM 입금 (비과세)
- **자동 감지**: `DEP`, `DEPOSIT`, `NABATM DEP` 패턴
- **용도**: 개인 현금 입금

### 3. Director's Loan (이사 대출)
- **코드**: `LIABILITY_DIRECTORS_LOAN`
- **UI 표시**: "Director's Loan"
- **설명**: 이사가 회사에 투입한 자본금 (대출 형태)
- **자동 감지**: Settings에서 설정한 Director 이름이 포함된 입금
- **용도**: 이사 자본 투입

---

## 지출 (Expenses) - 28개

### 사업 시작 비용 (Startup Costs)

#### 4. Startup Costs - Incorporation
- **코드**: `EXPENSE_STARTUP_INCORPORATION`
- **UI 표시**: "Startup Costs"
- **설명**: 회사 설립 비용

#### 5. Startup Costs - Domain
- **코드**: `EXPENSE_STARTUP_DOMAIN`
- **UI 표시**: "Startup Costs"
- **설명**: 도메인 구매 비용

#### 6. Startup Costs - Sample Production
- **코드**: `EXPENSE_STARTUP_SAMPLE`
- **UI 표시**: "Startup Costs"
- **설명**: 샘플 제작 비용

---

### 교통 및 여행 비용

#### 7. Fuel & Travel (연료 및 교통)
- **코드**: `EXPENSE_FUEL_TRAVEL`
- **UI 표시**: "Fuel & Travel"
- **설명**: 주유소, 주차장 비용
- **자동 감지 키워드**: 
  - 주유소: `7-ELEVEN`, `AMPOL`, `BP`, `LIBERTY`, `SHELL`, `UNITED`
  - 주차장: `UPTOWN PARKING`, `Secure Parking`, `BCC KGS CAR PARK`, `King George Square Car Park`

#### 8. Motor Vehicle Expenses (차량 유지비)
- **코드**: `EXPENSE_MOTOR_VEHICLE`
- **UI 표시**: "Motor Vehicle Expenses"
- **설명**: 차량 정비, 수리, 타이어 교체 비용
- **자동 감지 키워드**: 
  - 정비: `MECHANIC`, `MECHANIC SERVICE`, `AUTO SERVICE`, `SERVICE`, `CAR SERVICE`, `VEHICLE SERVICE`
  - 수리: `REPAIR`, `AUTO REPAIR`, `CAR REPAIR`, `VEHICLE REPAIR`
  - 타이어: `TYRE`, `TYRES`, `TYRE SERVICE`, `TYRE REPLACEMENT`, `TYRE SHOP`

#### 9. Travel & Accommodation (여행 및 숙박)
- **코드**: `EXPENSE_TRAVEL_ACCOMMODATION`
- **UI 표시**: "Travel & Accommodation"
- **설명**: 출장 숙박, 교통비
- **자동 감지 키워드**: 
  - 숙박: `HOTEL`, `MOTEL`, `ACCOMMODATION`, `BOOKING`, `AIRBNB`
  - 교통: `UBER`, `UBER EATS`, `UBER TRIP`, `LINKT`, `LINKT TOLL`, `TOLL`, `TOLL ROAD`
  - 항공: `AIRLINE`, `AIRLINES`, `QANTAS`, `VIRGIN`, `JETSTAR`, `FLIGHT`
  - 택시: `TAXI`, `TAXI SERVICE`, `CAB`

#### 10. Meals & Entertainment (식대 및 접대비)
- **코드**: `EXPENSE_MEALS_ENTERTAINMENT`
- **UI 표시**: "Meals & Entertainment"
- **설명**: 출장 및 업무 미팅 관련 식대, 클라이언트 접대비
- **자동 감지**: 비즈니스 관련 식대 (출장, 클라이언트 미팅 등)
- **참고**: 개인 식대는 `UNCATEGORIZED`로 분류

---

### 보험 및 전문 서비스

#### 11. Insurance/Professional (보험 및 전문 서비스)
- **코드**: `EXPENSE_INSURANCE_PROFESSIONAL`
- **UI 표시**: "Insurance/Professional"
- **설명**: 회사 보험료, 전문 서비스 비용
- **자동 감지 키워드**: `ALLIANZ`, `NRMA`, `TAL`, `RACQ`, `OKTAX`, `OKTAX PTY LTD`
- **참고**: 개인 이름이 포함된 보험은 `UNCATEGORIZED` + `personal`로 분류

---

### 사업 운영 비용

#### 12. Cleaning Supplies (청소 용품)
- **코드**: `EXPENSE_CLEANING_SUPPLIES`
- **UI 표시**: "Cleaning Supplies"
- **설명**: 청소 용품 및 장비 구매
- **자동 감지 키워드**: `KleenHub`, `KLEENHUB`, `BUNNINGS`, `TOTAL TOOLS`

#### 13. Utilities/Phone (공공요금 및 전화)
- **코드**: `EXPENSE_UTILITIES_PHONE`
- **UI 표시**: "Utilities/Phone"
- **설명**: 인터넷, 전기, 전화 요금
- **자동 감지 키워드**: `TPG Internet`, `TPG Telecom`, `ALINTA ENERGY`, `Aldi Mobile`
- **참고**: `Brisbane City Council (Rates)`는 사업 관련 시설 비용인 경우에만 이 카테고리 사용

#### 14. Subcontractor (하도급업체)
- **코드**: `EXPENSE_CLEANING_SUBCONTRACTOR`
- **UI 표시**: "Subcontractor"
- **설명**: 하도급업체 지급 비용
- **자동 감지 키워드**: `MJR ENTERPRISE`, `MJRENTERPRISE`
- **참고**: ABN 없이 $75 이상 지급 시 **No ABN Withholding (47%)** 경고 표시

#### 15. Repairs & Maintenance (수리 및 유지보수)
- **코드**: `EXPENSE_REPAIRS_MAINTENANCE`
- **UI 표시**: "Repairs & Maintenance"
- **설명**: 건물/시설 수리 및 유지보수 비용
- **자동 감지 키워드**: 
  - `HANDYMAN`, `HANDY MAN`, `PLUMBING`, `PLUMBER`
  - `ELECTRICAL`, `ELECTRICIAN`, `REPAIR`, `MAINTENANCE`, `FIX`, `FIXING`
- **Capital Improvement 확인**: 
  - 금액이 **$5,000 이상**이거나
  - 리모델링 키워드 (`RENOVATION`, `REMODEL`, `RENOVATE`) 포함 시
  - → **"Capital Improvement 확인 필요"** 툴팁 표시
  - Capital Improvement는 즉시 공제되지 않을 수 있음

#### 16. Office Equipment & Assets (사무용 장비 및 자산)
- **코드**: `EXPENSE_OFFICE_EQUIPMENT`
- **UI 표시**: "Office Equipment & Assets"
- **설명**: 컴퓨터, 가구, 장비 구매
- **자동 감지 키워드**: `COMPUTER`, `LAPTOP`, `PRINTER`, `FURNITURE`, `DESK`, `CHAIR`, `EQUIPMENT`, `ASSET`

#### 17. Office Supplies (사무용품)
- **코드**: `EXPENSE_OFFICE_SUPPLIES`
- **UI 표시**: "Office Supplies"
- **설명**: 일반 사무용품 구매

#### 18. Rent (임대료)
- **코드**: `EXPENSE_RENT`
- **UI 표시**: "Rent"
- **설명**: 사무실/창고 임대료

#### 19. Marketing & Advertising (마케팅 및 광고)
- **코드**: `EXPENSE_MARKETING`
- **UI 표시**: "Marketing & Advertising"
- **설명**: 마케팅 및 광고 비용

---

### 인건비 및 급여

#### 20. Wages & Salaries (급여 및 봉급)
- **코드**: `EXPENSE_WAGES_SALARIES`
- **UI 표시**: "Wages & Salaries"
- **설명**: 직원 급여
- **PAYG 태그**: 
  - `requiresPAYG: true`
  - `isPayrollTransaction: true`
  - `payrollType: 'employee'`

#### 21. Superannuation (연금)
- **코드**: `EXPENSE_SUPERANNUATION`
- **UI 표시**: "Superannuation"
- **설명**: 직원 연금 기여금
- **PAYG 태그**: 
  - `requiresPAYG: true`
  - `isPayrollTransaction: true`

#### 22. Director's Fees (이사 보수)
- **코드**: `EXPENSE_DIRECTORS_FEES`
- **UI 표시**: "Director's Fees"
- **설명**: 이사 보수
- **PAYG 태그**: 
  - `requiresPAYG: true`
  - `isPayrollTransaction: true`
  - `payrollType: 'director'`
- **참고**: Tax-free threshold 없이 계산됨

---

### 세금 및 정부 납부

#### 23. ATO - GST & BAS (GST 및 BAS 납부)
- **코드**: `EXPENSE_ATO_GST_BAS`
- **UI 표시**: "ATO - GST & BAS"
- **설명**: ATO에 납부하는 GST 및 BAS

#### 24. ATO - PAYG Withholding (PAYG 원천징수 납부)
- **코드**: `EXPENSE_ATO_PAYG_WITHHOLDING`
- **UI 표시**: "ATO - PAYG Withholding"
- **설명**: ATO에 납부하는 PAYG 원천징수

#### 25. Company Income Tax (법인세)
- **코드**: `EXPENSE_COMPANY_INCOME_TAX`
- **UI 표시**: "Company Income Tax"
- **설명**: 회사 소득세

#### 26. Workers Compensation (근로자 보상)
- **코드**: `EXPENSE_WORKERS_COMPENSATION`
- **UI 표시**: "Workers Compensation"
- **설명**: WorkCover 비용

---

### 전문 서비스 및 기타

#### 27. Accounting & Professional Fees (회계 및 전문 서비스 수수료)
- **코드**: `EXPENSE_ACCOUNTING_PROFESSIONAL_FEES`
- **UI 표시**: "Accounting & Professional Fees"
- **설명**: 회계사, 변호사 등 전문 서비스 수수료

#### 28. Director Loan Repayment (이사 대출 상환)
- **코드**: `EXPENSE_DIRECTOR_LOAN_REPAYMENT`
- **UI 표시**: "Director Loan Repayment"
- **설명**: 이사에게 대출 상환한 금액
- **자동 감지**: Settings에서 설정한 Director 이름이 포함된 출금

#### 29. Dividends Paid (배당금 지급)
- **코드**: `EXPENSE_DIVIDENDS_PAID`
- **UI 표시**: "Dividends Paid"
- **설명**: 주주에게 지급한 배당금

---

## 이체 및 기타 - 2개

### 30. Non-Taxable Transfer (비과세 이체)
- **코드**: `NON_TAXABLE_TRANSFER`, `TRANSFER_INTERNAL`, `TRANSFER_PARTNERSHIP_TO_COMPANY`
- **UI 표시**: "Non-Taxable Transfer"
- **설명**: 개인 간 이체, 계좌 간 이체 등 비과세 이체
- **자동 감지 키워드**: 
  - `LINKED ACC TRNS`, `Linked Acc Trns`
  - `MRS HEE KIM`, `HEE KIM`, `JINSOO KIM`, `KIM J` (개인 이름)
  - `REFUND FEES` (개인 이름 포함)
  - `INTER-BANK CREDIT`, `Transfer from`, `Internal Transfer`, `Account-to-Account`
- **참고**: 사업 수입에서 제외됨

### 31. Uncategorized (미분류)
- **코드**: `UNCATEGORIZED`
- **UI 표시**: "Uncategorized"
- **설명**: 분류되지 않은 거래
- **용도**: 
  - 개인 지출 (예: `SCHOOL24`, `HURRIKANE`, `HANARO TRADING`, `MR TOYS`, `BENTLEYS`, `METROPOL PHARMACY`)
  - 분류 불가능한 거래
  - 개인 보험 (Director 이름 포함)

---

## 주요 기능

### 1. 자동 키워드 매핑
다음 카테고리들이 키워드 기반 자동 분류를 지원합니다:
- Fuel & Travel
- Motor Vehicle Expenses
- Travel & Accommodation
- Meals & Entertainment
- Insurance/Professional
- Cleaning Supplies
- Utilities/Phone
- Subcontractor
- Repairs & Maintenance
- Office Equipment & Assets

### 2. PAYG 태그
급여 관련 카테고리는 자동으로 PAYG 태그가 설정됩니다:
- `requiresPAYG: true`
- `isPayrollTransaction: true`
- `payrollType: 'employee' | 'director' | 'contractor' | 'partner'`

### 3. Capital Improvement 확인
Repairs & Maintenance 카테고리에서:
- 금액이 **$5,000 이상**이거나
- 리모델링 키워드 (`RENOVATION`, `REMODEL`, `RENOVATE`) 포함 시
- → **"Capital Improvement 확인 필요"** 툴팁 표시

### 4. No ABN Withholding 경고
하도급업체 지급 시:
- ABN 없이 **$75 이상** 지급 시
- → **"No ABN (47%)"** 경고 배지 표시
- 원천징수 금액 계산 및 표시

### 5. Director Loan 자동 감지
Settings에서 설정한 Director 이름 기반:
- 입금: `LIABILITY_DIRECTORS_LOAN` (이사 대출)
- 출금: `EXPENSE_DIRECTOR_LOAN_REPAYMENT` (이사 대출 상환)

### 6. GST 감지
모든 거래에 대해 AI 기반 GST 감지:
- `isGSTIncluded`: GST 포함 여부
- `gstType`: `INCLUDED` | `EXCLUDED` | `FREE`
- `gstAmount`: GST 금액
- `netAmount`: 순액

### 7. 사용자 수정 학습 기능
사용자가 수동으로 카테고리를 수정하면:
- 거래 내역과 카테고리 매핑 저장
- 다음 업로드 시 자동 적용 (Fuzzy Matching)
- "Learned" 배지 표시

---

## 카테고리 그룹별 통계

### 수입 (Income)
- Trading Revenue: 2개 코드 (통합 표시)
- Non-Taxable cash deposit: 1개
- Director's Loan: 1개
- **총 4개**

### 지출 (Expenses)
- Startup Costs: 3개
- 교통 및 여행: 4개
- 보험 및 전문 서비스: 1개
- 사업 운영 비용: 8개
- 인건비 및 급여: 3개
- 세금 및 정부 납부: 4개
- 전문 서비스 및 기타: 3개
- **총 28개**

### 이체 및 기타
- Non-Taxable Transfer: 3개 코드 (통합 표시)
- Uncategorized: 1개
- **총 2개**

---

## 업데이트 이력

- 2025-01-XX: Motor Vehicle Expenses, Travel & Accommodation, Meals & Entertainment 추가
- 2025-01-XX: Repairs & Maintenance, Office Equipment & Assets 추가
- 2025-01-XX: Capital Improvement 확인 기능 추가

---

## 참고사항

1. **UI 통합 표시**: 일부 카테고리는 내부적으로 여러 코드를 사용하지만 UI에서는 하나로 통합 표시됩니다.
   - `INCOME_SALES_CLEANING`, `INCOME_SALES_STICKER` → "Trading Revenue"
   - `EXPENSE_STARTUP_*` → "Startup Costs"
   - `NON_TAXABLE_TRANSFER`, `TRANSFER_INTERNAL` → "Non-Taxable Transfer"

2. **자동 감지 우선순위**: 키워드 기반 자동 감지는 AI 분류보다 우선 적용됩니다.

3. **Department 분류**: 대부분의 사업 비용은 `cleaning` (Company) 부서로 분류되며, 개인 지출은 `personal` 부서로 분류됩니다.

4. **Excel 내보내기**: 모든 카테고리는 Excel 내보내기 시 올바른 이름으로 변환됩니다.
