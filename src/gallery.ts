// Dev-only art board: every drawing on one page, for checking the style at a glance.
import './art/art.css'
import { kipper, kipperAsleep } from './art/kipper'
import { basketSvg, toy, TOY_IDS } from './art/props'
import { friend, FRIEND_IDS } from './art/friends'

const root = document.querySelector<HTMLElement>('#gallery')!
document.body.style.cssText = 'margin:0;background:#fbf6ea;font:14px system-ui'
root.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;padding:16px;align-items:end'

const S = new URLSearchParams(location.search).has('big') ? 2 : 1
function card(label: string, art: string, w = 260) {
  w *= S
  const el = document.createElement('figure')
  el.style.cssText = `margin:0;width:${w}px;text-align:center`
  el.innerHTML = `${art}<figcaption>${label}</figcaption>`
  root.append(el)
}

const asleep = kipperAsleep()
card('kipper', kipper())
card('kipper sad', kipper('sad'))
card('kipper walking', kipper('walking'))
card('basket', basketSvg())
card('asleep', basketSvg(asleep.inside, asleep.over, 'asleep'))
card('asleep + blanket', basketSvg(asleep.inside.replace('class="drape"', 'class="drape on"'), asleep.over, 'asleep'))
for (const id of TOY_IDS) card(id, toy(id), 110)
FRIEND_IDS.forEach((id, i) => card(id, friend(id, TOY_IDS[i % TOY_IDS.length]), 180))
import { picture, PICTURE_IDS } from './art/pictures'
for (const id of PICTURE_IDS) card(id, picture(id), 120)
import { cloud, farHills, ground, nearHills, spot } from './art/scenery'
card('far hills', farHills(), 800)
card('near hills', nearHills(), 600)
card('ground', ground(), 450)
card('cloud', cloud('c1'), 200)
card('cloud', cloud('c2'), 200)
for (const s of ['bush', 'log', 'burrow'] as const) card(s, spot(s), 220)
