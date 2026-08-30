import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminPermission,
} from '@/lib/supabase/requireAdminPermission'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type DocumentSendLogRow = {
  id: string
  document_type: string
  document_number: string | null
  recipient_email: string
  recipient_name: string
  subject: string
  content: string
  sent_at: string
  sent_by: string
  status: 'sent' | 'failed' | 'pending'
  related_order_id: string | null
  source: string
  document_snapshot: Record<string, unknown> | null
  error_message: string | null
  resent_from_id: string | null
  created_at: string
}

const ALLOWED_TYPES = new Set([
  'invoice',
  'quote',
  'order_confirmation',
  'shipping_notification',
  'receipt',
  'contract',
  'other',
])

const ALLOWED_STATUS = new Set(['sent', 'failed', 'pending'])
const ALLOWED_SOURCE = new Set(['create_send', 'documents', 'other'])

function rowToClient(row: DocumentSendLogRow) {
  return {
    id: row.id,
    documentType: row.document_type,
    documentNumber: row.document_number || undefined,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    subject: row.subject,
    content: row.content,
    sentAt: row.sent_at,
    sentBy: row.sent_by,
    status: row.status,
    relatedOrderId: row.related_order_id || undefined,
    source: row.source,
    documentSnapshot: row.document_snapshot || undefined,
    errorMessage: row.error_message || undefined,
    resentFromId: row.resent_from_id || undefined,
  }
}

export async function GET() {
  const gate = await requireAdminPermission('documents:read')
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  try {
    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('document_send_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const logs = ((data || []) as DocumentSendLogRow[]).map(rowToClient)
    return NextResponse.json({ logs })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load send logs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const gate = await requireAdminPermission('documents:write')
  if (!gate.ok) return adminPermissionDeniedPlain(gate)!
  const user = gate.user

  let body: any = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const id = String(body?.id || '').trim()
  const documentType = String(body?.documentType || '').trim()
  const recipientEmail = String(body?.recipientEmail || '').trim()
  const status = String(body?.status || '').trim()
  const source = String(body?.source || 'other').trim()

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!ALLOWED_TYPES.has(documentType)) {
    return NextResponse.json({ error: 'Invalid documentType' }, { status: 400 })
  }
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return NextResponse.json({ error: 'Invalid recipientEmail' }, { status: 400 })
  }
  if (!ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (!ALLOWED_SOURCE.has(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  const row = {
    id,
    document_type: documentType,
    document_number: body?.documentNumber ? String(body.documentNumber) : null,
    recipient_email: recipientEmail,
    recipient_name: String(body?.recipientName || '').trim() || recipientEmail.split('@')[0],
    subject: String(body?.subject || ''),
    content: String(body?.content || ''),
    sent_at: body?.sentAt ? String(body.sentAt) : new Date().toISOString(),
    sent_by: String(body?.sentBy || user.email || 'Admin'),
    status,
    related_order_id: body?.relatedOrderId ? String(body.relatedOrderId) : null,
    source,
    document_snapshot:
      body?.documentSnapshot && typeof body.documentSnapshot === 'object'
        ? body.documentSnapshot
        : null,
    error_message: body?.errorMessage ? String(body.errorMessage) : null,
    resent_from_id: body?.resentFromId ? String(body.resentFromId) : null,
  }

  try {
    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('document_send_logs')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ log: rowToClient(data as DocumentSendLogRow) }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to save send log'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
