import 'openai/shims/node'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

/**
 * Validate OpenAI API Key
 * 
 * This endpoint tests if the provided API key is valid by making a simple API call
 */
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey || !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { valid: false, error: 'Invalid API key format' },
        { status: 400 }
      )
    }

    // Test API key by making a simple request
    const openai = new OpenAI({ apiKey })

    try {
      // Make a minimal API call to validate the key
      await openai.models.list()
      
      return NextResponse.json({ valid: true })
    } catch (error: any) {
      // If API call fails, key is invalid
      if (error.status === 401 || error.status === 403) {
        return NextResponse.json({ valid: false, error: 'Invalid API key' })
      }
      
      // Other errors might be network issues, but we'll consider it invalid for safety
      return NextResponse.json({ valid: false, error: 'API key validation failed' })
    }
  } catch (error) {
    console.error('API key validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Validation error' },
      { status: 500 }
    )
  }
}

