# NAB PDF 파서 Debit/Credit 분류 수정 가이드

## 문제점 분석

### 제공된 샘플 거래:
1. `07 Oct 25 ASSOCIATEDCLEANING ASSOCIATED CLEAN JINSOO KIM $3,498.00 $5,743.80 CR`
   - **현재**: DEBIT으로 잘못 분류 (debitKeywords에 'ASSOCIATED CLEAN' 포함)
   - **올바른 분류**: CREDIT (고객으로부터의 수입)
   - **카테고리**: INCOME_SALES_CLEANING

2. `07 Oct 25 2592202 JASON FAMILY SHINE CLE $1,408.00 $7,151.80 CR`
   - **현재**: DEBIT으로 잘못 분류 (debitKeywords에 'JASON FAMILY SHINE' 포함)
   - **올바른 분류**: CREDIT (고객으로부터의 수입)
   - **카테고리**: INCOME_SALES_CLEANING

3. `07 Oct 25 ONLINE S0990592579 LINKED ACC TRNS KIM J $4,300.00 $2,712.34 CR`
   - **현재**: CREDIT으로 잘못 분류 (creditKeywords에 'LINKED ACC TRNS' 포함)
   - **올바른 분류**: DEBIT (계좌간 이체 - 돈이 나감)
   - **카테고리**: NON_TAXABLE_TRANSFER

## 수정 규칙

### CREDIT (수입) - creditKeywords에 추가:
- ASSOCIATEDCLEANING / ASSOCIATED CLEAN (고객으로부터의 수입)
- JASON FAMILY SHINE (고객으로부터의 수입)
- MALATANG (고객으로부터의 수입)
- AK INNOVATION BUILDING / AK INNOVATION (고객으로부터의 수입)
- ASEEOS HOMES / ASEEOS (고객으로부터의 수입)
- COMMON ROOM (고객으로부터의 수입)

### DEBIT (지출) - debitKeywords에 추가:
- LINKED ACC TRNS / LINKED ACC (계좌간 이체 - 돈이 나감)
- ONLINE + TRNS/TRANSFER (계좌간 이체)

### 중요 원칙:
1. **고객으로부터의 수입** → 항상 CREDIT
2. **계좌간 이체** → DEBIT (돈이 나가는 방향)
3. **서브컨트랙터 지급** → DEBIT (비즈니스 지출)

## 수정 완료 사항

✅ creditKeywords에 고객 수입 키워드 추가
✅ debitKeywords에서 고객 수입 키워드 제거
✅ debitKeywords에 계좌간 이체 키워드 추가
✅ creditKeywords에서 계좌간 이체 키워드 제거
✅ 계좌간 이체 카테고리 자동 설정 (NON_TAXABLE_TRANSFER)

