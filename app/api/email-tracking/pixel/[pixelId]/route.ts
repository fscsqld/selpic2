import { NextRequest, NextResponse } from 'next/server'
import { emailTrackingService } from '@/lib/emailTrackingService'

// 1x1 transparent pixel image in base64
const TRACKING_PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pixelId: string }> }
) {
  try {
    await params // segment id available for future routing; open uses query emailId
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    
    if (!emailId) {
      return new NextResponse('Email ID required', { status: 400 })
    }

    // Get user agent and IP address
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Record email open
    emailTrackingService.recordOpen(emailId, userAgent, ipAddress)

    // Return 1x1 transparent pixel
    const pixelBuffer = Buffer.from(TRACKING_PIXEL, 'base64')
    
    return new NextResponse(pixelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixelBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error tracking email open:', error)
    
    // Still return pixel even on error
    const pixelBuffer = Buffer.from(TRACKING_PIXEL, 'base64')
    return new NextResponse(pixelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}
