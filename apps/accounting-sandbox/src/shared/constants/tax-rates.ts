/**
 * 세율 상수 정의
 * 호주 ATO 표준 세율 및 계산에 사용되는 상수
 */

// GST Rate
export const GST_RATE = 0.10 // 10%

// PAYG Withholding Rates (2024-2025)
export const PAYG_RATES = {
  // Employee Tax Rates (Weekly)
  EMPLOYEE_WEEKLY: {
    thresholds: [0, 355, 409, 512, 711, 1282, 1734, 3467],
    rates: [0, 0.19, 0.21, 0.345, 0.39, 0.42, 0.45, 0.47],
  },
  // Director's Fee (deprecated: now uses progressive rate like employees)
  DIRECTOR_FEE: 0.47, // 47% flat rate (no longer used - directors now use progressive rate)
  // Contractor (if no ABN)
  NO_ABN_WITHHOLDING: 0.47, // 47% flat rate
  // Superannuation
  SUPERANNUATION_RATE: 0.11, // 11% (2024-2025)
} as const

// Company Tax Rate
export const COMPANY_TAX_RATE = 0.25 // 25% (for small business)

// FBT Rate
export const FBT_RATE = 0.47 // 47%

// WorkCover Base Rate (varies by state and industry)
export const WORKCOVER_BASE_RATE = 0.015 // 1.5% (예시, 실제로는 산업별/주별로 다름)

// Tax-Free Threshold
export const TAX_FREE_THRESHOLD = 18200 // Annual

// Medicare Levy
export const MEDICARE_LEVY_RATE = 0.02 // 2%

// Medicare Levy Surcharge (for high income earners without private health insurance)
export const MEDICARE_LEVY_SURCHARGE_THRESHOLD = 90000 // Annual (single)
export const MEDICARE_LEVY_SURCHARGE_RATE = 0.01 // 1% (varies by income)
