import * as THREE from 'three'
import { P } from '../../../art/palette'
import { ball, canvasTexture, capsule, cheek, dot, eye, INK, outlineMaterial, place, toon, tube } from './kit'

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

/** Kipper and Tiger stand and walk on their back legs, like on TV. */
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
}

export function buildBiped(look: DogLook): BipedRig {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const chest = look.chest ?? look.body
  const hip = 0.42

  const legs = [-1, 1].map((side) => {
    const g = new THREE.Group()
    g.position.set(side * 0.14, hip, 0)
    g.add(capsule(0.1, 0.24, look.body, [0, -0.2, 0]))
    g.add(ball(0.13, chest === look.body ? look.body : chest, [0, -hip + 0.07, 0.07], [0.95, 0.6, 1.45]))
    body.add(g)
    return g
  })

  const torso = capsule(0.3, 0.34, look.body, [0, hip + 0.3, 0])
  if (look.stripes) torso.material = toon(look.body, { map: stripeTexture(look.body, look.stripes), key: `stripes-${look.body}` })
  body.add(torso)
  body.add(ball(0.25, chest, [0, hip + 0.22, 0.12], [1, 1.15, 0.8], [0, 0, 0], false))

  const arms = [-1, 1].map((side) => {
    const g = new THREE.Group()
    g.position.set(side * 0.29, hip + 0.56, 0.04)
    g.rotation.z = side * 0.12
    g.add(capsule(0.075, 0.26, look.body, [0, -0.17, 0]))
    g.add(ball(0.095, chest === look.body ? look.body : chest, [0, -0.36, 0.02]))
    body.add(g)
    return g
  })

  const tail = new THREE.Group()
  tail.position.set(0, hip + 0.1, -0.26)
  tail.add(
    tube(
      [
        [0, 0, 0.04],
        [0, 0.08, -0.16],
        [0, 0.28, -0.24],
        [0, 0.44, -0.14],
      ],
      0.048,
      look.stripes ?? look.body,
    ),
  )
  tail.add(ball(0.05, look.body, [0, 0.44, -0.14]))
  body.add(tail)

  const head = new THREE.Group()
  head.position.set(0, hip + 0.66, 0.04)
  body.add(head)
  head.add(ball(0.33, look.body, [0, 0.24, 0]))
  head.add(ball(0.19, chest, [0, 0.13, 0.28], [1.05, 0.82, 1.18]))
  head.add(dot(0.066, INK, [0, 0.19, 0.48], [1.1, 0.85, 0.9]))
  const eyes = [-0.13, 0.13].map((x) => eye(0.048, [x, 0.33, 0.25]))
  eyes.forEach((e) => head.add(e))
  head.add(cheek(0.06, [-0.21, 0.14, 0.22], [0, -0.6, 0]))
  head.add(cheek(0.06, [0.21, 0.14, 0.22], [0, 0.6, 0]))
  if (look.stripes) for (const x of [-0.06, 0.06]) head.add(dot(0.04, look.stripes, [x, 0.53, 0.08], [0.6, 1.6, 0.6]))
  const ears = [-1, 1].map((side) => {
    const g = new THREE.Group()
    g.position.set(side * 0.26, 0.44, -0.04)
    g.rotation.z = side * 0.2
    g.add(ball(1, look.ear, [side * 0.02, -look.earLen * 0.85, 0], [0.07, look.earLen * 1.1, 0.17]))
    head.add(g)
    return g
  })

  root.scale.setScalar(look.size)
  return { root, body, legs, arms, head, ears, tail, eyes }
}
