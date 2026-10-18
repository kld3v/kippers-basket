import { basketSvg, toy } from './art/props'
import { TOYS, type ToyId } from './content'

/** Kipper's basket in the corner, with a slot for every toy still to find. */
export class Hud {
  readonly el: HTMLElement
  private slots = new Map<ToyId, HTMLElement>()

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div')
    this.el.className = 'hud'
    this.el.innerHTML = `<div class="hud-basket">${basketSvg()}</div>`
    for (const t of TOYS) {
      const slot = document.createElement('div')
      slot.className = 'slot'
      slot.dataset.toy = t.id
      slot.innerHTML = toy(t.id)
      this.slots.set(t.id, slot)
      this.el.append(slot)
    }
    parent.append(this.el)
  }

  show(on: boolean) {
    this.el.classList.toggle('on', on)
  }

  reset() {
    for (const s of this.slots.values()) s.classList.remove('found', 'pulse')
  }

  slot(id: ToyId) {
    return this.slots.get(id)!
  }

  pulse(id: ToyId) {
    const s = this.slot(id)
    s.classList.remove('pulse')
    void s.offsetWidth
    s.classList.add('pulse')
  }

  found(id: ToyId, on = true) {
    this.slot(id).classList.toggle('found', on)
  }
}
