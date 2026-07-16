/**
 * Normalize to Australian local digits starting with 0 (e.g. 0412345678).
 * Does not invent missing digits — incomplete input stays incomplete.
 */
export function toAuLocalDigits(raw?: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (digits.startsWith('61') && digits.length >= 3) {
    digits = '0' + digits.slice(2)
  }
  // Common case: national significant number without leading 0 (e.g. 412345678)
  if (digits.length === 9 && /^[23478]/.test(digits)) {
    digits = '0' + digits
  }
  return digits
}

/**
 * Valid AU mobile (04…) or landline (02/03/07/08…) — 10 local digits.
 * Rejects empty values and country-code-only inputs like "+61".
 */
export function isValidAuPhone(raw?: string): boolean {
  const digits = toAuLocalDigits(raw)
  return /^04\d{8}$/.test(digits) || /^0[2378]\d{8}$/.test(digits)
}

export function formatAuPhoneHyphen(raw?: string): string {
  const original = raw || ''
  // Normalize to AU local format: replace +61 / 61 with leading 0, strip non-digits
  let digits = original.replace(/\D/g, '')
  
  // Handle +61 or 61 prefix
  if (digits.startsWith('61')) {
    digits = '0' + digits.slice(2)
  }
  
  // For Australian mobile numbers (starting with 04), ensure 10 digits
  if (digits.startsWith('04')) {
    // If it's 9 digits, add a trailing 0 to make it 10 digits
    if (digits.length === 9) {
      digits = digits + '0'
    }
    // If it's 8 digits, add two trailing 0s
    if (digits.length === 8) {
      digits = digits + '00'
    }
  }
  
  // Format 10-digit numbers as 0000-000-000 (4-3-3 with hyphens)
  if (digits.length === 10) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  
  // For 9-digit numbers, format as 000-000-000 (3-3-3 with hyphens)
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  // Fallback: return original unmodified
  return original
}


