const bannedKeywords = [
  'kill',
  'murder',
  'assault',
  'violence',
  'weapon',
  'bomb',
  'terror',
  'porn',
  'sex',
  'nude',
  'xxx',
  'adult',
  'drug',
  'cocaine',
  'heroin',
  'marijuana',
  'hate',
  'racist',
  'discrimination',
  'scam',
  'fraud',
  'phishing',
  'hack',
  'gambling',
  'casino',
  'betting',
  'piracy',
  'cracked',
  'torrent',
]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Whole-word match only — avoids false positives (e.g. "skill" contains "kill"). */
export function hasBannedCommunityContent(text: string): boolean {
  const lower = text.toLowerCase()
  return bannedKeywords.some((k) => {
    const re = new RegExp(`\\b${escapeRegex(k)}\\b`, 'i')
    return re.test(lower)
  })
}

export function sanitizeCommunityText(input: unknown, maxLen: number): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim()
  if (!s) return null
  if (s.length > maxLen) return null
  return s
}
