# Australia Post 라벨 출력 (내일 작업용) 작업 계획서

목표: 고객 주문이 들어오면 관리자 주문 관리 화면에서 **AusPost 라벨(PDF 또는 ZPL)을 생성**하고, 클릭으로 **바로 인쇄 흐름**을 제공한다.

---

## 0) 오늘 확정/결정해야 할 것 (내일 작업 시작 전 5분)

1. **라벨 출력 방식**
   - **A4/일반 프린터(PDF)**: 가장 빠르게 구현 가능 (추천 시작점)
   - **라벨 프린터(ZPL)**: 현장 업무 최적화(열전사), 자동 출력까지 가려면 추가 구성 필요

2. **“원클릭 자동 출력” 필요 여부**
   - **브라우저 인쇄창(사용자 확인 포함)**: 웹만으로 가능, 보안 제약 적음
   - **무인 자동 출력**: 브라우저만으로 불가 → 아래 중 하나 선택
     - QZ Tray(로컬 프린트 브릿지)
     - Electron 관리자 앱
     - 키오스크/정책 기반 브라우저 구성
     - 서버→프린터(IP/프린트 서버) 직접 전송(환경 필요)

3. **AusPost 계정/계약 상태**
   - MyPost Business + Parcel contract 여부
   - API 접근(테스트/프로덕션) 크리덴셜 확보 여부
   - MLID(Merchant Location ID), charge account 등 필요한 식별자 보유 여부

---

## 1) AusPost API 방식 (권장 표준)

AusPost Shipping & Tracking API 흐름:

1) **Create Shipment** (발송 정보 생성)
2) **Create Label**: `POST https://digitalapi.auspost.com.au/shipping/v1/labels`
   - PDF(기본) 또는 ZPL 지원
   - 소량이면 동기 모드(라벨 URL 즉시 반환) 사용 가능
3) (선택) **Manifest 생성/다운로드**: 일일 발송 마감 처리

---

## 2) 내일 구현 1차 목표 (MVP)

### MVP 스코프 (PDF 인쇄)

- 주문 관리 페이지에서 주문을 선택하고:
  - **Create AusPost label** 버튼
  - 성공 시 **View/Print label(PDF)** 버튼
  - PDF를 새 탭으로 열거나 모달로 열고, 사용자가 인쇄(Ctrl+P)

### MVP가 성공했는지 기준

- 라벨 PDF가 생성되고
- 주문별로 재생성/재출력이 가능하며
- 인쇄에 필요한 정보(수취인 주소/발신지/서비스/트래킹)가 PDF에 정상 반영된다.

---

## 3) 구현 단계 (내일 할 일 체크리스트)

### A. 데이터 준비

- 주문 데이터에 아래가 있는지 확인
  - 수취인: 이름/주소/주/우편번호/국가/연락처
  - 상품: 무게(필수), 크기(필요 시), 수량
  - 서비스: Parcel Post / Express 등 서비스 코드 결정
- 발신지(Origin)는 `lib/companyLegal.ts`의 `COMPANY_CONTACT.address` 또는 전용 “warehouse origin” 설정으로 고정할지 결정

### B. 환경 변수 / 시크릿

- AusPost API 키/시크릿(테스트/프로덕션)
- 계정/charge account/MLID 관련 값
- 서버에서만 사용 (브라우저로 노출 금지)

### C. 서버 API 라우트(Next.js) 설계

예시(제안):

- `POST /api/admin/shipping/auspost/shipments`  
  입력: orderId  
  출력: shipmentId + articleIds + tracking 등

- `POST /api/admin/shipping/auspost/labels`  
  입력: shipmentId 또는 orderId  
  출력: label 다운로드 URL(PDF) 또는 base64(PDF) 중 1개 방식

권장: URL 반환 후 프론트에서 그 URL을 열어 인쇄(대용량 base64 회피).

### D. Admin UI 연결

- 주문 상세/목록에 버튼 추가:
  - Create label
  - View/Print label
  - Download label
- 라벨 상태 표시:
  - Not created / Created / Failed
  - 생성 시각 + 생성자 + 마지막 오류 메시지

### E. 저장/캐싱 정책

- 라벨을 매번 새로 생성할지 vs 한 번 생성 후 URL/ID 저장할지 결정
- 재출력 버튼은 “기존 라벨 열기” 우선, 실패 시 재생성

---

## 4) 2차 목표(옵션): 원클릭 자동 출력

### 옵션 1) QZ Tray

- 관리자 PC에 QZ Tray 설치
- 브라우저에서 로컬 프린터 목록 접근/선택
- 라벨(PDF)을 QZ로 보내 “선택된 프린터”로 자동 출력

장점: 웹 기반 유지하면서 자동 출력 가능  
단점: PC별 설치/설정 필요, 서명/권한 처리

### 옵션 2) ZPL + 라벨 프린터

- AusPost API에서 ZPL로 생성
- QZ Tray 또는 로컬 에이전트로 Zebra 등 라벨 프린터에 전송

---

## 5) 테스트 체크리스트 (내일 마감 전)

- [ ] 테스트 주문 1건으로 라벨 생성 성공
- [ ] 주소가 긴 경우(아파트/유닛) 줄바꿈/오버플로 문제 없음
- [ ] Postcode/State/Suburb 검증(필요 시 AusPost suburb validation 사용)
- [ ] 동일 주문 “재출력” 가능
- [ ] Admin 권한 없이 API 호출 불가(보안)
- [ ] 프로덕션에서 PDF가 제대로 열리고 인쇄됨(브라우저별: Chrome/Edge)

---

## 6) 내일 시작할 때 필요한 정보(사용자에게 요청할 것)

1) 출력 방식: **PDF(A4)** vs **ZPL(라벨프린터)**  
2) 자동 출력 필요 여부: **인쇄창 OK** vs **무인 자동출력(QZ Tray 등)**  
3) AusPost 크리덴셜 보유 여부: 테스트/프로덕션, MLID/charge account 값

---

## 7) 로컬 MVP (구현됨, 2026-05)

- **관리자 주문 상세** (`/admin/orders/[orderId]`)에 **AusPost shipping label** 섹션: 모의 PDF 생성·열기·재생성·다운로드.
- **API**
  - `POST /api/admin/shipping/auspost/label` — body: `{ "orderId": "<id>", "force"?: boolean }` → 주문에 `ausPostShippingLabel` 메타 저장 + `pdfBase64` 반환(모의).
  - `GET /api/admin/shipping/auspost/label?orderId=<id>` — 이미 생성된 모의 라벨만 PDF 바이너리로 다운로드.
- **환경 변수 (로컬)**
  - 기본은 **모의 모드**: `AUSPOST_USE_MOCK`를 비우거나 `1` / `true`.
  - `AUSPOST_USE_MOCK=0`이면 **실 API 미연결** 상태에서 501(향후 Digital API 연동 시 사용).
- **주문 스키마**: `OrderRecord.ausPostShippingLabel` (`lib/store.ts` — `AusPostShippingLabelMeta`).
- **배포**: 로컬에서 `npm run dev`로 검증 후, Git 푸시·Vercel 배포는 별도 진행하면 됨(Supabase 주문 ledger·관리자 로그인 필요).

