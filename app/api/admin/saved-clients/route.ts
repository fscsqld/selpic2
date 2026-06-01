import { NextResponse } from 'next/server'

import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type SavedClientCategory = 'sticker' | 'cleaning'

type SavedClientRow = {
  id: string
  label: string
  category: SavedClientCategory
  billing: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function GET() {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = await createSupabaseServerClient()
  const { data, error } = await sb
    .from('admin_saved_clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ clients: (data || []) as SavedClientRow[] })
}

export async function POST(req: Request) {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const label = String(body?.label || '').trim()
  const category = body?.category as SavedClientCategory
  const billing = body?.billing && typeof body.billing === 'object' ? body.billing : {}

  if (!label) return NextResponse.json({ error: 'Missing label' }, { status: 400 })
  if (category !== 'sticker' && category !== 'cleaning') {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const sb = await createSupabaseServerClient()
  const { data, error } = await sb
    .from('admin_saved_clients')
    .insert({ label, category, billing })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ client: data as SavedClientRow }, { status: 201 })
}

