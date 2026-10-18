import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { create } from 'zustand'
import { P } from '../../art/palette'
import { sfx } from '../../audio/sfx'
import type { FriendId, SpotKind, ToyId } from '../../content'
import { InkPass, PARTICLES } from './ink'
import { HOME, POND, SPOTS, bushSpots, fog, heightAt, pathRibbon, pond, scatter, terrain, treeSpots } from './land'
import { buildFriend } from './models/critters'
import { buildBiped, type BipedLook } from './models/dog'
import { bake, ball, canvasTexture, outlineMaterial, toon } from './models/kit'
import { basket, bushPieces, cloud, flowerGeometry, grassGeometry, guideStar, hidingPlace, lilyPad, treePieces } from './models/props'
import { buildToy } from './models/toys'
import type { Body, Play } from './play'

// The 3D meadow scene. `Play` holds everything that moves; these components draw it.

export interface Cast {
  friend: FriendId
  toy: ToyId
  kind: SpotKind
}

/** What changes which models exist (React re-renders on these; everything else moves per frame). */
export const useWorld = create<{ cast: (Cast | null)[]; placed: ToyId[]; drape: boolean }>(() => ({
  cast: SPOTS.map(() => null),
  placed: [],
  drape: false,
}))

/** Where each toy is put down round the basket, as offsets from it. */
const RESTING: Record<ToyId, [number, number]> = {
  ball: [-1.55, 1.15],
  bone: [1.45, 1.2],
  blanket: [0, 0],
  teddy: [-1.35, -0.25],
  slipper: [1.95, 0.45],
  sock: [0.35, 1.6],
  bowl: [2.05, -0.65],
}
export const restingAt = (id: ToyId) => {
  const [x, z] = RESTING[id]
  const p = new THREE.Vector3(HOME.at.x + x, 0, HOME.at.z + z)
  return p.setY(heightAt(p.x, p.z) + (id === 'blanket' ? 0.55 : 0.17))
}
/** Where Tiger curls up, beside the basket. */
export const BED = (() => {
  const p = new THREE.Vector3(HOME.at.x - 2.2, 0, HOME.at.z + 0.05)
  return p.setY(heightAt(p.x, p.z))
})()

function Stepper({ play }: { play: Play }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    play.camera = camera
    play.canvas = gl.domElement
  }, [play, camera, gl])
  useFrame((s, dt) => play.step(dt, s.clock.elapsedTime), -2)
  return null
}

function Renderer({ play }: { play: Play }) {
  const ink = useMemo(() => new InkPass(), [])
  const size = useMemo(() => new THREE.Vector2(), [])
  const day = useMemo(() => fog.color.clone(), [])
  const dusk = useMemo(() => new THREE.Color('#5b5f86'), [])
  useEffect(() => () => ink.dispose(), [ink])
  useFrame(({ gl, scene, camera }) => {
    ink.uniforms.uNight.value = play.night
    fog.color.lerpColors(day, dusk, play.night)
    ;(scene.fog as THREE.Fog | null)?.color.copy(fog.color)
    gl.getDrawingBufferSize(size)
    ink.setSize(size.x, size.y, gl.getPixelRatio())
    ink.render(gl, scene, camera as THREE.PerspectiveCamera)
  }, 1)
  return null
}

