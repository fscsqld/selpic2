/**
 * User Mappings Storage
 * 
 * Stores user's manual category corrections for learning and auto-application
 * 
 * ⚠️ Client-side only (uses localStorage)
 * All functions check for browser environment before accessing localStorage
 */

export interface UserMapping {
  /** Transaction description pattern (normalized) */
  descriptionPattern: string
  
  /** User-selected category */
  category: string
  
  /** User-selected department */
  department?: string
  
  /** Timestamp when mapping was created */
  createdAt: string
  
  /** Timestamp when mapping was last used */
  lastUsedAt?: string
  
  /** Number of times this mapping has been applied */
  usageCount: number
}

const STORAGE_KEY = 'selpic_user_mappings'

/**
 * Normalize description for matching
 * - Remove extra spaces
 * - Convert to uppercase
 * - Remove common prefixes (VISA, EFTPOS, etc.)
 * - Extract merchant name
 */
export function normalizeDescription(description: string): string {
  if (!description) return ''
  
  let normalized = description.trim().toUpperCase()
  
  // Remove common transaction prefixes
  normalized = normalized
    .replace(/^(V\d+|EFTPOS|VISA|MASTERCARD|DEBIT|CREDIT|ATM|NABATM)\s+/i, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\s*/g, '') // Remove dates
    .replace(/\d{1,2}:\d{2}\s*/g, '') // Remove times
    .replace(/\s+\d{8,}$/g, '') // Remove reference numbers
    .replace(/\b\d{4,5}[A-Z]?\b/g, '') // Remove location codes
    .replace(/\b(QLD|NSW|VIC|SA|WA|NT|ACT|TAS)\b/gi, '') // Remove states
    .replace(/\b(MOUNT|MT|ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|BLVD|BOULEVARD)\b/gi, '')
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
  
  return normalized
}

/**
 * Extract merchant name from description (for fuzzy matching)
 */
export function extractMerchantName(description: string): string {
  const normalized = normalizeDescription(description)
  
  // Try to extract merchant name (first meaningful words)
  const words = normalized.split(/\s+/).filter(word => 
    word.length > 2 && 
    !/^\d+$/.test(word) && 
    !['THE', 'AND', 'FOR', 'FROM', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY', 'PTY', 'LTD'].includes(word)
  )
  
  // Take first 2-3 meaningful words as merchant name
  return words.slice(0, 3).join(' ')
}

/**
 * Check if two descriptions match (exact or fuzzy)
 */
export function descriptionsMatch(desc1: string, desc2: string, fuzzy: boolean = true): boolean {
  const normalized1 = normalizeDescription(desc1)
  const normalized2 = normalizeDescription(desc2)
  
  // Exact match
  if (normalized1 === normalized2) {
    return true
  }
  
  // Fuzzy match: check if merchant names match
  if (fuzzy) {
    const merchant1 = extractMerchantName(desc1)
    const merchant2 = extractMerchantName(desc2)
    
    if (merchant1 && merchant2 && merchant1.length > 5 && merchant2.length > 5) {
      // Check if one contains the other (for partial matches)
      if (merchant1.includes(merchant2) || merchant2.includes(merchant1)) {
        return true
      }
      
      // Check similarity (simple word overlap)
      const words1 = merchant1.split(/\s+/)
      const words2 = merchant2.split(/\s+/)
      const commonWords = words1.filter(w => words2.includes(w))
      
      // If more than 50% of words match, consider it a match
      if (commonWords.length > 0 && commonWords.length >= Math.min(words1.length, words2.length) * 0.5) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Get all user mappings
 */
export function getUserMappings(): UserMapping[] {
  if (typeof window === 'undefined') return [] // Server-side: return empty
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const mappings = JSON.parse(stored) as UserMapping[]
    return mappings || []
  } catch (error) {
    console.error('[USER-MAPPINGS] Failed to load mappings:', error)
    return []
  }
}

/**
 * Save user mapping
 */
export function saveUserMapping(
  description: string,
  category: string,
  department?: string
): void {
  if (typeof window === 'undefined') return // Server-side: skip
  
  try {
    const mappings = getUserMappings()
    const normalized = normalizeDescription(description)
    const merchantName = extractMerchantName(description)
    
    // Check if mapping already exists
    const existingIndex = mappings.findIndex(m => 
      m.descriptionPattern === normalized || 
      (merchantName && m.descriptionPattern === merchantName)
    )
    
    const newMapping: UserMapping = {
      descriptionPattern: normalized,
      category,
      department,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    }
    
    if (existingIndex >= 0) {
      // Update existing mapping
      mappings[existingIndex] = {
        ...mappings[existingIndex],
        category,
        department,
        createdAt: mappings[existingIndex].createdAt, // Keep original creation date
      }
    } else {
      // Add new mapping
      mappings.push(newMapping)
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
    console.log('[USER-MAPPINGS] Saved mapping:', { normalized, category, department })
  } catch (error) {
    console.error('[USER-MAPPINGS] Failed to save mapping:', error)
  }
}

/**
 * Find matching user mapping for a description
 */
export function findUserMapping(description: string): UserMapping | null {
  if (typeof window === 'undefined') return null // Server-side: return null
  
  const mappings = getUserMappings()
  if (mappings.length === 0) return null
  
  const normalized = normalizeDescription(description)
  
  // First, try exact match
  let match = mappings.find(m => m.descriptionPattern === normalized)
  if (match) {
    updateMappingUsage(match)
    return match
  }
  
  // Then, try fuzzy match
  for (const mapping of mappings) {
    if (descriptionsMatch(description, mapping.descriptionPattern, true)) {
      updateMappingUsage(mapping)
      return mapping
    }
  }
  
  return null
}

/**
 * Update mapping usage statistics
 */
function updateMappingUsage(mapping: UserMapping): void {
  if (typeof window === 'undefined') return // Server-side: skip
  
  try {
    const mappings = getUserMappings()
    const index = mappings.findIndex(m => 
      m.descriptionPattern === mapping.descriptionPattern &&
      m.category === mapping.category
    )
    
    if (index >= 0) {
      mappings[index].usageCount = (mappings[index].usageCount || 0) + 1
      mappings[index].lastUsedAt = new Date().toISOString()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
    }
  } catch (error) {
    console.error('[USER-MAPPINGS] Failed to update usage:', error)
  }
}

/**
 * Delete a user mapping
 */
export function deleteUserMapping(descriptionPattern: string): void {
  if (typeof window === 'undefined') return // Server-side: skip
  
  try {
    const mappings = getUserMappings()
    const filtered = mappings.filter(m => m.descriptionPattern !== descriptionPattern)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    console.log('[USER-MAPPINGS] Deleted mapping:', descriptionPattern)
  } catch (error) {
    console.error('[USER-MAPPINGS] Failed to delete mapping:', error)
  }
}

/**
 * Clear all user mappings
 */
export function clearUserMappings(): void {
  if (typeof window === 'undefined') return // Server-side: skip
  
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('[USER-MAPPINGS] Cleared all mappings')
  } catch (error) {
    console.error('[USER-MAPPINGS] Failed to clear mappings:', error)
  }
}

