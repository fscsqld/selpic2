# SELPIC-Accounting Sandbox

독립적인 회계 자동화 엔진 개발 환경

## 🚀 시작하기

### 1. 의존성 설치

```bash
cd apps/accounting-sandbox
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

또는 프로젝트 루트에서:

```bash
npm run dev:accounting
```

서버가 `http://localhost:3001`에서 실행됩니다.

## 📁 프로젝트 구조

```
apps/accounting-sandbox/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 메인 대시보드
│   ├── layout.tsx         # 레이아웃
│   └── globals.css        # 전역 스타일
├── lib/
│   ├── pdf-parser/        # PDF 파서 엔진
│   │   ├── types.ts
│   │   ├── cba-parser.ts
│   │   └── index.ts
│   └── ai-classifier/     # AI 분류 엔진
│       ├── types.ts
│       ├── openai-classifier.ts
│       └── index.ts
└── package.json
```

## 🎯 주요 기능

- ✅ PDF 업로드 UI
- ✅ 분석 결과 테이블 (Mock Data)
- ✅ PDF 파서 엔진 기본 구조
- ✅ AI 분류 엔진 기본 구조
- 🔄 CBA 파서 상세 구현 (진행 예정)

## 📝 개발 진행 상황

자세한 진행 상황은 프로젝트 루트의 `PROGRESS.md` 파일을 참조하세요.
