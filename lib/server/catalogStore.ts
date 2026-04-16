import path from 'path'
import fs from 'fs/promises'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { STOREFRONT_CATALOG_CONFIG_KEY } from '@/lib/siteConfigConstants'

export type CatalogProductRecord = {
  id: string
  name: string
  description: string
  image?: string
  price: number
  category: string
  subcategory?: string
  inStock: boolean
  updatedAt: string
  hasDetailPage?: boolean
}

export type CatalogFileShape = {
  updatedAt: string
  products: CatalogProductRecord[]
}

const DATA_DIR = path.join(process.cwd(), 'data', 'catalog')
const DATA_FILE = path.join(DATA_DIR, 'products.json')
let catalogSupabaseAnonClient: SupabaseClient | null = null

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function getCatalogSupabaseClient(): SupabaseClient | null {
  if (isSupabaseConfigured()) {
    return getSupabaseAdmin()
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) return null
  if (!catalogSupabaseAnonClient) {
    catalogSupabaseAnonClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return catalogSupabaseAnonClient
}

export async function readCatalogSnapshot(): Promise<CatalogFileShape> {
  const client = getCatalogSupabaseClient()
  if (client) {
    try {
      const { data, error } = await client
        .from('site_configs')
        .select('value, updated_at')
        .eq('config_key', STOREFRONT_CATALOG_CONFIG_KEY)
        .maybeSingle()
      if (!error && data) {
        const value = data.value
        let normalized: unknown = value
        if (typeof value === 'string') {
          try {
            normalized = JSON.parse(value)
          } catch {
            normalized = null
          }
        }
        if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
          const obj = normalized as Record<string, unknown>
          const products = Array.isArray(obj.products) ? (obj.products as CatalogProductRecord[]) : []
          return {
            updatedAt:
              (typeof obj.updatedAt === 'string' ? obj.updatedAt : '') ||
              (typeof data.updated_at === 'string' ? data.updated_at : ''),
            products,
          }
        }
        if (Array.isArray(normalized)) {
          return {
            updatedAt: typeof data.updated_at === 'string' ? data.updated_at : '',
            products: normalized as CatalogProductRecord[],
          }
        }
      }
    } catch {
      // Fall through to file fallback for local/dev recovery.
    }
  }

  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as CatalogFileShape | CatalogProductRecord[]
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray((parsed as CatalogFileShape).products)) {
      const snapshot = parsed as CatalogFileShape
      return {
        updatedAt: snapshot.updatedAt || '',
        products: snapshot.products,
      }
    }
    if (Array.isArray(parsed)) {
      return {
        updatedAt: '',
        products: parsed,
      }
    }
    return { updatedAt: '', products: [] }
  } catch {
    return { updatedAt: '', products: [] }
  }
}

export async function readCatalogProducts(): Promise<CatalogProductRecord[]> {
  const snapshot = await readCatalogSnapshot()
  return snapshot.products
}

export async function writeCatalogFile(data: CatalogFileShape): Promise<void> {
  const client = getCatalogSupabaseClient()
  if (client) {
    const now = new Date().toISOString()
    const { error } = await client
      .from('site_configs')
      .upsert(
        {
          config_key: STOREFRONT_CATALOG_CONFIG_KEY,
          value: {
            updatedAt: data.updatedAt || now,
            products: data.products,
          },
          updated_at: now,
        },
        { onConflict: 'config_key' }
      )
    if (error) {
      throw new Error(`[catalog] Supabase upsert failed: ${error.message}`)
    }
    return
  }

  await ensureDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}
