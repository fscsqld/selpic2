# 보고서 생성 가이드

## 📄 보고서 생성 방법

자동화 생산 플랫폼 관련 문서를 보고서 형식으로 변환하는 방법입니다.

---

## 🚀 빠른 시작

### 방법 1: 자동 보고서 생성 스크립트 (추천 ⭐)

터미널에서 다음 명령어 실행:

```bash
npm run generate-report
```

또는

```bash
node scripts/generate-report.js
```

**생성되는 파일:**
- `docs/report/automated-production-platform-report.md` (마크다운 보고서)
- `docs/report/automated-production-platform-report.html` (HTML 보고서)

**HTML 보고서 확인:**
- 파일 탐색기에서 `docs/report/automated-production-platform-report.html` 더블클릭
- 또는 브라우저로 드래그 앤 드롭

---

## 📋 보고서 내용

자동 생성되는 보고서에는 다음 문서들이 포함됩니다:

1. **프로젝트 개요 및 구상**
   - 프로젝트 목표
   - 핵심 아이디어
   - 현재 상태

2. **시스템 설계**
   - 비즈니스 모델
   - 아키텍처
   - 데이터 모델
   - API 설계

3. **구현 가이드**
   - 데이터베이스 스키마
   - 코드 예제
   - 구현 단계

---

## 🎨 보고서 형식 변환

### 마크다운 → PDF

#### 옵션 1: VS Code 확장 프로그램
1. VS Code에서 `Markdown PDF` 확장 프로그램 설치
2. `docs/report/automated-production-platform-report.md` 파일 열기
3. `Ctrl + Shift + P` → "Markdown PDF: Export (pdf)" 선택

#### 옵션 2: 온라인 도구
- https://www.markdowntopdf.com/
- https://dillinger.io/

#### 옵션 3: 명령줄
```bash
npm install -g md-to-pdf
md-to-pdf docs/report/automated-production-platform-report.md
```

### 마크다운 → Word

#### Pandoc 사용
```bash
# Pandoc 설치 필요
pandoc docs/report/automated-production-platform-report.md -o report.docx
```

#### 온라인 변환기
- https://cloudconvert.com/md-to-docx

---

## 📝 보고서 커스터마이징

### 스크립트 수정

`scripts/generate-report.js` 파일을 수정하여:
- 포함할 문서 목록 변경
- 보고서 헤더/푸터 수정
- 스타일 커스터마이징

### HTML 스타일 수정

`scripts/generate-report.js`의 `generateHTMLReport` 함수에서 CSS 스타일 수정

---

## 🔄 보고서 업데이트

문서가 업데이트되면 다시 보고서를 생성하세요:

```bash
npm run generate-report
```

기존 보고서는 자동으로 덮어씌워집니다.

---

## 📂 파일 구조

```
docs/
├── report/                                    # 보고서 생성 폴더
│   ├── automated-production-platform-report.md
│   └── automated-production-platform-report.html
├── automated-production-platform-design.md    # 원본 문서
├── automated-production-platform-implementation-guide.md
└── automated-production-platform-planning.md
```

---

## 💡 팁

1. **HTML 보고서**: 브라우저에서 바로 확인 가능, 링크 클릭 가능
2. **마크다운 보고서**: VS Code나 다른 마크다운 에디터에서 편집 가능
3. **PDF 변환**: 공유 및 인쇄에 최적
4. **Word 변환**: 추가 편집 및 협업에 유용

---

**작성일**: 2024년

