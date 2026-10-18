import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { sfx } from '../../audio/sfx'
import type { ToyId } from '../../content'
import type { StageHost } from '../types'
import { ease, useMeadow, type Ctl, type Dog as DogState } from './ctl'
import { InkPass, LAND, PAPER, paperSort } from './ink'
import { HOME, POND, SPOTS, bushSpots, fog, heightAt, pathRibbon, pond, scatter, terrain, treeSpots } from './land'
import { DOG_PIECES, type Art, type DogArt, type MeadowArt } from './textures'

// The meadow scene. Everything you see is the storybook's own artwork on paper cut-outs,
// standing in a real 3D landscape; only the land itself is 3D geometry.

/** Drawing units to world units: Kipper is 1.45 tall, friends 1.3, hiding places 2.7 wide, the basket 2.3. */
export const DOG_S = 1.45 / 220
export const FRIEND_S = 1.3 / 220
export const SPOT_S = 2.7 / 220
export const BASKET_S = 2.3 / 260
export const TOY_SIZE = 0.55

/** Where each toy ends up round the basket (offsets from the basket); the blanket goes over Kipper. */
export const RESTING: Record<ToyId, [x: number, z: number, onRim?: number]> = {
  ball: [-1.55, 0.95],
  bone: [1.25, 1.05],
  blanket: [0, 0.1, 0.45],
  teddy: [-0.85, 0.05, 0.62],
  slipper: [1.95, 0.55],
  sock: [0.3, 1.4],
  bowl: [2.55, 0.05],
}

export const restingAt = (id: ToyId) => {
  const [x, z, rim] = RESTING[id]
  const p = new THREE.Vector3(HOME.at.x + x, 0, HOME.at.z + z)
  return p.setY(rim !== undefined ? HOME.at.y + rim : heightAt(p.x, p.z))
}

const v3 = new THREE.Vector3()

/** Taps only count on the drawn part of a cut-out, not its transparent corners. */
function solidRaycast(art: Art) {
  return function (this: THREE.Mesh, rc: THREE.Raycaster, hits: THREE.Intersection[]) {
    const before = hits.length
    THREE.Mesh.prototype.raycast.call(this, rc, hits)
    for (let i = hits.length - 1; i >= before; i--) {
      const uv = hits[i].uv
      if (!uv || !art.solid(uv.x, uv.y)) hits.splice(i, 1)
    }
  }
}

const onLayer = (layer: number) => (o: THREE.Object3D | null) => {
  o?.layers.enable(layer)
}

interface PaperProps {
  art: Art
  scale: number
  /** The drawing point that sits at the mesh's origin (its feet, or the joint it swings from). */
  anchor: readonly [number, number]
  ctl: Ctl
  layer?: number
  meshRef?: React.Ref<THREE.Mesh>
  position?: [number, number, number]
}

