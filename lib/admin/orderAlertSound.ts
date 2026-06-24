/**
 * New-order alert for /admin/orders and dashboard order sections.
 * Place your sound file at public/sounds/new-order-alert.mp3 (or .wav).
 */

export const ORDER_ALERT_SOUND_MP3 = '/sounds/new-order-alert.mp3'
export const ORDER_ALERT_SOUND_WAV = '/sounds/new-order-alert.wav'

const STORAGE_KEY = 'selpic-admin-order-sound-enabled'

let audio: HTMLAudioElement | null = null
let audioSrc: string | null = null
let unlocked = false

export function isOrderAlertSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setOrderAlertSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
    window.dispatchEvent(new CustomEvent('admin-order-sound-pref-changed', { detail: { enabled } }))
  } catch {
    /* ignore */
  }
}

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
  }
  return audio
}

async function resolveSoundUrl(): Promise<string | null> {
  if (audioSrc) return audioSrc
  const candidates = [ORDER_ALERT_SOUND_MP3, ORDER_ALERT_SOUND_WAV]
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
      if (res.ok) {
        audioSrc = url
        return url
      }
    } catch {
      /* try next */
    }
  }
  return null
}

/** Call from a click handler once (browser autoplay policy). */
export async function unlockOrderAlertSound(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const el = getAudioElement()
  if (!el) return false

  const url = await resolveSoundUrl()
  if (!url) {
    unlocked = true
    return true
  }

  try {
    el.src = url
    el.currentTime = 0
    el.volume = 0.001
    await el.play()
    el.pause()
    el.currentTime = 0
    el.volume = 1
    unlocked = true
    return true
  } catch {
    return false
  }
}

function playSynthFallback(): void {
  if (typeof window === 'undefined') return
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  const ctx = new AC()
  void ctx.resume().then(() => {
    const now = ctx.currentTime
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + dur + 0.02)
    }
    tone(880, now, 0.14)
    tone(1318.51, now + 0.12, 0.16)
    window.setTimeout(() => void ctx.close(), 600)
  })
}

export function playOrderAlertSound(): void {
  if (!isOrderAlertSoundEnabled()) return
  if (typeof window === 'undefined') return
  if (document.visibilityState !== 'visible') return

  const el = getAudioElement()
  if (!el) return

  void (async () => {
    if (!unlocked) {
      const ok = await unlockOrderAlertSound()
      if (!ok) return
    }
    const url = await resolveSoundUrl()
    if (!url) {
      playSynthFallback()
      return
    }
    try {
      if (el.src !== new URL(url, window.location.origin).href) {
        el.src = url
      }
      el.currentTime = 0
      el.volume = 1
      await el.play()
    } catch {
      playSynthFallback()
    }
  })()
}

export async function enableOrderAlertSoundWithTest(): Promise<boolean> {
  const ok = await unlockOrderAlertSound()
  if (!ok) return false
  setOrderAlertSoundEnabled(true)
  playOrderAlertSound()
  return true
}

/** @deprecated Use unlockOrderAlertSound */
export const unlockNewOrderChime = unlockOrderAlertSound

/** @deprecated Use playOrderAlertSound */
export const playNewOrderChime = playOrderAlertSound
