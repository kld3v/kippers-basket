import * as THREE from 'three'

// The meadow: a flat-ish field inside a ring of hills, a sandy path looping round a pond,
// home at the front, and seven hiding places along the way. All distances in world units;
// Kipper is about 1.45 tall. The camera always looks towards -z, so "behind" means smaller z.

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export const MEADOW = { cx: 0, cz: -8, rx: 34, rz: 22 }
export const POND = { x: 0, z: -8.5, rx: 6.5, rz: 3.2, level: -0.12 }

export function heightAt(x: number, z: number) {
  const roll = 0.26 * Math.sin(0.23 * x + 0.5) * Math.cos(0.19 * z + 0.3) + 0.18 * Math.sin(0.11 * x - 0.13 * z + 1.7)
  const e = Math.hypot((x - MEADOW.cx) / MEADOW.rx, (z - MEADOW.cz) / MEADOW.rz)
  const hills = smooth(1.02, 2.1, e) * (4.4 + 2.2 * Math.sin(0.09 * x + 1) + 1.4 * Math.sin(0.13 * z))
  const p = Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz)
  const dip = smooth(1.15, 0.55, p) * 0.55
  return roll + hills - dip
}

/** A seeded random, so the meadow is laid out the same way every time. */
export function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The path: a wobbly loop starting at home (front middle) and going round clockwise as seen from above.
const LOOP = { cx: 0, cz: -8, rx: 22, rz: 10.5 }
const routeAt = (theta: number) =>
  new THREE.Vector3(
    LOOP.cx + LOOP.rx * Math.cos(theta) + 1.6 * Math.sin(3 * theta + 0.6),
    0,
    LOOP.cz + LOOP.rz * Math.sin(theta) + 0.9 * Math.cos(2 * theta + 1.1),
  )
const HOME_THETA = Math.PI / 2
const thetaOf = (stop: number) => HOME_THETA - (stop * Math.PI * 2) / 8

export const route = new THREE.CatmullRomCurve3(
  Array.from({ length: 48 }, (_, i) => routeAt((i / 48) * Math.PI * 2)),
  true,
  'centripetal',
)

const ground = (v: THREE.Vector3) => v.setY(heightAt(v.x, v.z))

export interface Place {
  /** Where the hiding place (or basket) stands. */
  at: THREE.Vector3
  /** Where Kipper stops to say hello. */
  stand: THREE.Vector3
  /** Where Tiger waits, a little behind him. */
  wait: THREE.Vector3
  /** Where the friend lands after hopping out. */
  out: THREE.Vector3
}

/** A stop on the path, with its hiding place set just behind the path (away from the camera). */
function place(stop: number): Place {
  const theta = thetaOf(stop)
  const p = routeAt(theta)
  const radial = new THREE.Vector3(p.x - LOOP.cx, 0, p.z - LOOP.cz).normalize()
  if (radial.z > 0) radial.negate() // front half: put it inside the loop, behind the path
  const at = p.clone().addScaledVector(radial, 2.1).add(new THREE.Vector3(0, 0, -0.6))
  // Every meeting looks the same as the storybook: Kipper on the left facing right, the friend
  // out in front of their hiding place, a clear step apart so neither hides the other.
  const stand = at.clone().add(new THREE.Vector3(-2.9, 0, 1.6))
  const wait = stand.clone().add(new THREE.Vector3(-1.7, 0, -0.5))
  const out = at.clone().add(new THREE.Vector3(-0.35, 0, 1.3))
  return { at: ground(at), stand: ground(stand), wait: ground(wait), out: ground(out) }
}

export const HOME: Place = (() => {
  const p = routeAt(HOME_THETA)
  const at = p.clone().add(new THREE.Vector3(1.2, 0, -1.6))
  return {
    at: ground(at),
    stand: ground(p.clone().add(new THREE.Vector3(-1.4, 0, 0.4))),
    wait: ground(p.clone().add(new THREE.Vector3(-3.2, 0, -0.2))),
    out: ground(at.clone()),
  }
})()

export const SPOTS: Place[] = Array.from({ length: 7 }, (_, i) => place(i + 1))

/** How far a point is from the path, for keeping flowers and trees off it. */
const routeSamples = route.getSpacedPoints(240)
export const distanceToPath = (x: number, z: number) => Math.min(...routeSamples.map((p) => Math.hypot(p.x - x, p.z - z)))

