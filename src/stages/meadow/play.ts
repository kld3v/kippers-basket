import * as THREE from 'three'
import type { FriendId, SpotKind, ToyId } from '../../content'
import { SPEED } from '../../run'
import { HOME, MEADOW, POND, SPOTS, bushSpots, heightAt, treeSpots } from './land'

// The 3D game's moving parts, independent of React: Kipper under her control, Tiger at his heel,
// the camera, the hiding places and the little puffs of dust and water. The scene reads this every
// frame; the game script calls into it and awaits the promises.

export const ease = {
  inOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  out: (t: number) => 1 - (1 - t) ** 3,
  linear: (t: number) => t,
}

interface Tween {
  t0: number
  ms: number
  fn: (k: number) => void
  ease: (t: number) => number
  done: () => void
}

export class Tweens {
  private list = new Set<Tween>()
  now = 0

  run(ms: number, fn: (k: number) => void, e = ease.inOut) {
    return new Promise<void>((done) => this.list.add({ t0: this.now, ms: Math.max(1, ms * Math.max(SPEED, 0.4)), fn, ease: e, done }))
  }

  tick(now: number) {
    this.now = now
    for (const tw of this.list) {
      const k = Math.min(1, (now - tw.t0) / tw.ms)
      tw.fn(tw.ease(k))
      if (k >= 1) {
        this.list.delete(tw)
        tw.done()
      }
    }
  }

  finish() {
    for (const tw of this.list) {
      tw.fn(1)
      tw.done()
    }
    this.list.clear()
  }
}

export interface Body {
  pos: THREE.Vector3
  vel: THREE.Vector3
  /** Facing: 0 looks along +z. */
  heading: number
  vy: number
  /** Height above the ground (jumps, hops into the basket). */
  lift: number
  speed: number
  face: 'happy' | 'sad'
  asleep: boolean
  hidden: boolean
  wet: boolean
}

const body = (at: THREE.Vector3, heading = Math.PI / 2): Body => ({
  pos: at.clone(),
  vel: new THREE.Vector3(),
  heading,
  vy: 0,
  lift: 0,
  speed: 0,
  face: 'happy',
  asleep: false,
  hidden: false,
  wet: false,
})

export interface SpotState {
  at: THREE.Vector3
  kind: SpotKind
  friend: FriendId | null
  toy: ToyId | null
  friendPos: THREE.Vector3
  friendHeading: number
  friendVisible: boolean
  toyVisible: boolean
  talking: boolean
  squash: number
  rustle: boolean
}

export interface Particle {
  pos: THREE.Vector3
  vel: THREE.Vector3
  life: number
  max: number
  size: number
  color: THREE.Color
}

export type Mode = 'title' | 'explore' | 'busy'