/** One drawing on a flat card. */
function Paper({ art, scale, anchor, ctl, layer = 0, meshRef, position }: PaperProps) {
  const [geo, mat] = useMemo(() => {
    const [bx, by, bw, bh] = art.box
    const g = new THREE.PlaneGeometry(bw * scale, bh * scale)
    g.translate((bx + bw / 2 - anchor[0]) * scale, (anchor[1] - (by + bh / 2)) * scale, 0)
    const m = new THREE.MeshBasicMaterial({ map: art.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    return [g, m] as const
  }, [art, scale, anchor])
  useEffect(() => {
    ctl.paper.add(mat)
    return () => {
      ctl.paper.delete(mat)
      geo.dispose()
      mat.dispose()
    }
  }, [ctl, geo, mat])
  const raycast = useMemo(() => solidRaycast(art), [art])
  return (
    <mesh
      ref={(m) => {
        onLayer(PAPER)(m)
        if (typeof meshRef === 'function') meshRef(m)
        else if (meshRef) (meshRef as React.RefObject<THREE.Mesh | null>).current = m
      }}
      geometry={geo}
      material={mat}
      raycast={raycast}
      position={position}
      userData={{ layer }}
    />
  )
}

/** Keep a cut-out's pieces sorted together, by where its feet touch the ground. */
function useAnchor(root: React.RefObject<THREE.Object3D | null>) {
  const camera = useThree((s) => s.camera)
  const meshes = useRef<THREE.Mesh[] | null>(null)
  useFrame(() => {
    const r = root.current
    if (!r) return
    if (!meshes.current) {
      meshes.current = []
      r.traverse((o) => o instanceof THREE.Mesh && meshes.current!.push(o))
    }
    v3.setFromMatrixPosition(r.matrixWorld).project(camera)
    for (const m of meshes.current) m.userData.anchorZ = v3.z
  })
  // Call after the pieces change, so the new meshes are picked up.
  return useCallback(() => {
    meshes.current = null
  }, [])
}

/** Runs before everything else each frame. */
function Clock({ ctl }: { ctl: Ctl }) {
  useFrame(({ clock }) => ctl.tweens.tick(clock.elapsedTime * 1000), -1)
  return null
}

function Renderer({ ctl }: { ctl: Ctl }) {
  const gl = useThree((s) => s.gl)
  const ink = useMemo(() => new InkPass(), [])
  const size = useMemo(() => new THREE.Vector2(), [])
  const tint = useMemo(() => new THREE.Color(), [])
  const day = useMemo(() => fog.color.clone(), [])
  const dusk = useMemo(() => new THREE.Color('#8d88ad'), [])
  useEffect(() => {
    gl.setTransparentSort(paperSort)
    ctl.canvas = gl.domElement
    return () => ink.dispose()
  }, [gl, ctl, ink])
  useFrame(({ gl, scene, camera }, dt) => {
    ctl.night += (ctl.nightTarget - ctl.night) * Math.min(1, dt * 0.7)
    ink.uniforms.uNight.value = ctl.night
    tint.setRGB(1 - 0.42 * ctl.night, 1 - 0.4 * ctl.night, 1 - 0.18 * ctl.night)
    for (const m of ctl.paper) m.color.copy(tint)
    fog.color.lerpColors(day, dusk, ctl.night)
    ;(scene.fog as THREE.Fog).color.copy(fog.color)
    gl.getDrawingBufferSize(size)
    ink.setSize(size.x, size.y, gl.getPixelRatio())
    ink.render(gl, scene, camera as THREE.PerspectiveCamera)
  }, 1)
  return null
}

function CameraRig({ ctl }: { ctl: Ctl }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const look = useMemo(() => HOME.at.clone(), [])
  const zoom = useRef(1)
  useEffect(() => {
    ctl.camera = camera
  }, [ctl, camera])
  useFrame(({ clock, size }, dt) => {
    const pts = ctl.focus
    const c = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length)
    let span = 3.6
    for (const p of pts) span = Math.max(span, Math.abs(p.x - c.x) * 2 + 3.2, Math.abs(p.z - c.z) * 1.6 + 3.2)
    const aspect = size.width / size.height
    const want = Math.max(1, span / (6.4 * aspect * 0.85), 0.95 / aspect)
    const k = 1 - Math.exp(-dt * 2.2)
    if (ctl.mode === 'title') c.x += Math.sin(clock.elapsedTime * 0.25) * 0.4
    look.lerp(c, k)
    zoom.current += (want - zoom.current) * k
    const z = zoom.current
    // Nearly eye level, like the storybook: the meadow in front, hills and sky beyond.
    camera.position.set(look.x, look.y + 3.2 * z, look.z + 10 * z)
    camera.lookAt(look.x, look.y + 1.25, look.z)
  })
  return null
}

function Land({ ctl }: { ctl: Ctl }) {
  const t = useMemo(terrain, [])
  const p = useMemo(pathRibbon, [])
  const w = useMemo(pond, [])
  const now = useRef(0)
  useFrame(({ clock }) => {
    now.current = clock.elapsedTime
    w.mat.uniforms.uTime.value = clock.elapsedTime
  })
  useEffect(() => {
    ctl.ripple = (x, z) => w.mat.uniforms.uRipple.value.set(x, z, now.current, 0)
    return () => {
      for (const o of [t, p, w]) {
        o.geo.dispose()
        o.mat.dispose()
      }
    }
  }, [ctl, t, p, w])
  const tapGround = (e: ThreeEvent<PointerEvent>) => {
    if (!ctl.groundTap) return
    e.stopPropagation()
    ctl.groundTap(e.point.clone())
  }
  return (
    <>
      <mesh ref={onLayer(LAND)} geometry={t.geo} material={t.mat} onPointerDown={tapGround} />
      <mesh ref={onLayer(LAND)} geometry={p.geo} material={p.mat} onPointerDown={tapGround} />
      <mesh
        ref={onLayer(LAND)}
        geometry={w.geo}
        material={w.mat}
        onPointerDown={(e) => {
          e.stopPropagation()
          ctl.ripple(e.point.x, e.point.z)
          sfx.plop()
        }}
      />
    </>
  )
}

function Dog({ who, art, ctl, host }: { who: 'kipper' | 'tiger'; art: DogArt; ctl: Ctl; host: StageHost }) {
  const d: DogState = ctl.dogs[who]
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const legs = useRef<THREE.Group[]>([])
  const tail = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const ear = useRef<THREE.Group>(null)
  const headMesh = useRef<THREE.Mesh>(null)
  const anim = useRef({ phase: 0, blinkUntil: 0, nextBlink: 2 + Math.random() * 2, want: new THREE.Vector3() })
  useAnchor(root)
  useEffect(() => {
    d.root = root.current
  }, [d])

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    const a = anim.current
    // Tiger tags along behind Kipper whenever he's not been sent somewhere himself.
    if (d.follow && !d.arrive) {
      const k = ctl.dogs.kipper
      a.want.set(k.pos.x - k.facing * 1.75, 0, k.pos.z - 0.55)
      if (d.target || Math.hypot(a.want.x - d.pos.x, a.want.z - d.pos.z) > 0.9) {
        d.target = a.want.clone()
        d.speed = 3.4
      }
    }
    if (d.target) {
      const [dx, dz] = [d.target.x - d.pos.x, d.target.z - d.pos.z]
      const dist = Math.hypot(dx, dz)
      if (dist < 0.04) {
        d.pos.x = d.target.x
        d.pos.z = d.target.z
        d.target = null
        const done = d.arrive
        d.arrive = null
        done?.()
      } else {
        const step = Math.min(dist, Math.min(d.speed, dist * 4 + 0.6) * dt)
        d.pos.x += (dx / dist) * step
        d.pos.z += (dz / dist) * step
        if (Math.abs(dx) > 0.06) d.facing = dx > 0 ? 1 : -1
      }
    }
    const moving = !!d.target
    a.phase = moving ? a.phase + dt * 12 : a.phase * 0.85
    const swing = Math.sin(a.phase) * (moving ? 0.42 : 0)
    // Diagonal pairs swing together, as in the storybook.
    legs.current.forEach((g, i) => g && (g.rotation.z = i === 0 || i === 3 ? swing : -swing))
    const sad = d.face === 'sad'
    if (body.current) body.current.position.y = moving ? Math.abs(Math.sin(a.phase)) * 0.04 : 0
    if (head.current) head.current.rotation.z = (moving ? Math.sin(a.phase * 2) * 0.05 : Math.sin(t * 1.7) * 0.02) - (sad ? 0.13 : 0)
    if (tail.current) tail.current.rotation.z = sad ? -0.65 : Math.sin(t * (d.face === 'happy' ? 17 : 8)) * 0.24
    if (ear.current) ear.current.rotation.z = moving ? Math.sin(a.phase * 2) * 0.13 : sad ? -0.15 : 0
    // Blink now and then.
    if (t > a.nextBlink) {
      a.blinkUntil = t + 0.13
      a.nextBlink = t + 3 + Math.random() * 3
    }
    const face = t < a.blinkUntil ? 'shut' : d.face
    const mat = headMesh.current?.material as THREE.MeshBasicMaterial | undefined
    if (mat && mat.map !== art.heads[face].tex) mat.map = art.heads[face].tex
    // Turning round flips the cut-out through edge-on, like turning a paper puppet.
    d.flip += (d.facing - d.flip) * Math.min(1, dt * 9)
    const r = root.current
    if (r) {
      r.position.set(d.pos.x, heightAt(d.pos.x, d.pos.z) + d.hop, d.pos.z)
      r.scale.x = Math.abs(d.flip) < 0.04 ? 0.04 * Math.sign(d.flip || 1) : d.flip
      r.visible = !d.hidden
    }
  })

  const at = (sx: number, sy: number): [number, number, number] => [(sx - 130) * DOG_S, (212 - sy) * DOG_S, 0]
  const tap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    void ctl.tweens.run(440, (k) => (d.hop = Math.sin(k * Math.PI) * 0.5), ease.linear)
    host.onDogTap(who)
  }
  const P = DOG_PIECES
  return (
    <group ref={root} onPointerDown={tap}>
      <group ref={body}>
        {[1, 3, 0, 2].map((i, n) => (
          <group key={i} ref={(g) => void (g && (legs.current[i] = g))} position={at(...P.leg(i).pivot)}>
            <Paper art={art.legs[i]} scale={DOG_S} anchor={P.leg(i).pivot} layer={n} ctl={ctl} />
          </group>
        ))}
        <group ref={tail} position={at(...P.tail.pivot)}>
          <Paper art={art.tail} scale={DOG_S} anchor={P.tail.pivot} layer={4} ctl={ctl} />
        </group>
        <Paper art={art.body} scale={DOG_S} anchor={[130, 212]} layer={5} ctl={ctl} />
        <group ref={head} position={at(...P.head.pivot)}>
          <Paper art={art.heads.happy} scale={DOG_S} anchor={P.head.pivot} layer={6} ctl={ctl} meshRef={headMesh} />
          <group ref={ear} position={[(P.ear.pivot[0] - P.head.pivot[0]) * DOG_S, (P.head.pivot[1] - P.ear.pivot[1]) * DOG_S, 0]}>
            <Paper art={art.ear} scale={DOG_S} anchor={P.ear.pivot} layer={7} ctl={ctl} />
          </group>
        </group>
      </group>
    </group>
  )
}