const nearPlaces = (x: number, z: number, r: number) => [HOME, ...SPOTS].some((s) => Math.hypot(s.at.x - x, s.at.z - z) < r || Math.hypot(s.stand.x - x, s.stand.z - z) < r)
const inPond = (x: number, z: number, pad = 1.2) => Math.hypot((x - POND.x) / (POND.rx + pad), (z - POND.z) / (POND.rz + pad)) < 1

/** Trees ring the meadow, but never between the camera and the path. */
export function treeSpots() {
  const rand = seeded(7)
  const out: { at: THREE.Vector3; kind: number; size: number }[] = []
  for (let i = 0; out.length < 46 && i < 2000; i++) {
    const a = rand() * Math.PI * 2
    const e = 1.02 + rand() * 0.75
    const x = MEADOW.cx + Math.cos(a) * MEADOW.rx * e
    const z = MEADOW.cz + Math.sin(a) * MEADOW.rz * e
    if (z > -1 && Math.abs(x) < 30) continue
    if (out.some((t) => Math.hypot(t.at.x - x, t.at.z - z) < 3.2)) continue
    out.push({ at: ground(new THREE.Vector3(x, 0, z)), kind: Math.floor(rand() * 3), size: 1.6 + rand() * 1.4 })
  }
  // A few inside the loop, by the pond.
  for (const [x, z] of [[-9, -12.5], [8.5, -12], [-4, -4], [11, -5.5]]) out.push({ at: ground(new THREE.Vector3(x, 0, z)), kind: out.length % 3, size: 1.5 })
  return out
}

export function bushSpots() {
  const rand = seeded(11)
  const out: THREE.Vector3[] = []
  for (let i = 0; out.length < 12 && i < 2000; i++) {
    const x = -30 + rand() * 60
    const z = -26 + rand() * 26
    if (distanceToPath(x, z) < 2.6 || inPond(x, z) || nearPlaces(x, z, 3.5) || z > 1) continue
    out.push(ground(new THREE.Vector3(x, 0, z)))
  }
  return out
}

/** Flowers and grass tufts scattered over the field, kept off the path and out of the pond. */
export function scatter(count: number, seed: number, minPath = 1.1) {
  const rand = seeded(seed)
  const out: THREE.Vector3[] = []
  for (let i = 0; out.length < count && i < count * 40; i++) {
    const a = rand() * Math.PI * 2
    const e = Math.sqrt(rand()) * 1.08
    const x = MEADOW.cx + Math.cos(a) * MEADOW.rx * e
    const z = MEADOW.cz + Math.sin(a) * MEADOW.rz * e
    if (z > 8 || distanceToPath(x, z) < minPath || inPond(x, z, 0.4) || nearPlaces(x, z, 1.6)) continue
    out.push(ground(new THREE.Vector3(x, 0, z)))
  }
  return out
}

// ---- Materials: flat watercolour greens, fogging into the sky like the storybook's far hills.

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`

export const fog = {
  color: new THREE.Color('#e9efe3'),
  near: 26,
  far: 95,
}

const fogUniforms = () => ({ uFog: { value: fog.color }, uFogNear: { value: fog.near }, uFogFar: { value: fog.far } })

export function terrain() {
  const geo = new THREE.PlaneGeometry(220, 150, 220, 150)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, 0, -35)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)))
  geo.computeVertexNormals()
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      uSun: { value: new THREE.Vector3(0.4, 0.8, 0.45).normalize() },
      uPond: { value: new THREE.Vector4(POND.x, POND.z, POND.rx, POND.rz) },
      uPondLevel: { value: POND.level },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos; varying vec3 vN; varying float vDist;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPos = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * wp; vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform vec3 uFog; uniform float uFogNear, uFogFar, uPondLevel; uniform vec4 uPond;
      varying vec3 vPos; varying vec3 vN; varying float vDist;
      ${NOISE}
      void main() {
        float n = noise(vPos.xz * 0.12) * 0.6 + noise(vPos.xz * 0.45) * 0.4;
        vec3 col = mix(vec3(0.663, 0.812, 0.486), vec3(0.561, 0.745, 0.420), smoothstep(0.35, 0.7, n));
        col = mix(col, vec3(0.80, 0.89, 0.64), smoothstep(0.6, 0.85, noise(vPos.xz * 0.05 + 3.1)) * 0.45);
        col = mix(col, vec3(0.84, 0.90, 0.69), smoothstep(1.5, 5.0, vPos.y) * 0.55);
        col *= 0.86 + 0.2 * clamp(dot(normalize(vN), uSun), 0.0, 1.0);
        // Muddy bank and an inked shoreline, only round the pond itself.
        float nearPond = step(length((vPos.xz - uPond.xy) / (uPond.zw * 1.35)), 1.0);
        float dh = vPos.y - uPondLevel;
        col = mix(col, vec3(0.58, 0.50, 0.38), smoothstep(0.14, 0.0, dh) * 0.55 * nearPond);
        col = mix(col, vec3(0.24, 0.20, 0.19), smoothstep(0.04, 0.0, abs(dh)) * 0.85 * nearPond);
        gl_FragColor = vec4(mix(col, uFog, smoothstep(uFogNear, uFogFar, vDist)), 1.0);
      }`,
  })
  return { geo, mat }
}