function Lights({ play }: { play: Play }) {
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  useFrame(() => {
    const n = play.night
    if (hemi.current) hemi.current.intensity = 1.7 - n * 0.9
    if (sun.current) sun.current.intensity = 2.2 - n * 1.6
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff6e3', '#a2c97c', 1.7]} />
      <directionalLight ref={sun} position={[12, 18, 9]} intensity={2.2} />
    </>
  )
}

function Land({ play }: { play: Play }) {
  const t = useMemo(terrain, [])
  const p = useMemo(pathRibbon, [])
  const w = useMemo(pond, [])
  const pads = useMemo(
    () =>
      [
        [-2.6, -0.8],
        [1.8, 0.9],
        [3.4, -0.6],
      ].map(([x, z], i) => {
        const m = lilyPad()
        m.position.set(POND.x + x, POND.level + 0.012, POND.z + z)
        m.rotation.y = i * 2
        return m
      }),
    [],
  )
  const ripple = useRef({ x: 0, z: 0, at: -99 })
  useFrame(({ clock }) => {
    w.mat.uniforms.uTime.value = clock.elapsedTime
    const k = play.kipper
    // Wading leaves ripples behind him.
    if (k.wet && k.speed > 0.5 && clock.elapsedTime - ripple.current.at > 0.5) ripple.current = { x: k.pos.x, z: k.pos.z, at: clock.elapsedTime }
    w.mat.uniforms.uRipple.value.set(ripple.current.x, ripple.current.z, ripple.current.at, 0)
  })
  useEffect(
    () => () => {
      for (const o of [t, p, w]) {
        o.geo.dispose()
        o.mat.dispose()
      }
    },
    [t, p, w],
  )
  // Tapping or clicking the grass sends Kipper running there.
  const runThere = (e: ThreeEvent<MouseEvent>) => {
    if (play.mode !== 'explore' || e.delta > 10) return
    e.stopPropagation()
    play.input.tapTarget = e.point.clone()
    play.input.lastInput = performance.now() / 1000
    play.spawn(e.point, 'sparkle', 4)
  }
  return (
    <>
      <mesh geometry={t.geo} material={t.mat} onClick={runThere} />
      <mesh geometry={p.geo} material={p.mat} onClick={runThere} />
      <mesh
        geometry={w.geo}
        material={w.mat}
        onClick={(e) => {
          runThere(e)
          ripple.current = { x: e.point.x, z: e.point.z, at: performance.now() / 1000 }
          sfx.plop()
        }}
      />
      {pads.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  )
}

function Forest() {
  const forest = useMemo(() => {
    const pieces = treeSpots().flatMap((t, i) => treePieces(t.at.x, t.at.y - 0.1, t.at.z, 0.55 * t.size, i))
    pieces.push(...bushSpots().flatMap((b) => bushPieces(b.x, b.y - 0.05, b.z, 0.75, false)))
    return bake(pieces)
  }, [])
  const clouds = useRef<THREE.Group>(null)
  const sky = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const c = cloud(i + 1)
        const a = (i / 9) * Math.PI * 2
        c.position.set(Math.cos(a) * 52, 16 + (i % 3) * 4, -8 + Math.sin(a) * 40)
        c.scale.setScalar(1.4 + (i % 2) * 0.5)
        return c
      }),
    [],
  )
  useFrame((_, dt) => {
    if (clouds.current) clouds.current.rotation.y += dt * 0.004
  })
  return (
    <>
      <primitive object={forest} />
      <group ref={clouds} position={[0, 0, -8]}>
        {sky.map((c, i) => (
          <primitive key={i} object={c} position={[c.position.x, c.position.y, c.position.z + 8]} />
        ))}
      </group>
    </>
  )
}

