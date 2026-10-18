import * as THREE from 'three'
import { P } from '../../../art/palette'
import type { ToyId } from '../../../content'
import { ball, canvasTexture, capsule, cylinder, dot, eye, INK, outlineMaterial, toon } from './kit'

// Kipper's toys in 3D, each about 0.3–0.4 across and centred on its own middle.

const textured = (geo: THREE.BufferGeometry, tex: THREE.Texture, key: string) => {
  const m = new THREE.Mesh(geo, toon('#ffffff', { map: tex, key }))
  m.add(new THREE.Mesh(geo, outlineMaterial()))
  return m
}

const TOYS: Record<ToyId, () => THREE.Object3D> = {
  ball() {
    const tex = canvasTexture(128, 64, (g) => {
      g.fillStyle = P.red
      g.fillRect(0, 0, 128, 64)
      g.fillStyle = P.yellow
      g.fillRect(0, 26, 128, 12)
    })
    const m = textured(new THREE.SphereGeometry(0.17, 24, 16), tex, 'ball')
    m.add(dot(0.035, '#ffffff', [-0.07, 0.09, 0.12], [1.3, 0.8, 0.5]))
    return m
  },

  bone() {
    const g = new THREE.Group()
    g.add(capsule(0.045, 0.28, P.cream, [0, 0, 0], [0, 0, Math.PI / 2]))
    for (const x of [-0.17, 0.17]) for (const y of [-0.045, 0.045]) g.add(ball(0.06, P.cream, [x, y, 0]))
    return g
  },

  blanket() {
    const tex = canvasTexture(64, 64, (g) => {
      g.fillStyle = P.blue
      g.fillRect(0, 0, 64, 64)
      g.fillStyle = P.yellow
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) g.fillRect(i * 16 + 2, j * 16 + 2, 12, 12)
    })
    const geo = new THREE.BoxGeometry(0.38, 0.1, 0.28, 1, 1, 1)
    const m = textured(geo, tex, 'blanket')
    const fold = textured(new THREE.CylinderGeometry(0.05, 0.05, 0.38, 12), tex, 'blanket')
    fold.position.set(0, 0.0, 0.14)
    fold.rotation.z = Math.PI / 2
    m.add(fold)
    return m
  },

  teddy() {
    const g = new THREE.Group()
    const fur = '#c69164'
    g.add(ball(0.11, fur, [0, -0.04, 0]))
    g.add(ball(0.06, P.cream, [0, -0.04, 0.08], [1, 1, 0.5], [0, 0, 0], false))
    g.add(ball(0.09, fur, [0, 0.13, 0.01]))
    g.add(ball(0.045, P.cream, [0, 0.11, 0.08], [1, 0.8, 0.7]))
    g.add(dot(0.018, INK, [0, 0.125, 0.115]))
    g.add(eye(0.015, [-0.035, 0.155, 0.075]), eye(0.015, [0.035, 0.155, 0.075]))
    for (const s of [-1, 1]) {
      g.add(ball(0.04, fur, [s * 0.07, 0.2, 0]))
      g.add(ball(0.045, fur, [s * 0.11, 0.0, 0.03], [0.8, 1.2, 0.8]))
      g.add(ball(0.05, fur, [s * 0.06, -0.14, 0.04], [1, 0.8, 1.2]))
    }
    g.add(ball(1, P.red, [0, 0.06, 0.07], [0.05, 0.025, 0.02]))
    return g
  },

  slipper() {
    const g = new THREE.Group()
    g.add(capsule(0.08, 0.16, '#f0a1b2', [0, 0, 0], [Math.PI / 2, 0, 0], [1.1, 0.75, 1]))
    g.add(ball(1, '#b07a5c', [0, -0.05, 0], [0.1, 0.03, 0.17]))
    g.add(ball(0.05, '#ffffff', [0, 0.06, 0.1]))
    return g
  },

  sock() {
    const tex = canvasTexture(32, 64, (g) => {
      g.fillStyle = P.red
      g.fillRect(0, 0, 32, 64)
      g.fillStyle = '#ffffff'
      for (const y of [6, 26, 46]) g.fillRect(0, y, 32, 8)
    })
    const g = new THREE.Group()
    const leg = textured(new THREE.CapsuleGeometry(0.06, 0.2, 6, 12), tex, 'sock')
    leg.position.set(0, 0.06, -0.04)
    g.add(leg)
    const foot = textured(new THREE.CapsuleGeometry(0.06, 0.12, 6, 12), tex, 'sock')
    foot.position.set(0, -0.08, 0.04)
    foot.rotation.x = Math.PI / 2
    g.add(foot)
    return g
  },

  bowl() {
    const g = new THREE.Group()
    const profile = [
      [0.1, -0.07],
      [0.17, -0.06],
      [0.2, 0.05],
      [0.18, 0.06],
      [0.15, -0.02],
      [0.0, -0.02],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    const lathe = new THREE.LatheGeometry(profile, 24)
    const m = new THREE.Mesh(lathe, toon(P.blue))
    m.add(new THREE.Mesh(lathe, outlineMaterial()))
    g.add(m)
    for (let i = 0; i < 9; i++) g.add(ball(0.035, P.brown, [Math.cos(i * 2.4) * 0.09 * (i % 3 ? 1 : 0.4), 0.0, Math.sin(i * 2.4) * 0.09 * (i % 3 ? 1 : 0.4)], [1, 0.7, 1]))
    g.add(cylinder(0.11, 0.11, 0.02, '#6f9cc6', [0, -0.07, 0]))
    return g
  },
}

export function buildToy(id: ToyId) {
  return TOYS[id]()
}
