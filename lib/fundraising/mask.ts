export function maskBsb(bsb?: string): string {
  const d = (bsb || '').replace(/\D/g, '')
  if (d.length < 3) return 'BSB ***-***'
  return `BSB ${d.slice(0, 3)}-***`
}

export function maskAccount(accountNumber?: string): string {
  const d = (accountNumber || '').replace(/\s/g, '')
  if (d.length < 4) return 'Acc ****'
  return `Acc ****${d.slice(-4)}`
}
