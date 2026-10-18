import { Ink, pivot, svg, type Pt } from './ink'

// Kipper and Tiger as they are on TV, standing and walking on two feet, drawn side-on
// facing right in a 220×260 frame with feet on y≈252.
//  Kipper: bright orange, a big white muzzle and a white stripe down his front, white paws,
//          a dark brown ear flopped back over the top of his head, a thin dark wiry tail.
//  Tiger:  a scruffy grey Scottie, pointed ears, a white beard and chest, white paws.
// In 2D, CSS moves the parts by class: .leg-near/.leg-far stride, .arm-near/.arm-far swing,
// .tail wags, .ear flops, .head nods; face parts switch for moods.

export interface Look {
  seed: string
  kind: 'kipper' | 'tiger'
  body: string
  shade: string
  white: string
  ear: string
}

export const KIPPER: Look = { seed: 'kipper-tv', kind: 'kipper', body: '#f2701f', shade: '#d65d14', white: '#fffdf8', ear: '#6e3711' }
export const TIGER: Look = { seed: 'tiger-tv', kind: 'tiger', body: '#8d877c', shade: '#77716a', white: '#fbfaf6', ear: '#5c5751' }

/** @deprecated name kept for older imports */
export type Coat = Look

const INK_DARK = '#3d3431'

/** Where the legs hang from (near, far) and the arms swing from (near, far). */
export const HIPS = [[100, 212], [118, 210]] as const
export const SHOULDERS = [[112, 128], [128, 126]] as const

/** A scruffy edge: every other point pushed in or out, drawn with straight joins. */
function shag(p: readonly Pt[], amp: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < p.length; i++) {
    const [a, b] = [p[i], p[(i + 1) % p.length]]
    out.push(a)
    const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
    const len = Math.hypot(dx, dy) || 1
    // Outward normal for a clockwise outline (screen y points down).
    out.push([mx - (dy / len) * amp, my + (dx / len) * amp])
  }
  return out
}

export interface DogParts {
  legs: string[]
  arms: string[]
  tail: string
  body: string
  skull: string
  ear: string
  face: string
}

function kipperParts(L: Look): DogParts {
  const k = new Ink(L.seed)
  const arm = (sx: number, sy: number, fill: string) =>
    k.shape([[sx - 8, sy - 6], [sx + 7, sy - 8], [sx + 11, sy + 22], [sx + 12, sy + 32], [sx - 1, sy + 34], [sx - 6, sy + 20]], { fill }) +
    k.blob(sx + 6, sy + 38, 9, 7, { fill: L.white })
  const leg = (hx: number, hy: number, fill: string) =>
    k.shape([[hx - 11, hy - 8], [hx + 10, hy - 8], [hx + 10, hy + 26], [hx + 8, hy + 32], [hx - 9, hy + 32], [hx - 11, hy + 24]], { fill }) +
    k.blob(hx + 4, hy + 35, 15, 7.5, { fill: L.white })
  const arms = [arm(...SHOULDERS[0], L.body), arm(...SHOULDERS[1], L.shade)]
  const legs = [leg(...HIPS[0], L.body), leg(...HIPS[1], L.shade)]
  // A thin dark wiry tail, like a little brush, at the back of his hips.
  const brush: Pt[][] = [[[84, 198], [62, 191]], [[84, 200], [59, 199]], [[84, 202], [62, 209]], [[84, 200], [68, 200]]]
  const tail = brush.map((pts, i) => k.line(pts, { ink: '#4a3022', w: i === 3 ? 3.4 : 2.2 })).join('')
  const body =
    k.shape([[102, 106], [122, 104], [132, 120], [142, 150], [147, 182], [142, 208], [126, 221], [100, 223], [83, 212], [77, 186], [80, 152], [90, 124]], { fill: L.body, gap: 0.05 }) +
    k.shape([[124, 108], [135, 122], [141, 152], [143, 184], [138, 206], [128, 213], [124, 196], [122, 164], [120, 132], [118, 114]], { fill: L.white, ink: false, edge: false, off: 0.4 }) +
    k.line([[124, 110], [121, 132], [123, 164], [125, 196], [128, 212]], { ink: '#f5c779', w: 2.6, op: 0.8 })
  const skull = k.shape(
    [[78, 74], [82, 48], [96, 30], [118, 22], [140, 26], [156, 40], [163, 60], [161, 84], [151, 102], [133, 112], [110, 114], [92, 106], [80, 92]],
    { fill: L.body },
  )
  // A long white snout with the nose at its tip, and the white running down to his chest.
  const muzzle =
    k.shape([[126, 52], [146, 47], [166, 50], [182, 57], [192, 68], [193, 82], [186, 95], [168, 104], [146, 109], [127, 106], [117, 92], [116, 72]], { fill: L.white, gap: 0.04 }) +
    k.line([[127, 56], [118, 80], [122, 101]], { ink: '#f5c779', w: 2.4, op: 0.75 })
  const ear =
    k.shape([[134, 22], [120, 11], [101, 9], [85, 15], [77, 27], [83, 36], [100, 34], [118, 31]], { fill: L.ear }) +
    k.line([[122, 18], [104, 18], [88, 25]], { ink: '#4f260b', w: 1.6, op: 0.7 })
  const face =
    muzzle +
    `<g class="eye-open">${k.eye(140, 44, 4.4)}</g>` +
    k.line([[134, 45], [140, 48], [146, 45]], { cls: 'eye-shut', w: 2.2 }) +
    k.line([[133, 35], [140, 33], [147, 36]], { cls: 'brow-sad', w: 2 }) +
    k.blob(189, 64, 6.8, 5.8, { fill: INK_DARK, ink: false, off: 0 }) +
    `<circle cx="187" cy="62" r="1.6" fill="#fff" opacity=".7"/>` +
    k.line([[183, 92], [168, 99], [154, 98]], { cls: 'mouth-happy', w: 2.2 }) +
    k.line([[183, 99], [168, 95], [155, 98]], { cls: 'mouth-sad', w: 2.2 })
  return { legs, arms, tail, body, skull, ear, face }
}

