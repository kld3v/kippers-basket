import * as THREE from 'three'
import { P } from '../../../art/palette'
import type { SpotKind } from '../../../content'
import { ball, bake, canvasTexture, cylinder, outlineMaterial, placed, SPHERE, toon } from './kit'

// The meadow's furniture: trees, bushes, the log, the burrow, Kipper's basket, clouds and flowers.

type Piece = { geo: THREE.BufferGeometry; color: string }

const trunk = new THREE.CylinderGeometry(0.16, 0.24, 1, 10)

/** One round storybook tree, as baked pieces at (x, y, z) with a size. */
export function treePieces(x: number, y: number, z: number, size: number, seed: number): Piece[] {
  const r = (n: number) => Math.sin(seed * 12.9898 + n * 78.233) * 0.5 + 0.5
  const h = 1.5 * size
  const green = ['#8fc06c', '#9ccb76', '#86b663'][seed % 3]
  return [
    { geo: placed(trunk, [x, y + h / 2, z], [size, h, size]), color: '#a9805b' },
    { geo: placed(SPHERE, [x, y + h + 0.55 * size, z], 0.95 * size), color: green },
    { geo: placed(SPHERE, [x - 0.62 * size, y + h + 0.1 * size, z + (r(1) - 0.5) * 0.4], 0.66 * size), color: green },
    { geo: placed(SPHERE, [x + 0.62 * size, y + h + 0.15 * size, z + (r(2) - 0.5) * 0.4], 0.7 * size), color: green },
    { geo: placed(SPHERE, [x + (r(3) - 0.5) * 0.4, y + h + 0.2 * size, z + 0.5 * size], 0.62 * size), color: green },
  ]
}

/** A low round bush; berry bushes are where friends hide. */
export function bushPieces(x: number, y: number, z: number, size: number, berries: boolean): Piece[] {
  const green = '#86b663'
  const pieces: Piece[] = [
    { geo: placed(SPHERE, [x, y + 0.55 * size, z], [1.0 * size, 0.8 * size, 0.85 * size]), color: green },
    { geo: placed(SPHERE, [x - 0.75 * size, y + 0.35 * size, z + 0.1], [0.7 * size, 0.6 * size, 0.65 * size]), color: green },
    { geo: placed(SPHERE, [x + 0.75 * size, y + 0.38 * size, z - 0.05], [0.72 * size, 0.62 * size, 0.68 * size]), color: green },
    { geo: placed(SPHERE, [x + 0.1, y + 0.3 * size, z + 0.5 * size], [0.8 * size, 0.5 * size, 0.6 * size]), color: green },
  ]
  if (berries)
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4
      pieces.push({ geo: placed(SPHERE, [x + Math.cos(a) * 0.8 * size, y + (0.45 + (i % 3) * 0.2) * size, z + Math.sin(a) * 0.45 * size + 0.4 * size], 0.07), color: P.red })
    }
  return pieces
}

/** A hiding place, built so a friend can crouch out of sight just behind it. */
export function hidingPlace(kind: SpotKind) {
  const g = new THREE.Group()
  if (kind === 'bush') g.add(bake(bushPieces(0, 0, 0, 1.05, true)))
  if (kind === 'log') {
    const rings = canvasTexture(64, 64, (c) => {
      c.fillStyle = '#e2bf8f'
      c.fillRect(0, 0, 64, 64)
      c.strokeStyle = '#b48760'
      c.lineWidth = 2
      for (const r of [8, 16, 24]) {
        c.beginPath()
        c.arc(32, 32, r, 0, Math.PI * 2)
        c.stroke()
      }
    })
    const geo = new THREE.CylinderGeometry(0.42, 0.45, 2.1, 20)
    const bark = toon(P.brown)
    const ends = toon('#ffffff', { map: rings, key: 'log-ends' })
    const log = new THREE.Mesh(geo, [bark, ends, ends])
    log.add(new THREE.Mesh(geo, outlineMaterial()))
    log.rotation.z = Math.PI / 2
    log.position.y = 0.4
    g.add(log)
    g.add(cylinder(0.04, 0.05, 0.16, '#f6efe2', [-0.4, 0.88, 0.1]))
    g.add(ball(0.13, P.red, [-0.4, 0.97, 0.1], [1, 0.6, 1]))
  }
  if (kind === 'burrow') {
    g.add(ball(1, '#c49a6c', [0, 0, 0], [1.35, 0.75, 1.05]))
    g.add(ball(1, '#3e2e25', [0, 0.28, 0.82], [0.45, 0.32, 0.16], [0.25, 0, 0], false))
  }
  return g
}

