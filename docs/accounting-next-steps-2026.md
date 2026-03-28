# SELPIC A: 다음 단계 개발 계획

## 📋 현재 상태 요약

### ✅ 완료된 주요 기능

1. **파일 파싱 시스템**
   - ✅ CBA PDF Parser
   - ✅ ANZ PDF Parser
   - ✅ NAB PDF Parser
   - ✅ Westpac PDF Parser
   - ✅ Universal CSV Parser

2. **AI 분류 시스템**
   - ✅ 31개 ATO Tax Category 자동 분류
   - ✅ 사용자 학습 기능 (User Mappings)
   - ✅ Fuzzy Matching
   - ✅ Debit/Credit 자동 감지
   - ✅ Director's Loan 자동 감지
   - ✅ FBT Risk 감지

3. **세금 관리 기능**
   - ✅ PAYG Withholding 계산
   - ✅ GST Settlement (GST Collected/Paid/Net)
   - ✅ BAS 리포트 생성 (Excel Export)
   - ✅ Tax Deadline Tracker
   - ✅ Payment Estimates

4. **데이터 관리**
   - ✅ IndexedDB 영속성
   - ✅ Excel Export (General Ledger)
   - ✅ Cash & Petty Cash 관리
   - ✅ Receipt Image Upload (AI Vision)
   - ✅ Data Backup/Restore

5. **UI/UX**
   - ✅ Tab-based Navigation (Dashboard/History/Settings)
   - ✅ Transaction Table (필터링, 수정)
   - ✅ Financial Summary Cards
   - ✅ Expense Charts (Pie/Bar)
   - ✅ API Balance Dashboard
   - ✅ Session API Cost Badge

---

## ✅ 완료된 수정 사항

### 1. Statement History 저장/로드 문제 ✅ (해결 완료)
**상태**: Statement History가 완벽하게 작동 중

**해결된 내용**:
- ✅ IndexedDB 저장/로드 로직 정상 작동
- ✅ Total Records 정확히 표시
- ✅ 새로고침 후에도 History 유지
- ✅ Load 버튼으로 데이터 정상 로드
- ✅ transactions 배열 검증 및 기본값 처리 완료

---

## 📝 다음 단계 개발 계획

### Phase 1: 데이터 영속성 개선 (Priority 2)

#### 1.1 Statement History 안정화 ✅ (완료)
- [x] IndexedDB 저장/로드 로직 재검토
- [x] 에러 핸들링 강화
- [x] 데이터 무결성 검증
- [ ] 자동 백업 기능 (선택적)

#### 1.2 데이터 동기화
- [ ] 여러 탭 간 데이터 동기화
- [ ] 실시간 업데이트 (CustomEvent)
- [ ] 충돌 해결 로직

#### 1.3 성능 최적화
- [ ] 대용량 데이터 처리 (Pagination)
- [ ] IndexedDB 인덱싱 최적화
- [ ] 메모리 사용량 모니터링

---

### Phase 2: 기능 확장 (Priority 3)

#### 2.1 고급 리포트 기능
- [ ] **Income Statement (손익계산서)**
  - Revenue vs Expenses 비교
  - Net Profit 계산
  - 기간별 비교

- [ ] **Balance Sheet (대차대조표)**
  - Assets, Liabilities, Equity
  - Director's Loan Balance
  - 현금 흐름 추적

- [ ] **Tax Summary Report**
  - 연간 세금 요약
  - 카테고리별 세금 공제 가능 금액
  - ATO 제출용 리포트

#### 2.2 예산 관리
- [ ] 예산 설정 (카테고리별)
- [ ] 예산 vs 실제 지출 비교
- [ ] 예산 초과 알림

#### 2.3 재발주 관리
- [ ] 반복 거래 패턴 감지
- [ ] 자동 재발주 알림
- [ ] 구독/정기 결제 관리

---

### Phase 3: 사용자 경험 개선 (Priority 4)

