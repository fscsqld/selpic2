/**
 * SELPIC-X 보고서 생성 스크립트
 * 
 * 사용 방법:
 * node scripts/generate-report.js
 * 
 * 생성되는 파일:
 * - docs/report/automated-production-platform-report.html (HTML 보고서)
 * - docs/report/automated-production-platform-report.md (통합 마크다운)
 */

const fs = require('fs')
const path = require('path')

// 보고서에 포함할 문서 목록 (순서대로)
const documents = [
  {
    file: 'automated-production-platform-planning.md',
    title: '1. SELPIC-X 프로젝트 개요 및 구상',
    description: 'SELPIC-X 프로젝트 목표, 핵심 아이디어, 현재 상태'
  },
  {
    file: 'automated-production-platform-design.md',
    title: '2. SELPIC-X 시스템 설계 (기본 버전)',
    description: '비즈니스 모델, 아키텍처, 데이터 모델, API 설계, 핵심 운영 가이드라인'
  },
  {
    file: 'automated-production-platform-extended-design.md',
    title: '3. SELPIC-X 시스템 설계 (확장 버전 v2.0)',
    description: '영업사원 모듈, 통합 정산 엔진, 인쇄 자동화 시스템 추가'
  },
  {
    file: 'revenue-distribution-logic.md',
    title: '4. SELPIC-X 수익 분배 로직 상세 설계',
    description: '이원화된 분배 프로세스, 상품별 개별 판단, 복합 주문 처리'
  },
  {
    file: 'settlement-system-implementation.md',
    title: '5. SELPIC-X 정산 시스템 구현 가이드',
    description: '핵심 운영 가이드라인, 데이터베이스 스키마, 코드 예제, 구현 단계'
  },
  {
    file: 'database-schema-settlement.md',
    title: '6. SELPIC-X 데이터베이스 스키마',
    description: '정산 시스템 데이터베이스 스키마 상세'
  }
]

// 보고서 헤더
const reportHeader = `# SELPIC-X 설계 보고서

> **문서 유형**: 설계 보고서  
> **프로젝트명**: SELPIC-X  
> **작성일**: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}  
> **버전**: 2.0  
> **상태**: 구상 단계

## 🎯 SELPIC-X 개요

**SELPIC-X**는 고객이 직접 디자인한 커스텀 스티커 상품을 자동으로 제작하고, 이를 다른 고객에게 판매할 수 있도록 하며, 판매 수익을 디자이너, 플랫폼, 영업사원, 제작사 간에 투명하게 배분하는 자동화 생산 플랫폼입니다.

### SELPIC-X 핵심 가이드라인

SELPIC-X는 다음 3가지 핵심 운영 가이드라인을 기반으로 구축됩니다:

1. **재무 안정성 (Financial Stability)**: 마이너스 잔액 관리 로직
2. **투명성 및 무결성 (Transparency & Integrity)**: 감사 로그 및 데이터 무결성
3. **사용자 이해도 (User Understanding)**: 파트너 대시보드 계산식 가독성

---

## 📋 목차

`

// 보고서 푸터
const reportFooter = `

---

## 📝 부록

### A. 용어 정의

- **SELPIC-X**: 고객이 직접 디자인한 커스텀 스티커 상품을 자동으로 제작하고 판매하는 자동화 생산 플랫폼
- **디자이너 (Designer)**: 커스텀 디자인을 제작하고 업로드하는 사용자
- **마켓플레이스 (Marketplace)**: 디자인 상품을 판매하는 플랫폼
- **수익 배분 (Revenue Share)**: 판매 수익을 디자이너, 플랫폼, 영업사원, 제작사 간에 배분하는 시스템
- **Print-on-Demand (POD)**: 주문이 들어올 때마다 제품을 제작하는 방식
- **핵심 운영 가이드라인**: SELPIC-X의 3대 핵심 원칙 (재무 안정성, 투명성 및 무결성, 사용자 이해도)

### B. 참고 자료

- Next.js 15 공식 문서: https://nextjs.org/docs
- PostgreSQL 공식 문서: https://www.postgresql.org/docs/
- Zustand 공식 문서: https://zustand-demo.pmnd.rs/

### C. 관련 문서

- **SELPIC-X 설계 문서**: \`docs/automated-production-platform-design.md\` (핵심 운영 가이드라인 포함)
- **SELPIC-X 정산 시스템 구현 가이드**: \`docs/settlement-system-implementation.md\`
- **SELPIC-X 구상 문서**: \`docs/automated-production-platform-planning.md\`
- **SELPIC-X 확장 설계 문서**: \`docs/automated-production-platform-extended-design.md\`

---

**보고서 생성일**: ${new Date().toISOString()}  
**생성 도구**: generate-report.js

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
  const markdownPath = path.join(reportDir, 'automated-production-platform-report.md')
  fs.writeFileSync(markdownPath, reportContent, 'utf-8')
  console.log(`✅ 마크다운 보고서 생성 완료: ${markdownPath}`)

  return reportContent
}

function generateHTMLReport(markdownContent) {
  // 간단한 HTML 변환 (실제로는 마크다운 파서 사용 권장)
  const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SELPIC-X 설계 보고서</title>
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
      max-width: 900px;
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
      <p>SELPIC-X 설계 보고서 v2.0</p>
      <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>
  </div>
</body>
</html>`

  const reportDir = path.join(__dirname, '..', 'docs', 'report')
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  const htmlPath = path.join(reportDir, 'automated-production-platform-report.html')
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8')
  console.log(`✅ HTML 보고서 생성 완료: ${htmlPath}`)
}

// 메인 실행
function main() {
  console.log('📄 SELPIC-X 보고서 생성 시작...\n')
  
  const markdownContent = generateMarkdownReport()
  generateHTMLReport(markdownContent)
  
  console.log('\n✅ 보고서 생성 완료!')
  console.log('\n생성된 파일:')
  console.log('  - docs/report/automated-production-platform-report.md')
  console.log('  - docs/report/automated-production-platform-report.html')
  console.log('\n💡 HTML 보고서는 브라우저에서 바로 열어서 확인할 수 있습니다.')
}

main()