function tigerParts(L: Look): DogParts {
  const k = new Ink(L.seed)
  // Fine fuzz: a zigzag on a zigzag, so the edge looks like short fur rather than torn paper.
  const fur = (p: Pt[], fill: string, amp = 2) => k.shape(shag(shag(p, amp), amp * 0.6), { fill, smooth: false, w: 1.9, wob: 0.35 })
  // Arms held a little out in front, as he stands.
  const arm = (sx: number, sy: number, fill: string) =>
    fur([[sx - 10, sy - 6], [sx + 9, sy - 9], [sx + 21, sy + 11], [sx + 23, sy + 22], [sx + 10, sy + 27], [sx - 7, sy + 13]], fill, 1.2) +
    k.blob(sx + 21, sy + 28, 9.5, 7.5, { fill: L.white })
  const leg = (hx: number, hy: number, fill: string) =>
    fur([[hx - 13, hy - 8], [hx + 12, hy - 8], [hx + 12, hy + 26], [hx + 10, hy + 32], [hx - 11, hy + 32], [hx - 13, hy + 24]], fill, 1.4) +
    k.blob(hx + 3, hy + 35, 15, 7.5, { fill: L.white })
  const arms = [arm(...SHOULDERS[0], L.body), arm(...SHOULDERS[1], L.shade)]
  const legs = [leg(...HIPS[0], L.body), leg(...HIPS[1], L.shade)]
  // A Scottie's short tail sticks straight up.
  const tail = fur([[84, 196], [72, 184], [68, 166], [76, 163], [83, 178], [90, 190]], L.body, 1.4)
  const body =
    fur([[94, 110], [128, 108], [144, 126], [155, 160], [155, 198], [145, 218], [119, 229], [92, 229], [74, 217], [67, 188], [71, 150], [81, 124]], L.body) +
    fur([[116, 116], [136, 126], [148, 158], [149, 194], [140, 214], [122, 220], [110, 198], [107, 158], [109, 130]], L.white, 1.6)
  const skull =
    k.shape([[102, 40], [106, 4, 1], [120, 30]], { fill: L.body, smooth: false, w: 2 }) +
    k.shape([[106, 34], [108, 14, 1], [115, 32]], { fill: L.ear, ink: false, smooth: false, edge: false }) +
    fur([[72, 70], [78, 44], [97, 27], [124, 22], [147, 29], [162, 48], [167, 70], [161, 96], [146, 111], [118, 118], [95, 113], [78, 97]], L.body, 2.4)
  const ear = k.shape([[122, 30], [132, 0, 1], [142, 30]], { fill: L.body, smooth: false, w: 2 }) + k.shape([[127, 26], [132, 10, 1], [137, 26]], { fill: L.ear, ink: false, smooth: false, edge: false })
  // A white beard all over the front of his face.
  const beard = fur([[131, 72], [152, 69], [168, 75], [177, 89], [174, 105], [164, 119], [147, 127], [128, 123], [117, 110], [117, 90]], L.white, 2)
  const face =
    beard +
    k.line([[132, 40], [140, 36], [148, 40]], { w: 2.4, ink: '#5c5751' }) +
    `<g class="eye-open">${k.eye(141, 48, 4.2)}</g>` +
    k.line([[135, 49], [141, 52], [147, 49]], { cls: 'eye-shut', w: 2.2 }) +
    k.line([[134, 40], [141, 37], [148, 41]], { cls: 'brow-sad', w: 2 }) +
    k.blob(170, 74, 7, 5.6, { fill: INK_DARK, ink: false, off: 0 }) +
    `<circle cx="168" cy="72" r="1.6" fill="#fff" opacity=".7"/>` +
    k.line([[164, 98], [152, 104], [140, 100]], { cls: 'mouth-happy', w: 2.2 }) +
    k.line([[164, 104], [152, 100], [141, 103]], { cls: 'mouth-sad', w: 2.2 })
  return { legs, arms, tail, body, skull, ear, face }
}

