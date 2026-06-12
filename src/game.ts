import confetti from 'canvas-confetti'
import type { Question } from './types.ts'
import { isQuestion } from './types.ts'
import { playClick, playCorrect, playCorrectHalf, playWin200, playWrong, resumeAudio } from './sounds.ts'

const MUTE_KEY = 'trivia-muted'
const AUTO_ADVANCE_MS = 5000

type TargetScore = 100 | 200 | 300
type Phase = 'loading' | 'error' | 'splash' | 'answering' | 'wrong' | 'correct' | 'revealed'

/** מַחְרוּזוֹת מַמְשָׁק — מְנוּקָּדוֹת */
const UI = {
  title: 'אוֹצַר מִילִים וּפִתְגָמִים',
  chooseLevel: 'בְּחִירַת רָמָה:',
  levelEasy: 'לִמְתַחִילִים 100',
  levelMid: 'בֵּינוֹנִי 200',
  levelHard: 'קָשֶׁה — 300',
  loading: 'טוֹעֲנִים שְׁאֵלוֹת…',
  loadError: 'לֹא הָיְתָה אֶפְשָׁרוּת לִטְעוֹן אֶת הַשְּׁאֵלוֹת. נָסוּ לְרַעֲנֵן אֶת הַדָּף.',
  mute: 'הַשְׁתָּקָה',
  unmute: 'הַשְׁמָעָה',
  scoreLabel: 'נִיקּוּד',
  synonymHint: 'בְּחַרוּ אֶת הַמִּילָה הַנִּרְדֶּפֶת:',
  proverbHint: 'בְּחַרוּ אֶת הַהֶסְבֵּר הַנָּכוֹן:',
  triviaHint: 'בְּחַרוּ אֶת הַתְּשׁוּבָה:',
  wrong: 'לֹא נָכוֹן',
  tryAgain: 'נָסוּ שׁוּב',
  correct: 'נָכוֹן!',
  revealedCaption: 'הִנֵּה הַתְּשׁוּבָה הַנְּכוֹנָה:',
  next: 'שְׁאֵלָה הַבָּאָה',
  autoNext: 'הַשְּׁאֵלָה הַבָּאָה תִיטָּעֵן אוֹטוֹמָטִית תּוֹךְ חָמֵשׁ שְׁנִיּוֹת…',
  winSub: 'כָּל הַכָּבוֹד!',
  /** חֲזָרָה לִבְחִירַת רָמָה — גַּם מֵעַל שְׁכֶבֶת הַנִּצָּחוֹן */
  home: 'לַמָּסָך הָרֹאשִׁי',
} as const