/** Flowers in four colours and grass tufts. Flowers spring up and chime when tapped or run through. */
function Flowers({ play }: { play: Play }) {
  const colours = [P.pink, '#ffffff', P.yellow, P.bluePale]
  const groups = useMemo(() => colours.map((c, i) => ({ geo: flowerGeometry(c), points: scatter(36, 100 + i) })), [])
  const grass = useMemo(() => ({ geo: grassGeometry(), points: scatter(280, 7, 0.9) }), [])
  const refs = useRef<THREE.InstancedMesh[]>([])
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const bounce = useRef(new Map<string, number>())
  const noteAt = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const mat = useMemo(() => toon('#ffffff', { vertexColors: true }), [])
  const set = (mesh: THREE.InstancedMesh, p: THREE.Vector3, i: number, s: number) => {
    dummy.position.copy(p)
    dummy.rotation.set(0, i * 1.7, 0)
    dummy.scale.setScalar(s * (0.85 + ((i * 7) % 5) * 0.08))
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  useLayoutEffect(() => {
    groups.forEach((g, gi) => g.points.forEach((p, i) => set(refs.current[gi], p, i, 1)))
    refs.current.forEach((m) => (m.instanceMatrix.needsUpdate = true))
    grass.points.forEach((p, i) => set(grassRef.current!, p, i, 1))
    grassRef.current!.instanceMatrix.needsUpdate = true
  })
  const poke = (gi: number, i: number) => {
    const key = `${gi}:${i}`
    if (bounce.current.has(key)) return
    bounce.current.set(key, 0)
    const now = performance.now()
    if (now - noteAt.current > 110) {
      noteAt.current = now
      sfx.note(gi * 3 + i)
    }
  }
  useFrame((_, dt) => {
    const k = play.kipper
    if (k.speed > 0.5)
      groups.forEach((g, gi) =>
        g.points.forEach((p, i) => {
          if (Math.abs(p.x - k.pos.x) < 0.55 && Math.abs(p.z - k.pos.z) < 0.55) poke(gi, i)
        }),
      )
    if (!bounce.current.size) return
    for (const [key, t] of bounce.current) {
      const [gi, i] = key.split(':').map(Number)
      const next = t + dt * 2
      set(refs.current[gi], groups[gi].points[i], i, 1 + Math.sin(Math.min(1, next) * Math.PI * 2) * (1 - Math.min(1, next)) * 0.7)
      refs.current[gi].instanceMatrix.needsUpdate = true
      if (next >= 1) bounce.current.delete(key)
      else bounce.current.set(key, next)
    }
  })
  return (
    <>
      {groups.map((g, gi) => (
        <instancedMesh
          key={gi}
          ref={(m) => void (m && (refs.current[gi] = m))}
          args={[g.geo, mat, g.points.length]}
          onPointerDown={(e) => {
            if (e.instanceId === undefined) return
            e.stopPropagation()
            poke(gi, e.instanceId)
          }}
        />
      ))}
      <instancedMesh ref={grassRef} args={[grass.geo, mat, grass.points.length]} raycast={() => {}} />
    </>
  )
}

function HidingPlace({ play, index }: { play: Play; index: number }) {
  const kind = useWorld((s) => s.cast[index]?.kind ?? 'bush')
  const model = useMemo(() => hidingPlace(kind), [kind])
  const s = play.spots[index]
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime
    g.rotation.z = s.rustle ? Math.sin(t * 16) * 0.05 * (0.6 + 0.4 * Math.sin(t * 2.3)) : 0
    g.scale.set(1, s.rustle ? 1 + Math.sin(t * 9) * 0.04 : 1, 1)
  })
  // Face the meadow's middle, so logs and holes look towards where Kipper comes from.
  const facing = Math.atan2(-s.at.x, -8 - s.at.z)
  return (
    <group ref={ref} position={s.at} rotation={[0, facing, 0]}>
      <primitive object={model} />
    </group>
  )
}

