import 'server-only'

import { requireAdminPermission, type AdminPermissionGate } from '@/lib/supabase/requireAdminPermission'

function getBearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization')
  if (h?.startsWith('Bearer ')) return h.slice(7).trim()
  const alt = req.headers.get('x-catalog-sync-secret')
  return alt?.trim() || null
}

function hasCatalogSyncSecret(req: Request): boolean {
  const token = getBearerToken(req)
  const expected = (process.env.CATALOG_SYNC_SECRET || '').trim()
  return Boolean(expected && token === expected)
}

/**
 * Catalog sync from automation may use CATALOG_SYNC_SECRET.
 * Browser admin writes must pass registry session + products permission.
 */
export async function authorizeCatalogApi(
  req: Request,
  mode: 'read' | 'write'
): Promise<AdminPermissionGate | { ok: true; user?: undefined }> {
  if (hasCatalogSyncSecret(req)) {
    return { ok: true }
  }

  return requireAdminPermission(mode === 'write' ? 'products:write' : 'products:read')
}
