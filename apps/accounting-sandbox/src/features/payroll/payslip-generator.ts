/**
 * Payslip Generator - 호주 표준 Payslip PDF 생성
 * 
 * 법인 정보(SELPIC PTY LTD, ABN 등)가 포함된 호주 표준 페이스립 PDF 생성
 */

import { Payslip, PayslipPDFData } from './types'
import { Employee } from '../../shared/types/employee'

/**
 * Payslip PDF 생성 (HTML 기반, 향후 PDF 라이브러리로 확장 가능)
 * @param payslipData - Payslip 데이터
 * @returns HTML 문자열 (PDF로 변환 가능)
 */
export function generatePayslipPDF(payslipData: PayslipPDFData): string {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payslip - ${payslipData.employeeName}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .payslip-container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #000;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .company-details {
      font-size: 12px;
      color: #666;
    }
    .payslip-title {
      font-size: 20px;
      font-weight: bold;
      margin-top: 10px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .info-box {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: bold;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 12px;
    }
    .earnings-section, .deductions-section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      background-color: #f0f0f0;
      padding: 8px;
      margin-bottom: 10px;
    }
    .earnings-table, .deductions-table {
      width: 100%;
      border-collapse: collapse;
    }
    .earnings-table th, .deductions-table th {
      background-color: #f0f0f0;
      padding: 8px;
      text-align: left;
      font-size: 12px;
      border: 1px solid #ddd;
    }
    .earnings-table td, .deductions-table td {
      padding: 8px;
      font-size: 12px;
      border: 1px solid #ddd;
    }
    .amount {
      text-align: right;
      font-weight: bold;
    }
    .total-row {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .net-pay {
      text-align: center;
      padding: 15px;
      background-color: #e8f5e9;
      border: 2px solid #4caf50;
      margin-top: 20px;
    }
    .net-pay-label {
      font-size: 14px;
      margin-bottom: 5px;
    }
    .net-pay-amount {
      font-size: 24px;
      font-weight: bold;
      color: #2e7d32;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #666;
      text-align: center;
    }
    @media print {
      body { margin: 0; padding: 10px; }
      .payslip-container { border: none; }
    }
  </style>
</head>
<body>
  <div class="payslip-container">
    <div class="header">
      <div class="company-name">${payslipData.companyInfo.name}</div>
      <div class="company-details">
        ABN: ${payslipData.companyInfo.abn}
        ${payslipData.companyInfo.acn ? ` | ACN: ${payslipData.companyInfo.acn}` : ''}
      </div>
      ${payslipData.companyInfo.address ? `<div class="company-details">${payslipData.companyInfo.address}</div>` : ''}
      <div class="payslip-title">PAYSLIP</div>
    </div>

    <div class="info-section">
      <div class="info-box">
        <h3>Employee Information</h3>
        <div class="info-row">
          <span>Name:</span>
          <span>${payslipData.employeeInfo.name}</span>
        </div>
        ${payslipData.employeeInfo.employeeId ? `
        <div class="info-row">
          <span>Employee ID:</span>
          <span>${payslipData.employeeInfo.employeeId}</span>
        </div>
        ` : ''}
        ${payslipData.employeeInfo.taxFileNumber ? `
        <div class="info-row">
          <span>TFN:</span>
          <span>${payslipData.employeeInfo.taxFileNumber}</span>
        </div>
        ` : ''}
      </div>
      <div class="info-box">
        <h3>Pay Period</h3>
        <div class="info-row">
          <span>Start:</span>
          <span>${formatDate(payslipData.payPeriod.start)}</span>
        </div>
        <div class="info-row">
          <span>End:</span>
          <span>${formatDate(payslipData.payPeriod.end)}</span>
        </div>
        <div class="info-row">
          <span>Pay Date:</span>
          <span>${formatDate(payslipData.payDate)}</span>
        </div>
      </div>
    </div>

    <div class="earnings-section">
      <div class="section-title">EARNINGS</div>
      <table class="earnings-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gross Pay</td>
            <td class="amount">$${payslipData.grossPay.toFixed(2)}</td>
          </tr>
          ${payslipData.breakdown.additions.map(add => `
          <tr>
            <td>${add.description}</td>
            <td class="amount">$${add.amount.toFixed(2)}</td>
          </tr>
          `).join('')}
          <tr class="total-row">
            <td>Total Earnings</td>
            <td class="amount">$${(payslipData.grossPay + payslipData.breakdown.additions.reduce((sum, a) => sum + a.amount, 0)).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="deductions-section">
      <div class="section-title">DEDUCTIONS</div>
      <table class="deductions-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${payslipData.taxWithheld > 0 ? `
          <tr>
            <td>PAYG Withholding</td>
            <td class="amount">$${payslipData.taxWithheld.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${payslipData.breakdown.deductions.map(ded => `
          <tr>
            <td>${ded.description}</td>
            <td class="amount">$${ded.amount.toFixed(2)}</td>
          </tr>
          `).join('')}
          <tr class="total-row">
            <td>Total Deductions</td>
            <td class="amount">$${(payslipData.taxWithheld + payslipData.breakdown.deductions.reduce((sum, d) => sum + d.amount, 0)).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${payslipData.superannuation > 0 ? `
    <div class="deductions-section" style="margin-top: 20px;">
      <div class="section-title">EMPLOYER CONTRIBUTIONS</div>
      <table class="deductions-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Superannuation (Employer Contribution)</td>
            <td class="amount">$${payslipData.superannuation.toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td>Total Employer Contributions</td>
            <td class="amount">$${payslipData.superannuation.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 11px; color: #666; margin-top: 8px; font-style: italic;">
        Note: Superannuation is paid by the employer and is not deducted from your gross pay.
      </p>
    </div>
    ` : ''}

    <div class="net-pay">
      <div class="net-pay-label">NET PAY</div>
      <div class="net-pay-amount">$${payslipData.netPay.toFixed(2)}</div>
    </div>

    <div class="footer">
      <p>This payslip is generated by SELPIC A Accounting System</p>
      <p>For inquiries, please contact your employer</p>
    </div>
  </div>
</body>
</html>
  `
  
  return html
}

/**
 * 날짜 포맷팅 헬퍼
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Payslip 데이터 준비
 * @param payslip - Payslip 정보
 * @param employee - 직원 정보
 * @param companyInfo - 회사 정보
 * @returns PDF 생성용 데이터
 */
export function preparePayslipPDFData(
  payslip: Payslip,
  employee: Employee,
  companyInfo: {
    name: string
    abn: string
    acn?: string
    address?: string
  }
): PayslipPDFData {
  return {
    ...payslip,
    companyInfo,
    employeeInfo: {
      name: employee.name,
      employeeId: employee.employeeId,
      taxFileNumber: employee.taxFileNumber,
      address: employee.address ? 
        `${employee.address.street || ''}, ${employee.address.city || ''}, ${employee.address.state || ''} ${employee.address.postcode || ''}`.trim() :
        undefined,
    },
    breakdown: {
      grossPay: payslip.grossPay,
      deductions: [
        // PAYG Withholding과 Superannuation은 HTML 템플릿에서 직접 표시되므로
        // breakdown.deductions에는 기타 공제만 포함
        // (향후 확장 가능: 예: Health Insurance, Union Fees 등)
      ],
      additions: [],
      netPay: payslip.netPay,
    },
  }
}
