import 'openai/shims/node'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

/**
 * OpenAI Usage & Billing API
 * 
 * Fetches usage information from IndexedDB (client-side tracking)
 * Note: This endpoint is called from client-side to get server-side aggregated usage
 * The actual usage data is stored in IndexedDB on the client side
 */

interface UsageResponse {
  totalUsage: number
  estimatedRemaining: number | null
  hasLowBalance: boolean
  budgetExceeded: boolean
  budgetLimit: number | null
  lastUpdated: string
  error?: string
  message?: string
  dashboardUrl?: string
  actualUsage?: number
  actualRemaining?: number
  success?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey || !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid API key format', success: false },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey })

    try {
      // Validate API key first
      await openai.models.list()
      
      console.log('[USAGE-API] API key validated successfully')
      
      // Note: Actual usage data is tracked in IndexedDB on the client side
      // This endpoint validates the API key and returns a success response
      // The client will fetch actual usage from IndexedDB using getApiUsageStats
      
      // Return success response - client will use IndexedDB data
      return NextResponse.json({
        success: true,
        totalUsage: 0, // Client will calculate from IndexedDB
        estimatedRemaining: null, // Client will calculate
        hasLowBalance: false,
        budgetExceeded: false,
        budgetLimit: null,
        lastUpdated: new Date().toISOString(),
        message: 'API key validated. Usage data will be fetched from IndexedDB.',
        dashboardUrl: 'https://platform.openai.com/account/billing'
      } as UsageResponse)
        
    } catch (apiError: any) {
      console.error('[USAGE-API] Error calling OpenAI API:', apiError)
      
      // If API key is invalid
      if (apiError.status === 401 || apiError.status === 403) {
        return NextResponse.json(
          { 
            error: 'Invalid API key', 
            hasLowBalance: false,
            success: false 
          },
          { status: 401 }
        )
      }

      // For other errors
      return NextResponse.json({
        success: false,
        totalUsage: 0,
        estimatedRemaining: null,
        hasLowBalance: false,
        budgetExceeded: false,
        budgetLimit: null,
        lastUpdated: new Date().toISOString(),
        error: `API validation failed: ${apiError.message || 'Unknown error'}`,
        dashboardUrl: 'https://platform.openai.com/account/billing'
      } as UsageResponse)
    }
  } catch (error: any) {
    console.error('[USAGE-API] Request error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process usage request',
        success: false 
      },
      { status: 500 }
    )
  }
}