function winTitleFor(target: TargetScore): string {
  if (target === 100) return 'הִגַּעְתֶּם לְמֵאָה נְקֻדּוֹת!'
  if (target === 200) return 'הִגַּעְתֶּם לְמָאָה וּשְׁנַיִם נְקֻדּוֹת!'
  return 'הִגַּעְתֶּם לְשָׁלוֹשׁ מֵאוֹת נְקֻדּוֹת!'
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function saveMuted(m: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function normalizeQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return []
  const out: Question[] = []
  for (const item of raw) {
    if (!isQuestion(item)) continue
    const opts = item.options
    out.push({
      ...item,
      options: [opts[0], opts[1], opts[2], opts[3]],
    })
  }
  return out
}

function questionsJsonUrl(): string {
  const base = import.meta.env.BASE_URL
  const path = 'questions.json'
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`
}

async function fetchQuestions(): Promise<Question[]> {
  const res = await fetch(questionsJsonUrl(), { cache: 'no-store' })
  if (!res.ok) throw new Error('fetch')
  const data: unknown = await res.json()
  return normalizeQuestions(data)
}

function hintForType(t: Question['type']): string {
  if (t === 'synonym') return UI.synonymHint
  if (t === 'proverb') return UI.proverbHint
  return UI.triviaHint
}

export function mountGame(root: HTMLElement): () => void {
  let questions: Question[] = []
  let qIndex = 0
  let score = 0
  let targetScore: TargetScore = 100
  let phase: Phase = 'loading'
  let muted = loadMuted()
  let advanceTimer: ReturnType<typeof setTimeout> | null = null

  /** סֵדֶר הַצָּגָה: אֵינְדֶקְסִים מְקוֹרִיִּים 0–3 */
  let optionOrder: [number, number, number, number] = [0, 1, 2, 3]
  let displayCorrectIndex = 0
  let wrongCount = 0
  let lastWrongDisplayIndex: number | null = null
  let pendingPointsPop: null | { amount: 5 | 10 } = null

  const el = document.createElement('div')
  el.className = 'game'
  root.appendChild(el)

  const clearAdvance = () => {
    if (advanceTimer !== null) {
      clearTimeout(advanceTimer)
      advanceTimer = null
    }
  }

  const scheduleAdvance = () => {
    clearAdvance()
    advanceTimer = window.setTimeout(() => {
      advanceTimer = null
      if (phase === 'correct' || phase === 'revealed') goNext()
    }, AUTO_ADVANCE_MS)
  }

  const goToHome = () => {
    void resumeAudio()
    playClick(muted)
    clearAdvance()
    document.querySelectorAll('.win-overlay').forEach((n) => n.remove())
    score = 0
    phase = 'splash'
    qIndex = 0
    pendingPointsPop = null
    if (questions.length) {
      questions = shuffle(questions)
      prepareQuestion()
    }
    render()
  }

  /** @returns true אִם הִגַּעְנוּ לְיַעַד הָרָמָה */
  const addScore = (delta: number): boolean => {
    const next = Math.min(targetScore, score + delta)
    const hitCap = next === targetScore && score < targetScore
    score = next
    if (hitCap) fireWinComplete()
    return hitCap
  }

  /** נִשׁאָר עַד לְחִיצָה עַל «לַמָּסָך הָרֹאשִׁי» — לְלֹא סְגִירָה אוֹטוֹמָטִית */
  const fireWinComplete = () => {
    clearAdvance()
    playWin200(muted)
    const mult = targetScore === 300 ? 1.4 : targetScore === 200 ? 1 : 0.75
    confetti({ particleCount: Math.round(120 * mult), spread: 70, origin: { y: 0.55, x: 0.2 } })
    confetti({ particleCount: Math.round(120 * mult), spread: 70, origin: { y: 0.55, x: 0.8 } })
    const overlay = document.createElement('div')
    overlay.className = 'win-overlay'
    const box = document.createElement('div')
    box.className = 'win-overlay-box'
    const t = document.createElement('h2')
    t.className = 'win-overlay-title'
    t.textContent = winTitleFor(targetScore)
    const s = document.createElement('p')
    s.className = 'win-overlay-sub'
    s.textContent = UI.winSub
    const homeBtn = document.createElement('button')
    homeBtn.type = 'button'
    homeBtn.className = 'btn btn-primary btn-large win-overlay-home'
    homeBtn.textContent = UI.home
    homeBtn.addEventListener('click', () => goToHome())
    box.appendChild(t)
    box.appendChild(s)
    box.appendChild(homeBtn)
    overlay.appendChild(box)
    document.body.appendChild(overlay)
  }

  const currentQ = (): Question | null => questions[qIndex] ?? null

  const prepareQuestion = () => {
    const q = currentQ()
    if (!q) return
    const ord = shuffle([0, 1, 2, 3]) as [number, number, number, number]
    optionOrder = ord
    displayCorrectIndex = ord.indexOf(q.correctIndex)
    wrongCount = 0
    lastWrongDisplayIndex = null
  }

  const goNext = () => {
    clearAdvance()
    if (questions.length === 0) return
    qIndex = (qIndex + 1) % questions.length
    prepareQuestion()
    phase = 'answering'
    pendingPointsPop = null
    render()
  }

  const startLevel = (t: TargetScore) => {
    void resumeAudio()
    playClick(muted)
    targetScore = t
    score = 0
    qIndex = 0
    prepareQuestion()
    phase = 'answering'
    pendingPointsPop = null
    render()
  }

  const render = () => {
    const q = currentQ()
    el.innerHTML = ''

    const header = document.createElement('header')
    header.className = 'game-header'

    const title = document.createElement('h1')
    title.className = 'game-title'
    title.textContent = UI.title
    header.appendChild(title)

    const tools = document.createElement('div')
    tools.className = 'game-tools'

    if (phase !== 'loading' && phase !== 'splash' && phase !== 'error') {
      const homeHeaderBtn = document.createElement('button')
      homeHeaderBtn.type = 'button'
      homeHeaderBtn.className = 'btn btn-ghost btn-home'
      homeHeaderBtn.textContent = UI.home
      homeHeaderBtn.addEventListener('click', () => goToHome())
      tools.appendChild(homeHeaderBtn)
    }

    const muteBtn = document.createElement('button')
    muteBtn.type = 'button'
    muteBtn.className = 'btn btn-ghost'
    muteBtn.textContent = muted ? UI.unmute : UI.mute
    muteBtn.addEventListener('click', () => {
      muted = !muted
      saveMuted(muted)
      muteBtn.textContent = muted ? UI.unmute : UI.mute
    })
    tools.appendChild(muteBtn)
    header.appendChild(tools)
    el.appendChild(header)

    if (phase === 'loading' || phase === 'splash' || phase === 'error') {
      const main = document.createElement('main')
      main.className = 'game-main game-center'
      if (phase === 'loading') {
        const p = document.createElement('p')
        p.className = 'game-status'
        p.textContent = UI.loading
        main.appendChild(p)
      } else if (phase === 'error') {
        const p = document.createElement('p')
        p.className = 'game-error'
        p.textContent = UI.loadError
        main.appendChild(p)
      } else {
        const sub = document.createElement('p')
        sub.className = 'splash-sub'
        sub.textContent = UI.chooseLevel
        main.appendChild(sub)
        const row = document.createElement('div')
        row.className = 'level-row'
        const mkLevel = (label: string, value: TargetScore) => {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = 'btn btn-primary btn-large btn-level'
          b.textContent = label
          b.addEventListener('click', () => startLevel(value))
          row.appendChild(b)
        }
        mkLevel(UI.levelEasy, 100)
        mkLevel(UI.levelMid, 200)
        mkLevel(UI.levelHard, 300)
        main.appendChild(row)
      }
      el.appendChild(main)
      return
    }

    const displayLabels = q ? (optionOrder.map((i) => q.options[i]) as [string, string, string, string]) : null

    const barWrap = document.createElement('div')
    barWrap.className = 'score-bar-wrap'
    const barLabel = document.createElement('div')
    barLabel.className = 'score-bar-label'
    barLabel.textContent = `${UI.scoreLabel}: ${score} / ${targetScore}`
    const barTrack = document.createElement('div')
    barTrack.className = 'score-bar-track'
    const barFill = document.createElement('div')
    barFill.className = 'score-bar-fill'
    barFill.style.width = `${(score / targetScore) * 100}%`
    barTrack.appendChild(barFill)
    barWrap.appendChild(barLabel)
    barWrap.appendChild(barTrack)
    el.appendChild(barWrap)

    if (!q || !displayLabels) {
      const p = document.createElement('p')
      p.className = 'game-error'
      p.textContent = UI.loadError
      el.appendChild(p)
      return
    }

    const main = document.createElement('main')
    main.className = phase === 'revealed' ? 'game-main game-main--revealed' : 'game-main'

    const hint = document.createElement('p')
    hint.className = 'type-hint'
    hint.textContent = hintForType(q.type)
    main.appendChild(hint)

    const prompt = document.createElement('div')
    prompt.className = 'prompt'
    prompt.textContent = q.prompt
    main.appendChild(prompt)

    const opts = document.createElement('div')
    opts.className = 'options'

    const handlePick = async (displayIdx: number) => {
      if (phase !== 'answering') return
      await resumeAudio()
      playClick(muted)
      if (displayIdx === displayCorrectIndex) {
        const pts: 5 | 10 = wrongCount === 0 ? 10 : 5
        pendingPointsPop = { amount: pts }
        if (pts === 10) {
          playCorrect(muted)
          if (!muted) {
            confetti({ particleCount: 55, spread: 62, origin: { y: 0.72, x: 0.5 }, startVelocity: 28, ticks: 90 })
          }
        } else {
          playCorrectHalf(muted)
        }
        const hitCap = addScore(pts)
        phase = 'correct'
        render()
        if (!hitCap) scheduleAdvance()
        return
      }
      wrongCount += 1
      lastWrongDisplayIndex = displayIdx
      playWrong(muted)
      if (wrongCount >= 2) {
        phase = 'revealed'
        render()
        scheduleAdvance()
      } else {
        phase = 'wrong'
        render()
      }
    }

    for (let i = 0; i < 4; i++) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'btn btn-option'
      b.textContent = displayLabels[i]
      if (phase === 'answering') {
        b.addEventListener('click', () => void handlePick(i))
      } else if (phase === 'wrong' && lastWrongDisplayIndex === i) {
        b.classList.add('btn-option-wrong')
        b.disabled = true
      } else if (phase === 'correct') {
        b.disabled = true
        if (i === displayCorrectIndex) b.classList.add('btn-option-correct')
      } else if (phase === 'revealed') {
        b.disabled = true
        if (i === displayCorrectIndex) b.classList.add('btn-option-correct')
        if (lastWrongDisplayIndex === i) b.classList.add('btn-option-wrong')
      } else {
        b.disabled = true
      }
      opts.appendChild(b)
    }
    main.appendChild(opts)

    if (phase === 'wrong') {
      const feedback = document.createElement('div')
      feedback.className = 'feedback feedback-wrong'
      feedback.textContent = UI.wrong
      main.appendChild(feedback)
      const retry = document.createElement('button')
      retry.type = 'button'
      retry.className = 'btn btn-secondary btn-large'
      retry.textContent = UI.tryAgain
      retry.addEventListener('click', () => {
        void resumeAudio()
        playClick(muted)
        phase = 'answering'
        lastWrongDisplayIndex = null
        render()
      })
      main.appendChild(retry)
    }

    if (phase === 'revealed') {
      const cap = document.createElement('p')
      cap.className = 'revealed-caption'
      cap.textContent = UI.revealedCaption
      main.appendChild(cap)
      const autoR = document.createElement('p')
      autoR.className = 'auto-hint'
      autoR.textContent = UI.autoNext
      main.appendChild(autoR)
      const nextBtnR = document.createElement('button')
      nextBtnR.type = 'button'
      nextBtnR.className = 'btn btn-primary btn-large'
      nextBtnR.textContent = UI.next
      nextBtnR.addEventListener('click', () => {
        void resumeAudio()
        playClick(muted)
        goNext()
      })
      main.appendChild(nextBtnR)
    }

    if (phase === 'correct') {
      const pop = pendingPointsPop
      if (pop) {
        const floater = document.createElement('div')
        floater.className = pop.amount === 10 ? 'points-pop points-pop--full' : 'points-pop points-pop--half'
        floater.setAttribute('role', 'status')
        floater.textContent = pop.amount === 10 ? '+10' : '+5'
        barWrap.appendChild(floater)
        pendingPointsPop = null
      }

      const feedback = document.createElement('div')
      feedback.className = 'feedback feedback-correct'
      feedback.textContent = UI.correct
      main.appendChild(feedback)
      if (q.imageUrl) {
        const fig = document.createElement('figure')
        fig.className = 'reward-image'
        const img = document.createElement('img')
        img.src = q.imageUrl
        img.alt = ''
        img.decoding = 'async'
        fig.appendChild(img)
        main.appendChild(fig)
      }
      const auto = document.createElement('p')
      auto.className = 'auto-hint'
      auto.textContent = UI.autoNext
      main.appendChild(auto)
      const nextBtn = document.createElement('button')
      nextBtn.type = 'button'
      nextBtn.className = 'btn btn-primary btn-large'
      nextBtn.textContent = UI.next
      nextBtn.addEventListener('click', () => {
        void resumeAudio()
        playClick(muted)
        goNext()
      })
      main.appendChild(nextBtn)
    }

    el.appendChild(main)
  }

  void (async () => {
    try {
      questions = shuffle(await fetchQuestions())
      phase = questions.length ? 'splash' : 'error'
      if (questions.length) prepareQuestion()
    } catch {
      phase = 'error'
    }
    render()
  })()

  return () => {
    clearAdvance()
    document.querySelectorAll('.win-overlay').forEach((n) => n.remove())
    el.remove()
  }
}
