/**
 * Short "ding" for new paid orders on /admin/orders.
 * Browsers block audio until a user gesture — call `unlockNewOrderChime()` from a click handler.
 */

let audioCtx: AudioContext | null = null

export function unlockNewOrderChime(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return Promise.resolve(false)
  if (!audioCtx) {
    audioCtx = new AC()
  }
  return audioCtx.resume().then(() => true).catch(() => false)
}

/** Call after unlock; safe to no-op if context not running. */
export function playNewOrderChime(): void {
  if (typeof window === 'undefined' || !audioCtx || audioCtx.state !== 'running') return

  const now = audioCtx.currentTime
  const makeBeep = (freq: number, start: number, dur: number) => {
    const osc = audioCtx!.createOscillator()
    const gain = audioCtx!.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.11, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain)
    gain.connect(audioCtx!.destination)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  }

  makeBeep(880, now, 0.14)
  makeBeep(1318.51, now + 0.12, 0.16)
}