export const dogParts = (L: Look): DogParts => (L.kind === 'tiger' ? tigerParts(L) : kipperParts(L))

const head = (p: DogParts) => `<g class="head" ${pivot(118, 112)}>${p.skull}<g class="ear" ${pivot(124, 22)}>${p.ear}</g>${p.face}</g>`

/** A whole standing dog for 2D, with classes CSS can walk, wag and blink. */
export function dogBody(L: Look) {
  const p = dogParts(L)
  const limb = (cls: string, at: readonly [number, number], art: string) => `<g class="${cls}" ${pivot(at[0], at[1])}>${art}</g>`
  return (
    limb('arm arm-far', SHOULDERS[1], p.arms[1]) +
    limb('leg leg-far', HIPS[1], p.legs[1]) +
    `<g class="tail" ${pivot(86, 198)}>${p.tail}</g>` +
    `<g class="torso">${p.body}</g>` +
    limb('leg leg-near', HIPS[0], p.legs[0]) +
    limb('arm arm-near', SHOULDERS[0], p.arms[0]) +
    head(p)
  )
}

export const kipperBody = () => dogBody(KIPPER)
export const dog = (L: Look, cls = '') => svg('0 0 220 260', dogBody(L), `kipper ${cls}`.trim())
export const kipper = (cls = '') => dog(KIPPER, cls)

/**
 * A dog asleep, in the basket's coordinates (see props.basket): `inside` lies on the cushion,
 * `over` is the head resting on the front rim. The blanket drape stays hidden until .drape.on.
 */
export function dogAsleep(L: Look = KIPPER) {
  const k = new Ink(`${L.seed}-asleep`)
  const p = dogParts(L)
  const checks = [[62, 86], [96, 76], [80, 102], [116, 96], [128, 76]]
    .map(([x, y]) => k.shape([[x, y], [x + 14, y], [x + 14, y + 12], [x, y + 12]], { fill: '#f4cf62', ink: false, smooth: false, off: 0.5 }))
    .join('')
  const drape =
    k.shape([[44, 104], [58, 80], [96, 68], [134, 66], [152, 72], [156, 96], [150, 120], [90, 122], [46, 116]], { fill: '#8fbadf' }) +
    checks +
    k.line([[136, 70], [146, 94], [142, 118]], { w: 1.6, op: 0.6 })
  const curl: Pt[] = [[40, 106], [56, 82], [92, 70], [140, 67], [180, 73], [204, 92], [206, 114], [150, 120], [90, 120], [44, 116]]
  const tail =
    L.kind === 'tiger'
      ? k.shape(shag(shag([[54, 104], [38, 94], [34, 80], [42, 80], [48, 92], [58, 98]], 1.4), 0.8), { fill: L.body, smooth: false, w: 1.9 })
      : ([[[48, 104], [28, 98]], [[48, 106], [26, 106]], [[48, 108], [30, 114]]] as Pt[][]).map((pts) => k.line(pts, { ink: '#4a3022', w: 2.2 })).join('')
  const inside =
    `<g class="tail-sleep" ${pivot(50, 104)}>${tail}</g>` +
    (L.kind === 'tiger' ? k.shape(shag(shag(curl, 2), 1.2), { fill: L.body, smooth: false, w: 1.9 }) : k.shape(curl, { fill: L.body, gap: 0.06 })) +
    k.shape([[150, 100], [190, 94], [204, 110], [180, 118], [150, 118]], { fill: L.white, ink: false, edge: false }) +
    `<g class="drape">${drape}</g>`
  // The upright head, tipped over to rest on the rim.
  const over = `<g transform="translate(50 6) rotate(16 150 80)">${head(p)}</g>`
  return { inside, over }
}

/** Kipper asleep in his basket (the 2D ending uses this). */
export const kipperAsleep = () => dogAsleep(KIPPER)