function Friend({ index, art, ctl, host }: { index: number; art: MeadowArt; ctl: Ctl; host: StageHost }) {
  const cast = useMeadow((s) => s.cast[index])!
  const s = ctl.spots[index]
  const root = useRef<THREE.Group>(null)
  const bob = useRef<THREE.Group>(null)
  const toy = useRef<THREE.Mesh>(null)
  const resetAnchor = useAnchor(root)
  useLayoutEffect(() => {
    resetAnchor()
    s.toyMesh = toy.current
    s.friendRoot = root.current
  }, [s, cast, resetAnchor])
  useFrame(({ clock }) => {
    const r = root.current
    if (!r) return
    r.position.copy(s.friend.pos)
    r.visible = s.friend.visible
    if (toy.current) toy.current.visible = s.friend.toyVisible
    const talk = s.friend.talking ? Math.sin(clock.elapsedTime * 15) * 0.035 : 0
    bob.current?.scale.set(1 + s.friend.squash * 0.14 - talk * 0.5, 1 - s.friend.squash * 0.14 + talk, 1)
  })
  const fa = art.friends[cast.friend]
  const [hx, hy, hs] = fa.hold
  return (
    <group
      ref={root}
      onPointerDown={(e) => {
        if (!s.friend.visible) return
        e.stopPropagation()
        host.onFriendTap()
        void ctl.tweens.run(600, (k) => (s.friend.squash = Math.sin(k * Math.PI * 3) * (1 - k)), ease.linear)
      }}
    >
      <group ref={bob}>
        <Paper art={fa.back} scale={FRIEND_S} anchor={[100, 212]} layer={0} ctl={ctl} />
        <group position={[(hx - 100) * FRIEND_S, (212 - hy) * FRIEND_S, 0]}>
          <Paper art={art.toys[cast.toy]} scale={(hs * FRIEND_S) / 100} anchor={[50, 50]} layer={1} ctl={ctl} meshRef={toy} />
        </group>
        <Paper art={fa.front} scale={FRIEND_S} anchor={[100, 212]} layer={2} ctl={ctl} />
      </group>
    </group>
  )
}

