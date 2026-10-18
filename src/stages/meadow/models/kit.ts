import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// The 3D look: flat storybook colours in a few soft tones, with ink round every shape.

export const INK = '#3d3431'

let gradient: THREE.DataTexture | null = null
/** Four tones of light, so shapes read as round without looking glossy. */
function gradientMap() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([110, 175, 225, 255]), 4, 1, THREE.RedFormat)
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter
    gradient.needsUpdate = true
  }
  return gradient
}

const toons = new Map<string, THREE.MeshToonMaterial>()
export function toon(color: string, opts: { vertexColors?: boolean; map?: THREE.Texture; key?: string } = {}) {
  const key = opts.key ?? `${color}|${opts.vertexColors ? 'v' : ''}`
  let m = toons.get(key)
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), vertexColors: !!opts.vertexColors, map: opts.map ?? null })
    toons.set(key, m)
  }
  return m
}

let outline: THREE.ShaderMaterial | null = null
/** Ink: the back faces, pushed out along their normals and filled flat. */
export function outlineMaterial() {
  outline ??= new THREE.ShaderMaterial({
    uniforms: { uWidth: { value: 0.022 }, uColor: { value: new THREE.Color(INK) } },
    vertexShader: /* glsl */ `
      uniform float uWidth;
      void main() {
        vec3 n = normalize(normal);
        #ifdef USE_INSTANCING
          vec4 p = instanceMatrix * vec4(position + n * uWidth, 1.0);
        #else
          vec4 p = vec4(position + n * uWidth, 1.0);
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * p;
      }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.BackSide,
  })
  return outline
}

/** A coloured shape with its ink outline. */
export function part(geo: THREE.BufferGeometry, color: string, ink = true) {
  const m = new THREE.Mesh(geo, toon(color))
  if (ink) m.add(new THREE.Mesh(geo, outlineMaterial()))
  return m
}

type V3 = [number, number, number]

export function place<T extends THREE.Object3D>(o: T, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 | number = 1): T {
  o.position.set(...pos)
  o.rotation.set(...rot)
  if (typeof scale === 'number') o.scale.setScalar(scale)
  else o.scale.set(...scale)
  return o
}

const sphereGeo = new THREE.SphereGeometry(1, 24, 16)
const lowSphereGeo = new THREE.SphereGeometry(1, 12, 8)
/** A sphere of radius r, squashed by `s`. */
export const ball = (r: number, color: string, pos: V3, s: V3 = [1, 1, 1], rot: V3 = [0, 0, 0], ink = true) =>
  place(part(sphereGeo, color, ink), pos, rot, [r * s[0], r * s[1], r * s[2]])

/** A small sphere with no outline: eyes, noses, highlights. */
export const dot = (r: number, color: string, pos: V3, s: V3 = [1, 1, 1]) => place(new THREE.Mesh(lowSphereGeo, toon(color)), pos, [0, 0, 0], [r * s[0], r * s[1], r * s[2]])

const capsules = new Map<string, THREE.CapsuleGeometry>()
/** A capsule: radius r, straight length len, standing along y unless rotated. */
export function capsule(r: number, len: number, color: string, pos: V3, rot: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) {
  const key = `${r}|${len}`
  let g = capsules.get(key)
  if (!g) capsules.set(key, (g = new THREE.CapsuleGeometry(r, len, 6, 16)))
  return place(part(g, color), pos, rot, s)
}

export const cone = (r: number, h: number, color: string, pos: V3, rot: V3 = [0, 0, 0], ink = true) => place(part(new THREE.ConeGeometry(r, h, 16), color, ink), pos, rot)

export const cylinder = (r0: number, r1: number, h: number, color: string, pos: V3, rot: V3 = [0, 0, 0]) => place(part(new THREE.CylinderGeometry(r0, r1, h, 18), color), pos, rot)

/** An eye: dark with a white glint. Returned as a group so it can blink (scale.y). */
export function eye(r: number, pos: V3) {
  const g = new THREE.Group()
  g.position.set(...pos)
  g.add(dot(r, INK, [0, 0, 0], [1, 1.12, 0.8]))
  g.add(dot(r * 0.34, '#ffffff', [r * 0.35, r * 0.42, r * 0.62]))
  return g
}

export const cheek = (r: number, pos: V3, rot: V3 = [0, 0, 0]) => place(new THREE.Mesh(lowSphereGeo, toon('#f2aaa5')), pos, rot, [r, r * 0.75, r * 0.35])

/** A tube along a curve, for tails and whiskers. */
export function tube(points: V3[], r: number, color: string, ink = true) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
  return part(new THREE.TubeGeometry(curve, 24, r, 8, false), color, ink)
}

/** Stripes, checks and other patterns are painted onto small canvas textures. */
export function canvasTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  paint(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/**
 * Bake many coloured shapes into one mesh (one draw call for a whole forest).
 * Each entry is a geometry already placed in world space and a colour.
 */
export function bake(pieces: { geo: THREE.BufferGeometry; color: string }[], ink = true) {
  const geos = pieces.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone()
    const c = new THREE.Color(color)
    const colors = new Float32Array(g.attributes.position.count * 3)
    for (let i = 0; i < colors.length; i += 3) c.toArray(colors, i)
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(name)) g.deleteAttribute(name)
    return g
  })
  const merged = mergeGeometries(geos)!
  geos.forEach((g) => g.dispose())
  const mesh = new THREE.Mesh(merged, toon('#ffffff', { vertexColors: true }))
  if (ink) mesh.add(new THREE.Mesh(merged, outlineMaterial()))
  return mesh
}

/** A geometry moved into place, for bake(). */
export function placed(geo: THREE.BufferGeometry, pos: V3, scale: V3 | number = 1, rot: V3 = [0, 0, 0]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale),
  )
  return geo.clone().applyMatrix4(m)
}

export const SPHERE = sphereGeo
