/**
 * Merchant / description text shown in Transaction History and Excel.
 * Keep one cleaner so the spreadsheet matches the on-screen cell.
 */

import { stripBankStatementBoilerplate } from '@/lib/classification/bank-advisory'

export function cleanTransactionDescription(description: string): string {
  if (!description) return ''

  const desc = stripBankStatementBoilerplate(description.trim())
  if (!desc) return ''
  const descLower = desc.toLowerCase()

  const merchantMap: Array<{ pattern: RegExp | string; name: string }> = [
    { pattern: /bcc\s+kgs\s+car\s+park|king\s+george\s+square/i, name: 'King George Square Car Park' },
    { pattern: /associated\s+cleaning?|associatedclean/i, name: 'Associated Cleaning' },
    { pattern: /jason\s+family(?:\s+shine)?/i, name: 'Jason Family Shine' },
    { pattern: /ak\s+innovation/i, name: 'AK Innovation' },
    { pattern: /aseeos(?:\s+homes)?/i, name: 'Aseeos Homes' },
    { pattern: /7[- ]?eleven|7eleven/i, name: '7-Eleven' },
    { pattern: /stripe/i, name: 'Stripe' },
    { pattern: /etsy/i, name: 'Etsy' },
    { pattern: /ebay|e-bay/i, name: 'eBay' },
    { pattern: /cursor/i, name: 'Cursor' },
    { pattern: /google\s+(workspace|cloud|ads)|gsuite/i, name: 'Google' },
    { pattern: /paypal/i, name: 'PayPal' },
    { pattern: /hanaone(?:\s+express)?/i, name: 'Hanaone Express' },
    { pattern: /australia\s+post|auspost|startrack|parcel\s+post/i, name: 'Australia Post' },
    { pattern: /sendle/i, name: 'Sendle' },
    { pattern: /kleenhub/i, name: 'KleenHub' },
    { pattern: /ampol/i, name: 'Ampol' },
    { pattern: /bunnings/i, name: 'Bunnings' },
    { pattern: /malatang/i, name: 'Malatang' },
    { pattern: /mjr\s+enterprise/i, name: 'MJR Enterprise' },
    { pattern: /oktax/i, name: 'OKTAX' },
    { pattern: /tpg(?:\s+(?:internet|telecom))?/i, name: 'TPG Internet' },
    { pattern: /alinta\s+energy/i, name: 'Alinta Energy' },
    { pattern: /brisbane\s+city\s+council/i, name: 'Brisbane City Council' },
    { pattern: /allianz/i, name: 'Allianz' },
    { pattern: /racq/i, name: 'RACQ' },
    { pattern: /nrma/i, name: 'NRMA' },
    { pattern: /secure\s+parking/i, name: 'Secure Parking' },
    { pattern: /uptown\s+parking/i, name: 'Uptown Parking' },
    { pattern: /supercheap\s+auto/i, name: 'Supercheap Auto' },
    { pattern: /total\s+tools/i, name: 'Total Tools' },
    { pattern: /bp\b/i, name: 'BP' },
    { pattern: /shell\b/i, name: 'Shell' },
    { pattern: /liberty\b/i, name: 'Liberty' },
    { pattern: /united\b/i, name: 'United' },
  ]

  for (const { pattern, name } of merchantMap) {
    if (typeof pattern === 'string') {
      if (descLower.includes(pattern)) return name
    } else if (pattern.test(desc)) {
      return name
    }
  }

  let cleaned = desc
    .replace(/^(V\d+|EFTPOS|VISA|MASTERCARD|DEBIT|CREDIT|ATM|NABATM)\s+/i, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\s*/g, '')
    .replace(/\d{1,2}:\d{2}\s*/g, '')
    .replace(/\s+\d{8,}$/g, '')
    .replace(/\b\d{4,5}[A-Z]?\b/g, '')
    .replace(/\b(QLD|NSW|VIC|SA|WA|NT|ACT|TAS)\b/gi, '')
    .replace(/\b(MOUNT|MT|ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|BLVD|BOULEVARD)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length > 30) {
    const words = cleaned.split(/\s+/).filter(
      (word) =>
        word.length > 2 &&
        !/^\d+$/.test(word) &&
        !['THE', 'AND', 'FOR', 'FROM', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY'].includes(
          word.toUpperCase()
        )
    )
    if (words.length > 0) {
      return words
        .slice(0, 3)
        .join(' ')
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }
  }

  if (cleaned.length > 50) {
    return cleaned.substring(0, 50) + '...'
  }

  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
