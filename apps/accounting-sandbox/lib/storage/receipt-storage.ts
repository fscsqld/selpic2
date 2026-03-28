/**
 * Receipt Storage - Future-Proof Architecture
 * 
 * Supports both:
 * - Base64 strings (current localStorage implementation)
 * - External URLs (future: Google Drive, S3, CDN, etc.)
 * 
 * Flexible data structure allows easy migration to cloud storage
 * without breaking existing UI components.
 */

const RECEIPTS_STORAGE_KEY = 'transaction_receipts'

export type ReceiptSource = 'base64' | 'url' | 'cloud'

export interface ReceiptData {
  transactionId: string
  // Flexible source: can be Base64 data URL or external URL
  source: ReceiptSource
  // For Base64: full data URL (data:image/jpeg;base64,...)
  // For URL: external URL (https://drive.google.com/..., https://cdn.example.com/...)
  imageData?: string // Base64 data URL (legacy support)
  url?: string // External URL (future: Google Drive, S3, etc.)
  fileName: string
  fileType: string
  uploadedAt: string
  // Future: Cloud storage metadata
  storageProvider?: 'localStorage' | 'googleDrive' | 's3' | 'cdn'
  cloudFileId?: string // Google Drive file ID, S3 key, etc.
}

/**
 * Save receipt for a transaction
 * Currently saves as Base64, but structure supports future cloud storage
 */
export function saveReceipt(transactionId: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      const base64Data = reader.result as string
      const receiptData: ReceiptData = {
        transactionId,
        source: 'base64', // Current: Base64 storage
        imageData: base64Data, // Base64 data URL
        fileName: file.name,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        storageProvider: 'localStorage', // Current provider
      }
      
      // Get existing receipts
      const existing = getReceipts()
      existing[transactionId] = receiptData
      
      // Save to localStorage
      try {
        localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(existing))
        resolve(transactionId)
      } catch (err) {
        reject(new Error('Failed to save receipt: ' + (err instanceof Error ? err.message : 'Unknown error')))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Save receipt from external URL (future: Google Drive, S3, etc.)
 * This allows migration to cloud storage without breaking existing code
 */
export function saveReceiptFromUrl(
  transactionId: string,
  url: string,
  fileName: string,
  fileType: string,
  storageProvider: 'googleDrive' | 's3' | 'cdn' = 'googleDrive',
  cloudFileId?: string
): Promise<string> {
  const receiptData: ReceiptData = {
    transactionId,
    source: 'url', // External URL
    url,
    fileName,
    fileType,
    uploadedAt: new Date().toISOString(),
    storageProvider,
    cloudFileId,
  }
  
  // Get existing receipts
  const existing = getReceipts()
  existing[transactionId] = receiptData
  
  // Save to localStorage (metadata only, actual file is in cloud)
  try {
    localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(existing))
    return Promise.resolve(transactionId)
  } catch (err) {
    return Promise.reject(new Error('Failed to save receipt URL: ' + (err instanceof Error ? err.message : 'Unknown error')))
  }
}

/**
 * Get receipt for a transaction
 */
export function getReceipt(transactionId: string): ReceiptData | null {
  const receipts = getReceipts()
  return receipts[transactionId] || null
}

/**
 * Get all receipts
 * Includes backward compatibility migration for old Base64-only data
 */
