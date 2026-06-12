/** צְלִילִים פְּשׁוּטִים בִּ-Web Audio — נִטְעָן אַחֲרֵי מַחְוָה רִאשׁוֹנָה */

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

/** נִיצּוּחוֹן מָלֵא — עֶשֶׂר נְקֻדּוֹת */
export function playCorrect(muted: boolean): void {
  if (muted) return
  const c = getCtx()
  if (!c) return
  const t = c.currentTime
  ;[523.25, 659.25, 783.99, 987.77].forEach((freq, i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.12, t + i * 0.06)
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.22)
    o.connect(g)
    g.connect(c.destination)
    o.start(t + i * 0.06)
    o.stop(t + i * 0.06 + 0.28)
  })
}

/** נִיצּוּחוֹן חֵצִי — חָמֵשׁ נְקֻדּוֹת, צָלִיל נָמוּךְ וְקָצָר יוֹתֵר */
export function playCorrectHalf(muted: boolean): void {
  if (muted) return
  const c = getCtx()
  if (!c) return
  const t = c.currentTime
  ;[392, 440].forEach((freq, i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'triangle'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.07, t + i * 0.1)
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.18)
    o.connect(g)
    g.connect(c.destination)
    o.start(t + i * 0.1)
    o.stop(t + i * 0.1 + 0.22)
  })
}

export function playWrong(muted: boolean): void {
  if (muted) return
  beep(180, 0.25, 'triangle', 0.15)
  setTimeout(() => beep(140, 0.3, 'triangle', 0.12), 120)
}

/** סִיּוּם יַעַד נִיקּוּד (מֵאָה / מָאָה וּשְׁנַיִם / שְׁלוֹשׁ מֵאוֹת) */
export function playWin200(muted: boolean): void {
  if (muted) return
  const c = getCtx()
  if (!c) return
  const t = c.currentTime
  const melody = [392, 523.25, 659.25, 783.99, 1046.5]
  melody.forEach((freq, i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.11, t + i * 0.12)
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.35)
    o.connect(g)
    g.connect(c.destination)
    o.start(t + i * 0.12)
    o.stop(t + i * 0.12 + 0.4)
  })
}

export function playClick(muted: boolean): void {
  if (muted) return
  beep(800, 0.04, 'square', 0.04)
}
