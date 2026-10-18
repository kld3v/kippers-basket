import { againIcon, gateIcon, homeIcon, playIcon } from './art/icons'
import { picture } from './art/pictures'
import { cloud } from './art/scenery'
import { DOG } from './content'
import { initFx } from './fx'
import { Hud } from './hud'

/**
 * Everything around the stage that both versions share: the sky, the basket bar,
 * the question cards, the menu, the grown-ups key and captions.
 */
export class Shell {
  readonly root: HTMLElement
  readonly scene: HTMLElement
  readonly hud: Hud
  readonly questionEl: HTMLElement
  readonly storyButton: HTMLButtonElement
  readonly meadowButton: HTMLButtonElement
  readonly againButton: HTMLButtonElement
  readonly homeButton: HTMLButtonElement
  readonly gate: HTMLButtonElement
  readonly caption: HTMLElement

  constructor(root: HTMLElement) {
    this.root = root
    const clouds = [
      ['c1', 6, 34, 95, -10],
      ['c2', 16, 24, 140, -70],
      ['c3', 3, 20, 120, -40],
    ]
      .map(([seed, top, w, dur, delay]) => `<div class="cloud-wrap" style="--top:${top};--w:${w};--dur:${dur}s;--delay:${delay}s">${cloud(String(seed))}</div>`)
      .join('')
    const stars = Array.from({ length: 22 }, () => `<i style="left:${Math.random() * 100}%;top:${Math.random() * 42}%;--d:${(Math.random() * 3).toFixed(2)}s"></i>`).join('')
    root.innerHTML = `
      <div class="sky"><div class="dusk"></div><div class="stars">${stars}</div><div class="moon">${picture('moon')}</div>${clouds}</div>
      <div class="scene"></div>
      <div class="question"></div>
      <div class="title-ui">
        <h1 class="title"></h1>
        <div class="modes">
          <button class="mode story" aria-label="Play the storybook">${playIcon()}<span>Story</span></button>
          <button class="mode meadow" aria-label="Play in 3D">${playIcon('#8fbadf')}<span>3D</span></button>
        </div>
      </div>
      <div class="end-ui">
        <button class="again" aria-label="Play again">${againIcon()}</button>
        <button class="to-menu" aria-label="Back to the start">${homeIcon()}</button>
      </div>
      <button class="gate" aria-label="Grown-ups: press and hold">${gateIcon()}<svg class="ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/></svg></button>
      <div class="caption" aria-live="polite"></div>
      <div class="fx"></div>
      <div class="grain" style="background-image:url(${grain()})"></div>`
    const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!

    $('.title').append(
      ...[...`${DOG}'s Basket`].map((ch, i) => {
        const s = document.createElement('span')
        s.textContent = ch
        s.style.setProperty('--r', `${(((i * 7919) % 11) - 5) * 1.1}deg`)
        return s
      }),
    )
    this.scene = $('.scene')
    this.hud = new Hud(root)
    this.questionEl = $('.question')
    this.storyButton = $('.mode.story')
    this.meadowButton = $('.mode.meadow')
    this.againButton = $('.again')
    this.homeButton = $('.to-menu')
    this.gate = $('.gate')
    this.caption = $('.caption')
    initFx($('.fx'))
  }

  scenePhase(name: 'title' | 'play' | 'end') {
    this.root.dataset.scene = name
  }

  night(on: boolean) {
    this.root.classList.toggle('night', on)
  }
}

/** Paper texture: faint warm specks with their own alpha, so no blend mode is needed (blend modes are slow on iPads). */
function grain() {
  const c = document.createElement('canvas')
  c.width = c.height = 160
  const g = c.getContext('2d')!
  const img = g.createImageData(160, 160)
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 90
    img.data[i + 1] = 70
    img.data[i + 2] = 50
    img.data[i + 3] = Math.random() < 0.5 ? Math.random() * 22 : 0
  }
  g.putImageData(img, 0, 0)
  return c.toDataURL()
}
