# Debugging Guide for Internal Server Error

## 🔍 Enhanced Logging Added

All critical points now have detailed logging with `[ANALYZE]`, `[OpenAI]`, and `[PDF-PARSER]` prefixes.

## 📋 How to Debug

### 1. Check Server Terminal Logs

When an error occurs, you'll see detailed logs like:

```
[ANALYZE] ========================================
[ANALYZE] Starting PDF analysis request...
[ANALYZE] Step 0: Parsing form data...
[ANALYZE] File received: { name: '...', size: ..., type: '...' }
[ANALYZE] API Key received: sk-...xxxx
```

### 2. Error Types

The system now returns specific error codes:

- `PDF_EXTRACTION_FAILED` - PDF parsing failed
- `INVALID_API_KEY` - OpenAI API key is invalid
- `RATE_LIMIT_EXCEEDED` - OpenAI rate limit exceeded
- `AI_CLASSIFIER_INIT_FAILED` - Failed to initialize AI classifier
- `FileReadError` - Failed to read uploaded file

### 3. Check Frontend Console

Open browser DevTools (F12) and check:
- Console tab for `[Frontend]` logs
- Network tab for API request/response details

### 4. Common Issues & Solutions

#### Issue: "PDF_EXTRACTION_FAILED"
- **Cause**: PDF is corrupted or not a valid PDF
- **Solution**: Verify the PDF file opens correctly in a PDF viewer

#### Issue: "INVALID_API_KEY"
- **Cause**: API key is wrong or expired
- **Solution**: 
  1. Go to Settings
  2. Validate your API key
  3. Make sure it starts with `sk-`

#### Issue: "RATE_LIMIT_EXCEEDED"
- **Cause**: Too many API requests
- **Solution**: Wait a few minutes and try again

#### Issue: Empty response from OpenAI
- **Cause**: OpenAI returned empty content
- **Solution**: Check OpenAI API status, try again

### 5. Logging Levels

- `[ANALYZE]` - Main analysis pipeline
- `[OpenAI]` - OpenAI API calls
- `[PDF-PARSER]` - PDF parsing operations
- `[Frontend]` - Client-side operations

### 6. Getting Full Error Details

All errors now include:
- Error message
- Error type
- Stack trace (in development mode)
- Timestamp

Check the server terminal for the complete error object.

