import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { STOREFRONT_CMS_CONFIG_KEY } from '@/lib/siteConfigConstants'
import { shippingOptions as staticShippingOptions } from '@/lib/shippingOptions'
import type { ShippingOptionForPricing, FreeShippingSettingsLike } from '@/lib/shipping/computeChargedShippingPrice'
import type { ShippingServiceType } from '@/lib/shipping/shippingSnapshot'

export type CmsShippingConfig = {
  shippingOptions: ShippingOptionForPricing[]
  freeShippingSettings: FreeShippingSettingsLike
  vipFreeShippingByGrade: Record<number, boolean>
}

const DEFAULT_FREE_SHIPPING: FreeShippingSettingsLike = {
  enabled: true,
  threshold: 50,
}

const STATIC_FALLBACK_OPTIONS: ShippingOptionForPricing[] = staticShippingOptions.map((o, index) => ({
  ...o,
  type: (o.id === 'local-pickup' ? 'pickup' : 'delivery') as ShippingServiceType,
  isActive: true,
  freeShippingWhenThresholdMet: o.id === 'standard-letter',
  discountWhenThresholdMet: ['tracked-letter', 'express-post', 'parcel-post'].includes(o.id) ? 2.4 : undefined,
  alwaysFree: o.id === 'local-pickup',
  order: index + 1,
}))

let cmsSupabaseAnonClient: SupabaseClient | null = null

function getCmsSupabaseClient(): SupabaseClient | null {
  if (isSupabaseConfigured()) {
    return getSupabaseAdmin()
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) return null
  if (!cmsSupabaseAnonClient) {
    cmsSupabaseAnonClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cmsSupabaseAnonClient
}

function normalizeOption(raw: any): ShippingOptionForPricing | null {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || '').trim()
  if (!id) return null
  return {
    id,
    name: String(raw.name || id).trim() || id,
    price: Number(raw.price) || 0,
    deliveryTime: String(raw.deliveryTime || '').trim() || '—',
    tracking: Boolean(raw.tracking),
    insurance: Boolean(raw.insurance),
    type: (raw.type === 'pickup' || raw.type === 'cash-on-delivery' ? raw.type : 'delivery') as ShippingServiceType,
    isActive: raw.isActive !== false,
    alwaysFree: Boolean(raw.alwaysFree),
    freeShippingWhenThresholdMet: Boolean(raw.freeShippingWhenThresholdMet),
    discountWhenThresholdMet:
      raw.discountWhenThresholdMet !== undefined && raw.discountWhenThresholdMet !== null
        ? Number(raw.discountWhenThresholdMet)
        : undefined,
  }
}

function parseCmsValue(value: unknown): Record<string, unknown> | null {
  let normalized: unknown = value
  if (typeof value === 'string') {
    try {
      normalized = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) return null
  return normalized as Record<string, unknown>
}

/**
 * Load active shipping options + free-shipping settings from storefront CMS.
 * Falls back to static defaults when CMS is unavailable.
 */
export async function readCmsShippingConfig(): Promise<CmsShippingConfig> {
  const client = getCmsSupabaseClient()
  if (client) {
    try {
      const { data, error } = await client
        .from('site_configs')
        .select('value')
        .eq('config_key', STOREFRONT_CMS_CONFIG_KEY)
        .maybeSingle()

      if (!error && data) {
        const obj = parseCmsValue(data.value)
        if (obj) {
          const rawOptions = Array.isArray(obj.shippingOptions) ? obj.shippingOptions : []
          const options = rawOptions
            .map(normalizeOption)
            .filter((o): o is ShippingOptionForPricing => Boolean(o))

          const fsRaw = obj.freeShippingSettings
          const freeShippingSettings: FreeShippingSettingsLike =
            fsRaw && typeof fsRaw === 'object' && !Array.isArray(fsRaw)
              ? {
                  enabled: Boolean((fsRaw as any).enabled),
                  threshold: Number((fsRaw as any).threshold) || DEFAULT_FREE_SHIPPING.threshold,
                }
              : DEFAULT_FREE_SHIPPING

          const vipFreeShippingByGrade: Record<number, boolean> = {}
          const benefits = Array.isArray(obj.vipGradeBenefits) ? obj.vipGradeBenefits : []
          for (const b of benefits) {
            if (!b || typeof b !== 'object') continue
            if ((b as any).isActive === false) continue
            const code = Number((b as any).gradeCode)
            if (!Number.isFinite(code)) continue
            vipFreeShippingByGrade[code] = Boolean((b as any).freeShipping)
          }

          if (options.length > 0) {
            return {
              shippingOptions: options,
              freeShippingSettings,
              vipFreeShippingByGrade,
            }
          }
        }
      }
    } catch {
      // Fall through to static defaults.
    }
  }

  return {
    shippingOptions: STATIC_FALLBACK_OPTIONS,
    freeShippingSettings: DEFAULT_FREE_SHIPPING,
    vipFreeShippingByGrade: {
      2: true,
      3: true,
      4: true,
    },
  }
}

export async function findActiveShippingOption(optionId: string): Promise<{
  option: ShippingOptionForPricing
  freeShippingSettings: FreeShippingSettingsLike
  vipFreeShippingByGrade: Record<number, boolean>
} | null> {
  const id = String(optionId || '').trim()
  if (!id) return null
  const cfg = await readCmsShippingConfig()
  const option = cfg.shippingOptions.find((o) => o.id === id && o.isActive !== false)
  if (!option) return null
  return {
    option,
    freeShippingSettings: cfg.freeShippingSettings,
    vipFreeShippingByGrade: cfg.vipFreeShippingByGrade,
  }
}