const RUN = 5.2
const DOG_R = 0.38
const lerpAngle = (a: number, b: number, t: number) => a + (((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * t
const inPond = (p: THREE.Vector3) => Math.hypot((p.x - POND.x) / POND.rx, (p.z - POND.z) / POND.rz) < 0.92

export class Play {
  readonly tweens = new Tweens()
  mode: Mode = 'title'
  readonly kipper = body(HOME.stand)
  readonly tiger = body(HOME.wait)
  tigerFollows = true
  /** Kipper's own scripted walk (into the basket, to a hiding place when nobody's steering). */
  autoTarget: THREE.Vector3 | null = null
  readonly input = {
    move: new THREE.Vector2(),
    keys: new Set<string>(),
    jump: false,
    orbit: new THREE.Vector2(),
    zoom: 0,
    tapTarget: null as THREE.Vector3 | null,
    lastInput: 0,
  }
  readonly spots: SpotState[] = SPOTS.map((p) => ({
    at: p.at,
    kind: 'bush',
    friend: null,
    toy: null,
    friendPos: p.at.clone(),
    friendHeading: 0,
    friendVisible: false,
    toyVisible: true,
    talking: false,
    squash: 0,
    rustle: false,
  }))
  /** Where she's heading: arriving within `radius` calls `arrive` once. */
  goal: { at: THREE.Vector3; radius: number; arrive: () => void } | null = null
  /** The golden star floats over this. */
  star: THREE.Vector3 | null = null
  readonly cam = {
    yaw: 0,
    pitch: 0.34,
    dist: 6.2,
    look: HOME.at.clone(),
    lift: 0.95,
    manualUntil: 0,
    /** When set, the camera frames these two from the side (Kipper meeting a friend). */
    frame: null as [THREE.Vector3, THREE.Vector3] | null,
  }
  readonly particles: Particle[] = []
  /** Each friend's toy, so it can be found on screen when it flies to the basket bar. */
  readonly toys: (THREE.Object3D | null)[] = SPOTS.map(() => null)
  /** When and where Kipper last barked (butterflies scatter). */
  barkAt = { t: -10, p: new THREE.Vector3() }
  night = 0
  nightTarget = 0
  camera: THREE.PerspectiveCamera | null = null
  canvas: HTMLCanvasElement | null = null
  sounds = { splash: () => {}, hop: () => {} }
  private colliders: { x: number; z: number; r: number }[] = []
  private dustAt = 0
  private nudged = false
  onNudge: () => void = () => {}

  constructor() {
    for (const t of treeSpots()) this.colliders.push({ x: t.at.x, z: t.at.z, r: 0.35 * t.size })
    for (const b of bushSpots()) this.colliders.push({ x: b.x, z: b.z, r: 0.75 })
    for (const s of SPOTS) this.colliders.push({ x: s.at.x, z: s.at.z, r: 0.95 })
    this.colliders.push({ x: HOME.at.x, z: HOME.at.z, r: 1.05 })
  }

  /** Put a dog somewhere, standing still. */
  place(b: Body, at: THREE.Vector3, heading = Math.PI / 2) {
    b.pos.copy(at)
    b.vel.set(0, 0, 0)
    b.heading = heading
    b.vy = 0
    b.lift = 0
    b.speed = 0
    b.asleep = false
    b.hidden = false
  }

  /** Walk Kipper somewhere by himself; resolves when he gets there. */
  walkTo(at: THREE.Vector3) {
    this.autoTarget = at.clone()
    return new Promise<void>((resolve) => {
      const check = () => {
        if (!this.autoTarget || this.flat(this.kipper.pos, at) < 0.25) {
          this.autoTarget = null
          resolve()
        } else requestAnimationFrame(check)
      }
      check()
    })
  }

  flat(a: THREE.Vector3, b: THREE.Vector3) {
    return Math.hypot(a.x - b.x, a.z - b.z)
  }

  spawn(at: THREE.Vector3, kind: 'dust' | 'splash' | 'sparkle', n = 1) {
    for (let i = 0; i < n; i++) {
      if (this.particles.length > 70) this.particles.shift()
      const up = kind === 'dust' ? 0.5 : kind === 'splash' ? 2.6 : 2
      this.particles.push({
        pos: at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, kind === 'sparkle' ? 0.6 : 0.05, (Math.random() - 0.5) * 0.3)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.4, up * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * 1.4),
        life: 0,
        max: kind === 'dust' ? 0.5 : 0.9,
        size: kind === 'dust' ? 0.09 : kind === 'splash' ? 0.07 : 0.06,
        color: new THREE.Color(kind === 'dust' ? '#efe6d2' : kind === 'splash' ? '#d9eefa' : '#f4cf62'),
      })
    }
  }

  step(dtRaw: number, now: number) {
    const dt = Math.min(dtRaw, 1 / 20)
    this.tweens.tick(now * 1000)
    this.moveKipper(dt, now)
    this.moveTiger(dt)
    this.moveCamera(dt, now)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += dt
      p.vel.y -= 6 * dt
      p.pos.addScaledVector(p.vel, dt)
      if (p.life > p.max) this.particles.splice(i, 1)
    }
    this.night += (this.nightTarget - this.night) * Math.min(1, dt * 0.7)
  }

  private moveKipper(dt: number, now: number) {
    const k = this.kipper
    const inp = this.input
    const wish = new THREE.Vector3()
    const free = this.mode === 'explore'
    if (free) {
      const kx = (inp.keys.has('right') ? 1 : 0) - (inp.keys.has('left') ? 1 : 0)
      const ky = (inp.keys.has('up') ? 1 : 0) - (inp.keys.has('down') ? 1 : 0)
      const mx = inp.move.x + kx
      const my = inp.move.y + ky
      if (mx || my) {
        // Steer relative to the camera: forward is away from it.
        const [s, c] = [Math.sin(this.cam.yaw), Math.cos(this.cam.yaw)]
        wish.set(c * mx - s * my, 0, -s * mx - c * my)
        inp.tapTarget = null
        this.autoTarget = null
        inp.lastInput = now
        this.nudged = false
      }
      // Nobody steering for a while: Kipper goes to look by himself, so the game never stalls.
      if (!wish.lengthSq() && !inp.tapTarget && !this.autoTarget && this.goal && now - inp.lastInput > 25 && !this.nudged) {
        this.nudged = true
        this.onNudge()
        this.autoTarget = this.goal.at.clone()
      }
    }
    const target = inp.tapTarget ?? this.autoTarget
    if (!wish.lengthSq() && target) {
      wish.set(target.x - k.pos.x, 0, target.z - k.pos.z)
      if (wish.length() < 0.2) {
        wish.set(0, 0, 0)
        inp.tapTarget = null
      }
    }
    if (wish.length() > 1) wish.normalize()
    const speed = RUN * (k.wet ? 0.55 : 1)
    const blend = 1 - Math.exp(-dt * 9)
    k.vel.x += (wish.x * speed - k.vel.x) * blend
    k.vel.z += (wish.z * speed - k.vel.z) * blend
    if (k.asleep || k.hidden) k.vel.set(0, 0, 0)
    k.pos.addScaledVector(k.vel, dt)
    k.speed = Math.hypot(k.vel.x, k.vel.z)
    if (k.speed > 0.3) k.heading = lerpAngle(k.heading, Math.atan2(k.vel.x, k.vel.z), 1 - Math.exp(-dt * 12))
    this.collide(k)

    // Jumping, and landing back on the grass (or in the pond).
    if (free && inp.jump && k.lift <= 0.001) {
      k.vy = 6.4
      this.sounds.hop()
    }
    inp.jump = false
    if (k.lift > 0 || k.vy > 0) {
      k.vy -= 18 * dt
      k.lift = Math.max(0, k.lift + k.vy * dt)
      if (k.lift === 0) k.vy = 0
    }
    k.pos.y = heightAt(k.pos.x, k.pos.z)
    const wasWet = k.wet
    k.wet = inPond(k.pos) && k.pos.y < POND.level + 0.05
    if (k.wet && !wasWet) {
      this.sounds.splash()
      this.spawn(new THREE.Vector3(k.pos.x, POND.level, k.pos.z), 'splash', 10)
    }
    if (k.speed > 1.5 && now > this.dustAt && k.lift === 0) {
      this.dustAt = now + (k.wet ? 0.12 : 0.16)
      if (k.wet) this.spawn(new THREE.Vector3(k.pos.x, POND.level, k.pos.z), 'splash', 2)
      else this.spawn(k.pos.clone().addScaledVector(new THREE.Vector3(Math.sin(k.heading), 0, Math.cos(k.heading)), -0.5), 'dust', 1)
    }

    if (free && this.goal && this.flat(k.pos, this.goal.at) < this.goal.radius) {
      const g = this.goal
      this.goal = null
      g.arrive()
    }
  }

  /** Tiger trots along just behind and to one side of Kipper. */
  private moveTiger(dt: number) {
    const t = this.tiger
    if (t.asleep || t.hidden) return
    const k = this.kipper
    const back = new THREE.Vector3(Math.sin(k.heading), 0, Math.cos(k.heading)).multiplyScalar(-1.5)
    const side = new THREE.Vector3(Math.cos(k.heading), 0, -Math.sin(k.heading)).multiplyScalar(0.7)
    const want = k.pos.clone().add(back).add(side)
    const to = new THREE.Vector3(want.x - t.pos.x, 0, want.z - t.pos.z)
    const d = to.length()
    const speed = this.tigerFollows && d > 0.45 ? Math.min(RUN * 1.15, d * 2.4) : 0
    const v = d > 0.001 ? to.multiplyScalar(speed / d) : to
    const blend = 1 - Math.exp(-dt * 7)
    t.vel.x += (v.x - t.vel.x) * blend
    t.vel.z += (v.z - t.vel.z) * blend
    t.pos.addScaledVector(t.vel, dt)
    t.speed = Math.hypot(t.vel.x, t.vel.z)
    if (t.speed > 0.3) t.heading = lerpAngle(t.heading, Math.atan2(t.vel.x, t.vel.z), 1 - Math.exp(-dt * 10))
    else t.heading = lerpAngle(t.heading, k.heading, 1 - Math.exp(-dt * 2))
    this.collide(t)
    t.pos.y = heightAt(t.pos.x, t.pos.z)
    t.wet = inPond(t.pos) && t.pos.y < POND.level + 0.05
  }

  private collide(b: Body) {
    for (const c of this.colliders) {
      const dx = b.pos.x - c.x
      const dz = b.pos.z - c.z
      const d = Math.hypot(dx, dz)
      const min = c.r + DOG_R
      if (d < min && d > 0.0001) {
        b.pos.x = c.x + (dx / d) * min
        b.pos.z = c.z + (dz / d) * min
      }
    }
    // The meadow ends where the hills begin.
    const ex = (b.pos.x - MEADOW.cx) / (MEADOW.rx * 1.02)
    const ez = (b.pos.z - MEADOW.cz) / (MEADOW.rz * 1.02)
    const e = Math.hypot(ex, ez)
    if (e > 1) {
      b.pos.x = MEADOW.cx + (ex / e) * MEADOW.rx * 1.02
      b.pos.z = MEADOW.cz + (ez / e) * MEADOW.rz * 1.02
    }
  }

  private moveCamera(dt: number, now: number) {
    const cam = this.camera
    if (!cam) return
    const c = this.cam
    const k = this.kipper
    const inp = this.input
    if (inp.orbit.lengthSq()) {
      c.yaw -= inp.orbit.x * 0.006
      c.pitch = Math.min(1.1, Math.max(0.08, c.pitch + inp.orbit.y * 0.004))
      c.manualUntil = now + 2.5
      inp.orbit.set(0, 0)
    }
    if (inp.zoom) {
      c.dist = Math.min(11, Math.max(3.5, c.dist + inp.zoom * 0.004))
      inp.zoom = 0
    }
    let look: THREE.Vector3
    let yaw = c.yaw
    let dist = c.dist
    let pitch = c.pitch
    if (c.frame) {
      // A meeting: look across the pair from the side nearest where the camera already is.
      const [a, b] = c.frame
      look = a.clone().add(b).multiplyScalar(0.5)
      const side = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2
      const other = side + Math.PI
      yaw = Math.abs(lerpAngle(c.yaw, side, 1) - c.yaw) < Math.abs(lerpAngle(c.yaw, other, 1) - c.yaw) ? side : other
      dist = Math.max(5.6, a.distanceTo(b) * 2.5)
      pitch = 0.24
      c.yaw = lerpAngle(c.yaw, yaw, 1 - Math.exp(-dt * 2.5))
    } else if (this.mode === 'title') {
      look = HOME.at.clone().lerp(k.pos, 0.5)
      yaw = Math.sin(now * 0.15) * 0.25
      dist = 6.4
      pitch = 0.3
      c.yaw = lerpAngle(c.yaw, yaw, 1 - Math.exp(-dt * 2))
    } else {
      look = k.pos.clone()
      // Swing round behind him while he runs, unless she's just moved the camera herself.
      if (k.speed > 1 && now > c.manualUntil) c.yaw = lerpAngle(c.yaw, k.heading + Math.PI, 1 - Math.exp(-dt * 1.4))
    }
    const aspect = cam.aspect
    dist *= Math.max(1, 1.1 / aspect)
    c.look.lerp(look, 1 - Math.exp(-dt * 6))
    const cy = Math.cos(pitch)
    const pos = new THREE.Vector3(Math.sin(c.yaw) * cy, Math.sin(pitch), Math.cos(c.yaw) * cy).multiplyScalar(dist).add(c.look)
    pos.y = Math.max(pos.y + 1.0, heightAt(pos.x, pos.z) + 0.6)
    cam.position.lerp(pos, 1 - Math.exp(-dt * 8))
    // When they meet, aim a little higher so both sit below the question cards.
    c.lift += ((c.frame ? 1.65 : 0.95) - c.lift) * (1 - Math.exp(-dt * 3))
    cam.lookAt(c.look.x, c.look.y + c.lift, c.look.z)
  }

  /** The screen box of an object, for flying toys to and from the basket bar. */
  screenRect(obj: THREE.Object3D) {
    const cam = this.camera!
    const r = this.canvas!.getBoundingClientRect()
    obj.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(obj)
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const v = new THREE.Vector3(x, y, z).project(cam)
          const [sx, sy] = [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height]
          ;[x0, y0, x1, y1] = [Math.min(x0, sx), Math.min(y0, sy), Math.max(x1, sx), Math.max(y1, sy)]
        }
    return new DOMRect(x0, y0, x1 - x0, y1 - y0)
  }

  /** Where a world point is on screen, and whether it's in front of the camera. */
  toScreen(p: THREE.Vector3) {
    const v = p.clone().project(this.camera!)
    const r = this.canvas!.getBoundingClientRect()
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, front: v.z < 1, rect: r }
  }
}
