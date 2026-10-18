import { Ink, INK, mirror, svg, type Pt } from './ink'
import { P } from './palette'
import type { FriendId, ToyId } from '../content'
import { toyBody } from './props'

// Friends face the viewer, viewBox 0 0 200 220 with feet on y≈212.
// Each draws its body, then the toy it is holding, then its paws over the toy.

interface FriendArt {
  /** Centre and size of the held toy. */
  hold: [x: number, y: number, size: number]
  draw: (k: Ink, held: string) => string
}

const whiskers = (k: Ink, x: number, y: number, len = 22) => {
  const lines: Pt[][] = [
    [[x, y], [x - len, y - 4]],
    [[x, y + 4], [x - len + 2, y + 7]],
    [[200 - x, y], [200 - x + len, y - 4]],
    [[200 - x, y + 4], [200 - x + len - 2, y + 7]],
  ]
  return lines.map((p) => k.line(p, { w: 1.2, op: 0.8 })).join('')
}

const ART: Record<FriendId, FriendArt> = {
  rabbit: {
    hold: [100, 152, 66],
    draw(k, held) {
      const fur = '#cdbfae'
      const light = '#f7f0e6'
      const ear: Pt[] = [[80, 76], [70, 46], [67, 19], [74, 6], [84, 12], [91, 42], [93, 72]]
      const inner: Pt[] = [[80, 64], [75, 42], [73, 23], [77, 16], [82, 23], [86, 43], [87, 62]]
      return (
        k.shape(ear, { fill: fur }) +
        k.shape(inner, { fill: P.pink, ink: false, edge: false }) +
        `<g transform="rotate(22 112 74)">${k.shape(mirror(ear), { fill: fur })}${k.shape(mirror(inner), { fill: P.pink, ink: false, edge: false })}</g>` +
        k.blob(76, 206, 21, 9, { fill: fur }) +
        k.blob(124, 206, 21, 9, { fill: fur }) +
        k.shape([[62, 150], [68, 124], [86, 112], [114, 112], [132, 124], [138, 150], [136, 184], [122, 204], [100, 208], [78, 204], [64, 184]], { fill: fur }) +
        k.blob(100, 172, 26, 28, { fill: light, ink: false, edge: false }) +
        held +
        k.blob(69, 157, 10, 9, { fill: fur }) +
        k.blob(131, 157, 10, 9, { fill: fur }) +
        k.blob(100, 90, 40, 34, { fill: fur }) +
        k.blob(100, 105, 17, 11, { fill: light, ink: false, edge: false }) +
        k.cheek(77, 101) +
        k.cheek(123, 101) +
        k.eye(86, 87, 4.8) +
        k.eye(114, 87, 4.8) +
        k.shape([[96, 110], [104, 110], [104, 117], [96, 117]], { fill: '#fff', w: 1.3, smooth: false, gap: 0, off: 0 }) +
        k.line([[100, 110], [100, 117]], { w: 1 }) +
        k.blob(100, 99, 5, 3.6, { fill: P.nose, w: 1.4, gap: 0 }) +
        k.line([[100, 103], [100, 108]], { w: 1.5 }) +
        k.line([[93, 109], [100, 107.5], [107, 109]], { w: 1.5 }) +
        whiskers(k, 88, 103)
      )
    },
  },

  badger: {
    hold: [100, 156, 68],
    draw(k, held) {
      const grey = '#aaa8a1'
      const white = '#fbfaf5'
      const stripe: Pt[] = [[68, 63], [82, 57], [92, 84], [97, 112], [92, 119], [80, 104], [63, 82]]
      return (
        k.blob(63, 67, 11, 10, { fill: INK }) +
        k.blob(137, 67, 11, 10, { fill: INK }) +
        k.blob(76, 205, 22, 10, { fill: INK }) +
        k.blob(124, 205, 22, 10, { fill: INK }) +
        k.shape([[54, 160], [62, 128], [84, 116], [116, 116], [138, 128], [146, 160], [142, 190], [126, 206], [100, 210], [74, 206], [58, 190]], { fill: grey }) +
        k.blob(100, 176, 28, 26, { fill: '#8f8d86', ink: false, edge: false, op: 0.45 }) +
        held +
        k.blob(67, 161, 10, 9, { fill: INK }) +
        k.blob(133, 161, 10, 9, { fill: INK }) +
        k.shape([[56, 84], [66, 62], [100, 52], [134, 62], [144, 84], [136, 106], [118, 122], [100, 128], [82, 122], [64, 106]], { fill: white }) +
        k.shape(stripe, { fill: INK, ink: false, edge: false, off: 0.4 }) +
        k.shape(mirror(stripe), { fill: INK, ink: false, edge: false, off: 0.4 }) +
        k.cheek(69, 101) +
        k.cheek(131, 101) +
        k.dot(85, 89, 6.2, '#fff') +
        k.dot(115, 89, 6.2, '#fff') +
        k.eye(85, 89, 3.8) +
        k.eye(115, 89, 3.8) +
        k.blob(100, 116, 8, 6, { fill: INK, ink: false, off: 0 }) +
        `<circle cx="97.5" cy="114" r="1.8" fill="#fff" opacity=".7"/>` +
        k.line([[94, 124], [100, 127], [106, 124]], { w: 1.6 })
      )
    },
  },

  weasel: {
    hold: [100, 148, 56],
    draw(k, held) {
      const fur = '#c98b54'
      const light = '#f7e7c9'
      return (
        k.shape([[116, 198], [140, 194], [160, 178], [172, 152], [176, 126], [184, 118], [190, 128], [186, 158], [172, 186], [146, 206], [118, 210]], { fill: fur }) +
        k.shape([[176, 128], [184, 118], [190, 128], [189, 140], [177, 138]], { fill: P.brownDark, ink: false, edge: false }) +
        k.blob(86, 208, 14, 7, { fill: fur }) +
        k.blob(114, 208, 14, 7, { fill: fur }) +
        k.shape([[76, 150], [80, 118], [92, 104], [108, 104], [120, 118], [124, 150], [124, 186], [116, 204], [100, 210], [84, 204], [76, 186]], { fill: fur }) +
        k.shape([[88, 118], [100, 110], [112, 118], [114, 150], [112, 184], [100, 196], [88, 184], [86, 150]], { fill: light, ink: false, edge: false }) +
        held +
        k.blob(74, 151, 8, 7, { fill: fur }) +
        k.blob(126, 151, 8, 7, { fill: fur }) +
        k.blob(75, 59, 10, 10, { fill: fur }) +
        k.blob(125, 59, 10, 10, { fill: fur }) +
        k.blob(75, 59, 5, 5, { fill: light, ink: false, edge: false }) +
        k.blob(125, 59, 5, 5, { fill: light, ink: false, edge: false }) +
        k.shape([[68, 78], [76, 58], [100, 50], [124, 58], [132, 78], [126, 94], [110, 102], [100, 104], [90, 102], [74, 94]], { fill: fur }) +
        k.blob(100, 91, 17, 10, { fill: light, ink: false, edge: false }) +
        k.cheek(78, 86, 5) +
        k.cheek(122, 86, 5) +
        k.eye(87, 75, 4.2) +
        k.eye(113, 75, 4.2) +
        k.blob(100, 85, 4.6, 3.2, { fill: INK, ink: false, off: 0 }) +
        k.line([[95, 93], [100, 95], [105, 93]], { w: 1.5 }) +
        whiskers(k, 90, 88, 18)
      )
    },
  },

  robin: {
    hold: [100, 150, 62],
    draw(k, held) {
      const brown = '#a87b54'
      const breast = '#ec7a4b'
      const light = '#f7eddd'
      const wing: Pt[] = [[46, 118], [58, 110], [70, 122], [76, 146], [72, 166], [60, 172], [50, 158]]
      return (
        k.line([[90, 190], [88, 212]], { w: 2.4 }) +
        k.line([[110, 190], [112, 212]], { w: 2.4 }) +
        k.line([[79, 214], [88, 212], [96, 215]], { w: 2.2 }) +
        k.line([[104, 215], [112, 212], [121, 214]], { w: 2.2 }) +
        k.shape([[44, 140], [50, 104], [72, 80], [100, 74], [128, 80], [150, 104], [156, 140], [148, 172], [126, 192], [100, 198], [74, 192], [52, 172]], { fill: brown }) +
        k.line([[98, 76], [93, 63]], { w: 2.2 }) +
        k.line([[102, 76], [109, 65]], { w: 2.2 }) +
        k.shape([[62, 122], [70, 99], [100, 91], [130, 99], [138, 122], [136, 152], [120, 170], [100, 174], [80, 170], [64, 152]], { fill: breast, ink: false }) +
        k.shape([[72, 170], [100, 176], [128, 170], [132, 182], [116, 194], [100, 196], [84, 194], [68, 182]], { fill: light, ink: false, edge: false }) +
        k.eye(84, 105, 4.6) +
        k.eye(116, 105, 4.6) +
        k.shape([[93, 112], [107, 112], [100, 123, 1]], { fill: '#e8b04c', w: 1.6, gap: 0, off: 0.5 }) +
        held +
        k.shape(wing, { fill: '#94694a' }) +
        k.shape(mirror(wing), { fill: '#94694a' })
      )
    },
  },

  hedgehog: {
    hold: [100, 168, 58],
    draw(k, held) {
      const cream = '#efdcbd'
      const spikes: Pt[] = Array.from({ length: 38 }, (_, i) => {
        const a = (i / 38) * Math.PI * 2
        const r = i % 2 ? 1.2 : 1
        return [100 + Math.cos(a) * 70 * r, 126 + Math.sin(a) * 64 * r, i % 2 ? 1 : undefined] as unknown as Pt
      })
      const quills = Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI * (1.08 + (i / 8) * 0.84)
        const [x, y] = [100 + Math.cos(a) * 58, 126 + Math.sin(a) * 52]
        return k.line([[x, y], [x + Math.cos(a) * 12, y + Math.sin(a) * 12]], { w: 1.4, ink: '#5e4532' })
      }).join('')
      return (
        k.shape(spikes, { fill: '#8f6c4f', smooth: false, w: 2, gap: 0 }) +
        quills +
        k.blob(78, 206, 15, 7, { fill: '#d9b291' }) +
        k.blob(122, 206, 15, 7, { fill: '#d9b291' }) +
        k.shape([[62, 160], [70, 134], [90, 126], [110, 126], [130, 134], [138, 160], [134, 190], [116, 204], [100, 206], [84, 204], [66, 190]], { fill: cream }) +
        held +
        k.blob(72, 172, 9, 7, { fill: '#d9b291' }) +
        k.blob(128, 172, 9, 7, { fill: '#d9b291' }) +
        k.blob(70, 94, 7, 7, { fill: cream }) +
        k.blob(130, 94, 7, 7, { fill: cream }) +
        k.shape([[64, 118], [70, 97], [100, 87], [130, 97], [136, 118], [128, 138], [112, 148], [100, 150], [88, 148], [72, 138]], { fill: cream }) +
        k.cheek(76, 129) +
        k.cheek(124, 129) +
        k.eye(86, 115, 4.4) +
        k.eye(114, 115, 4.4) +
        k.blob(100, 133, 12, 9, { fill: cream, w: 1.8 }) +
        k.blob(100, 130, 5.5, 4.3, { fill: INK, ink: false, off: 0 }) +
        k.line([[96, 140], [100, 142], [104, 140]], { w: 1.4 })
      )
    },
  },

  owl: {
    hold: [100, 156, 58],
    draw(k, held) {
      const brown = '#a87e59'
      const wing: Pt[] = [[48, 116], [60, 108], [72, 122], [78, 148], [74, 168], [62, 174], [50, 158]]
      const chevrons = [[88, 146], [112, 146], [100, 160], [88, 174], [112, 174]]
        .map(([x, y]) => k.line([[x - 5, y - 3], [x, y + 2], [x + 5, y - 3]], { w: 1.6, ink: '#9a7650' }))
        .join('')
      return (
        k.line([[86, 196], [84, 210]], { w: 3, ink: P.orange }) +
        k.line([[114, 196], [116, 210]], { w: 3, ink: P.orange }) +
        k.line([[76, 211], [84, 210], [92, 212]], { w: 2.6, ink: P.orange }) +
        k.line([[108, 212], [116, 210], [124, 211]], { w: 2.6, ink: P.orange }) +
        k.shape([[64, 84], [58, 58, 1], [80, 76]], { fill: brown, w: 2.2 }) +
        k.shape(mirror([[64, 84], [58, 58, 1], [80, 76]]), { fill: brown, w: 2.2 }) +
        k.shape([[46, 136], [52, 100], [72, 80], [100, 74], [128, 80], [148, 100], [154, 136], [146, 172], [126, 196], [100, 202], [74, 196], [54, 172]], { fill: brown }) +
        k.blob(100, 160, 32, 36, { fill: '#efdcbc', ink: false, edge: false }) +
        chevrons +
        k.blob(81, 108, 19, 18, { fill: '#f5e9d3', w: 2 }) +
        k.blob(119, 108, 19, 18, { fill: '#f5e9d3', w: 2 }) +
        k.eye(81, 108, 7.5) +
        k.eye(119, 108, 7.5) +
        k.shape([[94, 120], [106, 120], [100, 132, 1]], { fill: '#e8b04c', w: 1.6, gap: 0, off: 0.5 }) +
        held +
        k.shape(wing, { fill: '#8f6a48' }) +
        k.shape(mirror(wing), { fill: '#8f6a48' })
      )
    },
  },

  neddy: {
    // Neddy Dog: a basset hound puppy, all ears, with a red collar.
    hold: [100, 158, 60],
    draw(k, held) {
      const tan = '#d59c5f'
      const brown = '#8f5a33'
      const white = '#fbf8f1'
      const ear: Pt[] = [[70, 66], [58, 84], [50, 118], [50, 150], [58, 168], [70, 166], [78, 140], [80, 104], [80, 78]]
      return (
        k.shape([[136, 176], [152, 156], [158, 132], [164, 126], [166, 136], [160, 160], [146, 182]], { fill: tan }) +
        k.shape([[158, 132], [164, 126], [166, 136], [161, 140]], { fill: white, ink: false, edge: false }) +
        k.blob(75, 206, 22, 10, { fill: white }) +
        k.blob(125, 206, 22, 10, { fill: white }) +
        k.shape([[58, 162], [62, 136], [80, 124], [120, 124], [138, 136], [142, 162], [140, 190], [124, 206], [100, 210], [76, 206], [60, 190]], { fill: tan }) +
        k.shape([[62, 150], [70, 132], [86, 126], [84, 150], [70, 170]], { fill: brown, ink: false, edge: false, op: 0.85 }) +
        k.shape(mirror([[62, 150], [70, 132], [86, 126], [84, 150], [70, 170]]), { fill: brown, ink: false, edge: false, op: 0.85 }) +
        k.blob(100, 170, 26, 32, { fill: white, ink: false, edge: false }) +
        held +
        k.blob(69, 162, 11, 9, { fill: white }) +
        k.blob(131, 162, 11, 9, { fill: white }) +
        k.shape([[66, 82], [72, 60], [100, 50], [128, 60], [134, 82], [132, 106], [120, 122], [100, 128], [80, 122], [68, 106]], { fill: tan }) +
        k.shape([[94, 54], [106, 54], [108, 80], [116, 102], [100, 124], [84, 102], [92, 80]], { fill: white, ink: false, edge: false, off: 0.5 }) +
        k.blob(100, 109, 21, 15, { fill: white, w: 1.8 }) +
        k.line([[86, 66], [92, 64]], { w: 1.6, op: 0.6 }) +
        k.line([[108, 64], [114, 66]], { w: 1.6, op: 0.6 }) +
        k.cheek(80, 104, 6) +
        k.cheek(120, 104, 6) +
        k.eye(85, 84, 4.6) +
        k.eye(115, 84, 4.6) +
        k.line([[78, 91], [85, 94], [92, 91]], { w: 1.5, op: 0.7 }) +
        k.line([[108, 91], [115, 94], [122, 91]], { w: 1.5, op: 0.7 }) +
        k.blob(100, 101, 8.5, 6.5, { fill: INK, ink: false, off: 0 }) +
        `<circle cx="97" cy="99" r="2" fill="#fff" opacity=".7"/>` +
        k.line([[100, 107], [100, 113]], { w: 1.6 }) +
        k.line([[92, 115], [100, 113], [108, 115]], { w: 1.6 }) +
        k.shape(ear, { fill: brown }) +
        k.shape(mirror(ear), { fill: brown }) +
        k.shape([[80, 124], [120, 124], [122, 132], [78, 132]], { fill: P.red, w: 2, off: 0.5 }) +
        k.blob(100, 137, 5, 5, { fill: P.yellow, w: 1.6, gap: 0 })
      )
    },
  },

  mouse: {
    hold: [100, 160, 56],
    draw(k, held) {
      const fur = '#bfb3a7'
      const tail: Pt[] = [[122, 200], [150, 206], [172, 194], [178, 172], [168, 158], [158, 166]]
      return (
        k.line(tail, { w: 6, wob: 0 }) +
        k.line(tail, { w: 3, wob: 0, ink: '#e7b3aa' }) +
        k.blob(82, 207, 14, 7, { fill: '#e8b7ab' }) +
        k.blob(118, 207, 14, 7, { fill: '#e8b7ab' }) +
        k.shape([[66, 160], [72, 132], [88, 120], [112, 120], [128, 132], [134, 160], [130, 188], [116, 204], [100, 208], [84, 204], [70, 188]], { fill: fur }) +
        k.blob(100, 174, 22, 24, { fill: '#f4ece2', ink: false, edge: false }) +
        held +
        k.blob(73, 164, 8, 7, { fill: '#e8b7ab' }) +
        k.blob(127, 164, 8, 7, { fill: '#e8b7ab' }) +
        k.blob(62, 70, 27, 27, { fill: fur }) +
        k.blob(138, 70, 27, 27, { fill: fur }) +
        k.blob(63, 71, 17, 17, { fill: P.pink, ink: false, edge: false }) +
        k.blob(137, 71, 17, 17, { fill: P.pink, ink: false, edge: false }) +
        k.shape([[64, 96], [72, 77], [100, 69], [128, 77], [136, 96], [126, 115], [110, 125], [100, 127], [90, 125], [74, 115]], { fill: fur }) +
        k.cheek(77, 108) +
        k.cheek(123, 108) +
        k.eye(86, 96, 4.6) +
        k.eye(114, 96, 4.6) +
        k.blob(100, 117, 5, 4, { fill: P.nose, w: 1.4, gap: 0 }) +
        k.line([[96, 122.5], [100, 124], [104, 122.5]], { w: 1.4 }) +
        whiskers(k, 92, 115, 26)
      )
    },
  },
}

export const FRIEND_IDS = Object.keys(ART) as FriendId[]

const HELD = '<!--held-->'

/** A friend in three layers for 3D: behind the toy, the toy's box, and the paws in front of it. */
export function friendLayers(id: FriendId) {
  const art = ART[id]
  const [back, front] = art.draw(new Ink(id), HELD).split(HELD)
  return { back, front, hold: art.hold }
}

/** A friend holding a toy (or nothing). The toy is its own <svg class="held"> so it can be hidden as it flies off. */
export function friend(id: FriendId, toy?: ToyId, cls = '') {
  const art = ART[id]
  const [x, y, s] = art.hold
  const held = toy
    ? `<svg class="held" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" viewBox="0 0 100 100" overflow="visible">${toyBody(toy)}</svg>`
    : ''
  return svg('0 0 200 220', art.draw(new Ink(id), held), `friend-art friend-${id} ${cls}`.trim())
}
