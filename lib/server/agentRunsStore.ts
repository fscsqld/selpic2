/**
 * Persist Agent runs / OpenAI usage in site_configs (shared across admins).
 * Fallback: data/agent/agent-runs.json when Supabase off.
 */

import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { AGENT_RUNS_CONFIG_KEY } from '@/lib/siteConfigConstants'
import {
  AGENT_RUNS_MAX,
  parseAgentRunsSnapshot,
  sanitizeAgentRun,
  type AgentRunRecord,
  type AgentRunsSnapshot,
} from '@/lib/agent/agentRuns'

const DATA_DIR = path.join(process.cwd(), 'data', 'agent')
const DATA_FILE = path.join(DATA_DIR, 'agent-runs.json')

async function readLocal(): Promise<AgentRunsSnapshot> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    return parseAgentRunsSnapshot(JSON.parse(raw))
  } catch {
    return { updatedAt: '', runs: [] }
  }
}

async function writeLocal(snapshot: AgentRunsSnapshot): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(snapshot, null, 2), 'utf-8')
}

async function readRemote(): Promise<AgentRunsSnapshot | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('site_configs')
      .select('value')
      .eq('config_key', AGENT_RUNS_CONFIG_KEY)
      .maybeSingle()
    if (error) return null
    if (!data) return { updatedAt: '', runs: [] }
    return parseAgentRunsSnapshot(data.value)
  } catch {
    return null
  }
}

async function writeRemote(snapshot: AgentRunsSnapshot): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const admin = getSupabaseAdmin()
    const now = new Date().toISOString()
    const { error } = await admin.from('site_configs').upsert(
      {
        config_key: AGENT_RUNS_CONFIG_KEY,
        value: { updatedAt: snapshot.updatedAt || now, runs: snapshot.runs },
        updated_at: now,
      },
      { onConflict: 'config_key' }
    )
    return !error
  } catch {
    return false
  }
}

export async function readAgentRunsSnapshot(): Promise<AgentRunsSnapshot> {
  const remote = await readRemote()
  if (remote) {
    return {
      updatedAt: remote.updatedAt,
      runs: remote.runs.map(sanitizeAgentRun).filter(Boolean) as AgentRunRecord[],
    }
  }
  return readLocal()
}

async function persistSnapshot(runs: AgentRunRecord[]): Promise<void> {
  const capped = runs.slice(0, AGENT_RUNS_MAX)
  const snapshot: AgentRunsSnapshot = {
    updatedAt: new Date().toISOString(),
    runs: capped,
  }
  const remoteOk = await writeRemote(snapshot)
  try {
    await writeLocal(snapshot)
  } catch {
    if (!remoteOk) {
      console.warn('[agentRunsStore] Failed to persist agent runs (remote + local)')
    }
  }
}

/**
 * Append one successful OpenAI run. Fire-and-forget safe — never throws to callers.
 */
export async function appendAgentRun(
  run: Omit<AgentRunRecord, 'id'> & { id?: string }
): Promise<AgentRunRecord | null> {
  try {
    const record: AgentRunRecord = {
      ...run,
      id: run.id || randomUUID(),
      createdAt: run.createdAt || new Date().toISOString(),
      ok: run.ok !== false,
    }
    const sanitized = sanitizeAgentRun(record)
    if (!sanitized) return null
    const current = await readAgentRunsSnapshot()
    const next = [sanitized, ...current.runs].slice(0, AGENT_RUNS_MAX)
    await persistSnapshot(next)
    return sanitized
  } catch (e) {
    console.warn('[agentRunsStore] appendAgentRun failed:', e)
    return null
  }
}
