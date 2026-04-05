/**
 * Grant admin via Supabase Auth user_metadata (raw_user_meta_data), using the service role key.
 *
 *   node scripts/grant-supabase-admin.mjs [user-uuid]
 *
 * Loads `.env.local` from the project root (same pattern as verify-order-ledger.mjs).
 * Never commit SUPABASE_SERVICE_ROLE_KEY or run this in the browser.
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const DEFAULT_USER_ID = 'e46c1661-2608-4e97-ad2e-7947e19a21eb'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const userId = (process.argv[2] || DEFAULT_USER_ID).trim()

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: got, error: getErr } = await admin.auth.admin.getUserById(userId)
if (getErr || !got?.user) {
  console.error('getUserById failed:', getErr?.message || 'no user')
  process.exit(1)
}

const prev = got.user.user_metadata || {}
const user_metadata = {
  ...prev,
  admin: true,
  email_verified: true,
}

const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(userId, {
  user_metadata,
})

if (updErr) {
  console.error('updateUserById failed:', updErr.message)
  process.exit(1)
}

console.log('Updated user:', updated.user?.email || userId)
console.log('user_metadata:', JSON.stringify(updated.user?.user_metadata, null, 2))