function Friend({ play, index, cast, onTap }: { play: Play; index: number; cast: Cast; onTap: () => void }) {
  const rig = useMemo(() => buildFriend(cast.friend), [cast.friend])
  const toy = useMemo(() => buildToy(cast.toy), [cast.toy])
  const s = play.spots[index]
  const blink = useRef({ next: 2, until: 0 })
  useLayoutEffect(() => {
    toy.scale.setScalar(rig.toySize / 0.36)
    rig.hold.add(toy)
    play.toys[index] = toy
    return () => {
      rig.hold.remove(toy)
      play.toys[index] = null
    }
  }, [rig, toy, play, index])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    rig.root.visible = s.friendVisible
    rig.root.position.copy(s.friendPos)
    rig.root.rotation.y = s.friendHeading
    toy.visible = s.toyVisible
    const talk = s.talking ? Math.sin(t * 15) * 0.04 : 0
    rig.body.scale.set(1 + s.squash * 0.15 - talk * 0.5, 1 - s.squash * 0.15 + talk + Math.sin(t * 2.2) * 0.012, 1 + s.squash * 0.15)
    rig.ears.forEach((e, i) => (e.rotation.x = Math.sin(t * 3 + i) * 0.08))
    const b = blink.current
    if (t > b.next) {
      b.until = t + 0.12
      b.next = t + 2.5 + Math.random() * 3
    }
    rig.eyes.forEach((e) => (e.scale.y = t < b.until ? 0.12 : 1))
  })
  return (
    <primitive
      object={rig.root}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        if (!s.friendVisible) return
        e.stopPropagation()
        onTap()
        void play.tweens.run(600, (k) => (s.squash = Math.sin(k * Math.PI * 3) * (1 - k)))
      }}
    />
  )
}

function Friends({ play, onTap }: { play: Play; onTap: () => void }) {
  const cast = useWorld((s) => s.cast)
  return (
    <>
      {cast.map((c, i) => (
        <group key={i}>
          <HidingPlace play={play} index={i} />
          {c && <Friend key={`${c.friend}-${c.toy}`} play={play} index={i} cast={c} onTap={onTap} />}
        </group>
      ))}
    </>
  )
}

function Dog({ look, body, onTap }: { look: BipedLook; body: Body; onTap: () => void }) {
  const rig = useMemo(() => buildBiped(look), [look])
  const st = useRef({ gait: 0, ear: 0, blinkUntil: 0, nextBlink: 2 })
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    const s = st.current
    const r = rig
    r.root.visible = !body.hidden
    r.root.position.set(body.pos.x, body.pos.y + body.lift - (body.wet ? 0.2 : 0), body.pos.z)
    r.root.rotation.y = body.heading
    const sad = body.face === 'sad'
    if (body.asleep) {
      // Dozing sitting up: legs out in front, slumped forward, chin on his chest, paws in his lap.
      r.body.rotation.set(0.32, 0, 0)
      r.body.position.set(0, -0.3 + Math.sin(t * 1.6) * 0.01, -0.05)
      r.legs.forEach((l) => (l.rotation.x = -1.45))
      r.arms.forEach((a, i) => a.rotation.set(-0.75, 0, (i ? -1 : 1) * 0.45))
      r.head.rotation.set(0.55, 0, 0.12)
      r.ears.forEach((e) => (e.rotation.x = 0.3))
      r.eyes.forEach((e) => (e.scale.y = 0.12))
      r.tail.rotation.set(1.3, Math.sin(t * 1.2) * 0.2, 0)
      return
    }
    const amp = Math.min(1, body.speed / 4.5)
    s.gait += dt * (6.5 + body.speed * 2.2)
    const air = body.lift > 0.03
    const swing = Math.sin(s.gait) * 0.95 * amp
    r.arms.forEach((a, i) => (a.rotation.z = (i ? -1 : 1) * r.armOut))
    // Legs stride in turn and the arms swing against them; in the air, one knee up and both arms high.
    r.legs[0].rotation.x = air ? -0.75 : swing
    r.legs[1].rotation.x = air ? 0.35 : -swing
    const armRest = Math.sin(t * 1.5) * 0.05 * (1 - amp)
    r.arms[0].rotation.x = air ? -2.7 : -swing * 0.9 + armRest
    r.arms[1].rotation.x = air ? -2.7 : swing * 0.9 + armRest
    r.body.rotation.set(0.16 * amp, 0, Math.sin(s.gait) * 0.05 * amp)
    r.body.position.set(0, Math.abs(Math.cos(s.gait)) * 0.07 * amp, 0)
    r.head.rotation.set((sad ? 0.35 : 0) - 0.12 * amp + Math.sin(t * 1.3) * 0.02, 0, 0)
    r.tail.rotation.set(sad ? 0.9 : 0, Math.sin(t * (sad ? 3 : body.face === 'happy' ? 15 : 8)) * (sad ? 0.1 : 0.6), 0)
    // Ears fly back as he runs and bounce with each stride.
    s.ear += (-amp * 0.7 + Math.cos(s.gait * 2) * 0.18 * amp + (sad ? 0.2 : 0) - s.ear) * Math.min(1, dt * 10)
    r.ears.forEach((e) => (e.rotation.x = s.ear * r.earFlop))
    if (t > s.nextBlink) {
      s.blinkUntil = t + 0.12
      s.nextBlink = t + 2.5 + Math.random() * 3
    }
    r.eyes.forEach((e) => (e.scale.y = t < s.blinkUntil ? 0.12 : 1))
  })
  return (
    <primitive
      object={rig.root}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onTap()
      }}
    />
  )
}

