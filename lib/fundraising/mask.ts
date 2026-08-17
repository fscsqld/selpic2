export function maskBsb(bsb?: string): string {
  return `BSB ${maskedBsbValue(bsb)}`
}

/** Digits-only mask for labels that already say "BSB:" (e.g. D9/D10). */
export function maskedBsbValue(bsb?: string): string {
  const d = (bsb || '').replace(/\D/g, '')
  if (d.length < 3) return '***-***'
  return `${d.slice(0, 3)}-***`
}

export function maskAccount(accountNumber?: string): string {
  return `Acc ${maskedAccountValue(accountNumber)}`
}

/** Digits-only mask for labels that already say "Account Number:" / "Acc:". */
export function maskedAccountValue(accountNumber?: string): string {
  const d = (accountNumber || '').replace(/\s/g, '')
  if (d.length < 4) return '****'
  return `****${d.slice(-4)}`
}
