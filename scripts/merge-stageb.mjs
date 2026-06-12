import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import rows from './stageb-data.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const path = join(__dirname, '..', 'public', 'questions.json')

let n = 1
function mk([prompt, a, b, c, d]) {
  const id = `stg-${String(n++).padStart(3, '0')}`
  return {
    id,
    type: 'trivia',
    prompt,
    options: [a, b, c, d],
    correctIndex: 0,
  }
}

const bank = JSON.parse(readFileSync(path, 'utf8'))
for (const row of rows) {
  bank.push(mk(row))
}
writeFileSync(path, JSON.stringify(bank, null, 2) + '\n', 'utf8')
console.log('added', rows.length, 'stg questions; last id stg-' + String(n - 1).padStart(3, '0'))
