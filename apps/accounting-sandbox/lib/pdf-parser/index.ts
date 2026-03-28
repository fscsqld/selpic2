/**
 * PDF Parser Engine
 * 
 * Automatically detects and selects appropriate parser for different banks
 */

import { PDFParser, ParsedStatement } from './types'
import { CBAParser } from './cba-parser'
import { NABParser } from './nab-parser'
import { ANZParser } from './anz-parser'
import { WestpacParser } from './westpac-parser'
import pdfParse from 'pdf-parse'

export class PDFParserEngine {
  private parsers: PDFParser[] = []

  constructor() {
    // 등록된 파서들
    // ⚠️ 중요: 더 구체적인 파서를 먼저 배치
    // 각 파서는 다른 은행을 먼저 제외하고 자신의 패턴을 확인해야 함
    this.parsers = [
      new ANZParser(),    // ANZ를 먼저 확인 (더 구체적인 패턴)
      new CBAParser(),    // CBA 확인
      new WestpacParser(), // Westpac 확인
      new NABParser(),    // NAB를 마지막에 확인 (일반적인 키워드 사용)
    ]
  }

  /**
   * PDF 파일 파싱
   */
  async parsePDF(pdfBuffer: Buffer): Promise<ParsedStatement> {
    console.log('[PDF-PARSER] Starting PDF parsing...')
    console.log('[PDF-PARSER] Buffer size:', pdfBuffer.length, 'bytes')
    
    // 1. PDF에서 텍스트 추출
    let pdfData
    try {
      console.log('[PDF-PARSER] Extracting text from PDF using pdf-parse...')
      pdfData = await pdfParse(pdfBuffer)
      console.log('[PDF-PARSER] ✅ Text extraction successful')
      console.log('[PDF-PARSER] PDF pages:', pdfData.numpages)
      console.log('[PDF-PARSER] Extracted text length:', pdfData.text?.length || 0, 'characters')
    } catch (error: any) {
      console.error('[PDF-PARSER] ❌ PDF text extraction failed')
      console.error('[PDF-PARSER] Error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      throw new Error(`PDF_EXTRACTION_FAILED: ${error.message}`)
    }

    const text = pdfData.text

    if (!text || text.trim().length === 0) {
      console.error('[PDF-PARSER] ❌ Extracted text is empty')
      throw new Error('PDF_EXTRACTION_FAILED: PDF appears to be empty or contains no extractable text')
    }

    // 2. Find appropriate parser
    console.log('[PDF-PARSER] Finding appropriate parser...')
    console.log('[PDF-PARSER] Text preview (first 1000 chars):', text.substring(0, 1000))
    
    const parser = this.findParser(text)
    if (!parser) {
      console.error('[PDF-PARSER] ❌ No suitable parser found')
      console.error('[PDF-PARSER] Full text dump for debugging:')
      console.error('[PDF-PARSER] ========================================')
      console.error(text)
      console.error('[PDF-PARSER] ========================================')
      throw new Error('Unsupported bank PDF format. Please use CBA, ANZ, NAB, or Westpac statements.')
    }

    console.log('[PDF-PARSER] ✅ Parser found:', parser.constructor.name)

    // 3. 파싱 실행
    try {
      console.log('[PDF-PARSER] Executing parser.parse()...')
      const result = await parser.parse(pdfBuffer)
      console.log('[PDF-PARSER] ✅ Parsing completed successfully')
      return result
    } catch (error: any) {
      console.error('[PDF-PARSER] ❌ Parser execution failed')
      console.error('[PDF-PARSER] Error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      throw error
    }
  }

  /**
   * 적절한 파서 찾기
   */
  private findParser(text: string): PDFParser | null {
    for (const parser of this.parsers) {
      if (parser.detectBank(text)) {
        return parser
      }
    }
    return null
  }

  /**
   * 지원하는 은행 목록
   */
  getSupportedBanks(): string[] {
    return this.parsers.map(parser => {
      if (parser instanceof CBAParser) return 'CBA'
      if (parser instanceof NABParser) return 'NAB'
      if (parser instanceof ANZParser) return 'ANZ'
      if (parser instanceof WestpacParser) return 'Westpac'
      return 'Unknown'
    })
  }
}
