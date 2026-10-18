import * as THREE from 'three'
import { P } from '../../../art/palette'
import { bake, ball, canvasTexture, capsule, cheek, cone, dot, eye, INK, outlineMaterial, place, toon, tube } from './kit'

// A dog in 3D, facing +z with feet on y=0: Kipper, Tiger and Neddy are the same build with
// different looks. The rig exposes the joints the game animates.

export interface DogLook {
  body: string
  ear: string
  /** Chest and paws. */
  chest?: string
  stripes?: string
  /** A darker patch over the back (Neddy's saddle). */
  saddle?: string
  collar?: string
  bodyLen: number
  legLen: number
  earLen: number
  /** Overall size. */
  size: number
}

export const KIPPER_LOOK: DogLook = { body: '#f8f5ef', ear: P.tan, bodyLen: 0.5, legLen: 0.32, earLen: 0.3, size: 1 }
export const TIGER_LOOK: DogLook = { body: '#f4c991', ear: '#b9773f', chest: '#fbe5c4', stripes: '#cf8743', bodyLen: 0.52, legLen: 0.33, earLen: 0.27, size: 1.04 }
export const NEDDY_LOOK: DogLook = { body: '#d59c5f', ear: '#8a5531', chest: '#fbf8f1', saddle: '#6e4a30', collar: P.red, bodyLen: 0.78, legLen: 0.17, earLen: 0.46, size: 0.95 }

export interface DogRig {
  root: THREE.Group
  /** Bobs as he runs. */
  body: THREE.Group
  /** Front-left, front-right, back-left, back-right, each swinging from its hip. */
  legs: THREE.Group[]
  head: THREE.Group
  ears: THREE.Group[]
  tail: THREE.Group
  eyes: THREE.Group[]
  /** Where a toy sits in his mouth. */
  mouth: THREE.Group
  /** Hip height, for laying him down. */
  hip: number
}

const stripeTexture = (body: string, stripe: string) =>
  canvasTexture(64, 256, (g) => {
    g.fillStyle = body
    g.fillRect(0, 0, 64, 256)
    g.fillStyle = stripe
    for (let i = 0; i < 6; i++) g.fillRect(0, 22 + i * 38, 64, 13)
  })

export function buildDog(look: DogLook): DogRig {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const { bodyLen: L, legLen } = look
  const hip = legLen + 0.12
  const chest = look.chest ?? look.body

  // Torso: a capsule lying along z, a rounder chest at the front.
  const torso = capsule(0.29, L, look.body, [0, hip + 0.16, 0], [Math.PI / 2, 0, 0])
  if (look.stripes) {
    const mat = toon(look.body, { map: stripeTexture(look.body, look.stripes), key: `stripes-${look.body}` })
    torso.material = mat
  }
  body.add(torso)
  body.add(ball(0.3, chest, [0, hip + 0.13, L / 2 + 0.06], [1, 1.02, 0.95]))
  if (look.saddle) body.add(ball(1, look.saddle, [0, hip + 0.33, -0.02], [0.27, 0.13, L * 0.62 + 0.12]))

  // Legs swing from the hips; paws point forward.
  const legs = [
    [-0.15, L / 2 + 0.02],
    [0.15, L / 2 + 0.02],
    [-0.15, -L / 2 + 0.02],
    [0.15, -L / 2 + 0.02],
  ].map(([x, z]) => {
    const g = new THREE.Group()
    g.position.set(x, hip, z)
    g.add(capsule(0.085, Math.max(0.02, legLen - 0.06), x < 0 && z > 0 ? look.body : look.body, [0, -(legLen + 0.02) / 2, 0]))
    g.add(ball(0.1, chest === look.body ? look.body : chest, [0, -hip + 0.065, 0.045], [1, 0.68, 1.32]))
    body.add(g)
    return g
  })

  // Tail: long and thin, up and back, wagging from its root.
  const tail = new THREE.Group()
  tail.position.set(0, hip + 0.3, -L / 2 - 0.24)
  tail.add(
    tube(
      [
        [0, 0, 0.04],
        [0, 0.16, -0.1],
        [0, 0.36, -0.13],
        [0, 0.5, -0.04],
      ],
      0.048,
      look.stripes ?? look.body,
    ),
  )
  tail.add(ball(0.05, look.body, [0, 0.5, -0.04]))
  body.add(tail)

  // Head on a neck joint, so it can nod and droop.
  const head = new THREE.Group()
  head.position.set(0, hip + 0.38, L / 2 + 0.2)
  body.add(head)
  head.add(ball(0.3, look.body, [0, 0.14, 0.12]))
  head.add(ball(0.18, chest, [0, 0.03, 0.37], [1.05, 0.82, 1.15]))
  if (look === NEDDY_LOOK) head.add(ball(0.06, '#fbf8f1', [0, 0.27, 0.36], [0.6, 2.2, 0.5]))
  head.add(dot(0.062, INK, [0, 0.08, 0.565], [1.1, 0.85, 0.9]))
  const eyes = [-0.125, 0.125].map((x) => eye(0.045, [x, 0.2, 0.355]))
  eyes.forEach((e) => head.add(e))
  head.add(cheek(0.055, [-0.2, 0.06, 0.32], [0, -0.6, 0]))
  head.add(cheek(0.055, [0.2, 0.06, 0.32], [0, 0.6, 0]))
  const mouth = new THREE.Group()
  mouth.position.set(0, -0.06, 0.52)
  head.add(mouth)
  if (look.stripes) for (const x of [-0.05, 0.05]) head.add(dot(0.035, look.stripes, [x, 0.4, 0.17], [0.6, 1.6, 0.6]))
  if (look.collar) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 24), toon(look.collar))
    ring.add(new THREE.Mesh(ring.geometry, outlineMaterial()))
    place(ring, [0, -0.08, 0.02], [Math.PI / 2 - 0.3, 0, 0])
    head.add(ring)
    head.add(ball(0.045, P.yellow, [0, -0.2, 0.16]))
  }

  // Floppy ears hang from the top of the head and swing on their own.
  const ears = [-1, 1].map((side) => {
    const g = new THREE.Group()
    g.position.set(side * 0.23, 0.33, 0.06)
    g.rotation.z = side * 0.22
    g.add(ball(1, look.ear, [side * 0.02, -look.earLen * 0.82, 0], [0.065, look.earLen, 0.16]))
    head.add(g)
    return g
  })

  root.scale.setScalar(look.size)
  return { root, body, legs, head, ears, tail, eyes, mouth, hip }
}

