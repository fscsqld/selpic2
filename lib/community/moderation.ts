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

export function hasBannedCommunityContent(text: string): boolean {
  const lower = text.toLowerCase()
  return bannedKeywords.some((k) => lower.includes(k))
}

export function sanitizeCommunityText(input: unknown, maxLen: number): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim()
  if (!s) return null
  if (s.length > maxLen) return null
  return s
}
