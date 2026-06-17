import confetti from 'canvas-confetti'
import type { Question } from './types.ts'
import { isQuestion } from './types.ts'
import { sendSessionReportEmail } from './emailReport.ts'
import type { PlayerId, WrongChoiceLine } from './emailReport.ts'
import {
  playClick,
  playCorrectHalfRandom,
  playCorrectRandom,
  playWin200,
  playWrongFinalRandom,
  playWrongRandom,
  resumeAudio,
} from './sounds.ts'

const MUTE_KEY = 'trivia-muted'
/** אַחֲרֵי תְּשׁוּבָה נְכוֹנָה */
const AUTO_ADVANCE_AFTER_CORRECT_MS = 3000
/** אַחֲרֵי גִּלּוּי תְּשׁוּבָה (שְׁתֵּי טָעוּיוֹת) — לְפָחוֹת שֶׁבַע שְׁנִיּוֹת לִקְרֹא */
const AUTO_ADVANCE_AFTER_REVEAL_MS = 7000
/** לִפְנֵי שֶׁמַּפְשִׁיטִים שׁוּב נִסּוּיוֹן אַחֲרֵי טָעוּת רִאשׁוֹנָה */
const DELAY_BEFORE_RETRY_MS = 5000
/** כַּמָּה שְׁאֵלוֹת עַד לְהַצְגָּה חוֹזֶרֶת שֶׁל שְׁאֵלָה שֶׁהָיְתָה בָּהּ טָעוּת */
const RETRY_SAME_QUESTION_AFTER = 3
/** נִקּוּד שֶׁמּוּסָר עַל כָּל טָעוּת */
const WRONG_PENALTY_POINTS = 5

type TargetScore = 100 | 200 | 300
type Phase = 'loading' | 'error' | 'pickName' | 'splash' | 'answering' | 'wrong' | 'correct' | 'revealed'

/** מַחְרוּזוֹת מַמְשָׁק — מְנוּקָּדוֹת */
const UI = {
  title: 'אוֹצַר מִילִים וּפִתְגָמִים',
  choosePlayer: 'מִי מְשַׂחֵק/ת?',
  nameNoa: 'נעה',
  nameEdo: 'עדו',
  nameGuy: 'גיא',
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
  autoNextAfterCorrect: 'הַשְּׁאֵלָה הַבָּאָה תִיטָּעֵן אוֹטוֹמָטִית תּוֹךְ שָׁלוֹשׁ שְׁנִיּוֹת…',
  autoNextAfterReveal: 'הַשְּׁאֵלָה הַבָּאָה תִיטָּעֵן אוֹטוֹמָטִית תּוֹךְ שֶׁבַע שְׁנִיּוֹת…',
  waitBeforeNext: 'עוֹד {n} שְׁנִיּוֹת וְאָז אֶפְשָׁר לְהַמְשִׁיךְ…',
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

const SUCCESS_EFFECTS: (() => void)[] = [
  () => confetti({ particleCount: 55, spread: 62, origin: { y: 0.72, x: 0.5 }, startVelocity: 28, ticks: 90 }),
  () => {
    confetti({ particleCount: 40, spread: 55, origin: { y: 0.65, x: 0.25 }, startVelocity: 32, ticks: 80 })
    confetti({ particleCount: 40, spread: 55, origin: { y: 0.65, x: 0.75 }, startVelocity: 32, ticks: 80 })
  },
  () => confetti({ particleCount: 70, spread: 100, origin: { y: 0.35, x: 0.5 }, startVelocity: 22, ticks: 100, gravity: 0.9 }),
  () => confetti({ particleCount: 45, spread: 40, origin: { y: 0.85, x: 0.5 }, startVelocity: 18, ticks: 70, scalar: 0.9 }),
  () => {
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.6, x: 0.35 }, startVelocity: 26, ticks: 75 })
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.6, x: 0.5 }, startVelocity: 26, ticks: 75 })
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.6, x: 0.65 }, startVelocity: 26, ticks: 75 })
  },
]

function fireRandomSuccessEffect(): void {
  SUCCESS_EFFECTS[Math.floor(Math.random() * SUCCESS_EFFECTS.length)]()
}