/** Kipper and Tiger as on TV: standing up, Kipper orange with a white front, Tiger a scruffy grey Scottie. */
export interface BipedLook {
  kind: 'kipper' | 'tiger'
  body: string
  white: string
  ear: string
  size: number
}

export const KIPPER_TV: BipedLook = { kind: 'kipper', body: '#f2701f', white: '#fffdf8', ear: '#6e3711', size: 1 }
export const TIGER_TV: BipedLook = { kind: 'tiger', body: '#8d877c', white: '#fbfaf6', ear: '#5c5751', size: 1.03 }

export interface BipedRig {
  root: THREE.Group
  /** Bobs, leans and sways as he runs. */
  body: THREE.Group
  /** Left and right, swinging from the hips. */
  legs: THREE.Group[]
  /** Left and right, swinging from the shoulders. */
  arms: THREE.Group[]
  head: THREE.Group
  ears: THREE.Group[]
  tail: THREE.Group
  eyes: THREE.Group[]
  /** How far the arms hang out from the sides (Tiger holds his out). */
  armOut: number
  /** How much the ears flop (Kipper's a lot, Tiger's pointed ears hardly). */
  earFlop: number
}

/** Little cones of fur standing out from a shape's surface, baked into one mesh. */
function fuzz(color: string, centre: THREE.Vector3, radii: THREE.Vector3, count: number, keep: (d: THREE.Vector3) => boolean, size = 1) {
  const cone = new THREE.ConeGeometry(0.045 * size, 0.13 * size, 5)
  const up = new THREE.Vector3(0, 1, 0)
  const pieces: { geo: THREE.BufferGeometry; color: string }[] = []
  for (let i = 0; i < count * 3 && pieces.length < count; i++) {
    const y = 1 - ((i + 0.5) / (count * 3)) * 2
    const r = Math.sqrt(1 - y * y)
    const a = i * 2.399963
    const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
    if (!keep(d)) continue
    const at = d.clone().multiply(radii).add(centre)
    const g = cone.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d)).translate(at.x, at.y, at.z)
    pieces.push({ geo: g, color })
  }
  return pieces.length ? bake(pieces) : new THREE.Group()
}

