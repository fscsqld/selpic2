import { NextRequest, NextResponse } from 'next/server'
import { emailTrackingService } from '@/lib/emailTrackingService'

export async function GET(
  request: NextRequest,
  { params }: { params: { emailId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const originalUrl = searchParams.get('url')
    const linkName = searchParams.get('link') || 'default'
    
    if (!originalUrl) {
      return new NextResponse('Original URL required', { status: 400 })
    }

    const emailId = params.emailId
    const userAgent = request.headers.get('user-agent') || undefined

    // Record link click
    emailTrackingService.recordClick(emailId, linkName, userAgent)

    // Decode and redirect to original URL
    const decodedUrl = decodeURIComponent(originalUrl)
    
    return NextResponse.redirect(decodedUrl, 302)
  } catch (error) {
    console.error('Error tracking link click:', error)
    
    // If tracking fails, still try to redirect to original URL
    const originalUrl = request.nextUrl.searchParams.get('url')
    if (originalUrl) {
      try {
        const decodedUrl = decodeURIComponent(originalUrl)
        return NextResponse.redirect(decodedUrl, 302)
      } catch {
        return new NextResponse('Invalid URL', { status: 400 })
      }
    }
    
    return new NextResponse('URL not found', { status: 404 })
  }
}