function HidingPlace({ index, art, ctl, host }: { index: number; art: MeadowArt; ctl: Ctl; host: StageHost }) {
  const cast = useMeadow((s) => s.cast[index])
  const s = ctl.spots[index]
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const r = root.current
    if (!r) return
    const t = clock.elapsedTime
    r.rotation.z = s.rustle ? Math.sin(t * 15) * 0.04 * (0.6 + 0.4 * Math.sin(t * 2.3)) : 0
    r.scale.set(1, s.rustle ? 1 + Math.sin(t * 9) * 0.025 : 1, 1)
  })
  return (
    <>
      <group
        ref={root}
        position={s.place.at}
        onPointerDown={(e) => {
          if (!s.onTap) return
          e.stopPropagation()
          s.onTap()
        }}
      >
        <Paper art={art.spots[cast?.kind ?? 'bush']} scale={SPOT_S} anchor={[110, 147]} ctl={ctl} />
      </group>
      {cast && <Friend index={index} art={art} ctl={ctl} host={host} />}
    </>
  )
}

function Home({ art, ctl }: { art: MeadowArt; ctl: Ctl }) {
  const { asleep, tigerAsleep, drape, placed } = useMeadow()
  const root = useRef<THREE.Group>(null)
  const reanchor = useAnchor(root)
  useLayoutEffect(() => {
    reanchor()
  }, [asleep, drape, reanchor])
  const bedAt = useMemo(() => {
    const p = new THREE.Vector3(HOME.at.x - 2.35, 0, HOME.at.z + 0.35)
    return p.setY(heightAt(p.x, p.z))
  }, [])
  const tap = (e: ThreeEvent<PointerEvent>) => {
    if (!ctl.homeTap) return
    e.stopPropagation()
    ctl.homeTap()
  }
  return (
    <>
      <group ref={root} position={HOME.at} onPointerDown={tap}>
        <Paper art={art.basketBack} scale={BASKET_S} anchor={[130, 176]} layer={0} ctl={ctl} />
        {asleep && <Paper art={drape ? art.kipperInsideBlanket : art.kipperInside} scale={BASKET_S} anchor={[130, 176]} layer={1} ctl={ctl} />}
        <Paper art={art.basketFront} scale={BASKET_S} anchor={[130, 176]} layer={2} ctl={ctl} />
        {asleep && <Paper art={art.kipperOver} scale={BASKET_S} anchor={[130, 176]} layer={3} ctl={ctl} />}
      </group>
      {tigerAsleep && (
        <group position={bedAt}>
          <Paper art={art.tigerAsleep} scale={BASKET_S} anchor={[140, 124]} ctl={ctl} />
        </group>
      )}
      {placed
        .filter((id) => id !== 'blanket')
        .map((id) => (
          <group key={id} position={restingAt(id)}>
            <Paper art={art.toys[id]} scale={TOY_SIZE / 100} anchor={[50, 92]} ctl={ctl} />
          </group>
        ))}
    </>
  )
}