export function pathRibbon() {
  const n = 600
  const width = 1.55
  const pts = route.getSpacedPoints(n)
  const length = route.getLength()
  const positions: number[] = []
  const uvs: number[] = []
  const index: number[] = []
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n]
    const t = route.getTangentAt((i % n) / n)
    const side = new THREE.Vector3(-t.z, 0, t.x).normalize()
    for (const s of [-1, 1]) {
      const x = p.x + side.x * s * width * 0.5
      const z = p.z + side.z * s * width * 0.5
      positions.push(x, heightAt(x, z) + 0.035, z)
      uvs.push((i / n) * length, s < 0 ? 0 : 1)
    }
    if (i < n) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(index)
  const mat = new THREE.ShaderMaterial({
    uniforms: fogUniforms(),
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vDist;
      void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog; uniform float uFogNear, uFogFar;
      varying vec2 vUv; varying float vDist;
      ${NOISE}
      void main() {
        float wob = (noise(vec2(vUv.x * 1.3, 0.5)) - 0.5) * 0.16;
        float edge = min(vUv.y, 1.0 - vUv.y) + wob;
        // A steady pen width: a fixed share of the path up close, about a pixel and a half far away.
        float px = fwidth(vUv.y);
        float w = max(0.03, px * 1.2);
        float ink = 1.0 - smoothstep(w, w + px * 1.2, edge);
        vec2 cell = vec2(vUv.x * 1.6, vUv.y * 3.0);
        vec2 f = fract(cell) - 0.5;
        float peb = hash(floor(cell)) > 0.8 ? smoothstep(0.16, 0.1, length(f * vec2(1.0, 1.7))) : 0.0;
        vec3 col = mix(vec3(0.937, 0.863, 0.698), vec3(0.83, 0.77, 0.66), peb);
        col = mix(col, vec3(0.92, 0.84, 0.66), noise(vUv * vec2(0.6, 2.0)) * 0.4);
        col = mix(col, vec3(0.24, 0.20, 0.19), ink * 0.7);
        gl_FragColor = vec4(mix(col, uFog, smoothstep(uFogNear, uFogFar, vDist)), 1.0);
      }`,
  })
  return { geo, mat }
}

export function pond() {
  const geo = new THREE.CircleGeometry(1, 64)
  geo.rotateX(-Math.PI / 2)
  geo.scale(POND.rx * 1.25, 1, POND.rz * 1.25)
  geo.translate(POND.x, POND.level, POND.z)
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...fogUniforms(), uTime: { value: 0 }, uRipple: { value: new THREE.Vector4(0, 0, -99, 0) } },
    vertexShader: /* glsl */ `
      varying vec3 vPos; varying float vDist;
      void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog; uniform float uFogNear, uFogFar, uTime; uniform vec4 uRipple;
      varying vec3 vPos; varying float vDist;
      ${NOISE}
      void main() {
        vec3 col = mix(vec3(0.62, 0.79, 0.89), vec3(0.74, 0.86, 0.93), noise(vPos.xz * 0.6 + uTime * 0.05));
        float shine = smoothstep(0.78, 0.95, noise(vPos.xz * vec2(0.4, 1.4) + vec2(uTime * 0.12, 0.0)));
        col = mix(col, vec3(1.0), shine * 0.5);
        float age = uTime - uRipple.z;
        float d = distance(vPos.xz, uRipple.xy);
        float ring = age < 2.0 ? smoothstep(0.08, 0.0, abs(d - age * 1.4)) * (1.0 - age / 2.0) : 0.0;
        col = mix(col, vec3(1.0), ring * 0.8);
        gl_FragColor = vec4(mix(col, uFog, smoothstep(uFogNear, uFogFar, vDist)), 1.0);
      }`,
  })
  return { geo, mat }
}
