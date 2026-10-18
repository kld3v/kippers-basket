import * as THREE from 'three'
import type { FriendId } from '../../../content'
import { buildDog, NEDDY_LOOK } from './dog'
import { ball, bake, capsule, cheek, cone, cylinder, dot, eye, INK, tube } from './kit'

// The friends who have Kipper's toys, standing up and facing +z with feet on y=0.
// Each holds the toy in front of its tummy (Neddy, being a dog, holds it in his mouth).

export interface FriendRig {
  root: THREE.Group
  /** Squashes and bobs when they talk or giggle. */
  body: THREE.Group
  /** Where the toy sits. */
  hold: THREE.Group
  /** How big the held toy should be. */
  toySize: number
  eyes: THREE.Group[]
  ears: THREE.Group[]
}

function rig(toySize: number) {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const hold = new THREE.Group()
  body.add(hold)
  return { root, body, hold, toySize, eyes: [] as THREE.Group[], ears: [] as THREE.Group[] }
}

const pair = (fn: (side: -1 | 1) => THREE.Object3D) => [fn(-1), fn(1)]

function head(r: ReturnType<typeof rig>, y: number, z = 0.03) {
  const h = new THREE.Group()
  h.position.set(0, y, z)
  r.body.add(h)
  return h
}

const FRIENDS: Record<Exclude<FriendId, 'neddy'>, () => FriendRig> = {
  rabbit() {
    const r = rig(0.42)
    const [fur, light, pink] = ['#cdbfae', '#f7f0e6', '#f2b5b0']
    r.body.add(ball(0.36, fur, [0, 0.44, 0], [1, 1.12, 0.92]))
    r.body.add(ball(0.25, light, [0, 0.4, 0.18], [1, 1.15, 0.6], [0, 0, 0], false))
    r.body.add(...pair((s) => ball(0.1, fur, [s * 0.16, 0.06, 0.14], [1.1, 0.6, 1.8])))
    r.body.add(ball(0.11, '#ffffff', [0, 0.3, -0.33]))
    const h = head(r, 0.95)
    h.add(ball(0.29, fur, [0, 0, 0]))
    h.add(ball(0.13, light, [0, -0.08, 0.22], [1.2, 0.8, 0.8], [0, 0, 0], false))
    h.add(dot(0.04, '#e48a8c', [0, -0.02, 0.3]))
    h.add(dot(1, '#ffffff', [0, -0.15, 0.28], [0.045, 0.06, 0.02]))
    r.eyes.push(...pair((s) => eye(0.045, [s * 0.11, 0.06, 0.24])) as THREE.Group[])
    r.eyes.forEach((e) => h.add(e))
    h.add(...pair((s) => cheek(0.05, [s * 0.17, -0.06, 0.21], [0, s * 0.6, 0])))
    r.ears = pair((s) => {
      const g = new THREE.Group()
      g.position.set(s * 0.1, 0.22, -0.02)
      g.rotation.z = s > 0 ? -0.55 : 0.12
      g.add(capsule(0.065, 0.36, fur, [0, 0.24, 0]))
      g.add(dot(1, pink, [0, 0.24, 0.045], [0.04, 0.19, 0.02]))
      return g
    }) as THREE.Group[]
    r.ears.forEach((e) => h.add(e))
    r.body.add(...pair((s) => ball(0.085, fur, [s * 0.19, 0.58, 0.27], [1, 0.85, 1])))
    r.hold.position.set(0, 0.56, 0.36)
    return r
  },

  badger() {
    const r = rig(0.46)
    const [grey, black, white] = ['#aaa8a1', '#45403c', '#fbfaf5']
    r.body.add(ball(0.4, grey, [0, 0.45, 0], [1.05, 1.05, 0.95]))
    r.body.add(ball(0.27, '#8f8d86', [0, 0.42, 0.17], [1, 1.1, 0.6], [0, 0, 0], false))
    r.body.add(...pair((s) => ball(0.11, black, [s * 0.17, 0.07, 0.14], [1, 0.65, 1.5])))
    const h = head(r, 0.98, 0.05)
    h.add(ball(0.29, white, [0, 0, 0], [1, 0.95, 1.05]))
    h.add(ball(0.14, white, [0, -0.09, 0.25], [0.9, 0.75, 1.1]))
    h.add(...pair((s) => ball(1, black, [s * 0.1, 0.07, 0.22], [0.075, 0.25, 0.08], [-0.45, 0, s * 0.25], false)))
    h.add(dot(0.05, black, [0, -0.07, 0.39]))
    h.add(...pair((s) => dot(0.05, '#ffffff', [s * 0.1, 0.05, 0.28])))
    r.eyes.push(...pair((s) => eye(0.03, [s * 0.1, 0.05, 0.31])) as THREE.Group[])
    r.eyes.forEach((e) => h.add(e))
    r.ears = pair((s) => {
      const g = new THREE.Group()
      g.position.set(s * 0.22, 0.2, -0.02)
      g.add(ball(0.08, black, [0, 0, 0], [1, 1, 0.6]))
      return g
    }) as THREE.Group[]
    r.ears.forEach((e) => h.add(e))
    h.add(...pair((s) => cheek(0.05, [s * 0.21, -0.07, 0.15], [0, s * 0.8, 0])))
    r.body.add(...pair((s) => ball(0.09, black, [s * 0.22, 0.6, 0.26])))
    r.hold.position.set(0, 0.58, 0.38)
    return r
  },

  weasel() {
    const r = rig(0.34)
    const [fur, light] = ['#c98b54', '#f7e7c9']
    r.body.add(tube([[0.1, 0.22, -0.12], [0.35, 0.24, -0.3], [0.48, 0.5, -0.25], [0.45, 0.8, -0.18]], 0.06, fur))
    r.body.add(ball(0.07, '#8a6346', [0.45, 0.82, -0.18]))
    r.body.add(capsule(0.17, 0.42, fur, [0, 0.48, 0]))
    r.body.add(capsule(0.12, 0.36, light, [0, 0.48, 0.08], [0, 0, 0], [1, 1, 0.7]))
    r.body.add(...pair((s) => ball(0.08, fur, [s * 0.1, 0.05, 0.1], [1, 0.6, 1.6])))
    const h = head(r, 1.0)
    h.add(ball(0.2, fur, [0, 0, 0], [1, 0.9, 1]))
    h.add(ball(0.11, light, [0, -0.06, 0.15], [1.2, 0.8, 1], [0, 0, 0], false))
    h.add(dot(0.03, INK, [0, -0.02, 0.24]))
    r.eyes.push(...pair((s) => eye(0.035, [s * 0.08, 0.05, 0.16])) as THREE.Group[])
    r.eyes.forEach((e) => h.add(e))
    r.ears = pair((s) => {
      const g = new THREE.Group()
      g.position.set(s * 0.15, 0.13, -0.02)
      g.add(ball(0.07, fur, [0, 0, 0], [1, 1, 0.6]))
      g.add(dot(0.04, light, [0, 0, 0.03], [1, 1, 0.3]))
      return g
    }) as THREE.Group[]
    r.ears.forEach((e) => h.add(e))
    h.add(...pair((s) => cheek(0.035, [s * 0.12, -0.05, 0.13], [0, s * 0.7, 0])))
    r.body.add(...pair((s) => ball(0.06, fur, [s * 0.15, 0.62, 0.17])))
    r.hold.position.set(0, 0.6, 0.27)
    return r
  },

  robin() {
    const r = rig(0.4)
    const [brown, breast, light] = ['#a87b54', '#ec7a4b', '#f7eddd']
    r.body.add(...pair((s) => cylinder(0.02, 0.02, 0.22, '#6b4a32', [s * 0.09, 0.11, 0.02])))
    r.body.add(...pair((s) => cone(0.04, 0.12, '#6b4a32', [s * 0.09, 0.02, 0.08], [Math.PI / 2, 0, 0])))
    r.body.add(ball(0.4, brown, [0, 0.55, 0], [1, 1.05, 0.95]))
    r.body.add(ball(0.31, breast, [0, 0.58, 0.16], [1.05, 1.1, 0.65]))
    r.body.add(ball(0.2, light, [0, 0.36, 0.2], [1.1, 0.8, 0.6], [0, 0, 0], false))
    r.eyes.push(...pair((s) => eye(0.045, [s * 0.15, 0.74, 0.3])) as THREE.Group[])
    r.eyes.forEach((e) => r.body.add(e))
    r.body.add(cone(0.05, 0.13, '#e8b04c', [0, 0.66, 0.43], [Math.PI / 2, 0, 0]))
    r.body.add(cone(0.04, 0.12, brown, [0.02, 0.98, 0], [0, 0, -0.3]))
    r.ears = pair((s) => {
      const g = new THREE.Group()
      g.position.set(s * 0.36, 0.55, 0.05)
      g.add(ball(0.22, '#94694a', [0, 0, 0.06], [0.35, 0.9, 0.75], [0, s * 0.3, s * 0.3]))
      return g
    }) as THREE.Group[]
    r.ears.forEach((e) => r.body.add(e))
    r.hold.position.set(0, 0.5, 0.42)
    return r
  },

  hedgehog() {
    const r = rig(0.38)
    const [spines, cream, feet] = ['#8f6c4f', '#efdcbd', '#d9b291']
    r.body.add(ball(0.44, spines, [0, 0.46, -0.05], [1, 0.95, 1]))
    // Spines all over the back: little cones pointing out, baked into one mesh.
    const cones: { geo: THREE.BufferGeometry; color: string }[] = []
    const spine = new THREE.ConeGeometry(0.045, 0.17, 6)
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < 90; i++) {
      const y = 1 - (i / 89) * 2
      const rad = Math.sqrt(1 - y * y)
      const a = i * 2.399963
      const dir = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad)
      if (dir.z > 0.3 || dir.y < -0.35) continue
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir)
      const at = dir.clone().multiply(new THREE.Vector3(0.44, 0.42, 0.44)).add(new THREE.Vector3(0, 0.46, -0.05))
      const g = spine.clone().applyQuaternion(q).translate(at.x, at.y, at.z)
      cones.push({ geo: g, color: i % 3 ? '#6e523c' : '#8f6c4f' })
    }
    r.body.add(bake(cones))
    r.body.add(ball(0.27, cream, [0, 0.5, 0.24], [1, 1, 0.85]))
    r.body.add(ball(0.24, cream, [0, 0.28, 0.2], [1, 0.8, 0.7]))
    r.body.add(cone(0.1, 0.22, cream, [0, 0.47, 0.5], [Math.PI / 2, 0, 0]))
    r.body.add(dot(0.045, INK, [0, 0.47, 0.62]))
    r.eyes.push(...pair((s) => eye(0.04, [s * 0.1, 0.58, 0.44])) as THREE.Group[])
    r.eyes.forEach((e) => r.body.add(e))
    r.ears = pair((s) => {
      const g = new THREE.Group()
      g.position.set(s * 0.2, 0.72, 0.24)
      g.add(ball(0.06, cream, [0, 0, 0], [1, 1, 0.6]))
      return g
    }) as THREE.Group[]
    r.ears.forEach((e) => r.body.add(e))
    r.body.add(...pair((s) => cheek(0.045, [s * 0.18, 0.46, 0.38], [0, s * 0.6, 0])))
    r.body.add(...pair((s) => ball(0.08, feet, [s * 0.15, 0.05, 0.18], [1, 0.6, 1.5])))
    r.body.add(...pair((s) => ball(0.07, feet, [s * 0.2, 0.3, 0.42])))
    r.hold.position.set(0, 0.3, 0.5)
    return r
  },

  mouse() {
    const r = rig(0.36)
    const [fur, pink, light] = ['#bfb3a7', '#e8b7ab', '#f4ece2']
    r.body.add(tube([[0, 0.15, -0.24], [0.2, 0.08, -0.45], [0.38, 0.25, -0.5], [0.42, 0.45, -0.36]], 0.025, pink))
    r.body.add(ball(0.3, fur, [0, 0.4, 0], [1, 1.2, 0.9]))
    r.body.add(ball(0.2, light, [0, 0.38, 0.16], [1, 1.2, 0.6], [0, 0, 0], false))
    r.body.add(...pair((s) => ball(0.08, pink, [s * 0.12, 0.05, 0.12], [1, 0.6, 1.6])))
    const h = head(r, 0.9)
    h.add(ball(0.25, fur, [0, 0, 0], [1, 0.92, 1]))
    h.add(ball(0.1, fur, [0, -0.06, 0.22], [1, 0.85, 1.2]))
    h.add(dot(0.04, '#e48a8c', [0, -0.04, 0.33]))
    r.eyes.push(...pair((s) => eye(0.04, [s * 0.1, 0.05, 0.2])) as THREE.Group[])
    r.eyes.forEach((e) => h.add(e))
    h.add(...pair((s) => cheek(0.045, [s * 0.15, -0.06, 0.18], [0, s * 0.7, 0])))
    for (const s of [-1, 1])
      for (const dy of [0, -0.035]) h.add(tube([[s * 0.06, -0.06 + dy, 0.27], [s * 0.2, -0.04 + dy * 2, 0.27], [s * 0.3, -0.03 + dy * 3, 0.24]], 0.005, INK, false))
    r.ears = pair((s) => {
      const g = new THREE.Group()
      g.position.set(s * 0.22, 0.2, -0.04)
      g.add(cylinder(0.17, 0.17, 0.03, fur, [0, 0, 0], [Math.PI / 2, 0, 0]))
      g.add(cylinder(0.11, 0.11, 0.035, pink, [0, 0, 0.005], [Math.PI / 2, 0, 0]))
      return g
    }) as THREE.Group[]
    r.ears.forEach((e) => h.add(e))
    r.body.add(...pair((s) => ball(0.06, pink, [s * 0.16, 0.55, 0.23])))
    r.hold.position.set(0, 0.52, 0.32)
    return r
  },

  owl() {
    const r = rig(0.4)
    const [brown, light] = ['#a87e59', '#efdcbc']
    r.body.add(...pair((s) => cone(0.05, 0.1, '#ef9550', [s * 0.1, 0.04, 0.16], [Math.PI / 2, 0, 0])))
    r.body.add(ball(0.4, brown, [0, 0.55, 0], [1, 1.2, 0.9]))
    r.body.add(ball(0.28, light, [0, 0.46, 0.17], [1, 1.2, 0.6], [0, 0, 0], false))
    r.body.add(...pair((s) => ball(0.16, '#f5e9d3', [s * 0.14, 0.8, 0.26], [1, 1, 0.45])))
    r.eyes.push(...pair((s) => eye(0.07, [s * 0.14, 0.8, 0.31])) as THREE.Group[])
    r.eyes.forEach((e) => r.body.add(e))
    r.body.add(cone(0.04, 0.12, '#e8b04c', [0, 0.68, 0.34], [Math.PI / 2 + 0.6, 0, 0]))
    r.body.add(...pair((s) => cone(0.07, 0.2, brown, [s * 0.24, 1.07, 0.02], [0, 0, -s * 0.45])))
    r.ears = pair((s) => {
      const g = new THREE.Group()
      g.position.set(s * 0.36, 0.55, 0.05)
      g.add(ball(0.2, '#8f6a48', [0, 0, 0.06], [0.35, 1, 0.7], [0, s * 0.3, s * 0.25]))
      return g
    }) as THREE.Group[]
    r.ears.forEach((e) => r.body.add(e))
    r.hold.position.set(0, 0.46, 0.42)
    return r
  },
}

export function buildFriend(id: FriendId): FriendRig {
  if (id === 'neddy') {
    const d = buildDog(NEDDY_LOOK)
    return { root: d.root, body: d.body, hold: d.mouth, toySize: 0.32, eyes: d.eyes, ears: d.ears }
  }
  return FRIENDS[id]()
}