function Tree({ at, size, art, ctl }: { at: THREE.Vector3; size: number; art: Art; ctl: Ctl }) {
  const ref = useRef<THREE.Group>(null)
  const shake = useRef(0)
  useFrame(({ clock }) => {
    if (!ref.current || shake.current < 0.01) return
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 20) * 0.05 * shake.current
    shake.current *= 0.95
  })
  return (
    <group
      ref={ref}
      position={at}
      onPointerDown={(e) => {
        e.stopPropagation()
        shake.current = 1
        sfx.rustle()
      }}
    >
      <Paper art={art} scale={(size * 1.6) / 100} anchor={[60, 121]} ctl={ctl} />
    </group>
  )
}

/** Many copies of one small drawing standing on the grass, in a single draw call. */
function Scatter({ art, points, size, tappable }: { art: Art; points: THREE.Vector3[]; size: number; tappable?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const bounce = useRef(new Map<number, number>())
  const [geo, mat] = useMemo(() => {
    const [, , bw, bh] = art.box
    const g = new THREE.PlaneGeometry(size, (size * bh) / bw).translate(0, (size * bh) / bw / 2, 0)
    const m = new THREE.MeshBasicMaterial({ map: art.tex, alphaTest: 0.5, side: THREE.DoubleSide })
    return [g, m] as const
  }, [art, size])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const place = (i: number, s: number) => {
    dummy.position.copy(points[i])
    dummy.scale.setScalar(s * (0.85 + ((i * 7) % 5) * 0.08))
    dummy.updateMatrix()
    ref.current!.setMatrixAt(i, dummy.matrix)
  }
  useLayoutEffect(() => {
    ref.current!.layers.enable(PAPER)
    points.forEach((_, i) => place(i, 1))
    ref.current!.instanceMatrix.needsUpdate = true
  })
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  useFrame((_, dt) => {
    if (!bounce.current.size) return
    for (const [i, k] of bounce.current) {
      const next = k + dt * 2.2
      place(i, 1 + Math.sin(Math.min(1, next) * Math.PI * 2) * (1 - Math.min(1, next)) * 0.6)
      if (next >= 1) bounce.current.delete(i)
      else bounce.current.set(i, next)
    }
    ref.current!.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, points.length]}
      raycast={tappable ? undefined : () => {}}
      onPointerDown={
        tappable
          ? (e) => {
              if (e.instanceId === undefined) return
              e.stopPropagation()
              bounce.current.set(e.instanceId, 0)
              sfx.note(e.instanceId)
            }
          : undefined
      }
    />
  )
}

