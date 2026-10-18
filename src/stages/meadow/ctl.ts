import * as THREE from 'three'
import { create } from 'zustand'
import type { FriendId, SpotKind, ToyId } from '../../content'
import { SPEED } from '../../run'
import { HOME, SPOTS, heightAt, type Place } from './land'

// The meadow's moving state. The game script calls into this (walk there, pop out, take the toy)
// and awaits the promises; the scene components read it every frame and resolve them.

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

  /** Jump every tween to its end (on reset or when the stage goes away). */
  finish() {
    for (const tw of this.list) {
      tw.fn(1)
      tw.done()
    }
    this.list.clear()
  }
}

export interface Dog {
  pos: THREE.Vector3
  target: THREE.Vector3 | null
  speed: number
  facing: 1 | -1
  /** Current horizontal scale: swings through 0 when he turns round, like a paper cut-out. */
  flip: number
  face: 'happy' | 'sad'
  /** Extra height from a jump. */
  hop: number
  hidden: boolean
  /** Tiger tags along behind Kipper. */
  follow: boolean
  arrive: (() => void) | null
  root: THREE.Object3D | null
}

const dog = (at: THREE.Vector3, follow = false): Dog => ({
  pos: at.clone(),
  target: null,
  speed: 2.6,
  facing: 1,
  flip: 1,
  face: 'happy',
  hop: 0,
  hidden: false,
  follow,
  arrive: null,
  root: null,
})

export interface FriendPose {
  pos: THREE.Vector3
  visible: boolean
  toyVisible: boolean
  talking: boolean
  /** Squash and stretch, for landings and giggles. */
  squash: number
}

export interface SpotState {
  place: Place
  rustle: boolean
  friend: FriendPose
  onTap: (() => void) | null
  toyMesh: THREE.Mesh | null
  friendRoot: THREE.Object3D | null
}

export interface Cast {
  friend: FriendId
  toy: ToyId
  kind: SpotKind
}

/** The parts of the meadow that change what's drawn (React re-renders on these). */
export const useMeadow = create<{
  cast: (Cast | null)[]
  placed: ToyId[]
  asleep: boolean
  tigerAsleep: boolean
  drape: boolean
  snoring: boolean
}>(() => ({ cast: SPOTS.map(() => null), placed: [], asleep: false, tigerAsleep: false, drape: false, snoring: false }))

export type Mode = 'title' | 'explore' | 'busy'

export class Ctl {
  readonly tweens = new Tweens()
  mode: Mode = 'title'
  readonly dogs = { kipper: dog(HOME.stand), tiger: dog(HOME.wait, true) }
  readonly spots: SpotState[] = SPOTS.map((place) => ({
    place,
    rustle: false,
    friend: { pos: place.at.clone(), visible: false, toyVisible: true, talking: false, squash: 0 },
    onTap: null,
    toyMesh: null,
    friendRoot: null,
  }))
  /** Where the sparkles circle: the next thing to tap. */
  sparkle: THREE.Vector3 | null = null
  /** What the camera keeps in frame. */
  focus: THREE.Vector3[] = [HOME.at, HOME.stand]
  night = 0
  nightTarget = 0
  homeTap: (() => void) | null = null
  /** A tap on the grass (Kipper goes there, when he's allowed to wander). */
  groundTap: ((p: THREE.Vector3) => void) | null = null
  /** Every paper material, so night can tint them all at once. */
  readonly paper = new Set<THREE.MeshBasicMaterial>()
  camera: THREE.PerspectiveCamera | null = null
  canvas: HTMLCanvasElement | null = null
  ripple: (x: number, z: number) => void = () => {}

  walkTo(who: 'kipper' | 'tiger', p: THREE.Vector3, speed = 2.6) {
    const d = this.dogs[who]
    d.arrive?.()
    d.speed = speed
    d.target = p.clone()
    return new Promise<void>((resolve) => (d.arrive = resolve))
  }

  /** Put a dog somewhere at once, stopped. */
  place(who: 'kipper' | 'tiger', p: THREE.Vector3, facing: 1 | -1 = 1) {
    const d = this.dogs[who]
    d.arrive?.()
    d.arrive = null
    d.target = null
    d.pos.copy(p)
    d.facing = facing
    d.flip = facing
    d.hop = 0
    d.hidden = false
  }

  /** Where an object's box lands on screen, for flying toys to and from the basket bar. */
  screenRect(obj: THREE.Object3D) {
    const cam = this.camera!
    const r = this.canvas!.getBoundingClientRect()
    obj.updateWorldMatrix(true, false)
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

  /** A screen box around a ground point (for toys landing round the basket). */
  screenBox(p: THREE.Vector3, size: number) {
    const o = new THREE.Object3D()
    o.position.copy(p)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).translate(0, size / 2, 0))
    o.add(m)
    const r = this.screenRect(o)
    m.geometry.dispose()
    return r
  }

  ground(p: THREE.Vector3) {
    return p.setY(heightAt(p.x, p.z))
  }
}