const blanketChecks = () =>
  canvasTexture(64, 64, (g) => {
    g.fillStyle = P.blue
    g.fillRect(0, 0, 64, 64)
    g.fillStyle = P.yellow
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) g.fillRect(i * 8 + 1, j * 16 + 2, 6, 12)
  })

function Home() {
  const placed = useWorld((s) => s.placed)
  const drape = useWorld((s) => s.drape)
  const bed = useMemo(basket, [])
  const toys = useMemo(() => new Map<ToyId, THREE.Object3D>(), [])
  // The blanket over Kipper: a soft checked dome rather than the folded toy.
  const blanket = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const m = new THREE.Mesh(geo, toon('#ffffff', { map: blanketChecks(), key: 'drape' }))
    m.add(new THREE.Mesh(geo, outlineMaterial()))
    m.scale.set(0.62, 0.42, 0.5)
    m.position.set(HOME.at.x - 0.12, HOME.at.y + 0.22, HOME.at.z)
    return m
  }, [])
  const get = (id: ToyId) => {
    let o = toys.get(id)
    if (!o) {
      o = buildToy(id)
      o.position.copy(restingAt(id))
      o.rotation.y = Object.keys(RESTING).indexOf(id) * 1.3
      toys.set(id, o)
    }
    return o
  }
  return (
    <>
      <primitive object={bed} position={HOME.at} />
      {drape && <primitive object={blanket} />}
      {placed
        .filter((id) => id !== 'blanket')
        .map((id) => (
          <primitive key={id} object={get(id)} />
        ))}
    </>
  )
}

/** The golden star over whatever she should find next. */
function Star({ play }: { play: Play }) {
  const star = useMemo(guideStar, [])
  useFrame(({ clock }, dt) => {
    star.visible = !!play.star
    if (!play.star) return
    star.position.set(play.star.x, play.star.y + 2.6 + Math.sin(clock.elapsedTime * 2.5) * 0.18, play.star.z)
    star.rotation.y += dt * 2
  })
  return <primitive object={star} />
}

function Particles({ play }: { play: Play }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 80)
    m.layers.set(PARTICLES)
    m.frustumCulled = false
    m.raycast = () => {}
    return m
  }, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    play.particles.forEach((p, i) => {
      dummy.position.copy(p.pos)
      dummy.scale.setScalar(p.size * (1 - p.life / p.max))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, p.color)
    })
    mesh.count = play.particles.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return <primitive object={mesh} />
}