function Decor({ art, ctl }: { art: MeadowArt; ctl: Ctl }) {
  const trees = useMemo(treeSpots, [])
  const bushes = useMemo(bushSpots, [])
  const flowers = useMemo(() => [0, 1, 2, 3].map((i) => scatter(34, 100 + i)), [])
  const tufts = useMemo(() => scatter(260, 7, 0.9), [])
  const lilies = useMemo(
    () =>
      [
        [-2.6, -0.8],
        [1.8, 0.9],
        [3.4, -0.6],
      ].map(([x, z]) => new THREE.Vector3(POND.x + x, POND.level + 0.012, POND.z + z)),
    [],
  )
  return (
    <>
      {trees.map((t, i) => (
        <Tree key={i} at={t.at} size={t.size} art={art.trees[t.kind]} ctl={ctl} />
      ))}
      {bushes.map((at, i) => (
        <group key={i} position={at} scale={0.75}>
          <Paper art={art.bush} scale={SPOT_S} anchor={[110, 147]} ctl={ctl} />
        </group>
      ))}
      {flowers.map((pts, i) => (
        <Scatter key={i} art={art.flowers[i]} points={pts} size={0.3} tappable />
      ))}
      <Scatter art={art.tuft} points={tufts} size={0.34} />
      {lilies.map((p, i) => (
        <group key={i} position={p} rotation={[-Math.PI / 2, 0, i]}>
          <Paper art={art.lily} scale={0.022} anchor={[20, 13]} ctl={ctl} />
        </group>
      ))}
    </>
  )
}

