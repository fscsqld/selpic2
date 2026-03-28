/**
 * WorkCover Certificate Management - Certificate of Currency 관리
 * 
 * Certificate of Currency 저장, 조회, 만료 확인
 */

import { WorkCoverPolicy, CertificateOfCurrency } from './types'

/**
 * Certificate of Currency 저장
 * @param policyId - 정책 ID
 * @param certificateData - Certificate 데이터 (URL 또는 Base64)
 * @param expiryDate - 만료일
 * @returns 저장된 Certificate 정보
 */
export function saveCertificateOfCurrency(
  policyId: string,
  certificateData: {
    url?: string
    base64?: string
  },
  expiryDate: string
): CertificateOfCurrency {
  const certificate: CertificateOfCurrency = {
    id: `cert_${policyId}_${Date.now()}`,
    policyId,
    certificateUrl: certificateData.url,
    certificateBase64: certificateData.base64,
    issueDate: new Date().toISOString(),
    expiryDate,
    uploadedAt: new Date().toISOString(),
  }
  
  return certificate
}

/**
 * Certificate of Currency 조회
 * @param policyId - 정책 ID
 * @param certificates - Certificate 목록
 * @returns Certificate 정보 또는 null
 */
export function getCertificateOfCurrency(
  policyId: string,
  certificates: CertificateOfCurrency[]
): CertificateOfCurrency | null {
  // 가장 최근 Certificate 반환
  const policyCertificates = certificates
    .filter(cert => cert.policyId === policyId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  
  return policyCertificates.length > 0 ? policyCertificates[0] : null
}

/**
 * Certificate 만료 확인
 * @param certificate - Certificate 정보
 * @returns 만료 여부 및 남은 일수
 */
export function checkCertificateExpiry(certificate: CertificateOfCurrency): {
  isExpired: boolean
  daysUntilExpiry: number
  isExpiringSoon: boolean
} {
  const expiryDate = new Date(certificate.expiryDate)
  const today = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    isExpired: daysUntilExpiry < 0,
    daysUntilExpiry,
    isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 30,
  }
}

/**
 * 모든 만료 예정 Certificate 조회
 * @param certificates - Certificate 목록
 * @param daysThreshold - 경고 일수 (기본 30일)
 * @returns 만료 예정 Certificate 목록
 */
export function getExpiringCertificates(
  certificates: CertificateOfCurrency[],
  daysThreshold: number = 30
): CertificateOfCurrency[] {
  const today = new Date()
  
  return certificates.filter(cert => {
    const expiryDate = new Date(cert.expiryDate)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry >= 0 && daysUntilExpiry <= daysThreshold
  })
}
