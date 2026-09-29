/**
 * Pure guard: customer close-account must never list orders as a delete target.
 * Admin cascade (`deletePublicDataForAuthUser`) is a different path.
 */

export const CLOSE_ACCOUNT_MUST_NOT_DELETE_TABLES = ['orders'] as const

export function assertCloseAccountKeepsOrders(tablesToDelete: string[]): boolean {
  const blocked = new Set(CLOSE_ACCOUNT_MUST_NOT_DELETE_TABLES.map((t) => t.toLowerCase()))
  return !tablesToDelete.some((t) => blocked.has(String(t || '').toLowerCase()))
}
