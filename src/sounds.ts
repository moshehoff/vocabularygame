/** צְלִילִים פְּשׁוּתִים בִּ-Web Audio — נִטְעָן אַחֲרֵי מַחְוָה רִאשׁוֹנָה */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
  }
  return ctx
}

export async function resumeAudio(): Promise<void> {
  const c = getCtx()
  if (c?.state === 'suspended') await c.resume()
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.12): void {
  const c = getCtx()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.value = gain
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  o.connect(g)
  g.connect(c.destination)
  o.start(c.currentTime)
  o.stop(c.currentTime + duration + 0.05)
}

function playToneSequence(
  notes: { freq: number; start: number; dur: number; type?: OscillatorType; gain?: number }[],
): void {
  const c = getCtx()
  if (!c) return
  const t = c.currentTime
  for (const n of notes) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = n.type ?? 'sine'
    o.frequency.value = n.freq
    const gain = n.gain ?? 0.11
    g.gain.setValueAtTime(gain, t + n.start)
    g.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur)
    o.connect(g)
    g.connect(c.destination)
    o.start(t + n.start)
    o.stop(t + n.start + n.dur + 0.05)
  }
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** נִיצּוּחוֹן מָלֵא — עֶשֶׂר נְקֻדּוֹת */
function playCorrect1(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 523.25, start: 0, dur: 0.22 },
    { freq: 659.25, start: 0.06, dur: 0.22 },
    { freq: 783.99, start: 0.12, dur: 0.22 },
    { freq: 987.77, start: 0.18, dur: 0.22 },
  ])
}

function playCorrect2(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 523.25, start: 0, dur: 0.18, type: 'triangle' },
    { freq: 659.25, start: 0.08, dur: 0.18, type: 'triangle' },
    { freq: 783.99, start: 0.16, dur: 0.28, type: 'triangle', gain: 0.13 },
  ])
}

function playCorrect3(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 880, start: 0, dur: 0.1, gain: 0.09 },
    { freq: 1174.66, start: 0.12, dur: 0.14, gain: 0.1 },
  ])
}

function playCorrect4(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 1046.5, start: 0, dur: 0.08, gain: 0.07 },
    { freq: 1318.51, start: 0.07, dur: 0.08, gain: 0.07 },
    { freq: 1567.98, start: 0.14, dur: 0.12, gain: 0.08 },
  ])
}

function playCorrect5(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 392, start: 0, dur: 0.14 },
    { freq: 493.88, start: 0.1, dur: 0.14 },
    { freq: 587.33, start: 0.2, dur: 0.14 },
    { freq: 783.99, start: 0.3, dur: 0.25, gain: 0.13 },
  ])
}

const CORRECT_SOUNDS = [playCorrect1, playCorrect2, playCorrect3, playCorrect4, playCorrect5] as const

export function playCorrectRandom(muted: boolean): void {
  pickRandom(CORRECT_SOUNDS)(muted)
}

/** נִיצּוּחוֹן חֵצִי — חָמֵשׁ נְקֻדּוֹת */
function playCorrectHalf1(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 392, start: 0, dur: 0.18, type: 'triangle', gain: 0.07 },
    { freq: 440, start: 0.1, dur: 0.18, type: 'triangle', gain: 0.07 },
  ])
}

function playCorrectHalf2(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 440, start: 0, dur: 0.12, gain: 0.06 },
    { freq: 523.25, start: 0.1, dur: 0.16, gain: 0.07 },
  ])
}

function playCorrectHalf3(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 349.23, start: 0, dur: 0.14, type: 'sine', gain: 0.06 },
    { freq: 415.3, start: 0.09, dur: 0.16, type: 'sine', gain: 0.06 },
  ])
}

function playCorrectHalf4(muted: boolean): void {
  if (muted) return
  beep(587.33, 0.14, 'triangle', 0.06)
}

function playCorrectHalf5(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 493.88, start: 0, dur: 0.1, gain: 0.05 },
    { freq: 587.33, start: 0.08, dur: 0.12, gain: 0.06 },
    { freq: 659.25, start: 0.16, dur: 0.1, gain: 0.05 },
  ])
}

const CORRECT_HALF_SOUNDS = [
  playCorrectHalf1,
  playCorrectHalf2,
  playCorrectHalf3,
  playCorrectHalf4,
  playCorrectHalf5,
] as const

export function playCorrectHalfRandom(muted: boolean): void {
  pickRandom(CORRECT_HALF_SOUNDS)(muted)
}

/** @deprecated — use playCorrectRandom */
export function playCorrect(muted: boolean): void {
  playCorrect1(muted)
}

/** @deprecated — use playCorrectHalfRandom */
export function playCorrectHalf(muted: boolean): void {
  playCorrectHalf1(muted)
}

/** טָעוּת רִאשׁוֹנָה — יוֹרֵד נָמוּךְ */
function playWrong1(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 233.08, start: 0, dur: 0.42 },
    { freq: 220, start: 0.16, dur: 0.42 },
    { freq: 196, start: 0.32, dur: 0.42 },
  ])
}

function playWrong2(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 180, start: 0, dur: 0.15, type: 'square', gain: 0.06 },
    { freq: 140, start: 0.14, dur: 0.2, type: 'square', gain: 0.06 },
  ])
}

function playWrong3(muted: boolean): void {
  if (muted) return
  const c = getCtx()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(320, t)
  o.frequency.exponentialRampToValueAtTime(90, t + 0.45)
  g.gain.setValueAtTime(0.07, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.48)
  o.connect(g)
  g.connect(c.destination)
  o.start(t)
  o.stop(t + 0.52)
}

