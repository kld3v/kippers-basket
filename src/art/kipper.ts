import { Ink, pivot, svg, type Pt } from './ink'
import { P } from './palette'

// Dogs face right, drawn in a 260×220 frame with feet on y≈212. The same drawing makes
// Kipper and Tiger (a coat changes the colours) and comes apart into puppet pieces for 3D.
// In 2D, CSS moves the parts by class: .leg-a/.leg-b swing in diagonal pairs, .tail wags, .ear flops, .head nods.

export interface Coat {
  seed: string
  body: string
  shade: string
  ear: string
  /** Tiger's stripes. */
  stripes?: string
}

export const KIPPER: Coat = { seed: 'kipper', body: P.white, shade: P.shadow, ear: P.tan }
export const TIGER: Coat = { seed: 'tiger', body: '#f7d6a0', shade: '#e8bf84', ear: '#b9773f', stripes: '#cf8743' }

/** Where each leg hangs from, left to right: back-near, back-far, front-near, front-far. */
export const LEG_X = [80, 100, 162, 182] as const

// Legs start well inside the body so its outline hides their tops; paws point forward.
const leg = (hx: number): Pt[] => [
  [hx - 11, 150],
  [hx + 11, 150],
  [hx + 10, 197],
  [hx + 17, 203],
  [hx + 14, 212],
  [hx - 9, 212],
  [hx - 11, 203],
]

export interface DogParts {
  legs: string[]
  tail: string
  body: string
  skull: string
  ear: string
  face: string
}

function stripe(k: Ink, c: Coat, pts: Pt[], w = 6.5) {
  return c.stripes ? k.line(pts, { ink: c.stripes, w, op: 0.85 }) : ''
}

/** Every piece of a dog, drawn in the same order as always so the wobble never changes. */
export function dogParts(c: Coat): DogParts {
  const k = new Ink(c.seed)
  const s = new Ink(`${c.seed}-stripes`)
  const legFill = [P.white, c.shade, P.white, c.shade].map((f) => (f === P.white ? c.body : f))
  // Drawing order matters for the seeded wobble: far legs, near legs, tail, body, head.
  const legs: string[] = []
  legs[1] = k.shape(leg(LEG_X[1]), { fill: legFill[1] })
  legs[3] = k.shape(leg(LEG_X[3]), { fill: legFill[3] })
  legs[0] = k.shape(leg(LEG_X[0]), { fill: legFill[0] })
  legs[2] = k.shape(leg(LEG_X[2]), { fill: legFill[2] })
  const tail =
    k.shape([[68, 127], [55, 118], [45, 101], [41, 83], [45, 70], [51, 78], [53, 96], [60, 111], [72, 120]], { fill: c.body }) +
    stripe(s, c, [[46, 92], [53, 90]], 4) +
    stripe(s, c, [[50, 106], [57, 102]], 4)
  const body =
    k.shape(
      [
        [64, 128], [88, 114], [120, 110], [152, 108], [178, 110], [194, 127], [197, 150],
        [190, 167], [164, 173], [136, 170], [108, 173], [80, 171], [62, 160], [57, 146],
      ],
      { fill: c.body, gap: 0.06 },
    ) +
    k.shape([[82, 163], [130, 161], [180, 158], [186, 163], [164, 172], [110, 173], [81, 170]], { fill: c.shade, ink: false, op: 0.85, edge: false }) +
    [90, 112, 134, 156].map((x) => stripe(s, c, [[x, 116], [x + 3, 126], [x + 1, 137]])).join('')
  const skull =
    k.shape(
      [
        [160, 90], [165, 70], [180, 56], [200, 52], [219, 57], [231, 68], [239, 78],
        [251, 82], [258, 93], [253, 104], [240, 109], [226, 113], [213, 124], [195, 129],
        [177, 125], [164, 113],
      ],
      { fill: c.body },
    ) +
    stripe(s, c, [[200, 56], [203, 66]], 4.5) +
    stripe(s, c, [[211, 58], [212, 67]], 4.5)
  const ear =
    k.shape(
      [[175, 55], [186, 56], [189, 70], [191, 92], [191, 112], [185, 128], [175, 137], [164, 134], [160, 120], [164, 95], [169, 71]],
      { fill: c.ear },
    ) + k.line([[179, 66], [181, 92], [177, 118]], { w: 1.4, op: 0.55 })
  const face =
    k.cheek(227, 99, 6.5) +
    `<g class="eye-open">${k.eye(215, 81, 4.8)}</g>` +
    k.line([[208, 82], [215, 86], [222, 82]], { cls: 'eye-shut', w: 2.4 }) +
    k.line([[207, 70], [214, 67], [222, 69]], { cls: 'brow-sad', w: 2 }) +
    k.blob(252, 91, 6.5, 5.2, { fill: P.black, ink: false, off: 0 }) +
    `<circle cx="250" cy="89" r="1.6" fill="#fff" opacity=".7"/>` +
    k.line([[247, 103], [239, 108.5], [230, 106]], { cls: 'mouth-happy', w: 2.2 }) +
    k.line([[247, 108], [239, 104.5], [231, 107.5]], { cls: 'mouth-sad', w: 2.2 })
  return { legs, tail, body, skull, ear, face }
}