export function getReceipts(): Record<string, ReceiptData> {
  if (typeof window === 'undefined') {
    return {}
  }
  
  try {
    const stored = localStorage.getItem(RECEIPTS_STORAGE_KEY)
    if (!stored) return {}
    
    const receipts = JSON.parse(stored)
    
    // Migrate old format to new format (backward compatibility)
    // Old format: { imageData: string, ... }
    // New format: { source: 'base64' | 'url', imageData?: string, url?: string, ... }
    const migrated: Record<string, ReceiptData> = {}
    for (const [txId, receipt] of Object.entries(receipts)) {
      const oldReceipt = receipt as any
      
      // If it's already in new format, use as-is
      if (oldReceipt.source) {
        migrated[txId] = oldReceipt as ReceiptData
      } else {
        // Migrate old format to new format
        migrated[txId] = {
          ...oldReceipt,
          source: oldReceipt.imageData?.startsWith('http') ? 'url' : 'base64',
          url: oldReceipt.imageData?.startsWith('http') ? oldReceipt.imageData : undefined,
          storageProvider: 'localStorage',
        } as ReceiptData
      }
    }
    
    // Save migrated data back if migration occurred
    const needsMigration = Object.keys(receipts).some(txId => !receipts[txId].source)
    if (needsMigration) {
      try {
        localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(migrated))
        console.log('[Receipt] Migrated old receipt format to new format')
      } catch (err) {
        console.warn('[Receipt] Failed to save migrated receipts:', err)
      }
    }
    
    return migrated
  } catch (err) {
    console.error('Failed to load receipts:', err)
    return {}
  }
}

/**
 * Delete receipt for a transaction
 */
export function deleteReceipt(transactionId: string): void {
  const receipts = getReceipts()
  delete receipts[transactionId]
  
  try {
    localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts))
  } catch (err) {
    console.error('Failed to delete receipt:', err)
  }
}

/**
 * Get all receipt IDs
 */
export function getAllReceiptIds(): string[] {
  return Object.keys(getReceipts())
}

/**
 * Get receipt source URL - Modular fetching function
 * 
 * This is the single source of truth for getting receipt display URLs.
 * UI components should use this function instead of directly accessing receipt.imageData or receipt.url.
 * 
 * Future: Can easily switch storage providers by modifying this function:
 * - localStorage (Base64) -> return imageData
 * - Google Drive -> return Google Drive view URL
 * - S3/CDN -> return CDN URL
 * 
 * @param receipt - ReceiptData object
 * @returns URL string that can be used in <img src> or <iframe src>
 */
export function getReceiptSourceUrl(receipt: ReceiptData | null): string | null {
  if (!receipt) return null
  
  // Handle Base64 (current implementation)
  if (receipt.source === 'base64' && receipt.imageData) {
    return receipt.imageData
  }
  
  // Handle external URL (future: Google Drive, S3, etc.)
  if (receipt.source === 'url' && receipt.url) {
    // For Google Drive: convert to viewable URL if needed
    if (receipt.storageProvider === 'googleDrive' && receipt.cloudFileId) {
      // Google Drive file ID to viewable URL
      return `https://drive.google.com/file/d/${receipt.cloudFileId}/preview`
    }
    // For S3/CDN: return direct URL
    return receipt.url
  }
  
  // Fallback: try imageData (backward compatibility with old data)
  if (receipt.imageData) {
    return receipt.imageData
  }
  
  return null
}

/**
 * Check if receipt is from cloud storage
 */
export function isCloudReceipt(receipt: ReceiptData | null): boolean {
  if (!receipt) return false
  return receipt.source === 'url' && receipt.storageProvider !== 'localStorage'
}

/**
 * Get receipt thumbnail URL (for cloud storage, may differ from full URL)
 */
export function getReceiptThumbnailUrl(receipt: ReceiptData | null): string | null {
  if (!receipt) return null
  
  // Base64: use same URL for thumbnail
  if (receipt.source === 'base64' && receipt.imageData) {
    return receipt.imageData
  }
  
  // Google Drive: use thumbnail URL
  if (receipt.storageProvider === 'googleDrive' && receipt.cloudFileId) {
    return `https://drive.google.com/thumbnail?id=${receipt.cloudFileId}&sz=w200-h200`
  }
  
  // S3/CDN: may have thumbnail variant
  if (receipt.storageProvider === 's3' && receipt.url) {
    // Example: append thumbnail suffix (implementation depends on CDN)
    return receipt.url.replace(/\.(jpg|png|jpeg)$/i, '_thumb.$1')
  }
  
  // Fallback: use full URL
  return getReceiptSourceUrl(receipt)
}
