const STORAGE_KEY = 'selpic-admin-inbound-sound-enabled'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioContext) audioContext = new Ctx()
  return audioContext
}

export function isAdminInboundSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setAdminInboundSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
    window.dispatchEvent(new CustomEvent('admin-inbound-sound-pref-changed', { detail: { enabled } }))
  } catch {
    /* ignore */
  }
}

/** Required once per session for browser autoplay policy (call from a click handler). */
export async function unlockAdminInboundAudio(): Promise<boolean> {
  const ctx = getAudioContext()
  if (!ctx) return false
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return false
    }
  }
  return ctx.state === 'running'
}

/** Short two-tone chime for new inbound customer activity. */
export function playAdminInboundChime(): void {
  if (!isAdminInboundSoundEnabled()) return
  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running') return

  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)
  gain.connect(ctx.destination)

  const tone = (frequency: number, start: number, duration: number) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, start)
    osc.connect(gain)
    osc.start(start)
    osc.stop(start + duration)
  }

  tone(880, now, 0.14)
  tone(1318.51, now + 0.1, 0.22)
}

export async function enableAdminInboundSoundWithTest(): Promise<boolean> {
  const unlocked = await unlockAdminInboundAudio()
  if (!unlocked) return false
  setAdminInboundSoundEnabled(true)
  playAdminInboundChime()
  return true
}
