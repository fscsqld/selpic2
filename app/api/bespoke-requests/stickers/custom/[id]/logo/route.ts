import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import {
  bespokeLogoDownloadFilename,
  readBespokeLogoBytes,
  readBespokeStickerRequestById,
} from '@/lib/server/bespokeStickerRequests'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id: requestId } = await params
  try {
    const record = await readBespokeStickerRequestById(requestId)
    if (!record?.logo?.fileUrl) {
      return NextResponse.json({ success: false, message: 'Logo not found' }, { status: 404 })
    }

    const buffer = await readBespokeLogoBytes(record)
    if (!buffer) {
      return NextResponse.json({ success: false, message: 'Logo file unavailable' }, { status: 404 })
    }

    const filename = bespokeLogoDownloadFilename(record)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': record.logo.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
