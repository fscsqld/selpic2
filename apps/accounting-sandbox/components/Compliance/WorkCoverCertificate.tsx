/**
 * WorkCover Certificate Management Component
 * 
 * Certificate of Currency 관리 (업로드, 조회, 만료 확인)
 */

'use client'

import { useState, useEffect } from 'react'
import { FileText, Upload, Calendar, AlertTriangle, CheckCircle, XCircle, Download, Trash2 } from 'lucide-react'
import { 
  saveCertificateOfCurrency, 
  getCertificateOfCurrency,
  checkCertificateExpiry,
  getExpiringCertificates
} from '@/src/features/compliance'
import { WorkCoverPolicy, CertificateOfCurrency } from '@/src/features/compliance/types'
import { formatDateAustralian } from '@/lib/utils/date-format'

interface WorkCoverCertificateProps {
  policy?: WorkCoverPolicy
}

export function WorkCoverCertificate({ policy }: WorkCoverCertificateProps) {
  const [certificates, setCertificates] = useState<CertificateOfCurrency[]>([])
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateOfCurrency | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [expiryDate, setExpiryDate] = useState('')

  useEffect(() => {
    if (policy) {
      loadCertificates()
    }
  }, [policy])

  const loadCertificates = async () => {
    if (!policy) return
    
    try {
      // TODO: Load from IndexedDB
      // For now, use empty array
      const cert = getCertificateOfCurrency(policy.id, certificates)
      if (cert) {
        setSelectedCertificate(cert)
      }
    } catch (err) {
      console.error('Failed to load certificates:', err)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !policy) return

    setIsUploading(true)
    try {
      // Convert file to Base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        
        const certificate = saveCertificateOfCurrency(
          policy.id,
          { base64 },
          expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // Default 1 year
        )

        setCertificates([...certificates, certificate])
        setSelectedCertificate(certificate)
        setExpiryDate('')
        
        alert('✅ Certificate uploaded successfully!')
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Failed to upload certificate:', err)
      alert('❌ Failed to upload certificate')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (certificateId: string) => {
    if (!window.confirm('Are you sure you want to delete this certificate?')) {
      return
    }

    try {
      // TODO: Delete from IndexedDB
      setCertificates(certificates.filter(cert => cert.id !== certificateId))
      if (selectedCertificate?.id === certificateId) {
        setSelectedCertificate(null)
      }
    } catch (err) {
      console.error('Failed to delete certificate:', err)
      alert('Failed to delete certificate')
    }
  }

  const handleViewCertificate = (certificate: CertificateOfCurrency) => {
    if (certificate.certificateBase64) {
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Certificate of Currency</title></head>
            <body style="margin:0;padding:20px;">
              <img src="${certificate.certificateBase64}" style="max-width:100%;height:auto;" />
            </body>
          </html>
        `)
      }
    } else if (certificate.certificateUrl) {
      window.open(certificate.certificateUrl, '_blank')
    }
  }

  if (!policy) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No WorkCover policy selected</p>
        </div>
      </div>
    )
  }

  const expiryInfo = selectedCertificate ? checkCertificateExpiry(selectedCertificate) : null
  const expiringCertificates = getExpiringCertificates(certificates, 30)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Certificate of Currency
        </h2>
        <div className="text-sm text-gray-600">
          Policy: {policy.policyNumber}
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h3 className="font-semibold text-gray-800 mb-4">Upload Certificate</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Upload className="w-4 h-4 inline mr-1" />
              Certificate File (PDF, JPG, PNG)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Current Certificate */}
      {selectedCertificate && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Current Certificate
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleViewCertificate(selectedCertificate)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => handleDelete(selectedCertificate.id)}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Issue Date:</span>
              <span className="font-medium">{formatDateAustralian(selectedCertificate.issueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Expiry Date:</span>
              <span className="font-medium">{formatDateAustralian(selectedCertificate.expiryDate)}</span>
            </div>
            {expiryInfo && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                {expiryInfo.isExpired ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="font-medium">Certificate Expired ({Math.abs(expiryInfo.daysUntilExpiry)} days ago)</span>
                  </div>
                ) : expiryInfo.isExpiringSoon ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Expiring Soon ({expiryInfo.daysUntilExpiry} days remaining)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Valid ({expiryInfo.daysUntilExpiry} days remaining)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expiring Certificates Warning */}
      {expiringCertificates.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Expiring Certificates</h3>
              <p className="text-sm text-yellow-800">
                {expiringCertificates.length} certificate(s) will expire within 30 days. Please renew them.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Certificates List */}
      {certificates.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">All Certificates ({certificates.length})</h3>
          <div className="space-y-2">
            {certificates.map((cert) => {
              const certExpiry = checkCertificateExpiry(cert)
              return (
                <div
                  key={cert.id}
                  className={`p-4 border rounded-md ${
                    cert.id === selectedCertificate?.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900">
                          {formatDateAustralian(cert.issueDate)}
                        </span>
                        {certExpiry?.isExpired && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                            Expired
                          </span>
                        )}
                        {certExpiry?.isExpiringSoon && !certExpiry.isExpired && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                            Expiring Soon
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Expires: {formatDateAustralian(cert.expiryDate)}
                        {certExpiry && (
                          <span className="ml-2">
                            ({certExpiry.daysUntilExpiry >= 0 ? `${certExpiry.daysUntilExpiry} days` : `${Math.abs(certExpiry.daysUntilExpiry)} days ago`})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewCertificate(cert)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {certificates.length === 0 && !selectedCertificate && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No certificates uploaded yet</p>
          <p className="text-sm mt-1">Upload a Certificate of Currency to get started</p>
        </div>
      )}
    </div>
  )
}
