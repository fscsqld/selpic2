# How to Start the Accounting Sandbox Server

## Quick Start

1. **Open a new terminal** (PowerShell or Command Prompt)

2. **Navigate to the project directory:**
   ```powershell
   cd C:\Users\fscsq\Desktop\selpic2\apps\accounting-sandbox
   ```

3. **Start the development server:**
   ```powershell
   npm run dev
   ```

4. **Wait for the server to start:**
   You should see output like:
   ```
   ▲ Next.js 15.5.0
   - Local:        http://localhost:3001
   - Ready in X seconds
   ```

5. **Open your browser:**
   Navigate to: `http://localhost:3001`

## Troubleshooting

### If you see "Port 3001 is already in use":

1. **Kill the process:**
   ```powershell
   Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
   ```

2. **Try starting again:**
   ```powershell
   npm run dev
   ```

### If you see build errors:

1. **Clear the build cache:**
   ```powershell
   Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
   ```

2. **Reinstall dependencies:**
   ```powershell
   npm install
   ```

3. **Start again:**
   ```powershell
   npm run dev
   ```

### If the browser shows "ERR_CONNECTION_REFUSED":

1. **Check if the server is actually running:**
   ```powershell
   netstat -ano | findstr :3001
   ```

2. **Check the terminal output** for any error messages

3. **Make sure you're using the correct URL:**
   - ✅ `http://localhost:3001`
   - ❌ `https://localhost:3001` (don't use HTTPS)

## Common Issues

### Issue: "Cannot find module"
**Solution:** Run `npm install` in the `apps/accounting-sandbox` directory

### Issue: "Port already in use"
**Solution:** Kill the process using the port (see above)

### Issue: "Build failed"
**Solution:** Check the error message in the terminal and fix the issue

## Server Status Check

To verify the server is running:
```powershell
# Check if port 3001 is listening
netstat -ano | findstr :3001

# Test the connection
Invoke-WebRequest -Uri http://localhost:3001 -UseBasicParsing
```

