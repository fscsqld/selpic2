# CMS 필수 섹션 · 페이지 비교 가이드

Admin → Content에서 **`section` + `title`**이 아래와 맞아야 스토어프론트에 반영됩니다.  
이 문서는 **반드시 검토·유지해야 할 섹션**, **현재 사이트와 비교하는 절차**, **문구 추가 시 어디에 넣는지**를 한곳에 정리합니다.

---

## 1. 반드시 다루어야 하는 섹션 (우선순위)

| 우선순위 | `section` | 대상 URL | 왜 필수인가 |
|----------|-----------|----------|-------------|
| P0 | `terms` | `/terms` | 이용약관·주문/결제·환불 요약·준거법 등 |
| P0 | `privacy` | `/privacy` | APPs / Privacy Act 준수 고지 |
| P0 | `refund` | `/refund` | ACL 기반 환불·반품 정책 |
| P1 | `footer` | 홈 등 공통 푸터 | 회사 소개, 법적 링크, 뉴스레터 문구, 퀵 링크 |
| P1 | `header` | 전 페이지 헤더 | 브랜드명, 로고, 로그인/카트 URL |
| P2 | `how-it-works` | `/` (How it works) | 프로세스 설명·다국어 일관성 |
| P2 | `categories` | `/` (Shop by category 타일) | 카테고리명·설명·링크 |
| P2 | Hero Slides (콘텐츠 스토어) | `/` 메인 히어로 | 슬라이드 카피·이미지·이벤트 링크 |

**코드만 있고 CMS `content` 섹션으로 관리되지 않는 것:** `lib/companyLegal.ts`의 **법인명·ABN/ACN·도메인** 등(약관/개인정보 하단 일부와 별도). CMS 연락처와 **실제 연락처**가 어긋나지 않게 맞출 것.

---

## 2. 페이지와 CMS 비교 절차 (추가 문구 반영용)

1. 브라우저에서 해당 **URL**을 연다.
2. Admin → Content에서 같은 **`section`**을 연다.
3. 아래 **체크리스트의 `title`**을 찾아, 화면 문구와 `content`(또는 링크의 `linkUrl`)를 비교한다.
4. 수정 후 저장 → 스토어 새로고침으로 재확인.

**한글/영문 키:** `terms`·`privacy`·`refund`는 `lib/policyPageContent.ts`의 alias로 **한글 제목으로 조회해도 영문 canonical title 행**으로 연결됩니다. Admin에는 보통 **영문 `title`(시드와 동일)**을 쓰면 됩니다.

---

## 3. URL별 체크리스트 (반드시 채울 행)

### 3.1 `/terms` — `section: terms`

최소로 **비어 있으면 안 되는 실질 블록:** 상단 제목·부제, 연락처(이메일·전화·주소), 주문/결제·환불 관련 단락.

**연락처 (terms·privacy·refund):** CMS 행이 비어 있으면 각 페이지는 **`lib/companyLegal.ts`의 `COMPANY_CONTACT`**(이메일·전화·주소)를 폴백으로 사용합니다.

| `title` | 비고 |
|---------|------|
| `Contact Email`, `Contact Phone`, `Contact Address` | 시드·Admin 값은 `COMPANY_CONTACT`와 동일하게 유지 권장 |

**공식 스토어 vs 마켓플레이스 (약관 본문):**

| `title` | 비고 |
|---------|------|
| `Official Store and Marketplaces Title` | 주문·결제 절 하위 소제목 |
| `Official Store and Marketplaces Content` | 가격 차이·Best Price Guarantee·Selpic N은 공식 사이트 직구매 한정 등 |

`terms` 페이지의 `getContent('Official Store and Marketplaces 제목')` 등은 `lib/policyPageContent.ts`의 `TERMS_TITLE_ALIASES`로 위 영문 `title`에 연결됩니다.

→ 운영 연락처가 바뀌면 **CMS 정책 행과** `COMPANY_CONTACT` **둘 다** 맞출 것.

전체 `title` 목록은 시드 `lib/contentStore.ts`의 `section: 'terms'` 블록을 따른다.

### 3.2 `/privacy` — `section: privacy`

**연락처:** `Contact Email`, `Contact Phone`, `Contact Address` (폴백은 terms와 유사; privacy 페이지 코드의 기본 문자열과 시드 비교).

**목록 필드:** `FIRST LIST` ~ `FOURTH LIST`, 각 절의 `* List` 등은 **쉼표 구분** 규칙을 깨지 않도록 편집할 것 (`app/privacy/page.tsx`의 split 규칙 참고).

### 3.3 `/refund` — `section: refund`

| `title` | 비고 |
|---------|------|
| `Refund Policy Title` | |
| `Refund Policy Intro` | ACL 고지 |
| `Section 1 Title` ~ `Section 3 List` | 본문·목록; 목록은 `\|` 구분 권장 |
| `Contact Title`, `Contact Email`, `Contact Hours` | 폴백 이메일: `lib/companyLegal.ts`의 `COMPANY_CONTACT.email` (`info@selpic.com.au`) |

