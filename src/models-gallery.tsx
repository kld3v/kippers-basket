// Dev-only: every 3D model in a row, for checking the look (open /models.html?set=dogs|friends|things).
import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import { FRIENDS, TOYS } from './content'
import { buildFriend } from './stages/meadow/models/critters'
import { buildBiped, buildDog, KIPPER_LOOK, NEDDY_LOOK, TIGER_LOOK } from './stages/meadow/models/dog'
import { bake } from './stages/meadow/models/kit'
import { basket, bushPieces, cloud, guideStar, hidingPlace, treePieces } from './stages/meadow/models/props'
import { buildToy } from './stages/meadow/models/toys'

const params = new URLSearchParams(location.search)
const set = params.get('set') ?? 'dogs'
const turn = { side: Math.PI / 2, front: 0, quarter: Math.PI / 5 }[params.get('view') ?? 'quarter'] ?? Math.PI / 5

function Row() {
  const items = useMemo((): THREE.Object3D[] => {
    if (set === 'dogs') return [buildBiped(KIPPER_LOOK).root, buildBiped(TIGER_LOOK).root, buildDog(NEDDY_LOOK).root]
    if (set === 'sleep') {
      const b = basket()
      const k = buildBiped(KIPPER_LOOK)
      k.body.rotation.set(0.32, 0, 0)
      k.body.position.set(0, -0.3, -0.05)
      k.legs.forEach((l) => (l.rotation.x = -1.45))
      k.arms.forEach((a, i) => a.rotation.set(-0.75, 0, (i ? -1 : 1) * 0.45))
      k.head.rotation.set(0.55, 0, 0.12)
      k.eyes.forEach((e) => (e.scale.y = 0.12))
      k.tail.rotation.set(1.3, 0, 0)
      k.root.position.set(0, 0.12, 0)
      k.root.rotation.y = Math.PI / 2
      b.add(k.root)
      return [b]
    }
    if (set === 'friends')
      return FRIENDS.map((f, i) => {
        const r = buildFriend(f.id)
        const toy = buildToy(TOYS[i % TOYS.length].id)
        toy.scale.setScalar(r.toySize / 0.36)
        r.hold.add(toy)
        return r.root
      })
    if (set === 'toys') return TOYS.map((t) => buildToy(t.id))
    return [hidingPlace('bush'), hidingPlace('log'), hidingPlace('burrow'), basket(), bake(treePieces(0, 0, 0, 0.8, 1)), bake(bushPieces(0, 0, 0, 0.7, false)), cloud(2), guideStar()]
  }, [])
  const gap = set === 'toys' ? 0.6 : set === 'things' ? 2.6 : set === 'friends' ? 1.15 : 1.9
  return (
    <>
      {items.map((o, i) => (
        <primitive key={i} object={o} position={[(i - (items.length - 1) / 2) * gap, set === 'toys' ? 0.25 : 0, 0]} rotation={[0, set === 'things' ? 0 : turn, 0]} scale={set === 'things' && i >= 6 ? 0.35 : 1} />
      ))}
    </>
  )
}

const cam = { sleep: [0, 2.6, 4.5], dogs: [0, 1.6, 6], friends: [0, 1.4, 9.5], toys: [0, 0.9, 4.5], things: [0, 2.6, 14] }[set] as [number, number, number]
createRoot(document.getElementById('root')!).render(
  <Canvas flat camera={{ position: cam, fov: 35 }} onCreated={({ camera }) => camera.lookAt(0, set === 'things' ? 0.9 : 0.6, 0)}>
    <hemisphereLight args={['#fff8e8', '#9fc77a', 1.6]} />
    <directionalLight position={[4, 8, 6]} intensity={2.2} />
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial color="#c9e2a3" />
    </mesh>
    <Row />
  </Canvas>,
)