/** Kipper's wicker basket with its red cushion. */
export function basket() {
  const g = new THREE.Group()
  const wicker = canvasTexture(128, 32, (c) => {
    c.fillStyle = P.wicker
    c.fillRect(0, 0, 128, 32)
    c.strokeStyle = P.wickerDark
    c.lineWidth = 2
    for (let y = 6; y < 32; y += 8) {
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(128, y)
      c.stroke()
    }
    for (let x = 0; x < 128; x += 8) {
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x, 32)
      c.stroke()
    }
  })
  wicker.repeat.set(4, 1)
  const profile = [
    [0, 0],
    [0.85, 0.02],
    [1.05, 0.25],
    [1.12, 0.5],
    [1.04, 0.52],
    [0.96, 0.32],
    [0.8, 0.12],
    [0, 0.12],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const geo = new THREE.LatheGeometry(profile, 36)
  const m = new THREE.Mesh(geo, toon('#ffffff', { map: wicker, key: 'wicker' }))
  m.add(new THREE.Mesh(geo, outlineMaterial()))
  m.scale.set(1, 1, 0.78)
  g.add(m)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.07, 8, 40), toon(P.wickerDark))
  rim.add(new THREE.Mesh(rim.geometry, outlineMaterial()))
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.52
  rim.scale.set(1, 0.78, 1)
  g.add(rim)
  g.add(ball(1, '#e99383', [0, 0.2, 0], [0.86, 0.14, 0.66]))
  return g
}

export function cloud(seed: number) {
  const r = (n: number) => Math.sin(seed * 9.17 + n * 3.1) * 0.5 + 0.5
  return bake(
    Array.from({ length: 5 }, (_, i) => ({
      geo: placed(SPHERE, [(i - 2) * 1.5 + r(i) * 0.6, r(i + 5) * 0.8 - Math.abs(i - 2) * 0.35, r(i + 9) * 0.6], 1.2 + r(i + 2) * 0.7 - Math.abs(i - 2) * 0.2),
      color: '#ffffff',
    })),
  )
}

/** A five-pointed star that floats over whatever she should find next. */
export function guideStar() {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2
    const rr = i % 2 ? 0.17 : 0.42
    if (i) shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 })
  geo.center()
  geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, toon(P.yellow))
  m.add(new THREE.Mesh(geo, outlineMaterial()))
  return m
}

/** Flower and grass shapes for instancing: a stem with petals round a middle. */
export function flowerGeometry(petal = '#ffffff') {
  const pieces: Piece[] = [{ geo: placed(new THREE.CylinderGeometry(0.012, 0.016, 0.3, 5), [0, 0.15, 0]), color: P.greenDark }]
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    pieces.push({ geo: placed(SPHERE, [Math.cos(a) * 0.06, 0.32, Math.sin(a) * 0.06], [0.05, 0.025, 0.05]), color: petal })
  }
  pieces.push({ geo: placed(SPHERE, [0, 0.33, 0], 0.035), color: P.yellow })
  return bake(pieces, false).geometry
}

export function grassGeometry() {
  const blade = new THREE.ConeGeometry(0.025, 0.28, 4)
  return bake(
    [
      { geo: placed(blade, [0, 0.14, 0], 1, [0, 0, 0.15]), color: P.greenDark },
      { geo: placed(blade, [0.05, 0.12, 0.02], 0.85, [0.1, 0, -0.35]), color: '#7aa957' },
      { geo: placed(blade, [-0.05, 0.11, -0.02], 0.8, [-0.1, 0, 0.45]), color: P.greenDark },
    ],
    false,
  ).geometry
}

export const lilyPad = () => {
  const geo = new THREE.CircleGeometry(0.42, 20, 0.35, Math.PI * 2 - 0.7)
  geo.rotateX(-Math.PI / 2)
  const m = new THREE.Mesh(geo, toon('#8fc87a'))
  return m
}

