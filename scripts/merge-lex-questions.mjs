/**
 * מַמְזֵג מַאֲגָר שְׁאֵלוֹת lex-parts → סוֹף public/questions.json
 * הרצה: node scripts/merge-lex-questions.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import part1 from './lex-part1.mjs'
import part2 from './lex-part2.mjs'
import part3 from './lex-part3.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const path = join(root, 'public', 'questions.json')

const rows = [...part1, ...part2, ...part3]
let id = 181

function mk([w, c, a, b, d]) {
  const n = id++
  return {
    id: `lit-${n}`,
    type: 'trivia',
    prompt: `מַה פֵּירוּשׁ ״${w}״?`,
    options: [c, a, b, d],
    correctIndex: 0,
  }
}

const bank = JSON.parse(readFileSync(path, 'utf8'))
for (const row of rows) {
  bank.push(mk(row))
}
writeFileSync(path, JSON.stringify(bank, null, 2) + '\n', 'utf8')
console.log('added', rows.length, 'questions; last id lit-' + (id - 1))
