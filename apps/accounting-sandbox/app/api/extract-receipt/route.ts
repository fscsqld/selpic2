import 'openai/shims/node'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

/**
 * Extract receipt data from image using OpenAI Vision API
 */
export async function POST(request: NextRequest) {
  // 🔧 CRITICAL: Single attempt only - NO RETRIES
  // If this fails, return error immediately
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const userApiKey = formData.get('apiKey') as string
    
    console.log('[EXTRACT-RECEIPT] ========================================')
    console.log('[EXTRACT-RECEIPT] Receipt extraction request received')
    console.log('[EXTRACT-RECEIPT] Image file:', imageFile ? {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type
    } : 'NULL')
    console.log('[EXTRACT-RECEIPT] ========================================')

    // Get Master API Key from environment variable (fallback)
    const masterApiKey = process.env.OPENAI_API_KEY

    // Use user's API key if provided, otherwise fall back to Master API Key
    const apiKey = userApiKey?.trim() || masterApiKey

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { error: 'OpenAI API key is required. Please provide your API key or configure OPENAI_API_KEY environment variable.' },
        { status: 400 }
      )
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid API key format. Must start with "sk-"' },
        { status: 400 }
      )
    }

    // 🔧 MOCK TEST: Convert image to base64 and log the process
    console.log('[EXTRACT-RECEIPT] 🔍 Starting Base64 conversion...')
    console.log('[EXTRACT-RECEIPT] Original file info:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
      lastModified: new Date(imageFile.lastModified).toISOString()
    })
    
    const arrayBuffer = await imageFile.arrayBuffer()
    console.log('[EXTRACT-RECEIPT] ArrayBuffer created:', {
      byteLength: arrayBuffer.byteLength,
      sizeKB: Math.round(arrayBuffer.byteLength / 1024)
    })
    
    const buffer = Buffer.from(arrayBuffer)
    console.log('[EXTRACT-RECEIPT] Buffer created:', {
      length: buffer.length,
      sizeKB: Math.round(buffer.length / 1024)
    })
    
    const base64Image = buffer.toString('base64')
    const mimeType = imageFile.type || 'image/jpeg'
    
    // 🔧 MOCK TEST: Log Base64 conversion result
    console.log('[EXTRACT-RECEIPT] ✅ Base64 conversion complete:', {
      base64Length: base64Image.length,
      base64SizeKB: Math.round(base64Image.length / 1024),
      mimeType,
      first50Chars: base64Image.substring(0, 50),
      last50Chars: base64Image.substring(base64Image.length - 50),
      dataUrlFormat: `data:${mimeType};base64,${base64Image.substring(0, 30)}...`,
      isValidBase64: /^[A-Za-z0-9+/=]+$/.test(base64Image.substring(0, 100)) // Check first 100 chars
    })

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // 🔧 CRITICAL: Use gpt-4o-mini for cost optimization (not gpt-4o)
    // gpt-4o-mini supports vision and is much cheaper
    // Call OpenAI Vision API - Standalone request with NO conversation history
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 🔧 COST FIX: Changed from gpt-4o to gpt-4o-mini
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract structured data from this Australian receipt image. Extract the following information in JSON format:
{
  "date": "YYYY-MM-DD" (extract the date from the receipt),
  "amount": number (total amount including GST),
  "merchant": "string" (merchant/store name),
  "abn": "string" (ABN if visible, otherwise empty string),
  "gstAmount": number (GST amount if shown separately, otherwise null),
  "items": [{"description": "string", "quantity": number, "unitPrice": number, "total": number}] (list of items if visible, otherwise empty array)
}

