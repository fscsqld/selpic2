import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import os from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function sleepSync(ms) {
  if (os.platform() === 'win32') {
    try {
      execFileSync('powershell.exe', ['-NoProfile', '-Command', `Start-Sleep -Milliseconds ${ms}`], { stdio: 'ignore' })
      return
    } catch {
      // fall through
    }
  }
  const end = Date.now() + ms
  while (Date.now() < end) {
    // busy wait fallback
  }
}

function tryKillWindowsPortListener(port) {
  if (os.platform() !== 'win32') return
  try {
    const out = execFileSync('cmd.exe', ['/c', `netstat -ano | findstr :${port}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      // Example: TCP    0.0.0.0:3000   0.0.0.0:0   LISTENING   12345
      if (!line.includes('LISTENING')) continue
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && /^\d+$/.test(pid)) pids.add(pid)
    }
    for (const pid of pids) {
      try {
        execFileSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore' })
        console.warn(`[clean] killed process ${pid} listening on :${port} (likely Next dev server lock)`)
      } catch {
        // ignore
      }
    }
    if (pids.size) sleepSync(400)
  } catch {
    // ignore (no listeners / netstat not available)
  }
}

function rmDirSafe(relPath) {
  const target = path.join(repoRoot, relPath)
  try {
    fs.rmSync(target, { recursive: true, force: true })
    console.log(`[clean] removed: ${relPath}`)
  } catch (e) {
    console.warn(`[clean] failed to remove ${relPath}:`, e)
  }
}

// Next/Turbopack + PostCSS/Tailwind can keep stale file tracking under .next on Windows.
tryKillWindowsPortListener(3000)
tryKillWindowsPortListener(3001)
rmDirSafe('.next')
rmDirSafe(path.join('node_modules', '.cache'))