#### 3.1 검색 및 필터링 고도화
- [ ] 고급 검색 (날짜 범위, 금액 범위, 키워드)
- [ ] 저장된 필터 프리셋
- [ ] 빠른 필터 (자주 사용하는 조합)

#### 3.2 대시보드 커스터마이징
- [ ] 위젯 배치 변경
- [ ] 카드 표시/숨김
- [ ] 개인화된 대시보드

#### 3.3 알림 시스템
- [ ] 세금 마감일 알림
- [ ] 예산 초과 알림
- [ ] 중요한 거래 알림

---

### Phase 4: 통합 및 자동화 (Priority 5)

#### 4.1 은행 API 연동
- [ ] Open Banking API 연동 (선택적)
- [ ] 자동 거래 가져오기
- [ ] 실시간 잔액 동기화

#### 4.2 회계 소프트웨어 연동
- [ ] Xero 연동
- [ ] MYOB 연동
- [ ] QuickBooks 연동

#### 4.3 이메일 리포트
- [ ] 주간/월간 리포트 자동 전송
- [ ] 세금 마감일 리마인더
- [ ] 중요 거래 알림

---

### Phase 5: 고급 기능 (Priority 6)

#### 5.1 다중 회사 관리
- [ ] 여러 회사 프로필 관리
- [ ] 회사 간 데이터 분리
- [ ] 통합 리포트

#### 5.2 팀 협업
- [ ] 사용자 권한 관리
- [ ] 거래 승인 워크플로우
- [ ] 댓글 및 메모 기능

#### 5.3 AI 고도화
- [ ] 거래 패턴 학습
- [ ] 이상 거래 감지
- [ ] 세금 절감 제안

---

## 🔧 기술적 개선 사항

### 1. 코드 품질
- [ ] TypeScript 타입 안정성 강화
- [ ] 에러 바운더리 추가
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성

### 2. 성능
- [ ] 코드 스플리팅
- [ ] 이미지 최적화
- [ ] API 호출 최적화
- [ ] 캐싱 전략 개선

### 3. 보안
- [ ] API 키 암호화
- [ ] 데이터 암호화 (민감 정보)
- [ ] XSS/CSRF 방지
- [ ] Rate Limiting 강화

### 4. 접근성
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 지원
- [ ] 색상 대비 개선
- [ ] 반응형 디자인 개선

---

## 📊 우선순위 매트릭스

| 우선순위 | 기능 | 예상 시간 | 영향도 | 상태 |
|---------|------|----------|--------|------|
| ~~P1~~ | ~~Statement History 수정~~ | ~~2-4시간~~ | ~~높음~~ | ✅ 완료 |
| P2 | Income Statement 리포트 | 3-5일 | 높음 | 🔄 다음 |
| P3 | Balance Sheet 리포트 | 3-5일 | 높음 | ⏳ 대기 |
| P4 | 데이터 영속성 개선 | 1-2주 | 중간 | ⏳ 대기 |
| P5 | 고급 리포트 기능 | 2-3주 | 중간 | ⏳ 대기 |
| P6 | 사용자 경험 개선 | 1-2주 | 중간 | ⏳ 대기 |
| P7 | 통합 및 자동화 | 3-4주 | 낮음 | ⏳ 대기 |
| P8 | 고급 기능 | 4-6주 | 낮음 | ⏳ 대기 |

---

## 🎯 단기 목표 (다음 2주)

1. ✅ **Statement History 문제 해결** (완료)
2. **Income Statement 리포트 추가** (다음 우선순위)
3. **Balance Sheet 리포트 추가**
4. **검색 기능 개선**

---

## 📝 참고 문서

- `docs/accounting-tax-categories.md` - Tax Category 전체 목록
- `docs/accounting-development-status.md` - 현재 개발 상태
- `docs/accounting-current-vs-next-steps.md` - 이전 단계 비교

---

**마지막 업데이트**: 2026-01-XX
**Statement History**: ✅ 완료 (2026-01-XX)
**다음 리뷰**: Income Statement 리포트 개발 시작 전
