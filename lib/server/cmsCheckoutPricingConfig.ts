import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { supabaseNoSessionClientOptions } from '@/lib/supabase/adminFetch'
import { STOREFRONT_CMS_CONFIG_KEY } from '@/lib/siteConfigConstants'
import { unwrapSiteConfigValue } from '@/lib/siteConfigWritePayload'
import type { PaymentFeeOptionLike } from '@/lib/checkout/paymentFee'
import type { PromoCodeLike } from '@/lib/checkout/promoCheckoutDiscount'
import type { VipGradeBenefitLike } from '@/lib/checkout/vipCheckoutDiscount'

export type CmsCheckoutPricingConfig = {
  paymentOptions: Array<PaymentFeeOptionLike & { type?: string; name?: string; isActive?: boolean }>
  promoCodes: PromoCodeLike[]
  vipGradeBenefits: VipGradeBenefitLike[]
  vipGradeConfigs: Array<{ code: number; minAmount: number; maxAmount?: number; isActive?: boolean }>
}

let cmsSupabaseAnonClient: SupabaseClient | null = null

function getCmsClient(): SupabaseClient | null {
  if (isSupabaseConfigured()) return getSupabaseAdmin()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) return null
  if (!cmsSupabaseAnonClient) {
    cmsSupabaseAnonClient = createClient(url, anon, supabaseNoSessionClientOptions())
  }
  return cmsSupabaseAnonClient
}

/**
 * Payment / promo / VIP benefit rows from the same storefront CMS blob as shipping.
 * Empty arrays when CMS unavailable — callers treat as “no extra discount/fee”.
 */
export async function readCmsCheckoutPricingConfig(): Promise<CmsCheckoutPricingConfig> {
  const empty: CmsCheckoutPricingConfig = {
    paymentOptions: [],
    promoCodes: [],
    vipGradeBenefits: [],
    vipGradeConfigs: [],
  }
  const client = getCmsClient()
  if (!client) return empty
  try {
    const { data, error } = await client
      .from('site_configs')
      .select('value')
      .eq('config_key', STOREFRONT_CMS_CONFIG_KEY)
      .maybeSingle()
    if (error || !data) return empty
    const obj = unwrapSiteConfigValue(data.value)
    if (!obj) return empty
    return {
      paymentOptions: Array.isArray(obj.paymentOptions) ? obj.paymentOptions : [],
      promoCodes: Array.isArray(obj.promoCodes) ? obj.promoCodes : [],
      vipGradeBenefits: Array.isArray(obj.vipGradeBenefits) ? obj.vipGradeBenefits : [],
      vipGradeConfigs: Array.isArray(obj.vipGradeConfigs) ? obj.vipGradeConfigs : [],
    }
  } catch {
    return empty
  }
}