export function buildBiped(look: BipedLook): BipedRig {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const tiger = look.kind === 'tiger'
  const hip = 0.42

  const legs = [-1, 1].map((side) => {
    const g = new THREE.Group()
    g.position.set(side * 0.15, hip, 0)
    g.add(capsule(0.105, 0.22, look.body, [0, -0.18, 0]))
    g.add(ball(0.13, look.white, [0, -hip + 0.07, 0.07], [0.95, 0.6, 1.45]))
    body.add(g)
    return g
  })

  // A pear of a body: round at the tummy and hips, narrower at the chest.
  body.add(ball(0.34, look.body, [0, hip + 0.22, 0], [tiger ? 1.08 : 1, 1.05, 0.92]))
  body.add(ball(0.26, look.body, [0, hip + 0.52, 0.01], [tiger ? 1.12 : 1, 1, 0.92]))
  if (tiger) body.add(ball(1, look.white, [0, hip + 0.31, 0.27], [0.22, 0.36, 0.13], [0, 0, 0], false))
  else {
    body.add(ball(1, look.white, [0, hip + 0.33, 0.26], [0.16, 0.42, 0.12], [-0.08, 0, 0], false))
    body.add(ball(1, '#f5c779', [0, hip + 0.33, 0.24], [0.185, 0.44, 0.12], [-0.08, 0, 0], false))
  }
  if (tiger)
    body.add(fuzz(look.body, new THREE.Vector3(0, hip + 0.3, 0), new THREE.Vector3(0.36, 0.42, 0.32), 26, (d) => d.z < 0.35 && Math.abs(d.y) < 0.8))

  const armOut = tiger ? 0.42 : 0.1
  const arms = [-1, 1].map((side) => {
    const g = new THREE.Group()
    g.position.set(side * (tiger ? 0.33 : 0.3), hip + 0.6, 0.02)
    g.add(capsule(0.078, 0.24, look.body, [0, -0.16, 0]))
    g.add(ball(0.1, look.white, [0, -0.35, 0.02]))
    body.add(g)
    return g
  })

  const tail = new THREE.Group()
  if (tiger) {
    // A Scottie's short tail sticks straight up.
    tail.position.set(0, hip + 0.26, -0.3)
    tail.add(cone(0.075, 0.26, look.body, [0, 0.11, -0.03], [-0.45, 0, 0]))
  } else {
    // Kipper's thin dark wiry tail, like a little brush.
    tail.position.set(0, hip + 0.12, -0.3)
    tail.add(
      tube(
        [
          [0, 0, 0.04],
          [0, -0.02, -0.12],
          [0, -0.06, -0.22],
        ],
        0.016,
        '#4a3022',
      ),
    )
    for (const [y, z] of [[0.02, -0.05], [-0.06, -0.02], [-0.12, -0.04]]) tail.add(cone(0.012, 0.13, '#4a3022', [0, -0.06 + y, -0.27 + z], [-Math.PI / 2 + y * 3, 0, 0], false))
  }
  body.add(tail)

  const head = new THREE.Group()
  head.position.set(0, hip + 0.78, 0.04)
  body.add(head)
  let ears: THREE.Group[]
  let eyes: THREE.Group[]
  if (tiger) {
    head.add(ball(0.34, look.body, [0, 0.26, 0], [1.02, 1.05, 1.06]))
    head.add(fuzz(look.body, new THREE.Vector3(0, 0.26, 0), new THREE.Vector3(0.35, 0.36, 0.36), 18, (d) => d.z < 0.45 && d.y > -0.4))
    head.add(ball(0.14, look.body, [0, 0.22, 0.29]))
    // The white beard over the lower half of his face, with tufts hanging down.
    head.add(ball(1, look.white, [0, 0.1, 0.23], [0.26, 0.2, 0.2]))
    head.add(fuzz(look.white, new THREE.Vector3(0, 0.06, 0.24), new THREE.Vector3(0.24, 0.2, 0.18), 12, (d) => d.y < -0.2 && d.z > -0.2, 0.9))
    head.add(dot(0.07, INK, [0, 0.27, 0.43], [1.15, 0.85, 0.9]))
    eyes = [-0.12, 0.12].map((x) => eye(0.042, [x, 0.4, 0.27]))
    for (const x of [-0.12, 0.12]) head.add(cone(0.05, 0.14, look.body, [x, 0.48, 0.27], [1.1, 0, x > 0 ? -0.5 : 0.5]))
    ears = [-1, 1].map((side) => {
      const g = new THREE.Group()
      g.position.set(side * 0.18, 0.56, -0.02)
      g.rotation.z = -side * 0.22
      g.add(cone(0.1, 0.32, look.body, [0, 0.13, 0]))
      g.add(cone(0.055, 0.2, look.ear, [0, 0.1, 0.06], [0, 0, 0], false))
      head.add(g)
      return g
    })
  } else {
    head.add(ball(0.32, look.body, [0, 0.27, -0.02], [0.95, 1.08, 0.98]))
    // The big white snout with the nose on its top front, and white down his throat.
    head.add(ball(1, look.white, [0, 0.16, 0.28], [0.18, 0.17, 0.34], [-0.2, 0, 0]))
    head.add(ball(1, look.white, [0, 0.05, 0.12], [0.22, 0.2, 0.2], [0, 0, 0], false))
    head.add(dot(0.068, INK, [0, 0.27, 0.6], [1.1, 0.85, 0.9]))
    eyes = [-0.11, 0.11].map((x) => eye(0.042, [x, 0.42, 0.22]))
    ears = [-1, 1].map((side) => {
      const g = new THREE.Group()
      // Long brown flaps, flopped back over the top of his head.
      g.position.set(side * 0.1, 0.56, -0.02)
      g.add(ball(1, look.ear, [side * 0.04, 0.03, -0.17], [0.14, 0.05, 0.29], [-0.42, side * 0.25, side * 0.42]))
      head.add(g)
      return g
    })
  }
  eyes.forEach((e) => head.add(e))

  root.scale.setScalar(look.size)
  return { root, body, legs, arms, head, ears, tail, eyes, armOut, earFlop: tiger ? 0.15 : 1 }
}
