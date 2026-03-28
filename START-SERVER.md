# Fix "localhost refused to connect" (ERR_CONNECTION_REFUSED)

This means **the dev server is not running**. Follow these steps:

---

## Step 1: Open a terminal

- In Cursor/VS Code: **Terminal → New Terminal** (or press **Ctrl + `**)
- Or open **Command Prompt** or **PowerShell** from Windows

---

## Step 2: Go to the project folder

```cmd
cd c:\Users\fscsq\Desktop\selpic2
```

---

## Step 3: Start the server

```cmd
npm run dev
```

---

## Step 4: Wait until you see this

You must see something like:

```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
✓ Ready in 2.5s
```

**Do not open the browser before "Ready" appears.** If you see errors in the terminal instead, read them and fix (e.g. port in use, missing dependencies).

---

## Step 5: Open the homepage

In your browser go to: **http://localhost:3000**

---

## If port 3000 is already in use

1. Stop the other process:
   - In the terminal where the server is running, press **Ctrl+C**
   - Or run: `taskkill /F /IM node.exe` (in a new terminal)

2. Run again:
   ```cmd
   cd c:\Users\fscsq\Desktop\selpic2
   npm run dev
   ```

---

## If you see "npm not found"

Install Node.js from https://nodejs.org/ (LTS), then close and reopen the terminal and try again.
