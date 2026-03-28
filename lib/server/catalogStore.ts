import path from 'path'
import fs from 'fs/promises'

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

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export async function readCatalogProducts(): Promise<CatalogProductRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as CatalogFileShape | CatalogProductRecord[]
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray((parsed as CatalogFileShape).products)) {
      return (parsed as CatalogFileShape).products
    }
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

export async function writeCatalogFile(data: CatalogFileShape): Promise<void> {
  await ensureDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}