export function mountGame(root: HTMLElement): () => void {
  let questions: Question[] = []
  let qIndex = 0
  let score = 0
  let targetScore: TargetScore = 100
  let phase: Phase = 'loading'
  let playerId: PlayerId | null = null
  /** תְּשׁוּבוֹת שְׁגוּיוֹת שֶׁנִבְחֲרוּ (לְדוּחַ אִימֵייל) */
  let wrongLog: WrongChoiceLine[] = []
  /** כמה פעמים נִלְחֲצָה תְּשׁוּבָה נְכוֹנָה בַּמַּחֲזוֹר הַנּוֹכְחִי (מֵאָז בְּחִירַת רָמָה) */
  let correctAnswersCount = 0
  let muted = loadMuted()
  let advanceTimer: ReturnType<typeof setTimeout> | null = null
  let wrongRetryIntervalId: ReturnType<typeof setInterval> | null = null
  /** זְמַן (מֵחֲזִית Date.now()) שֶׁבּוֹ נִפְתַּח כּוֹפֶת «נָסוּ שׁוּב» אַחֲרֵי טָעוּת רִאשׁוֹנָה */
  let wrongRetryUnlockAt = 0
  /** הָאִם בַּשְׁאֵלָה הַנּוֹכְחִית הָיְתָה לְפָחוֹת טָעוּת אַחַת לִפְנֵי מַעֲבָר לַשְּׁאֵלָה הַבָּאָה */
  let currentQuestionHadWrong = false

  /** סֵדֶר הַצָּגָה: אֵינְדֶקְסִים מְקוֹרִיִּים 0–3 */
  let optionOrder: [number, number, number, number] = [0, 1, 2, 3]
  let displayCorrectIndex = 0
  let wrongCount = 0
  let lastWrongDisplayIndex: number | null = null
  let pendingPointsPop: null | { amount: 5 | 10 | -5 } = null

  const el = document.createElement('div')
  el.className = 'game'
  root.appendChild(el)

  const clearAdvance = () => {
    if (advanceTimer !== null) {
      clearTimeout(advanceTimer)
      advanceTimer = null
    }
  }

  const clearWrongRetryTicker = () => {
    if (wrongRetryIntervalId !== null) {
      clearInterval(wrongRetryIntervalId)
      wrongRetryIntervalId = null
    }
  }

  const startUnlockTicker = (untilPhase: 'wrong' | 'revealed') => {
    clearWrongRetryTicker()
    wrongRetryIntervalId = window.setInterval(() => {
      if (phase !== untilPhase) {
        clearWrongRetryTicker()
        return
      }
      if (Date.now() >= wrongRetryUnlockAt) {
        clearWrongRetryTicker()
      }
      render()
    }, 350)
  }

  const scheduleAdvance = (delayMs: number) => {
    clearAdvance()
    advanceTimer = window.setTimeout(() => {
      advanceTimer = null
      if (phase === 'correct' || phase === 'revealed') goNext()
    }, delayMs)
  }

  const flushSessionReport = (opts?: { keepalive?: boolean }) => {
    if (!playerId) return
    const active =
      phase === 'answering' ||
      phase === 'wrong' ||
      phase === 'correct' ||
      phase === 'revealed'
    if (!active) return
    if (wrongLog.length === 0 && correctAnswersCount === 0) return
    const wrongSnapshot = wrongLog.slice()
    wrongLog.length = 0
    const correctSnapshot = correctAnswersCount
    correctAnswersCount = 0
    sendSessionReportEmail(
      playerId,
      { wrongLines: wrongSnapshot, correctCount: correctSnapshot },
      opts,
    )
  }

  const goToHome = () => {
    void resumeAudio()
    playClick(muted)
    flushSessionReport({ keepalive: false })
    clearWrongRetryTicker()
    clearAdvance()
    document.querySelectorAll('.win-overlay').forEach((n) => n.remove())
    score = 0
    phase = 'splash'
    wrongLog = []
    correctAnswersCount = 0
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
    const raw = score + delta
    const next = Math.min(targetScore, Math.max(0, raw))
    const hitCap = next === targetScore && score < targetScore
    score = next
    if (hitCap) fireWinComplete()
    return hitCap
  }

  /** נִשׁאָר עַד לְחִיצָה עַל «לַמָּסָך הָרֹאשִׁי» — לְלֹא סְגִירָה אוֹטוֹמָטִית */
  const fireWinComplete = () => {
    clearWrongRetryTicker()
    clearAdvance()
    flushSessionReport({ keepalive: true })
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
    currentQuestionHadWrong = false
  }

  const goNext = () => {
    clearWrongRetryTicker()
    clearAdvance()
    if (questions.length === 0) return
    const hadWrong = currentQuestionHadWrong
    const finishedIndex = qIndex
    const qFinished = questions[finishedIndex]
    const oldLen = questions.length
    let nextIndex = (finishedIndex + 1) % oldLen

    if (hadWrong && qFinished) {
      const pos = finishedIndex + 1 + RETRY_SAME_QUESTION_AFTER
      const copy: Question = { ...qFinished }
      if (pos >= oldLen) {
        questions.push(copy)
      } else {
        questions.splice(pos, 0, copy)
        if (pos <= nextIndex) nextIndex += 1
      }
    }

    qIndex = nextIndex % questions.length
    prepareQuestion()
    phase = 'answering'
    pendingPointsPop = null
    render()
  }

  const startLevel = (t: TargetScore) => {
    void resumeAudio()
    playClick(muted)
    clearWrongRetryTicker()
    wrongLog = []
    correctAnswersCount = 0
    targetScore = t
    score = 0
    qIndex = 0
    prepareQuestion()
    phase = 'answering'
    pendingPointsPop = null
    render()
  }

  const pickPlayer = (id: PlayerId) => {
    void resumeAudio()
    playClick(muted)
    playerId = id
    phase = 'splash'
    render()
  }

  const onPageHide = (ev: Event) => {
    const e = ev as PageTransitionEvent
    if (e.persisted) return
    flushSessionReport({ keepalive: true })
  }
  window.addEventListener('pagehide', onPageHide)

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

    if (phase !== 'loading' && phase !== 'splash' && phase !== 'pickName' && phase !== 'error') {
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

    if (phase === 'loading' || phase === 'splash' || phase === 'pickName' || phase === 'error') {
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
      } else if (phase === 'pickName') {
        const sub = document.createElement('p')
        sub.className = 'splash-sub'
        sub.textContent = UI.choosePlayer
        main.appendChild(sub)
        const row = document.createElement('div')
        row.className = 'level-row'
        const mkName = (label: string, id: PlayerId) => {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = 'btn btn-primary btn-large btn-level'
          b.textContent = label
          b.addEventListener('click', () => pickPlayer(id))
          row.appendChild(b)
        }
        mkName(UI.nameNoa, 'noa')
        mkName(UI.nameEdo, 'edo')
        mkName(UI.nameGuy, 'guy')
        main.appendChild(row)
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
    const popFlash = pendingPointsPop
    if (popFlash) {
      const floater = document.createElement('div')
      floater.setAttribute('role', 'status')
      if (popFlash.amount === -5) {
        floater.className = 'points-pop points-pop--penalty'
        floater.textContent = '-5'
      } else if (popFlash.amount === 10) {
        floater.className = 'points-pop points-pop--full'
        floater.textContent = '+10'
      } else {
        floater.className = 'points-pop points-pop--half'
        floater.textContent = '+5'
      }
      barWrap.appendChild(floater)
      pendingPointsPop = null
    }
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
          playCorrectRandom(muted)
          if (!muted) fireRandomSuccessEffect()
        } else {
          playCorrectHalfRandom(muted)
          if (!muted) fireRandomSuccessEffect()
        }
        correctAnswersCount += 1
        const hitCap = addScore(pts)
        phase = 'correct'
        render()
        if (!hitCap) scheduleAdvance(AUTO_ADVANCE_AFTER_CORRECT_MS)
        return
      }
      wrongCount += 1
      lastWrongDisplayIndex = displayIdx
      currentQuestionHadWrong = true
      wrongLog.push({ prompt: q.prompt, chosen: displayLabels[displayIdx] })
      pendingPointsPop = { amount: -5 }
      addScore(-WRONG_PENALTY_POINTS)
      if (wrongCount >= 2) {
        playWrongFinalRandom(muted)
        wrongRetryUnlockAt = Date.now() + DELAY_BEFORE_RETRY_MS
        startUnlockTicker('revealed')
        phase = 'revealed'
        render()
        scheduleAdvance(AUTO_ADVANCE_AFTER_REVEAL_MS)
      } else {
        playWrongRandom(muted)
        wrongRetryUnlockAt = Date.now() + DELAY_BEFORE_RETRY_MS
        startUnlockTicker('wrong')
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
      const canRetry = Date.now() >= wrongRetryUnlockAt
      if (!canRetry) {
        const wait = document.createElement('p')
        wait.className = 'auto-hint'
        const secs = Math.max(1, Math.ceil((wrongRetryUnlockAt - Date.now()) / 1000))
        wait.textContent = `עוֹד ${secs} שְׁנִיּוֹת וְאָז אֶפְשָׁר לִנְסוֹת שׁוּב…`
        main.appendChild(wait)
      }
      const retry = document.createElement('button')
      retry.type = 'button'
      retry.className = 'btn btn-secondary btn-large'
      retry.textContent = UI.tryAgain
      retry.disabled = !canRetry
      retry.addEventListener('click', () => {
        if (!canRetry) return
        void resumeAudio()
        playClick(muted)
        clearWrongRetryTicker()
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
      const canNext = Date.now() >= wrongRetryUnlockAt
      if (!canNext) {
        const wait = document.createElement('p')
        wait.className = 'auto-hint'
        const secs = Math.max(1, Math.ceil((wrongRetryUnlockAt - Date.now()) / 1000))
        wait.textContent = UI.waitBeforeNext.replace('{n}', String(secs))
        main.appendChild(wait)
      } else {
        const autoR = document.createElement('p')
        autoR.className = 'auto-hint'
        autoR.textContent = UI.autoNextAfterReveal
        main.appendChild(autoR)
      }
      const nextBtnR = document.createElement('button')
      nextBtnR.type = 'button'
      nextBtnR.className = 'btn btn-primary btn-large'
      nextBtnR.textContent = UI.next
      nextBtnR.disabled = !canNext
      nextBtnR.addEventListener('click', () => {
        if (!canNext) return
        void resumeAudio()
        playClick(muted)
        goNext()
      })
      main.appendChild(nextBtnR)
    }

    if (phase === 'correct') {
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
      auto.textContent = UI.autoNextAfterCorrect
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
      phase = questions.length ? 'pickName' : 'error'
      if (questions.length) prepareQuestion()
    } catch {
      phase = 'error'
    }
    render()
  })()

  return () => {
    window.removeEventListener('pagehide', onPageHide)
    clearWrongRetryTicker()
    clearAdvance()
    document.querySelectorAll('.win-overlay').forEach((n) => n.remove())
    el.remove()
  }
}
