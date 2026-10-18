import { Ink, pivot, svg, type Pt } from './ink'
import { P } from './palette'

// Kipper faces right. Parts carry classes so CSS can walk, wag, flop and blink them:
// .leg-a/.leg-b swing in diagonal pairs, .tail wags, .ear flops, .head nods.

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

function head(k: Ink) {
  const skull = k.shape(
    [
      [160, 90], [165, 70], [180, 56], [200, 52], [219, 57], [231, 68], [239, 78],
      [251, 82], [258, 93], [253, 104], [240, 109], [226, 113], [213, 124], [195, 129],
      [177, 125], [164, 113],
    ],
    { fill: P.white },
  )
  const ear = k.shape(
    [[175, 55], [186, 56], [189, 70], [191, 92], [191, 112], [185, 128], [175, 137], [164, 134], [160, 120], [164, 95], [169, 71]],
    { fill: P.tan },
  )
  const earFold = k.line([[179, 66], [181, 92], [177, 118]], { w: 1.4, op: 0.55 })
  const face =
    k.cheek(227, 99, 6.5) +
    `<g class="eye-open">${k.eye(215, 81, 4.8)}</g>` +
    k.line([[208, 82], [215, 86], [222, 82]], { cls: 'eye-shut', w: 2.4 }) +
    k.line([[207, 70], [214, 67], [222, 69]], { cls: 'brow-sad', w: 2 }) +
    k.blob(252, 91, 6.5, 5.2, { fill: P.black, ink: false, off: 0 }) +
    `<circle cx="250" cy="89" r="1.6" fill="#fff" opacity=".7"/>` +
    k.line([[247, 103], [239, 108.5], [230, 106]], { cls: 'mouth-happy', w: 2.2 }) +
    k.line([[247, 108], [239, 104.5], [231, 107.5]], { cls: 'mouth-sad', w: 2.2 })
  return `<g class="head" ${pivot(182, 112)}>${skull}<g class="ear" ${pivot(180, 58)}>${ear}${earFold}</g>${face}</g>`
}

/** Standing / walking Kipper, viewBox 0 0 260 220, feet on y=212. */
export function kipperBody() {
  const k = new Ink('kipper')
  const legG = (hx: number, fill: string, cls: string) =>
    k.shape(leg(hx), { fill, cls: `leg ${cls}`, attrs: pivot(hx, 160) })
  return (
    legG(100, P.shadow, 'leg-b') +
    legG(182, P.shadow, 'leg-a') +
    legG(80, P.white, 'leg-a') +
    legG(162, P.white, 'leg-b') +
    k.shape(
      [[68, 127], [55, 118], [45, 101], [41, 83], [45, 70], [51, 78], [53, 96], [60, 111], [72, 120]],
      { fill: P.white, cls: 'tail', attrs: pivot(68, 125) },
    ) +
    k.shape(
      [
        [64, 128], [88, 114], [120, 110], [152, 108], [178, 110], [194, 127], [197, 150],
        [190, 167], [164, 173], [136, 170], [108, 173], [80, 171], [62, 160], [57, 146],
      ],
      { fill: P.white, gap: 0.06 },
    ) +
    k.shape([[82, 163], [130, 161], [180, 158], [186, 163], [164, 172], [110, 173], [81, 170]], { fill: P.shadow, ink: false, op: 0.85, edge: false }) +
    head(k)
  )
}

export const kipper = (cls = '') => svg('0 0 260 220', kipperBody(), `kipper ${cls}`.trim())

/**
 * Kipper asleep in his basket, in the basket's coordinates (see props.basket):
 * `inside` lies on the cushion, `over` is his chin and paws resting on the front rim.
 * The blanket drape is hidden until the blanket comes home (.drape.on).
 */
export function kipperAsleep() {
  const k = new Ink('kipper-asleep')
  const checks = [[62, 86], [96, 76], [80, 102], [116, 96], [128, 76]]
    .map(([x, y]) => k.shape([[x, y], [x + 14, y], [x + 14, y + 12], [x, y + 12]], { fill: P.yellow, ink: false, smooth: false, off: 0.5 }))
    .join('')
  const drape =
    k.shape([[44, 104], [58, 80], [96, 68], [134, 66], [152, 72], [156, 96], [150, 120], [90, 122], [46, 116]], { fill: P.blue }) +
    checks +
    k.line([[136, 70], [146, 94], [142, 118]], { w: 1.6, op: 0.6 })
  const inside =
    k.shape([[54, 106], [33, 101], [24, 89], [28, 79], [35, 85], [39, 95], [56, 98]], { fill: P.white, cls: 'tail-sleep', attrs: pivot(55, 102) }) +
    k.shape([[40, 106], [56, 82], [92, 70], [140, 67], [180, 73], [204, 92], [206, 114], [150, 120], [90, 120], [44, 116]], { fill: P.white, gap: 0.06 }) +
    `<g class="drape">${drape}</g>`
  const over = `<g transform="translate(-16 -6) rotate(14 205 92)">${head(k)}</g>`
  return { inside, over }
}
