/** ילד/ה פעיל/ת — לניתוב דוח אימייל */
export type PlayerId = 'noa' | 'edo' | 'guy'

const RECIPIENT: Record<PlayerId, string> = {
  noa: 'tirza01@hotmail.com',
  edo: 'moshe.hoffman@gmail.com',
  guy: 'tirza01@hotmail.com',
}

const DISPLAY_NAME: Record<PlayerId, string> = {
  noa: 'נעה',
  edo: 'עדו',
  guy: 'גיא',
}

export type WrongChoiceLine = { prompt: string; chosen: string }

export type SessionReportPayload = {
  wrongLines: WrongChoiceLine[]
  /** כמה פעמים נלחצה תשובה נכונה במהלך הסשן (כל לחיצה נכונה נספרת) */
  correctCount: number
}

function formatMessage(payload: SessionReportPayload): string {
  const header = `מספר תשובות נכונות שנענו: ${payload.correctCount}\n\n`
  if (payload.wrongLines.length === 0) {
    return `${header}לא נרשמו בחירות שגויות.`
  }
  const body = payload.wrongLines.map((l) => `${l.prompt}:\n${l.chosen}`).join('\n\n')
  return `${header}${body}`
}

/**
 * שולח דוח סשן (FormSubmit — דורש הפעלה חד־פעמית לכל כתובת נמען).
 * `keepalive` — לסגירת לשונית / ניצחון מהיר.
 */
export function sendSessionReportEmail(
  player: PlayerId,
  payload: SessionReportPayload,
  opts?: { keepalive?: boolean },
): void {
  if (payload.wrongLines.length === 0 && payload.correctCount === 0) return
  const to = RECIPIENT[player]
  const url = `https://formsubmit.co/ajax/${encodeURIComponent(to)}`
  const message = formatMessage(payload)
  const subject = `סיכום משחק — ${DISPLAY_NAME[player]}`
  const body = JSON.stringify({
    _subject: subject,
    name: `משחק אוצר מילים (${DISPLAY_NAME[player]})`,
    message,
    _captcha: 'false',
  })
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
    keepalive: opts?.keepalive ?? false,
  }).catch(() => {
    /* דוח לא קריטי ל־UX */
  })
}
