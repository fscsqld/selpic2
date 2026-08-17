/**
 * Verify admin idle + absolute session timeout logic (no browser required).
 * Run: npx tsx scripts/verify-admin-session-timeout.ts
 */
import {
  useAdminSession,
} from '../lib/adminSession'

type Case = { name: string; ok: boolean; detail?: string }

function forceSession(over: {
  loginTime: string
  lastActivity: string
  sessionTimeoutMs: number
}) {
  const id = `session-test-${Date.now()}`
  useAdminSession.setState({
    sessions: [
      {
        id,
        username: 'timeout-test',
        role: 'admin',
        loginTime: over.loginTime,
        lastActivity: over.lastActivity,
        isActive: true,
      },
    ],
    currentSessionId: id,
    sessionTimeout: over.sessionTimeoutMs,
    maxSessionsPerUser: 0,
  })
  return id
}

const cases: Case[] = []
const now = Date.now()
const FIVE_MIN = 5 * 60 * 1000
const ABSOLUTE_8H = 8 * 60 * 60 * 1000

// 1) Within idle window → valid
{
  const id = forceSession({
    loginTime: new Date(now - 2 * 60 * 1000).toISOString(),
    lastActivity: new Date(now - 1 * 60 * 1000).toISOString(),
    sessionTimeoutMs: FIVE_MIN,
  })
  const ok = useAdminSession.getState().isSessionValid(id) === true
  cases.push({ name: 'idle: within 5m still valid', ok })
}

// 2) Past idle window → invalid
{
  const id = forceSession({
    loginTime: new Date(now - 10 * 60 * 1000).toISOString(),
    lastActivity: new Date(now - 6 * 60 * 1000).toISOString(),
    sessionTimeoutMs: FIVE_MIN,
  })
  const ok = useAdminSession.getState().isSessionValid(id) === false
  cases.push({ name: 'idle: after 5m inactivity invalid', ok })
}

// 3) Recent activity but absolute 8h exceeded → invalid
{
  const id = forceSession({
    loginTime: new Date(now - ABSOLUTE_8H - 60_000).toISOString(),
    lastActivity: new Date(now - 30_000).toISOString(),
    sessionTimeoutMs: FIVE_MIN,
  })
  const ok = useAdminSession.getState().isSessionValid(id) === false
  cases.push({ name: 'absolute: 8h exceeded invalid even if active', ok })
}

// 4) Activity refresh keeps idle alive
{
  const id = forceSession({
    loginTime: new Date(now - 20 * 60 * 1000).toISOString(),
    lastActivity: new Date(now - 4 * 60 * 1000).toISOString(),
    sessionTimeoutMs: FIVE_MIN,
  })
  useAdminSession.getState().updateActivity(id)
  const ok = useAdminSession.getState().isSessionValid(id) === true
  cases.push({ name: 'idle: updateActivity extends session', ok })
}

// 5) cleanupExpiredSessions clears currentSessionId
{
  const id = forceSession({
    loginTime: new Date(now - 10 * 60 * 1000).toISOString(),
    lastActivity: new Date(now - 6 * 60 * 1000).toISOString(),
    sessionTimeoutMs: FIVE_MIN,
  })
  useAdminSession.getState().cleanupExpiredSessions()
  const st = useAdminSession.getState()
  const ok = st.currentSessionId === null && st.sessions.every((s) => !s.isActive || s.id !== id || !st.isSessionValid(id))
  cases.push({
    name: 'cleanup: expired session deactivated',
    ok: st.currentSessionId === null && st.sessions.find((s) => s.id === id)?.isActive === false,
    detail: ok ? undefined : JSON.stringify({ currentSessionId: st.currentSessionId, session: st.sessions.find((s) => s.id === id) }),
  })
}

const failed = cases.filter((c) => !c.ok)
console.log(
  JSON.stringify(
    {
      total: cases.length,
      passed: cases.filter((c) => c.ok).length,
      failed,
      cases,
      note: 'Absolute timeout is hardcoded 8h in lib/adminSession.ts',
    },
    null,
    2
  )
)
if (failed.length) process.exit(1)
