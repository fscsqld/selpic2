import { NextResponse } from 'next/server'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { closeCurrentStorefrontAccount } from '@/lib/server/closeStorefrontAccount'

/**
 * Customer closes their own login (Auth). Orders ledger is retained.
 * Admin Users list drops the row after Auth sync (email no longer in Auth roster).
 */
export async function POST() {
  try {
    const result = await closeCurrentStorefrontAccount()
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    logAndSafeMessage('me/close-account POST', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