function playWrong4(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 330, start: 0, dur: 0.12, type: 'square', gain: 0.05 },
    { freq: 220, start: 0.14, dur: 0.2, type: 'square', gain: 0.06 },
  ])
}

function playWrong5(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 277.18, start: 0, dur: 0.1 },
    { freq: 261.63, start: 0.08, dur: 0.1 },
    { freq: 246.94, start: 0.16, dur: 0.1 },
    { freq: 233.08, start: 0.24, dur: 0.14 },
  ])
}

function playWrong6(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 155.56, start: 0, dur: 0.08, type: 'triangle', gain: 0.1 },
    { freq: 155.56, start: 0.14, dur: 0.08, type: 'triangle', gain: 0.1 },
    { freq: 155.56, start: 0.28, dur: 0.12, type: 'triangle', gain: 0.09 },
  ])
}

function playWrong7(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 311.13, start: 0, dur: 0.08, gain: 0.08 },
    { freq: 293.66, start: 0.07, dur: 0.08, gain: 0.08 },
    { freq: 277.18, start: 0.14, dur: 0.08, gain: 0.08 },
    { freq: 261.63, start: 0.21, dur: 0.08, gain: 0.08 },
    { freq: 246.94, start: 0.28, dur: 0.12, gain: 0.08 },
  ])
}

const WRONG_SOUNDS = [playWrong1, playWrong2, playWrong3, playWrong4, playWrong5, playWrong6, playWrong7] as const

export function playWrongRandom(muted: boolean): void {
  pickRandom(WRONG_SOUNDS)(muted)
}

/** @deprecated — use playWrongRandom */
export function playWrong(muted: boolean): void {
  playWrong1(muted)
}

/** טָעוּת שְׁנִיָּה וְגִלּוּי */
function playWrongFinal1(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 196, start: 0, dur: 0.55, type: 'triangle', gain: 0.09 },
    { freq: 174.61, start: 0.22, dur: 0.55, type: 'triangle', gain: 0.09 },
    { freq: 155.56, start: 0.44, dur: 0.55, type: 'triangle', gain: 0.09 },
  ])
}

function playWrongFinal2(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 220, start: 0, dur: 0.35, type: 'sine', gain: 0.08 },
    { freq: 185, start: 0.28, dur: 0.45, type: 'sine', gain: 0.08 },
    { freq: 155.56, start: 0.55, dur: 0.55, type: 'sine', gain: 0.07 },
  ])
}

function playWrongFinal3(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 146.83, start: 0, dur: 0.2, type: 'square', gain: 0.05 },
    { freq: 138.59, start: 0.22, dur: 0.25, type: 'square', gain: 0.05 },
    { freq: 130.81, start: 0.48, dur: 0.35, type: 'square', gain: 0.05 },
  ])
}

function playWrongFinal4(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 207.65, start: 0, dur: 0.5, type: 'sawtooth', gain: 0.05 },
    { freq: 185, start: 0.08, dur: 0.5, type: 'sawtooth', gain: 0.04 },
    { freq: 164.81, start: 0.16, dur: 0.55, type: 'sawtooth', gain: 0.04 },
  ])
}

function playWrongFinal5(muted: boolean): void {
  if (muted) return
  const c = getCtx()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(250, t)
  o.frequency.exponentialRampToValueAtTime(80, t + 0.7)
  g.gain.setValueAtTime(0.08, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.75)
  o.connect(g)
  g.connect(c.destination)
  o.start(t)
  o.stop(t + 0.8)
}

function playWrongFinal6(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 123.47, start: 0, dur: 0.18, gain: 0.1 },
    { freq: 116.54, start: 0.2, dur: 0.18, gain: 0.1 },
    { freq: 110, start: 0.4, dur: 0.22, gain: 0.09 },
  ])
}

function playWrongFinal7(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 174.61, start: 0, dur: 0.3, type: 'triangle', gain: 0.07 },
    { freq: 164.81, start: 0.25, dur: 0.3, type: 'triangle', gain: 0.07 },
    { freq: 155.56, start: 0.5, dur: 0.35, type: 'triangle', gain: 0.07 },
    { freq: 146.83, start: 0.75, dur: 0.4, type: 'triangle', gain: 0.06 },
  ])
}

const WRONG_FINAL_SOUNDS = [
  playWrongFinal1,
  playWrongFinal2,
  playWrongFinal3,
  playWrongFinal4,
  playWrongFinal5,
  playWrongFinal6,
  playWrongFinal7,
] as const

export function playWrongFinalRandom(muted: boolean): void {
  pickRandom(WRONG_FINAL_SOUNDS)(muted)
}

/** @deprecated — use playWrongFinalRandom */
export function playWrongFinal(muted: boolean): void {
  playWrongFinal1(muted)
}

/** סִיּוּם יַעַד נִיקּוּד (מֵאָה / מָאָה וּשְׁנַיִם / שְׁלוֹשׁ מֵאוֹת) */
export function playWin200(muted: boolean): void {
  if (muted) return
  playToneSequence([
    { freq: 392, start: 0, dur: 0.35 },
    { freq: 523.25, start: 0.12, dur: 0.35 },
    { freq: 659.25, start: 0.24, dur: 0.35 },
    { freq: 783.99, start: 0.36, dur: 0.35 },
    { freq: 1046.5, start: 0.48, dur: 0.35 },
  ])
}

export function playClick(muted: boolean): void {
  if (muted) return
  beep(800, 0.04, 'square', 0.04)
}
