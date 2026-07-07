// Tiny Web Audio helper for the round-timer cues — no audio files needed.
// Browsers require an AudioContext to be created/resumed after a user gesture,
// so call unlockAudio() from a click handler (e.g. the Play button).

let ctx: AudioContext | null = null

let muted = false
try {
  muted = localStorage.getItem('gg-muted') === '1'
} catch {
  /* localStorage may be unavailable */
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(m: boolean): void {
  muted = m
  try {
    localStorage.setItem('gg-muted', m ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted)
  return muted
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    if (!ctx) ctx = new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Prime the audio context from within a user gesture so later beeps are allowed. */
export function unlockAudio(): void {
  getCtx()
}

function beep(freq: number, durationMs: number, gain: number, type: OscillatorType): void {
  if (muted) return
  const ac = getCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(g)
  g.connect(ac.destination)
  const now = ac.currentTime
  g.gain.setValueAtTime(gain, now)
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
  osc.start(now)
  osc.stop(now + durationMs / 1000)
}

/** A short, urgent tick for the final seconds of the countdown. */
export function playTick(): void {
  beep(880, 90, 0.12, 'square')
}

/** A lower, longer buzz when time runs out. */
export function playTimeUp(): void {
  beep(300, 450, 0.2, 'sawtooth')
}

/** Happy two-note chirp for a correct answer. */
export function playCorrect(): void {
  beep(660, 90, 0.1, 'sine')
  setTimeout(() => beep(990, 130, 0.1, 'sine'), 85)
}

/** Short low buzz for a wrong answer. */
export function playWrong(): void {
  beep(180, 240, 0.16, 'sawtooth')
}
