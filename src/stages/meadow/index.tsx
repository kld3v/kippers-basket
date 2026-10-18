import { Canvas } from '@react-three/fiber'
import { createRoot, type Root } from 'react-dom/client'
import * as THREE from 'three'
import { sfx } from '../../audio/sfx'
import { speech } from '../../audio/speech'
import { LINES, pick, type ToyId } from '../../content'
import { AUTOPLAY } from '../../question'
import type { Run } from '../../run'
import type { Mood, Round, Stage, StageHost } from '../types'
import { Ctl, ease, useMeadow } from './ctl'
import { HOME, MEADOW, SPOTS, fog, heightAt } from './land'
import { Meadow, TOY_SIZE, restingAt } from './Meadow'
import { disposeArt, loadArt, type MeadowArt } from './textures'

// The 3D meadow. Kipper only moves when she taps: on a rustling bush to go and look,
// or anywhere on the grass to wander off and explore.

/** How high a friend's feet are while peeking over each kind of hiding place. */
const PEEK = { bush: 0.75, log: 0.05, burrow: 0.12 }
const flat = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z)

/** Keep wandering inside the meadow (the hills beyond are just for looking at). */
function inMeadow(p: THREE.Vector3) {
  const dx = (p.x - MEADOW.cx) / (MEADOW.rx * 0.92)
  const dz = (p.z - MEADOW.cz) / (MEADOW.rz * 0.92)
  const e = Math.hypot(dx, dz)
  if (e > 1) p.set(MEADOW.cx + (dx / e) * MEADOW.rx * 0.92, 0, MEADOW.cz + (dz / e) * MEADOW.rz * 0.92)
  return p.setY(heightAt(p.x, p.z))
}

class MeadowStage implements Stage {
  private ctl: Ctl
  private art: MeadowArt
  private root: Root
  private el: HTMLElement

  constructor(ctl: Ctl, art: MeadowArt, root: Root, el: HTMLElement) {
    this.ctl = ctl
    this.art = art
    this.root = root
    this.el = el
  }

  reset() {
    const c = this.ctl
    c.tweens.finish()
    c.mode = 'title'
    c.place('kipper', HOME.stand)
    c.place('tiger', HOME.wait)
    c.dogs.tiger.follow = true
    this.mood('')
    for (const s of c.spots) {
      s.rustle = false
      s.onTap = null
      s.friend.visible = false
      s.friend.toyVisible = true
      s.friend.talking = false
      s.friend.squash = 0
    }
    c.sparkle = null
    c.homeTap = null
    c.groundTap = null
    c.focus = [HOME.at, HOME.stand, HOME.wait]
    c.nightTarget = 0
    c.night = 0
    useMeadow.setState({ cast: SPOTS.map(() => null), placed: [], asleep: false, tigerAsleep: false, drape: false, snoring: false })
  }

  mood(m: Mood) {
    const face = m === 'sad' ? 'sad' : 'happy'
    this.ctl.dogs.kipper.face = face
    this.ctl.dogs.tiger.face = face
  }

  private jump(who: 'kipper' | 'tiger', h = 0.45) {
    const d = this.ctl.dogs[who]
    return this.ctl.tweens.run(440, (k) => (d.hop = Math.sin(k * Math.PI) * h), ease.linear)
  }

  cheer() {
    void this.jump('kipper')
    setTimeout(() => void this.jump('tiger'), 140)
  }

  /**
   * The next place rustles and sparkles. Tapping it sends Kipper over; tapping the grass sends
   * him wandering (Tiger follows). If nothing happens for a while, he goes and looks by himself.
   */
  private search(run: Run, target: THREE.Vector3, stand: THREE.Vector3, prompts: string[], setTap: (fn: (() => void) | null) => void) {
    const c = this.ctl
    const k = c.dogs.kipper
    c.mode = 'explore'
    c.sparkle = target
    c.focus = [k.pos, target]
    return run.guard(
      new Promise<void>((resolve) => {
        let done = false
        let idle = 0
        let nudges = 0
        const finish = () => {
          if (done) return
          done = true
          clearTimeout(idle)
          setTap(null)
          c.groundTap = null
          resolve()
        }
        const arrived = () => flat(k.pos, stand) < 0.3 && finish()
        const goThere = () => void c.walkTo('kipper', stand).then(arrived)
        const wait = () => {
          clearTimeout(idle)
          idle = window.setTimeout(
            () => {
              if (done) return
              nudges++
              if (nudges < 2) {
                void speech.say('narrator', [prompts[nudges % prompts.length]])
                wait()
              } else {
                void speech.say('narrator', [pick(LINES.narrator.nudge)])
                goThere()
              }
            },
            AUTOPLAY ? 600 : 7000,
          )
        }
        setTap(() => {
          sfx.pop()
          goThere()
        })
        c.groundTap = (p) => {
          wait()
          // A tap close to the hiding place counts as tapping it.
          if (flat(p, target) < 1.7) return goThere()
          sfx.hop()
          void c.walkTo('kipper', inMeadow(p), 3.2).then(() => flat(k.pos, stand) < 1.2 && goThere())
        }
        run.onCancel(() => clearTimeout(idle))
        void speech.say('narrator', [prompts[0]])
        if (AUTOPLAY) goThere()
        else wait()
      }),
    )
  }