function Butterflies({ art, ctl }: { art: MeadowArt; ctl: Ctl }) {
  const flock = useMemo(
    () =>
      [
        [-6, -3],
        [9, -3],
        [-12, -14],
        [6, -17],
      ].map(([x, z], i) => ({ home: new THREE.Vector3(x, 0, z), seed: i * 1.7, scare: 0, art: art.butterflies[i % art.butterflies.length] })),
    [art],
  )
  const refs = useRef<THREE.Group[]>([])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    flock.forEach((b, i) => {
      const g = refs.current[i]
      if (!g) return
      b.scare = Math.max(0, b.scare - dt * 0.4)
      const s = 1 + b.scare * 3
      const x = b.home.x + Math.sin(t * 0.37 * s + b.seed) * 2.4
      const z = b.home.z + Math.cos(t * 0.29 * s + b.seed * 2) * 1.6
      g.position.set(x, heightAt(x, z) + 0.9 + Math.sin(t * 1.9 + b.seed) * 0.25 + b.scare * 2, z)
      g.scale.x = 0.3 + 0.7 * Math.abs(Math.sin(t * 14 + b.seed))
    })
  })
  return (
    <>
      {flock.map((b, i) => (
        <group
          key={i}
          ref={(g) => void (g && (refs.current[i] = g))}
          onPointerDown={(e) => {
            e.stopPropagation()
            b.scare = 1
            sfx.giggle()
          }}
        >
          <Paper art={b.art} scale={0.012} anchor={[20, 15]} ctl={ctl} />
        </group>
      ))}
    </>
  )
}

/** Little stars circling whatever she should tap next. */
function Sparkles({ art, ctl }: { art: MeadowArt; ctl: Ctl }) {
  const refs = useRef<THREE.Group[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((g, i) => {
      if (!g) return
      g.visible = !!ctl.sparkle
      if (!ctl.sparkle) return
      const a = t * 1.6 + (i / 5) * Math.PI * 2
      g.position.set(ctl.sparkle.x + Math.cos(a) * 1.1, ctl.sparkle.y + 2.25 + Math.sin(t * 3 + i) * 0.15, ctl.sparkle.z + Math.sin(a) * 0.5)
      g.rotation.z = t * 2 + i
      g.scale.setScalar(0.8 + 0.3 * Math.sin(t * 5 + i))
    })
  })
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} ref={(g) => void (g && (refs.current[i] = g))}>
          <Paper art={art.star} scale={0.0034} anchor={[50, 50]} ctl={ctl} />
        </group>
      ))}
    </>
  )
}

function Snores({ art, ctl }: { art: MeadowArt; ctl: Ctl }) {
  const snoring = useMeadow((s) => s.snoring)
  const refs = useRef<THREE.Group[]>([])
  useFrame(({ clock }) => {
    refs.current.forEach((g, i) => {
      if (!g) return
      const k = (clock.elapsedTime / 2.6 + i / 3) % 1
      g.position.set(HOME.at.x + 0.7 + k * 0.9, HOME.at.y + 1.0 + k * 1.6, HOME.at.z + 0.2)
      g.scale.setScalar(0.5 + k)
      const mat = (g.children[0] as THREE.Mesh | undefined)?.material as THREE.MeshBasicMaterial | undefined
      if (mat) mat.opacity = Math.sin(k * Math.PI)
    })
  })
  if (!snoring) return null
  return (
    <>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(g) => void (g && (refs.current[i] = g))}>
          <Paper art={art.zzz} scale={0.012} anchor={[15, 15]} ctl={ctl} />
        </group>
      ))}
    </>
  )
}

export function Meadow({ art, ctl, host }: { art: MeadowArt; ctl: Ctl; host: StageHost }) {
  return (
    <>
      <Clock ctl={ctl} />
      <CameraRig ctl={ctl} />
      <Land ctl={ctl} />
      <Decor art={art} ctl={ctl} />
      <Home art={art} ctl={ctl} />
      {SPOTS.map((_, i) => (
        <HidingPlace key={i} index={i} art={art} ctl={ctl} host={host} />
      ))}
      <Dog who="tiger" art={art.tiger} ctl={ctl} host={host} />
      <Dog who="kipper" art={art.kipper} ctl={ctl} host={host} />
      <Butterflies art={art} ctl={ctl} />
      <Sparkles art={art} ctl={ctl} />
      <Snores art={art} ctl={ctl} />
      <Renderer ctl={ctl} />
    </>
  )
}
