import type { Play } from './play'

// Keyboard, mouse and touch for the 3D game.
//  Keys: WASD or arrows to run, Space to jump, B to bark, Q/E to turn the camera.
//  Mouse: drag to look around, wheel to zoom, click the grass to run there.
//  Touch: a thumb joystick wherever the left thumb lands, drag on the right to look, tap the grass to run there.

const KEYS: Record<string, string> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

export interface Pad {
  joy: HTMLElement
  knob: HTMLElement
  jump: HTMLElement
  bark: HTMLElement
}

export function bindInput(play: Play, surface: HTMLElement, pad: Pad, bark: () => void) {
  const inp = play.input
  const now = () => performance.now() / 1000
  const busyElsewhere = () => !!document.querySelector('dialog[open]')

  const keydown = (e: KeyboardEvent) => {
    if (busyElsewhere() || e.metaKey || e.ctrlKey) return
    const k = KEYS[e.code]
    if (k && play.mode === 'explore') {
      inp.keys.add(k)
      inp.lastInput = now()
      e.preventDefault()
    } else if (e.code === 'Space' && play.mode === 'explore') {
      inp.jump = true
      e.preventDefault()
    } else if (e.code === 'KeyB' && play.mode === 'explore') bark()
    else if (e.code === 'KeyQ') inp.orbit.x -= 60
    else if (e.code === 'KeyE') inp.orbit.x += 60
  }
  const keyup = (e: KeyboardEvent) => {
    const k = KEYS[e.code]
    if (k) inp.keys.delete(k)
  }
  const blur = () => inp.keys.clear()

  // One pointer can steer (the joystick) and another can look around at the same time.
  let stick: { id: number; x: number; y: number } | null = null
  let look: { id: number; x: number; y: number; moved: boolean } | null = null
  const R = 56

  const down = (e: PointerEvent) => {
    if (e.target !== surface && !(e.target as Element).closest('canvas')) return
    const left = e.clientX < innerWidth * 0.45
    if (e.pointerType === 'touch' && left && play.mode === 'explore' && !stick) {
      stick = { id: e.pointerId, x: e.clientX, y: e.clientY }
      pad.joy.style.left = `${e.clientX}px`
      pad.joy.style.top = `${e.clientY}px`
      pad.joy.classList.add('on')
      pad.knob.style.transform = ''
    } else if (!look) look = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
  }
  const move = (e: PointerEvent) => {
    if (stick && e.pointerId === stick.id) {
      let dx = e.clientX - stick.x
      let dy = e.clientY - stick.y
      const d = Math.hypot(dx, dy)
      if (d > R) {
        dx *= R / d
        dy *= R / d
      }
      pad.knob.style.transform = `translate(${dx}px,${dy}px)`
      inp.move.set(dx / R, -dy / R)
      if (d > 8) {
        inp.tapTarget = null
        inp.lastInput = now()
      }
    } else if (look && e.pointerId === look.id) {
      const [dx, dy] = [e.clientX - look.x, e.clientY - look.y]
      if (!look.moved && Math.hypot(dx, dy) < 8) return
      look.moved = true
      inp.orbit.x += dx
      inp.orbit.y += dy
      look.x = e.clientX
      look.y = e.clientY
    }
  }
  const up = (e: PointerEvent) => {
    if (stick && e.pointerId === stick.id) {
      stick = null
      inp.move.set(0, 0)
      pad.joy.classList.remove('on')
    }
    if (look && e.pointerId === look.id) look = null
  }
  const wheel = (e: WheelEvent) => {
    inp.zoom += e.deltaY
    e.preventDefault()
  }
  const jump = (e: Event) => {
    e.preventDefault()
    inp.jump = true
    inp.lastInput = now()
  }
  const woof = (e: Event) => {
    e.preventDefault()
    bark()
  }

  addEventListener('keydown', keydown)
  addEventListener('keyup', keyup)
  addEventListener('blur', blur)
  surface.addEventListener('pointerdown', down)
  addEventListener('pointermove', move)
  addEventListener('pointerup', up)
  addEventListener('pointercancel', up)
  surface.addEventListener('wheel', wheel, { passive: false })
  pad.jump.addEventListener('pointerdown', jump)
  pad.bark.addEventListener('pointerdown', woof)

  return () => {
    removeEventListener('keydown', keydown)
    removeEventListener('keyup', keyup)
    removeEventListener('blur', blur)
    surface.removeEventListener('pointerdown', down)
    removeEventListener('pointermove', move)
    removeEventListener('pointerup', up)
    removeEventListener('pointercancel', up)
    surface.removeEventListener('wheel', wheel)
    pad.jump.removeEventListener('pointerdown', jump)
    pad.bark.removeEventListener('pointerdown', woof)
  }
}
