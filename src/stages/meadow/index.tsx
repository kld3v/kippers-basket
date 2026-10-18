import { Canvas } from '@react-three/fiber'
import { createRoot, type Root } from 'react-dom/client'
import * as THREE from 'three'
import { sfx } from '../../audio/sfx'
import { speech } from '../../audio/speech'
import { LINES, pick, type ToyId } from '../../content'
import { AUTOPLAY } from '../../question'
import type { Run } from '../../run'
import type { Mood, Round, Stage, StageHost } from '../types'
import { bindInput } from './input'
import { HOME, fog, heightAt } from './land'
import { KIPPER_TV, TIGER_TV } from './models/dog'
import { Play, ease } from './play'
import { BED, World, restingAt, useWorld } from './World'

// The 3D game: she runs Kipper round the meadow herself (WASD, arrows, a thumb joystick, or by
// tapping the grass), finds whoever is hiding, and the shared game script does the rest.

/** How far up a friend pops while peeking over each kind of hiding place. */
const PEEK = { bush: 0.55, log: 0.15, burrow: 0.1 }

class MeadowStage implements Stage {
  private play: Play
  private root: Root
  private el: HTMLElement
  private pad: HTMLElement
  private hint: HTMLElement
  private zzz: HTMLElement
  private unbind: () => void

  constructor(play: Play, root: Root, el: HTMLElement, overlay: { pad: HTMLElement; hint: HTMLElement; zzz: HTMLElement }, unbind: () => void) {
    this.play = play
    this.root = root
    this.el = el
    this.pad = overlay.pad
    this.hint = overlay.hint
    this.zzz = overlay.zzz
    this.unbind = unbind
  }

  private controls(on: boolean) {
    this.play.mode = on ? 'explore' : 'busy'
    this.pad.classList.toggle('on', on)
    if (on && !this.hint.dataset.shown) {
      this.hint.dataset.shown = '1'
      this.hint.classList.add('on')
      setTimeout(() => this.hint.classList.remove('on'), 9000)
    }
    if (!on) {
      const inp = this.play.input
      inp.keys.clear()
      inp.move.set(0, 0)
      inp.tapTarget = null
      this.play.autoTarget = null
    }
  }

  reset() {
    const p = this.play
    p.tweens.finish()
    this.controls(false)
    p.mode = 'title'
    p.place(p.kipper, HOME.stand, Math.PI / 2)
    p.place(p.tiger, HOME.wait, Math.PI / 2)
    p.tigerFollows = true
    this.mood('')
    for (const s of p.spots) {
      s.rustle = false
      s.friendVisible = false
      s.toyVisible = true
      s.talking = false
      s.squash = 0
    }
    p.goal = null
    p.star = null
    p.cam.frame = null
    p.cam.yaw = 0
    p.nightTarget = 0
    p.night = 0
    this.zzz.hidden = true
    useWorld.setState({ cast: p.spots.map(() => null), placed: [], drape: false })
  }

  mood(m: Mood) {
    const face = m === 'sad' ? 'sad' : 'happy'
    this.play.kipper.face = face
    this.play.tiger.face = face
  }

  private hop(b: (typeof this.play)['kipper'], h = 0.6) {
    return this.play.tweens.run(460, (k) => (b.lift = Math.sin(k * Math.PI) * h), ease.linear)
  }

  cheer() {
    void this.hop(this.play.kipper)
    setTimeout(() => void this.hop(this.play.tiger), 150)
  }

  celebrate(r: Round) {
    const p = this.play
    const bounce = (b: (typeof p)['kipper'], delay: number) =>
      setTimeout(() => void p.tweens.run(950, (k) => (b.lift = Math.abs(Math.sin(k * Math.PI * 2)) * 0.75), ease.linear), delay)
    bounce(p.kipper, 0)
    bounce(p.tiger, 160)
    // Kipper spins round once for joy.
    const h = p.kipper.heading
    void p.tweens.run(800, (k) => (p.kipper.heading = h + k * Math.PI * 2))
    const s = p.spots[r.index]
    void p.tweens.run(950, (k) => (s.squash = Math.sin(k * Math.PI * 4) * (1 - k)), ease.linear)
    p.spawn(p.kipper.pos.clone().setY(p.kipper.pos.y + 1), 'sparkle', 18)
    p.spawn(s.friendPos.clone().setY(s.friendPos.y + 0.8), 'sparkle', 12)
  }

