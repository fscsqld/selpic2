import { NextResponse } from 'next/server'

import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { normalizeProductLikeId } from '@/lib/productLikes'
import { allowRateLimit } from '@/lib/server/simpleRateLimit'
import { getRequestClientIp } from '@/lib/server/requestIp'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { getSupabaseSessionUser } from '@/lib/supabase/requireSupabaseAdmin'

const WINDOW_MS = 10 * 60 * 1000
const MAX_WRITES = 40

type Ctx = { params: Promise<{ id: string }> }

async function countForProduct(productId: string): Promise<number> {
  const sb = getSupabaseAdmin()
  const { count, error } = await sb
    .from('product_likes')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)
  if (error) throw error
  return count ?? 0
}

async function userLiked(productId: string, userId: string): Promise<boolean> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from('product_likes')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

/** Public: like count + whether the session user already liked. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: raw } = await ctx.params
  const productId = normalizeProductLikeId(raw)
  if (!productId) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ productId, count: 0, liked: false, available: false })
  }

  try {
    const sessionUser = await getSupabaseSessionUser()
    const count = await countForProduct(productId)
    const liked = sessionUser?.id ? await userLiked(productId, sessionUser.id) : false
    return NextResponse.json({ productId, count, liked, available: true })
  } catch (e) {
    logAndSafeMessage('products/like GET', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}

/** Logged-in customer: add one like (idempotent if already liked). */
export async function POST(req: Request, ctx: Ctx) {
  const sessionUser = await getSupabaseSessionUser()
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Likes unavailable' }, { status: 503 })
  }

  const ip = getRequestClientIp(req)
  if (!allowRateLimit(`product-like:${ip}`, MAX_WRITES, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  if (!allowRateLimit(`product-like-user:${sessionUser.id}`, MAX_WRITES, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id: raw } = await ctx.params
  const productId = normalizeProductLikeId(raw)
  if (!productId) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
  }

  try {
    const sb = getSupabaseAdmin()
    const { error } = await sb.from('product_likes').insert({
      user_id: sessionUser.id,
      product_id: productId,
    })

    if (error) {
      // Unique violation = already liked
      if (error.code === '23505') {
        const count = await countForProduct(productId)
        return NextResponse.json({ productId, count, liked: true, already: true })
      }
      throw error
    }

    const count = await countForProduct(productId)
    return NextResponse.json({ productId, count, liked: true, already: false })
  } catch (e) {
    logAndSafeMessage('products/like POST', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}

/** Logged-in customer: remove like (optional toggle). */
export async function DELETE(req: Request, ctx: Ctx) {
  const sessionUser = await getSupabaseSessionUser()
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Likes unavailable' }, { status: 503 })
  }

  const ip = getRequestClientIp(req)
  if (!allowRateLimit(`product-like:${ip}`, MAX_WRITES, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id: raw } = await ctx.params
  const productId = normalizeProductLikeId(raw)
  if (!productId) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
  }

  try {
    const sb = getSupabaseAdmin()
    const { error } = await sb
      .from('product_likes')
      .delete()
      .eq('product_id', productId)
      .eq('user_id', sessionUser.id)
    if (error) throw error

    const count = await countForProduct(productId)
    return NextResponse.json({ productId, count, liked: false })
  } catch (e) {
    logAndSafeMessage('products/like DELETE', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