const head = (p: DogParts) => `<g class="head" ${pivot(182, 112)}>${p.skull}<g class="ear" ${pivot(180, 58)}>${p.ear}</g>${p.face}</g>`

/** A whole standing dog for 2D, with classes CSS can walk, wag and blink. */
export function dogBody(c: Coat) {
  const p = dogParts(c)
  const legG = (i: number, cls: string) => `<g class="leg ${cls}" ${pivot(LEG_X[i], 160)}>${p.legs[i]}</g>`
  return (
    legG(1, 'leg-b') +
    legG(3, 'leg-a') +
    legG(0, 'leg-a') +
    legG(2, 'leg-b') +
    `<g class="tail" ${pivot(68, 125)}>${p.tail}</g>` +
    p.body +
    head(p)
  )
}

export const kipperBody = () => dogBody(KIPPER)
export const dog = (c: Coat, cls = '') => svg('0 0 260 220', dogBody(c), `kipper ${cls}`.trim())
export const kipper = (cls = '') => dog(KIPPER, cls)

/**
 * A dog asleep, in the basket's coordinates (see props.basket): `inside` lies on the cushion,
 * `over` is the chin resting on the front rim. The blanket drape stays hidden until .drape.on.
 */
export function dogAsleep(c: Coat = KIPPER) {
  const k = new Ink(`${c.seed}-asleep`)
  const p = dogParts(c)
  const checks = [[62, 86], [96, 76], [80, 102], [116, 96], [128, 76]]
    .map(([x, y]) => k.shape([[x, y], [x + 14, y], [x + 14, y + 12], [x, y + 12]], { fill: P.yellow, ink: false, smooth: false, off: 0.5 }))
    .join('')
  const drape =
    k.shape([[44, 104], [58, 80], [96, 68], [134, 66], [152, 72], [156, 96], [150, 120], [90, 122], [46, 116]], { fill: P.blue }) +
    checks +
    k.line([[136, 70], [146, 94], [142, 118]], { w: 1.6, op: 0.6 })
  const inside =
    k.shape([[54, 106], [33, 101], [24, 89], [28, 79], [35, 85], [39, 95], [56, 98]], { fill: c.body, cls: 'tail-sleep', attrs: pivot(55, 102) }) +
    k.shape([[40, 106], [56, 82], [92, 70], [140, 67], [180, 73], [204, 92], [206, 114], [150, 120], [90, 120], [44, 116]], { fill: c.body, gap: 0.06 }) +
    (c.stripes ? [86, 110, 134].map((x) => k.line([[x, 74], [x + 3, 86], [x + 1, 96]], { ink: c.stripes, w: 6, op: 0.85 })).join('') : '') +
    `<g class="drape">${drape}</g>`
  const over = `<g transform="translate(-16 -6) rotate(14 205 92)">${head(p)}</g>`
  return { inside, over }
}

/** Kipper asleep in his basket (the 2D ending uses this). */
export const kipperAsleep = () => dogAsleep(KIPPER)
