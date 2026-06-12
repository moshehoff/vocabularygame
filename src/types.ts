export type QuestionType = 'synonym' | 'proverb' | 'trivia'

/**
 * כל שדות הטקסט לתצוגה (`prompt`, `options`) — בַּעֲבָרִית **עִם נִיקּוּד מָלֵא**,
 * כְּדֵי שֶׁיֶּלֶד בֶּן 7 יוּכַל לִקְרוֹת בְּבֵרוּר.
 */
export type Question = {
  id: string
  type: QuestionType
  /** הַמִּילָה, הַפִּתְגָם אוֹ נִיסּוּחַ הַשְּׁאֵלָה — מְנוּקָּד */
  prompt: string
  /** בְּדִיּוּק 4 אֲפְשָׁרוּיוֹת, כֻּלָּן מְנוּקָּדוֹת */
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  /** מוּצָג רַק אַחֲרֵי תְּשׁוּבָה נְכוֹנָה */
  imageUrl?: string
}

export function isQuestion(x: unknown): x is Question {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (typeof o.id !== 'string') return false
  if (o.type !== 'synonym' && o.type !== 'proverb' && o.type !== 'trivia') return false
  if (typeof o.prompt !== 'string') return false
  if (!Array.isArray(o.options) || o.options.length !== 4) return false
  if (!o.options.every((s) => typeof s === 'string')) return false
  const ci = o.correctIndex
  if (ci !== 0 && ci !== 1 && ci !== 2 && ci !== 3) return false
  if (o.imageUrl !== undefined && typeof o.imageUrl !== 'string') return false
  return true
}