  /** Let her run about until Kipper reaches `at`; if nobody steers for a while he goes by himself. */
  private reach(run: Run, at: THREE.Vector3, radius: number, prompt: string) {
    const p = this.play
    p.star = at
    this.controls(true)
    p.input.lastInput = performance.now() / 1000
    p.onNudge = () => void speech.say('narrator', [LINES.narrator.thisWay])
    void speech.say('narrator', [prompt])
    if (AUTOPLAY) p.autoTarget = at.clone()
    return run
      .guard(new Promise<void>((resolve) => (p.goal = { at, radius, arrive: resolve })))
      .finally(() => {
        p.goal = null
        p.star = null
        this.controls(false)
      })
  }

  async find(run: Run, r: Round) {
    const p = this.play
    const s = p.spots[r.index]
    useWorld.setState((st) => ({ cast: st.cast.map((c, i) => (i === r.index ? { friend: r.friend.id, toy: r.toy, kind: r.friend.spot } : c)) }))
    s.friendVisible = false
    s.toyVisible = true
    s.rustle = true
    const rustle = setInterval(() => sfx.rustle(), 1600)
    try {
      await this.reach(run, s.at, 2.6, pick(LINES.narrator.find[r.friend.spot]))
    } finally {
      clearInterval(rustle)
      s.rustle = false
    }
    speech.stop()
    const k = p.kipper
    k.vel.set(0, 0, 0)
    k.heading = Math.atan2(s.at.x - k.pos.x, s.at.z - k.pos.z)
    // Kipper settles a clear step away, so he and the friend never cover each other.
    const toward = new THREE.Vector3(k.pos.x - s.at.x, 0, k.pos.z - s.at.z).normalize()
    const stand = s.at.clone().addScaledVector(toward, 3.4)
    const was = k.pos.clone()
    void p.tweens.run(350, (t) => k.pos.lerpVectors(was, stand, t))

    // Peek up out of the hiding place, then hop out towards Kipper.
    const inside = s.at.clone().addScaledVector(toward, -0.2)
    const from = inside.clone().setY(inside.y - 1.4)
    const peek = inside.clone().setY(inside.y + PEEK[r.friend.spot])
    const out = s.at.clone().addScaledVector(toward, 1.55)
    out.y = heightAt(out.x, out.z)
    s.friendHeading = Math.atan2(k.pos.x - out.x, k.pos.z - out.z)
    s.friendPos.copy(from)
    s.friendVisible = true
    p.cam.frame = [k.pos, s.friendPos]
    sfx.pop()
    await run.guard(p.tweens.run(480, (t) => s.friendPos.lerpVectors(from, peek, t), (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2))
    await run.wait(600)
    sfx.hop()
    const high = r.friend.move === 'fly' ? 1.5 : r.friend.move === 'scurry' ? 0.5 : 1.0
    await run.guard(
      p.tweens.run(r.friend.move === 'fly' ? 950 : 650, (t) => {
        s.friendPos.lerpVectors(peek, out, t)
        s.friendPos.y += Math.sin(t * Math.PI) * high
      }),
    )
    void p.tweens.run(320, (t) => (s.squash = Math.sin(t * Math.PI) * (1 - t)), ease.linear)
    p.tiger.heading = Math.atan2(out.x - p.tiger.pos.x, out.z - p.tiger.pos.z)
  }

  talking(r: Round, on: boolean) {
    this.play.spots[r.index].talking = on
  }

  takeToy(r: Round) {
    const p = this.play
    const s = p.spots[r.index]
    const toy = p.toys[r.index]
    const box = toy ? p.screenRect(toy) : new DOMRect(innerWidth / 2, innerHeight / 2, 60, 60)
    s.toyVisible = false
    p.spawn(s.friendPos.clone().setY(s.friendPos.y + 0.3), 'sparkle', 12)
    return box
  }

  async farewell(run: Run, r: Round) {
    const p = this.play
    const s = p.spots[r.index]
    const start = s.friendPos.clone()
    const inside = s.at.clone().setY(s.at.y + 0.3)
    sfx.hop()
    await run.guard(
      p.tweens.run(650, (t) => {
        s.friendPos.lerpVectors(start, inside, t)
        s.friendPos.y += Math.sin(t * Math.PI) * 0.9
      }),
    )
    await run.guard(p.tweens.run(350, (t) => s.friendPos.setY(inside.y - t * 1.8), ease.linear))
    s.friendVisible = false
    p.cam.frame = null
  }

  async goHome(run: Run) {
    await run.wait(800)
    await this.reach(run, HOME.at, 2.6, LINES.narrator.runHome)
  }

  /** Kipper hops into his basket and curls up; Tiger flops down beside it. */
  async tuckIn(run: Run) {
    const p = this.play
    const k = p.kipper
    const from = k.pos.clone()
    const into = HOME.at.clone()
    k.heading = Math.PI / 2
    sfx.hop()
    p.cam.frame = [HOME.at, BED]
    await run.guard(
      p.tweens.run(850, (t) => {
        k.pos.lerpVectors(from, into, t)
        k.lift = Math.sin(t * Math.PI) * 1.2 + t * 0.12
      }),
    )
    k.asleep = true
    sfx.pop()
    p.tigerFollows = false
    const t = p.tiger
    const tFrom = t.pos.clone()
    await run.guard(
      p.tweens.run(900, (u) => {
        t.pos.lerpVectors(tFrom, BED, u)
        t.speed = 3
        t.heading = Math.atan2(BED.x - tFrom.x, BED.z - tFrom.z)
      }),
    )
    t.speed = 0
    t.heading = Math.PI / 2
    t.asleep = true
  }

  restingPlace(id: ToyId) {
    const p = this.play
    const o = new THREE.Object3D()
    o.position.copy(restingAt(id))
    const box = new THREE.Mesh(new THREE.BoxGeometry(id === 'blanket' ? 0.9 : 0.4, 0.4, 0.4))
    o.add(box)
    const r = p.screenRect(o)
    box.geometry.dispose()
    return r
  }

  placeToy(id: ToyId) {
    if (id === 'blanket') useWorld.setState({ drape: true })
    else useWorld.setState((s) => ({ placed: [...s.placed, id] }))
    this.play.spawn(restingAt(id), 'sparkle', 6)
  }

  night(on: boolean) {
    this.play.nightTarget = on ? 1 : 0
  }

  snore() {
    this.zzz.hidden = false
  }

  dispose() {
    this.unbind()
    this.play.tweens.finish()
    this.root.unmount()
    this.el.remove()
  }
}

export async function createMeadow(host: StageHost): Promise<Stage> {
  const play = new Play()
  play.sounds = { splash: () => sfx.plop(), hop: () => sfx.hop() }
  const el = document.createElement('div')
  el.className = 'meadow-stage'
  el.innerHTML = `
    <div class="meadow-canvas"></div>
    <div class="pad">
      <div class="joy"><i></i></div>
      <button class="pad-jump" aria-label="Jump"><svg viewBox="0 0 40 40"><path d="M20 30V11M12 18l8-8 8 8" /></svg></button>
      <button class="pad-bark" aria-label="Woof"><svg viewBox="0 0 40 40"><ellipse cx="20" cy="25" rx="7" ry="6"/><circle cx="11" cy="16" r="3.2"/><circle cx="17" cy="12" r="3.2"/><circle cx="23" cy="12" r="3.2"/><circle cx="29" cy="16" r="3.2"/></svg></button>
    </div>
    <div class="compass" hidden><svg viewBox="0 0 40 40"><path d="M8 20h22M22 12l9 8-9 8" /></svg></div>
    <div class="keys-hint">WASD or arrows to run · Space to jump · B to bark · drag to look round</div>
    <div class="zzz3d" hidden><span>z</span><span>z</span><span>z</span></div>`
  host.root.append(el)
  const $ = (s: string) => el.querySelector<HTMLElement>(s)!
  const canvasBox = $('.meadow-canvas')
  const bark = () => {
    sfx.bark()
    play.barkAt = { t: performance.now() / 1000, p: play.kipper.pos.clone() }
    void play.tweens.run(300, (k) => (play.kipper.lift = Math.sin(k * Math.PI) * 0.18), ease.linear)
  }
  const unbind = bindInput(play, canvasBox, { joy: $('.joy'), knob: $('.joy i'), jump: $('.pad-jump'), bark: $('.pad-bark') }, bark)

  const root = createRoot(canvasBox)
  root.render(
    <Canvas
      flat
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 42, near: 0.1, far: 400, position: [0, 3, 8] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x000000, 0)
        scene.fog = new THREE.Fog(fog.color.clone(), fog.near, fog.far)
      }}
    >
      <World
        play={play}
        kipperLook={KIPPER_TV}
        tigerLook={TIGER_TV}
        onDogTap={(who) => {
          if (who === 'kipper' && play.mode === 'explore') bark()
          else host.onDogTap(who)
        }}
        onFriendTap={host.onFriendTap}
        compass={$('.compass')}
        zzz={$('.zzz3d')}
      />
    </Canvas>,
  )
  for (let i = 0; i < 200 && !(play.camera && play.canvas); i++) await new Promise((r) => setTimeout(r, 25))
  const stage = new MeadowStage(play, root, el, { pad: $('.pad'), hint: $('.keys-hint'), zzz: $('.zzz3d') }, unbind)
  stage.reset()
  return stage
}