/** Butterflies wander over the flowers, and scatter when Kipper runs at them or barks. */
function Butterflies({ play }: { play: Play }) {
  const flock = useMemo(
    () =>
      [
        [-6, -3, P.yellow],
        [9, -3, P.pink],
        [-12, -14, P.bluePale],
        [6, -17, P.yellow],
        [15, -9, P.pink],
      ].map(([x, z, c], i) => {
        const g = new THREE.Group()
        g.add(ball(0.02, '#3d3431', [0, 0, 0], [1, 1, 4], [0, 0, 0], false))
        const wings = [-1, 1].map((s) => {
          const w = new THREE.Group()
          w.add(ball(1, c as string, [s * 0.09, 0, 0], [0.09, 0.01, 0.07]))
          g.add(w)
          return w
        })
        return { g, wings, home: new THREE.Vector3(x as number, 0, z as number), seed: i * 1.7, scare: 0 }
      }),
    [],
  )
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const k = play.kipper
    for (const b of flock) {
      const near = Math.hypot(b.g.position.x - k.pos.x, b.g.position.z - k.pos.z)
      if ((near < 1.4 && k.speed > 1) || (t - play.barkAt.t < 0.3 && near < 6)) b.scare = 1
      b.scare = Math.max(0, b.scare - dt * 0.35)
      const s = 1 + b.scare * 3
      const x = b.home.x + Math.sin(t * 0.37 * s + b.seed) * 2.6
      const z = b.home.z + Math.cos(t * 0.29 * s + b.seed * 2) * 1.8
      b.g.position.set(x, heightAt(x, z) + 0.9 + Math.sin(t * 1.9 + b.seed) * 0.25 + b.scare * 2.4, z)
      b.g.rotation.y = t * 0.6 + b.seed
      const flap = Math.sin(t * 16 + b.seed) * 0.9
      b.wings[0].rotation.z = flap
      b.wings[1].rotation.z = -flap
    }
  })
  return (
    <>
      {flock.map((b, i) => (
        <primitive key={i} object={b.g} />
      ))}
    </>
  )
}

/** HTML bits that follow the 3D world: the arrow to an off-screen star, and Kipper's snores. */
function Pointers({ play, compass, zzz }: { play: Play; compass: HTMLElement; zzz: HTMLElement }) {
  useFrame(() => {
    if (!play.camera || !play.canvas) return
    const show = !!play.star && play.mode === 'explore'
    if (show) {
      const s = play.toScreen(play.star!.clone().setY(play.star!.y + 1))
      const { width: w, height: h, left, top } = s.rect
      const inView = s.front && s.x > left + 40 && s.x < left + w - 40 && s.y > top + 60 && s.y < top + h - 40
      compass.hidden = inView
      if (!inView) {
        let dx = s.x - (left + w / 2)
        let dy = s.y - (top + h / 2)
        if (!s.front) {
          dx = -dx
          dy = Math.abs(dy) + h
        }
        const a = Math.atan2(dy, dx)
        const r = Math.min(w, h) * 0.42
        compass.style.transform = `translate(${left + w / 2 + Math.cos(a) * r}px,${top + h / 2 + Math.sin(a) * r}px) rotate(${a}rad)`
      }
    } else compass.hidden = true
    if (!zzz.hidden) {
      const s = play.toScreen(HOME.at.clone().setY(HOME.at.y + 1.3))
      zzz.style.transform = `translate(${s.x}px,${s.y}px)`
    }
  })
  return null
}

export function World(props: {
  play: Play
  tigerLook: BipedLook
  kipperLook: BipedLook
  onDogTap(who: 'kipper' | 'tiger'): void
  onFriendTap(): void
  compass: HTMLElement
  zzz: HTMLElement
}) {
  const { play } = props
  return (
    <>
      <Stepper play={play} />
      <Lights play={play} />
      <Land play={play} />
      <Forest />
      <Flowers play={play} />
      <Friends play={play} onTap={props.onFriendTap} />
      <Home />
      <Dog look={props.kipperLook} body={play.kipper} onTap={() => props.onDogTap('kipper')} />
      <Dog look={props.tigerLook} body={play.tiger} onTap={() => props.onDogTap('tiger')} />
      <Star play={play} />
      <Butterflies play={play} />
      <Particles play={play} />
      <Pointers play={play} compass={props.compass} zzz={props.zzz} />
      <Renderer play={play} />
    </>
  )
}
