/**
 * SELPIC-Accounting 보고서 생성 스크립트
 * 
 * 사용 방법:
 * node scripts/generate-accounting-report.js
 * 
 * 생성되는 파일:
 * - docs/report/accounting-report.html (HTML 보고서)
 * - docs/report/accounting-report.md (통합 마크다운)
 */

const fs = require('fs')
const path = require('path')

// 보고서에 포함할 문서 목록
const documents = [
  {
    file: 'accounting-module-blueprint.md',
    title: 'SELPIC-Accounting 전체 설계 문서',
    description: 'PDF 파싱, AI 분류, PAYG, GST, FBT, 통합 대시보드 등 전체 기능 설계'
  }
]

// 보고서 헤더
const reportHeader = `# SELPIC-Accounting 설계 보고서

> **문서 유형**: 설계 보고서  
> **프로젝트명**: SELPIC-Accounting  
> **작성일**: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}  
> **버전**: 3.1  
> **상태**: 설계 완료, 구현 대기

## 🎯 SELPIC-Accounting 개요

**SELPIC-Accounting**은 호주 은행 PDF 내역서를 자동으로 파싱하고, AI를 통해 ATO(호주 국세청) 표준 카테고리로 분류하며, PAYG, GST, FBT 등 세무 신고를 자동화하는 회계 자동화 도구입니다.

### 핵심 기능
- ✅ **PDF 파싱**: 호주 주요 은행 (CBA, ANZ 등) PDF 내역서 자동 파싱
- ✅ **AI 분류**: ATO 표준 카테고리 자동 분류
- ✅ **PAYG Withholding**: 급여/보수 원천징수 계산 (모듈화 - On/Off 가능)
- ✅ **GST 정산**: GST 포함 여부 판별 및 BAS 신고 지원
- ✅ **FBT 감지**: 복리후생세 이슈 자동 모니터링
- ✅ **Director's Loan**: 이사 대여금 집중 관리 (PAYG 미등록 시)
- ✅ **통합 대시보드**: 신고 마감일 추적 및 납부 금액 추정
- ✅ **General Ledger**: 엑셀 내보내기 (ATO 표준 형식)

### 개발 전략
1. **Phase 1 (독립 개발)**: \`apps/accounting-sandbox\`에서 완전히 독립적인 웹 앱으로 구축
2. **검증 단계**: 공공 배포(SaaS) 형태로 테스트하여 핵심 엔진 검증
3. **Phase 2 (통합)**: 검증 완료 후 메인 홈페이지 Admin Dashboard 모듈로 통합

---

## 📋 목차

`

// 보고서 푸터
const reportFooter = `

---

## 📝 부록

### A. 용어 정의

- **SELPIC-Accounting**: 호주 은행 PDF 내역서를 자동 파싱하고 세무 신고를 자동화하는 회계 도구
- **PAYG Withholding**: 호주 원천징수 시스템 (급여/보수 지급 시 세금 원천징수)
- **GST (Goods and Services Tax)**: 호주 부가세 (10%)
- **FBT (Fringe Benefits Tax)**: 복리후생세 (직원 복리후생에 대한 세금)
- **BAS (Business Activity Statement)**: 호주 사업 활동 신고서 (분기별 신고)
- **Director's Loan**: 이사 대여금 (법인 계좌에서 이사에게 지급된 자금)
- **No ABN Withholding**: ABN 없는 계약자에게 47% 원천징수 (법적 의무)

### B. 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **PDF Parsing**: pdf-parse
- **AI**: OpenAI API (GPT-4o-mini)
- **Excel Export**: xlsx
- **UI**: React, Tailwind CSS

### C. 관련 문서

- **설계 문서**: \`docs/accounting-module-blueprint.md\`
- **PDF 파서 초기 코드**: \`apps/accounting-sandbox/lib/pdf-parser/\`
- **Director's Loan 컴포넌트**: \`apps/accounting-sandbox/components/DirectorsLoanManager.tsx\`

### D. 구현 상태

#### ✅ 완료
- [x] 전체 설계 문서 작성
- [x] PDF 파서 타입 정의
- [x] 공통 파서 유틸리티
- [x] CBA 파서 초기 구현
- [x] PAYG 모듈화 설계
- [x] Director's Loan 관리 설계
- [x] GST 정산 기능 설계
- [x] FBT 감지 시스템 설계
- [x] 통합 세무 대시보드 설계

#### 🚧 진행 예정
- [ ] Next.js 프로젝트 초기화
- [ ] PDF 파서 엔진 구현
- [ ] AI 분류 엔진 구현
- [ ] PAYG 계산 엔진 구현
- [ ] GST 정산 엔진 구현
- [ ] FBT 감지 엔진 구현
- [ ] UI 컴포넌트 개발

---

**보고서 생성일**: ${new Date().toISOString()}  
**생성 도구**: generate-accounting-report.js

`

function readMarkdownFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    console.error(`❌ 파일을 읽을 수 없습니다: ${filePath}`, error)
    return null
  }
}

function generateTableOfContents(documents) {
  let toc = ''
  documents.forEach((doc, index) => {
    toc += `${index + 1}. [${doc.title}](#${doc.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})\n`
  })
  return toc
}

function generateMarkdownReport() {
  const docsDir = path.join(__dirname, '..', 'docs')
  const reportDir = path.join(docsDir, 'report')
  
  // report 디렉토리 생성
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  let reportContent = reportHeader
  reportContent += generateTableOfContents(documents)
  reportContent += '\n---\n\n'

  // 각 문서 내용 추가
  documents.forEach((doc, index) => {
    const filePath = path.join(docsDir, doc.file)
    const content = readMarkdownFile(filePath)
    
    if (content) {
      // 문서 제목 추가
      reportContent += `\n\n# ${doc.title}\n\n`
      reportContent += `*${doc.description}*\n\n`
      reportContent += '---\n\n'
      
      // 원본 문서의 첫 번째 제목 제거 (중복 방지)
      const cleanedContent = content.replace(/^#\s+.*$/m, '')
      reportContent += cleanedContent
      reportContent += '\n\n---\n\n'
    } else {
      reportContent += `\n\n# ${doc.title}\n\n`
      reportContent += `*⚠️ 문서를 불러올 수 없습니다: ${doc.file}*\n\n`
    }
  })

  reportContent += reportFooter

  // 마크다운 보고서 저장
  const markdownPath = path.join(reportDir, 'accounting-report.md')
  fs.writeFileSync(markdownPath, reportContent, 'utf-8')
  console.log(`✅ 마크다운 보고서 생성 완료: ${markdownPath}`)

  return reportContent
}

function generateHTMLReport(markdownContent) {
  // 간단한 HTML 변환
  const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SELPIC-Accounting 설계 보고서</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #2563eb;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    h3 {
      color: #1e40af;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h4 {
      color: #1e3a8a;
      margin-top: 15px;
      margin-bottom: 8px;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 15px 0;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
    }
    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 20px;
      margin: 20px 0;
      color: #6b7280;
      font-style: italic;
    }
    ul, ol {
      margin: 15px 0;
      padding-left: 30px;
    }
    li {
      margin: 5px 0;
    }
    a {
      color: #3b82f6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .toc {
      background: #f9fafb;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .toc ul {
      list-style: none;
      padding-left: 0;
    }
    .toc li {
      margin: 8px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 0.9em;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-info {
      background: #dbeafe;
      color: #1e40af;
    }
  </style>
</head>
<body>
  <div class="container">
    ${markdownContent
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/g, '<p>')
      .replace(/$/g, '</p>')}
    <div class="footer">
      <p>SELPIC-Accounting 설계 보고서 v3.1</p>
      <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>
  </div>
</body>
</html>`

  const reportDir = path.join(__dirname, '..', 'docs', 'report')
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  const htmlPath = path.join(reportDir, 'accounting-report.html')
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8')
  console.log(`✅ HTML 보고서 생성 완료: ${htmlPath}`)
}

// 메인 실행
function main() {
  console.log('📄 SELPIC-Accounting 보고서 생성 시작...\n')
  
  const markdownContent = generateMarkdownReport()
  generateHTMLReport(markdownContent)
  
  console.log('\n✅ 보고서 생성 완료!')
  console.log('\n생성된 파일:')
  console.log('  - docs/report/accounting-report.md')
  console.log('  - docs/report/accounting-report.html')
  console.log('\n💡 HTML 보고서는 브라우저에서 바로 열어서 확인할 수 있습니다.')
  console.log('   파일 경로: docs/report/accounting-report.html')
}

main()