### 3.4 공통 푸터 — `section: footer`

| `title` | 비고 |
|---------|------|
| `Company Name`, `Company Description` | |
| `Quick Links Title`, `Help/Useful Links Title` | |
| `Privacy Policy Link`, `Terms and Conditions Link` | `linkUrl` 정확히 |
| `Newsletter Title`, `Newsletter Description` | |
| `Copyright Information` | 표시명; 법인 한 줄은 `companyLegal`도 참고 |
| 선택이지만 권장 | `Quick Links Item 5 Label` / `Quick Links Item 5 URL` — 코드 기본값이 비어 있어 **5번째 링크는 CMS에만 존재** |

### 3.5 헤더 — `section: header`

| `title` | 비고 |
|---------|------|
| `Company Name`, `Logo Image` | |
| `Home Link`, `Login Button`, `Cart Button` | 라벨 + `linkUrl` |
| `Search Button Enabled`, `Language Selector Enabled` | `true` / `false` |

### 3.6 홈 `/` — `how-it-works`, `categories`, Hero Slides

| 영역 | CMS | 비고 |
|------|-----|------|
| How it works | `how-it-works` | **`How It Works Subtitle`** 행이 시드에 없음 → 부제는 번역 폴백; 제목은 CMS가 우선 → **언어 일치를 위해 부제·제목을 CMS에 명시** 권장 |
| 카테고리 타일 | `categories` | 각 카드 `title`, `content`(설명), `linkUrl` |
| 메인 히어로 | **Hero Slides** | `section: hero`의 `Selpic Main Title` 등은 **홈 히어로에 연결되지 않음**; 슬라이드는 Admin 히어로 슬라이드에서 관리 |

**홈에서 CMS가 없는 하드코딩:** "Shop by Category" 섹션 제목/부제, 히어로 버튼 "Learn More →" 문구 — 문구만 바꾸려면 코드 수정 필요.

### 3.7 `/about` — `section: about`

`app/about/page.tsx`는 **영문 canonical `title`**(예: `Hero Title`, `Company Story First Paragraph`)을 사용합니다.  
기존 Supabase 등에 **한글 `title`로 저장된 행**은 `lib/aboutPageContent.ts`의 `ABOUT_TITLE_ALIASES`로 동일 영문 키에 매핑되어 계속 동작합니다.

---

## 4. 비교 후 “추가 문구” 넣는 위치 (요약)

| 하고 싶은 일 | 할 일 |
|--------------|--------|
| 약관 마켓플레이스·가격 정책 문구 수정 | `section: terms` → `Official Store and Marketplaces Title` / `Official Store and Marketplaces Content` |
| 개인정보 제3자 목록 보강 | `section: privacy`, `Disclosure to Third Parties List` 등 기존 `title`의 `content` 수정 |
| 환불 절차 문구 보강 | `section: refund`, `Section N Content` / `Section N List` |
| 푸터에 정책 외 링크 | `footer` + `Quick Links Item N Label` / `URL` 쌍 |
| 연락처 전역 통일 | `terms`·`privacy`·`refund`·`footer`의 연락처 관련 행 + **`lib/companyLegal.ts`** |

---

## 5. 이 문서의 역할 (에이전트·사람 공용)

- **사람:** 체크리스트대로 URL ↔ Admin을 오가며 누락·불일치를 잡는다.
- **에이전트:** “필수 섹션”, “비교 기준”, “about 한글 키”를 이 파일로 맞춘다.

수정 이력은 Git 커밋 메시지에 **어떤 `section`/`title`을 바꿨는지** 남기는 것을 권장합니다.

---

## 부록: 이번 작업 묶음에서 다룬 영역 (커밋 메시지 참고용)

- **단일 소스:** `COMPANY_WEBSITE_URL`, `COMPANY_DOMAIN`, `COMPANY_CONTACT` (`lib/companyLegal.ts`)
- **약관:** 마켓플레이스 조항 CMS 키 + UI (`lib/contentStore.ts`, `lib/policyPageContent.ts`, `app/terms/page.tsx`)
- **개인정보·환불·Admin 기본값:** 연락처 폴백·시드 (`app/privacy/page.tsx`, `app/refund/page.tsx`, `app/admin/content/page.tsx`, `lib/contentStore.ts`)
- **About:** 영문 canonical 키 + 레거시 한글 alias (`lib/aboutPageContent.ts`, `app/about/page.tsx`)
- **푸터·이메일 시그니처:** `COMPANY_CONTACT` 사용 (`app/page.tsx`, `components/Footer.tsx`, `lib/transactionalEmailBranding.ts`, `lib/emailService.ts`)
- **기타:** 커뮤니티 `Post.hidden` 타입 (`app/community/page.tsx`), 문서 예시 (`docs/email-setup-guide.md`)