  async find(run: Run, r: Round) {
    const c = this.ctl
    const s = c.spots[r.index]
    useMeadow.setState((st) => ({ cast: st.cast.map((x, i) => (i === r.index ? { friend: r.friend.id, toy: r.toy, kind: r.friend.spot } : x)) }))
    s.friend.visible = false
    s.friend.toyVisible = true
    s.rustle = true
    const rustle = setInterval(() => sfx.rustle(), 1600)
    try {
      await this.search(run, s.place.at, s.place.stand, LINES.narrator.peek[r.friend.spot], (fn) => (s.onTap = fn))
    } finally {
      clearInterval(rustle)
      s.rustle = false
    }
    speech.stop()
    c.mode = 'busy'
    c.sparkle = null
    c.dogs.kipper.facing = s.place.at.x > c.dogs.kipper.pos.x ? 1 : -1
    void c.walkTo('tiger', s.place.wait, 3).then(() => (c.dogs.tiger.facing = c.dogs.kipper.facing))
    c.focus = [c.dogs.kipper.pos, s.place.out]

    // Peek up from behind the hiding place, then hop out in front of it.
    const behind = s.place.at.clone().add(new THREE.Vector3(0, 0, -0.12))
    const from = behind.clone().setY(behind.y - 1.6)
    const peek = behind.clone().setY(behind.y + PEEK[r.friend.spot])
    s.friend.pos.copy(from)
    s.friend.visible = true
    sfx.pop()
    await run.guard(c.tweens.run(480, (k) => s.friend.pos.lerpVectors(from, peek, k), (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2))
    await run.wait(650)
    sfx.hop()
    const high = r.friend.move === 'fly' ? 1.6 : r.friend.move === 'scurry' ? 0.55 : 1.1
    await run.guard(
      c.tweens.run(r.friend.move === 'fly' ? 1000 : 700, (k) => {
        s.friend.pos.lerpVectors(peek, s.place.out, k)
        s.friend.pos.y += Math.sin(k * Math.PI) * high
      }),
    )
    void c.tweens.run(320, (k) => (s.friend.squash = Math.sin(k * Math.PI) * (1 - k)), ease.linear)
  }

  talking(r: Round, on: boolean) {
    this.ctl.spots[r.index].friend.talking = on
  }

  takeToy(r: Round) {
    const s = this.ctl.spots[r.index]
    const box = s.toyMesh ? this.ctl.screenRect(s.toyMesh) : this.ctl.screenBox(s.place.out, TOY_SIZE)
    s.friend.toyVisible = false
    return box
  }

  async farewell(run: Run, r: Round) {
    const c = this.ctl
    const s = c.spots[r.index]
    const start = s.friend.pos.clone()
    const behind = s.place.at.clone().add(new THREE.Vector3(0, 0.3, -0.15))
    sfx.hop()
    await run.guard(
      c.tweens.run(700, (k) => {
        s.friend.pos.lerpVectors(start, behind, k)
        s.friend.pos.y += Math.sin(k * Math.PI) * 1
      }),
    )
    await run.guard(c.tweens.run(380, (k) => s.friend.pos.setY(behind.y - k * 1.9), ease.linear))
    s.friend.visible = false
    c.focus = [c.dogs.kipper.pos]
  }

  async goHome(run: Run) {
    await run.wait(1500)
    await this.search(run, HOME.at, HOME.stand, [LINES.narrator.tapBasket], (fn) => (this.ctl.homeTap = fn))
    this.ctl.mode = 'busy'
    this.ctl.sparkle = null
  }

  /** Kipper hops into his basket; Tiger trots over and flops down beside it. */
  async tuckIn(run: Run) {
    const c = this.ctl
    const k = c.dogs.kipper
    const from = k.pos.clone()
    const into = HOME.at.clone().add(new THREE.Vector3(0, 0, 0.05))
    k.facing = into.x >= from.x ? 1 : -1
    sfx.hop()
    await run.guard(
      c.tweens.run(850, (t) => {
        k.pos.lerpVectors(from, into, t)
        k.hop = Math.sin(t * Math.PI) * 1.1 + t * 0.25
      }),
    )
    k.hidden = true
    k.hop = 0
    useMeadow.setState({ asleep: true })
    sfx.pop()
    const bed = new THREE.Vector3(HOME.at.x - 2.35, 0, HOME.at.z + 0.35)
    c.dogs.tiger.follow = false
    await run.guard(c.walkTo('tiger', bed, 2.8))
    c.dogs.tiger.hidden = true
    useMeadow.setState({ tigerAsleep: true })
    c.focus = [HOME.at, bed, restingAt('bowl'), restingAt('ball')]
  }

  restingPlace(id: ToyId) {
    return id === 'blanket' ? this.ctl.screenBox(restingAt('blanket'), 0.9) : this.ctl.screenBox(restingAt(id), TOY_SIZE)
  }

  placeToy(id: ToyId) {
    if (id === 'blanket') useMeadow.setState({ drape: true })
    else useMeadow.setState((s) => ({ placed: [...s.placed, id] }))
  }

  night(on: boolean) {
    this.ctl.nightTarget = on ? 1 : 0
  }

  snore() {
    useMeadow.setState({ snoring: true })
  }

  dispose() {
    this.ctl.tweens.finish()
    this.root.unmount()
    disposeArt(this.art)
    this.el.remove()
  }
}

export async function createMeadow(host: StageHost): Promise<Stage> {
  const art = await loadArt()
  const ctl = new Ctl()
  const el = document.createElement('div')
  el.className = 'meadow-stage'
  host.root.append(el)
  const root = createRoot(el)
  root.render(
    <Canvas
      flat
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 34, near: 0.5, far: 400, position: [0, 6, 12] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x000000, 0)
        scene.fog = new THREE.Fog(fog.color.clone(), fog.near, fog.far)
      }}
    >
      <Meadow art={art} ctl={ctl} host={host} />
    </Canvas>,
  )
  // Wait until the scene is up, so the first thing the game asks of it works.
  for (let i = 0; i < 200 && !(ctl.camera && ctl.canvas); i++) await new Promise((r) => setTimeout(r, 25))
  const stage = new MeadowStage(ctl, art, root, el)
  stage.reset()
  return stage
}
