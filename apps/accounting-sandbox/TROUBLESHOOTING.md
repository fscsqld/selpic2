# Troubleshooting Guide

## Internal Server Error

If you encounter an "Internal Server Error", check the following:

### 1. Check Server Logs
Look at the terminal where `npm run dev` is running for detailed error messages.

### 2. Common Issues

#### OpenAI API Key Issues
- **Error**: "OpenAI API key is required"
- **Solution**: 
  1. Click the "Settings" button
  2. Enter your OpenAI API key (starts with `sk-`)
  3. Click "Validate Key" to test
  4. Click "Save"

#### PDF Parsing Issues
- **Error**: "Failed to parse PDF"
- **Possible Causes**:
  - PDF is not a valid CBA bank statement
  - PDF is corrupted
  - PDF format is not supported
- **Solution**: Ensure you're uploading a valid CBA bank statement PDF

#### Module Import Issues
- **Error**: "Cannot find module" or "Module not found"
- **Solution**: 
  ```bash
  cd apps/accounting-sandbox
  npm install
  ```

#### OpenAI Shim Issues
- **Error**: Runtime errors related to OpenAI
- **Solution**: The code includes `import 'openai/shims/node'` at the top of API routes. If errors persist, try:
  ```bash
  cd apps/accounting-sandbox
  npm install openai@latest
  ```

### 3. Debug Steps

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Check Console tab for client-side errors
   - Check Network tab for API request/response details

2. **Check Server Terminal**
   - Look for error stack traces
   - Note the exact error message

3. **Verify Dependencies**
   ```bash
   cd apps/accounting-sandbox
   npm list
   ```

4. **Clear Cache and Rebuild**
   ```bash
   cd apps/accounting-sandbox
   rm -rf .next
   npm run build
   ```

### 4. Common Error Messages

#### "index is not defined"
- **Fixed**: This was a bug in the loop variable. Already fixed in the code.

#### "Cannot read property 'classify' of null"
- **Cause**: AI classifier not initialized
- **Solution**: Ensure API key is set and valid

#### "EPERM: operation not permitted"
- **Cause**: File permission issue (Windows)
- **Solution**: 
  - Close any processes using the `.next` folder
  - Run terminal as Administrator
  - Delete `.next` folder manually

### 5. Getting Help

If the error persists:
1. Copy the full error message from the terminal
2. Check the browser console for additional errors
3. Verify all dependencies are installed
4. Try restarting the development server