Important:
- Date format must be YYYY-MM-DD
- Amount should be the total amount paid (including GST)
- If date is not clear, use today's date
- If amount is not clear, return null for amount
- Extract merchant name as accurately as possible
- ABN format: XX XXX XXX XXX (11 digits with spaces)
- Return only valid JSON, no additional text`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`, // 🔧 IMAGE FIX: Base64 encoded image in data URL format
                detail: 'low', // 🔧 COST FIX: Use low detail to reduce token usage (gpt-4o-mini supports this)
              },
            },
          ],
        },
      ],
      max_tokens: 1000, // 🔧 TOKEN FIX: Limited to 1000 tokens
      temperature: 0.3, // 🔧 COST FIX: Lower temperature for more consistent, shorter responses
    })
    
    // 🔧 CRITICAL: Log final payload before sending to OpenAI
    const finalPayload = {
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '...' }, // Text prompt (truncated in log)
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image.substring(0, 30)}...`, // Truncated for log
              detail: 'low'
            }
          }
        ]
      }],
      max_tokens: 1000,
      temperature: 0.3
    }
    
    console.log('[EXTRACT-RECEIPT] 📤 Final payload (before API call):', {
      model: finalPayload.model,
      messageCount: finalPayload.messages.length,
      hasImageContent: finalPayload.messages[0].content.some((c: any) => c.type === 'image_url'),
      imageDetail: 'low',
      maxTokens: finalPayload.max_tokens,
      temperature: finalPayload.temperature,
      imageUrlLength: `data:${mimeType};base64,${base64Image}`.length,
      fullBase64Length: base64Image.length
    })
    
    // 🔧 CRITICAL: Log API usage for cost tracking
    if (response.usage) {
      const promptTokens = response.usage.prompt_tokens || 0
      const completionTokens = response.usage.completion_tokens || 0
      const totalTokens = response.usage.total_tokens || 0
      // gpt-4o-mini vision pricing: $0.15/$0.60 per 1M tokens (input/output)
      const estimatedCost = 
        (promptTokens / 1_000_000) * 0.15 +
        (completionTokens / 1_000_000) * 0.60
      
      console.log('[EXTRACT-RECEIPT] 💰 API Usage:', {
        model: 'gpt-4o-mini',
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost: estimatedCost.toFixed(6)
      })
    }

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'Failed to extract receipt data' },
        { status: 500 }
      )
    }

    // Parse JSON response
    let extractedData
    try {
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      extractedData = JSON.parse(jsonContent)
    } catch (parseError) {
      console.error('[EXTRACT-RECEIPT] Failed to parse JSON:', parseError)
      console.error('[EXTRACT-RECEIPT] Response content:', content)
      return NextResponse.json(
        { error: 'Failed to parse extracted data', rawContent: content },
        { status: 500 }
      )
    }

    console.log('[EXTRACT-RECEIPT] Successfully extracted receipt data:', extractedData)

    return NextResponse.json({
      success: true,
      data: extractedData,
    })
  } catch (error: any) {
    // 🔧 CRITICAL: Log error details and return immediately - NO RETRY
    console.error('[EXTRACT-RECEIPT] ❌ Error (NO RETRY):', error)
    
    // 🔧 CRITICAL: Extract OpenAI error message in full detail
    const openAIError = error?.error || error?.response?.data || error
    const errorMessage = openAIError?.message || error?.message || 'Unknown error'
    const errorCode = openAIError?.code || error?.code
    const errorType = openAIError?.type || error?.type || error?.constructor?.name
    
    console.error('[EXTRACT-RECEIPT] 🔍 OpenAI Error Details (Full):', {
      message: errorMessage,
      code: errorCode,
      type: errorType,
      status: error?.status,
      statusText: error?.statusText,
      fullError: JSON.stringify(openAIError, null, 2),
      stack: error.stack
    })
    
    // 🔧 CRITICAL: Check for specific OpenAI errors and stop immediately
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json(
        { 
          error: 'INVALID_API_KEY',
          details: errorMessage, // 🔧 Show OpenAI's original error message
          originalError: openAIError, // 🔧 Include full OpenAI error object
          type: 'AuthenticationError'
        },
        { status: 401 }
      )
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { 
          error: 'RATE_LIMIT_EXCEEDED',
          details: errorMessage, // 🔧 Show OpenAI's original error message
          originalError: openAIError, // 🔧 Include full OpenAI error object
          type: 'RateLimitError'
        },
        { status: 429 }
      )
    }
    
    // 🔧 CRITICAL: Return OpenAI's original error message, not generic message
    return NextResponse.json(
      { 
        error: errorMessage, // 🔧 Show OpenAI's original error message
        originalError: openAIError, // 🔧 Include full OpenAI error object for debugging
        type: errorType || 'ExtractionError',
        details: 'OpenAI API returned an error. See error message above for details.'
      },
      { status: error?.status || 500 }
    )
  }
}
