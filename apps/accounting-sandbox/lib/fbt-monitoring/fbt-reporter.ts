/**
 * FBT (Fringe Benefits Tax) 보고서 생성
 */

import * as XLSX from 'xlsx'
import { FBTTransaction, FBTReport } from './types'

export class FBTReporter {
  /**
   * 연간 FBT 보고서 생성
   */
  generateFBTReport(
    transactions: FBTTransaction[],
    financialYear: string,
    startDate: string,
    endDate: string
  ): FBTReport {
    // 기간 내 거래 필터링 (FBT 신고 대상만)
    const periodTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return txDate >= start && txDate <= end && tx.isFBTReportable
    })

    // 카테고리별 집계 초기화
    const byCategory = {
      meal: { count: 0, total: 0 },
      entertainment: { count: 0, total: 0 },
      travel: { count: 0, total: 0 },
      vehicle: { count: 0, total: 0 },
      other: { count: 0, total: 0 },
    }

    // 위험도별 집계 초기화
    const byRisk = {
      low: { count: 0, total: 0 },
      medium: { count: 0, total: 0 },
      high: { count: 0, total: 0 },
    }

    let totalFBT = 0

    // 거래별 집계
    for (const tx of periodTransactions) {
      const fbtAmount = tx.fbtAmount || 0
      totalFBT += fbtAmount

      // 카테고리별 집계
      if (byCategory[tx.fbtCategory]) {
        byCategory[tx.fbtCategory].count++
        byCategory[tx.fbtCategory].total += fbtAmount
      }

      // 위험도별 집계
      if (byRisk[tx.fbtRisk]) {
        byRisk[tx.fbtRisk].count++
        byRisk[tx.fbtRisk].total += fbtAmount
      }
    }

    return {
      financialYear,
      period: {
        startDate,
        endDate,
      },
      summary: {
        totalFBTAmount: totalFBT,
        transactionCount: periodTransactions.length,
        byCategory,
        byRisk,
      },
      transactions: periodTransactions,
    }
  }

  /**
   * FBT 보고서를 Excel 형식으로 내보내기
   */
  exportFBTToExcel(report: FBTReport, filename: string = 'fbt-report.xlsx'): void {
    const rows: any[][] = [
      ['FBT (Fringe Benefits Tax) Report', '', '', ''],
      ['Financial Year', report.financialYear, '', ''],
      ['Period', `${report.period.startDate} to ${report.period.endDate}`, '', ''],
      ['', '', '', ''],
      ['FBT Summary', '', '', ''],
      ['Total FBT Amount', `$${report.summary.totalFBTAmount.toFixed(2)}`, '', ''],
      ['Transaction Count', report.summary.transactionCount.toString(), '', ''],
      ['', '', '', ''],
      ['By Category', '', '', ''],
      ['Category', 'Count', 'Total FBT Amount', ''],
      ['Meal', 
        report.summary.byCategory.meal.count.toString(),
        `$${report.summary.byCategory.meal.total.toFixed(2)}`,
        ''
      ],
      ['Entertainment',
        report.summary.byCategory.entertainment.count.toString(),
        `$${report.summary.byCategory.entertainment.total.toFixed(2)}`,
        ''
      ],
      ['Travel',
        report.summary.byCategory.travel.count.toString(),
        `$${report.summary.byCategory.travel.total.toFixed(2)}`,
        ''
      ],
      ['Vehicle',
        report.summary.byCategory.vehicle.count.toString(),
        `$${report.summary.byCategory.vehicle.total.toFixed(2)}`,
        ''
      ],
      ['Other',
        report.summary.byCategory.other.count.toString(),
        `$${report.summary.byCategory.other.total.toFixed(2)}`,
        ''
      ],
      ['', '', '', ''],
      ['By Risk Level', '', '', ''],
      ['Risk Level', 'Count', 'Total FBT Amount', ''],
      ['Low',
        report.summary.byRisk.low.count.toString(),
        `$${report.summary.byRisk.low.total.toFixed(2)}`,
        ''
      ],
      ['Medium',
        report.summary.byRisk.medium.count.toString(),
        `$${report.summary.byRisk.medium.total.toFixed(2)}`,
        ''
      ],
      ['High',
        report.summary.byRisk.high.count.toString(),
        `$${report.summary.byRisk.high.total.toFixed(2)}`,
        ''
      ],
      ['', '', '', ''],
      ['Transaction Details', '', '', ''],
      ['Date', 'Description', 'Amount', 'FBT Category', 'FBT Risk', 'FBT Amount', 'Employee Name'],
      ...report.transactions.map(tx => [
        tx.date,
        tx.description,
        `$${tx.amount.toFixed(2)}`,
        tx.fbtCategory,
        tx.fbtRisk,
        tx.fbtAmount ? `$${tx.fbtAmount.toFixed(2)}` : '$0.00',
        tx.employeeName || 'N/A',
      ]),
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'FBT Report')
    XLSX.writeFile(workbook, filename)
  }
}
