import { NextResponse } from 'next/server'
import { getSupabaseSessionUser } from '@/lib/supabase/requireSupabaseAdmin'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { readCmsCheckoutPricingConfig } from '@/lib/server/cmsCheckoutPricingConfig'
import { resolveStorefrontVipGradeFromOrders } from '@/lib/server/resolveStorefrontVipGrade'

function normEmail(s: string) {
  return (s || '').trim().toLowerCase()
}

/**
 * Customer-facing VIP grade for profile / checkout UI.
 * Same source as payment APIs: admin manual override in site_configs, else sales-derived.
 */
export async function GET() {
  const sessionUser = await getSupabaseSessionUser()
  if (!sessionUser?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = normEmail(sessionUser.email)

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      gradeCode: 0,
      totalSales: 0,
      fromManualOverride: false,
    })
  }

  try {
    const cms = await readCmsCheckoutPricingConfig()
    const { gradeCode, totalSales, fromManualOverride } = await resolveStorefrontVipGradeFromOrders({
      email,
      gradeConfigs: cms.vipGradeConfigs,
    })
    return NextResponse.json({
      gradeCode,
      totalSales,
      fromManualOverride,
    })
  } catch (e) {
    logAndSafeMessage('me/vip-grade GET', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
