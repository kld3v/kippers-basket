import * as THREE from 'three'
import { friendLayers } from '../../art/friends'
import { dogAsleep, dogParts, KIPPER, LEG_X, TIGER, type Coat } from '../../art/kipper'
import { P } from '../../art/palette'
import { basketLayers, toyBody } from '../../art/props'
import { butterflyArt, flowerArt, lilyArt, spot, treeArt, tuftArt, zzzArt } from '../../art/scenery'
import { starIcon } from '../../art/icons'
import { FRIENDS, TOYS, type FriendId, type SpotKind, type ToyId } from '../../content'

// The 3D meadow uses the very same drawings as the storybook, rasterised into textures.

/** A drawing as a texture, with its size in drawing units and a way to ask how solid a point is (for taps). */
export interface Art {
  tex: THREE.Texture
  /** The drawing's box, in its own SVG units. */
  box: [x: number, y: number, w: number, h: number]
  solid(u: number, v: number): boolean
}

type Box = Art['box']

async function raster(body: string, box: Box, ppu: number, style = ''): Promise<Art> {
  const [x, y, w, h] = box
  const pw = Math.min(1024, Math.round(w * ppu))
  const ph = Math.round((pw * h) / w)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${pw}" height="${ph}">${style ? `<style>${style}</style>` : ''}${body}</svg>`
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const img = new Image()
  img.src = url
  await img.decode()
  URL.revokeObjectURL(url)
  const canvas = document.createElement('canvas')
  canvas.width = pw
  canvas.height = ph
  const g = canvas.getContext('2d', { willReadFrequently: false })!
  g.drawImage(img, 0, 0, pw, ph)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  let pixels: Uint8ClampedArray | null = null
  return {
    tex,
    box,
    solid(u, v) {
      pixels ??= g.getImageData(0, 0, pw, ph).data
      const px = Math.min(pw - 1, Math.max(0, Math.floor(u * pw)))
      const py = Math.min(ph - 1, Math.max(0, Math.floor((1 - v) * ph)))
      return pixels[(py * pw + px) * 4 + 3] > 24
    },
  }
}

// Faces: every mood is the same head with different bits switched off.
const FACE_STYLE = {
  happy: '.eye-shut,.brow-sad,.mouth-sad{display:none}',
  sad: '.eye-shut,.mouth-happy{display:none}',
  shut: '.eye-open,.brow-sad,.mouth-sad{display:none}',
}
export type Face = keyof typeof FACE_STYLE

/** Where each puppet piece sits in the dog's 260×220 frame, and the point it swings from. */
export const DOG_PIECES = {
  leg: (i: number) => ({ box: [LEG_X[i] - 14, 134, 36, 82] as Box, pivot: [LEG_X[i], 160] as const }),
  tail: { box: [36, 62, 42, 70] as Box, pivot: [68, 125] as const },
  body: { box: [52, 102, 150, 76] as Box },
  head: { box: [154, 46, 110, 88] as Box, pivot: [182, 112] as const },
  ear: { box: [154, 50, 42, 92] as Box, pivot: [180, 58] as const },
}

export interface DogArt {
  legs: Art[]
  tail: Art
  body: Art
  heads: Record<Face, Art>
  ear: Art
}

async function dogArt(c: Coat): Promise<DogArt> {
  const p = dogParts(c)
  const ppu = 3.2
  const [legs, tail, body, ear, happy, sad, shut] = await Promise.all([
    Promise.all(p.legs.map((l, i) => raster(l, DOG_PIECES.leg(i).box, ppu))),
    raster(p.tail, DOG_PIECES.tail.box, ppu),
    raster(p.body, DOG_PIECES.body.box, ppu),
    raster(p.ear, DOG_PIECES.ear.box, ppu),
    ...(['happy', 'sad', 'shut'] as Face[]).map((f) => raster(p.skull + p.face, DOG_PIECES.head.box, ppu, FACE_STYLE[f])),
  ])
  return { legs, tail, body, heads: { happy, sad, shut }, ear }
}

export interface FriendArt {
  back: Art
  front: Art
  hold: [x: number, y: number, size: number]
}

export interface MeadowArt {
  kipper: DogArt
  tiger: DogArt
  friends: Record<FriendId, FriendArt>
  toys: Record<ToyId, Art>
  spots: Record<SpotKind, Art>
  basketBack: Art
  basketFront: Art
  kipperInside: Art
  kipperInsideBlanket: Art
  kipperOver: Art
  tigerAsleep: Art
  trees: Art[]
  bush: Art
  flowers: Art[]
  tuft: Art
  butterflies: Art[]
  star: Art
  zzz: Art
  lily: Art
}

