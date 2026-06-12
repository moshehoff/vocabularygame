import './style.css'
import { mountGame } from './game.ts'

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  mountGame(app)
}