const FRIEND_BOX: Box = [0, 0, 200, 220]
const BASKET_BOX: Box = [0, 8, 262, 174]
const SPOT_BOX: Box = [0, 22, 220, 130]
const TREE_BOX: Box = [14, 38, 92, 86]

export async function loadArt(): Promise<MeadowArt> {
  const friendArt = async (id: FriendId): Promise<FriendArt> => {
    const l = friendLayers(id)
    const [back, front] = await Promise.all([raster(l.back, FRIEND_BOX, 2.6), raster(l.front, FRIEND_BOX, 2.6)])
    return { back, front, hold: l.hold }
  }
  const asleep = dogAsleep(KIPPER)
  const tigerSleeps = dogAsleep(TIGER)
  const basket = basketLayers()
  const [kipper, tiger, friendList, toyList, spotList, rest] = await Promise.all([
    dogArt(KIPPER),
    dogArt(TIGER),
    Promise.all(FRIENDS.map((f) => friendArt(f.id))),
    Promise.all(TOYS.map((t) => raster(toyBody(t.id), [0, 0, 100, 100], 3))),
    Promise.all((['bush', 'log', 'burrow'] as SpotKind[]).map((k) => raster(spot(k, `meadow-${k}`).replace(/^<svg[^>]*>|<\/svg>$/g, ''), SPOT_BOX, 2.6))),
    Promise.all([
      raster(basket.back, BASKET_BOX, 2.6),
      raster(basket.front, BASKET_BOX, 2.6),
      raster(asleep.inside, BASKET_BOX, 2.6, '.drape{display:none}'),
      raster(asleep.inside, BASKET_BOX, 2.6),
      raster(asleep.over, BASKET_BOX, 2.6, FACE_STYLE.shut),
      raster(tigerSleeps.inside + tigerSleeps.over, [16, 40, 250, 100], 2.6, `.drape{display:none}${FACE_STYLE.shut}`),
      raster(spot('bush', 'meadow-decor-bush').replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/<circle[^>]*fill="#e2614f"[^>]*\/>/g, ''), SPOT_BOX, 2),
      raster(tuftArt('tuft'), [0, 0, 24, 16], 3),
      raster(starIcon(P.yellow).replace(/^<svg[^>]*>|<\/svg>$/g, ''), [0, 0, 100, 100], 0.8),
      raster(zzzArt(), [0, 0, 30, 30], 3),
      raster(lilyArt('lily'), [0, 0, 40, 26], 3),
    ]),
  ])
  const [trees, flowers, butterflies] = await Promise.all([
    Promise.all([0.9, 1, 1.12].map((s, i) => raster(treeArt(`meadow-tree-${i}`, s), [14 - 4, 120 - 80 * s - 4, 100, 80 * s + 8], 2.4))),
    Promise.all([P.pink, '#fff', P.yellow, P.bluePale].map((c, i) => raster(flowerArt(`flower-${i}`, c), [0, 0, 24, 30], 3))),
    Promise.all([P.yellow, P.pink, P.bluePale].map((c, i) => raster(butterflyArt(`butterfly-${i}`, c), [0, 0, 40, 30], 3))),
  ])
  const [basketBack, basketFront, kipperInside, kipperInsideBlanket, kipperOver, tigerAsleep, bush, tuft, star, zzz, lily] = rest
  return {
    kipper,
    tiger,
    friends: Object.fromEntries(FRIENDS.map((f, i) => [f.id, friendList[i]])) as Record<FriendId, FriendArt>,
    toys: Object.fromEntries(TOYS.map((t, i) => [t.id, toyList[i]])) as Record<ToyId, Art>,
    spots: { bush: spotList[0], log: spotList[1], burrow: spotList[2] },
    basketBack,
    basketFront,
    kipperInside,
    kipperInsideBlanket,
    kipperOver,
    tigerAsleep,
    trees,
    bush,
    flowers,
    tuft,
    butterflies,
    star,
    zzz,
    lily,
  }
}

export function disposeArt(a: MeadowArt) {
  const seen = new Set<THREE.Texture>()
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return
    if ('tex' in v && (v as Art).tex instanceof THREE.Texture) seen.add((v as Art).tex)
    else Object.values(v).forEach(walk)
  }
  walk(a)
  seen.forEach((t) => t.dispose())
}

export { TREE_BOX }
