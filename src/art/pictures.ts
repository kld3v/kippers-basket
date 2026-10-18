import { Ink, INK, mirror, svg, type Pt } from './ink'
import { P } from './palette'

// Word pictures for the letter questions, viewBox 0 0 120 120.

type Draw = (k: Ink) => string

const arc = (cx: number, cy: number, r: number, from: number, to: number, n: number, rx = r): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * r] as Pt
  })

/** A thick coloured stroke with an ink edge: tentacles, worms, rainbow bands. */
const tube = (k: Ink, p: Pt[], w: number, color: string) => k.line(p, { w: w + 4, wob: 0 }) + k.line(p, { w, wob: 0, ink: color })

const star = (k: Ink, x: number, y: number, r: number, fill = P.yellow) =>
  k.shape(
    [[x, y - r, 1], [x + r * 0.28, y - r * 0.28], [x + r, y, 1], [x + r * 0.28, y + r * 0.28], [x, y + r, 1], [x - r * 0.28, y + r * 0.28], [x - r, y, 1], [x - r * 0.28, y - r * 0.28]],
    { fill, w: 1.4, gap: 0, off: 0.4 },
  )

const PICTURES: Record<string, Draw> = {
  apple: (k) =>
    k.shape(
      [[60, 36], [74, 28], [92, 32], [104, 48], [105, 70], [97, 92], [81, 106], [66, 104], [60, 100], [54, 104], [39, 106], [23, 92], [15, 70], [16, 48], [28, 32], [46, 28]],
      { fill: P.red, w: 2.6 },
    ) +
    k.line([[60, 36], [61, 23], [65, 13]], { w: 3.4, ink: P.brownDark }) +
    k.shape([[64, 25], [74, 13], [92, 12], [84, 23], [71, 28]], { fill: P.green, w: 2 }) +
    k.blob(36, 52, 7, 11, { fill: '#fff', ink: false, op: 0.7, rot: 0.4, edge: false }),

  banana: (k) =>
    k.shape(
      [[22, 40], [26, 58], [44, 77], [68, 87], [92, 83], [108, 70], [100, 67], [84, 72], [64, 70], [44, 60], [32, 46], [29, 36]],
      { fill: P.yellow, w: 2.6 },
    ) +
    k.shape([[22, 41], [19, 29], [26, 26], [30, 37]], { fill: P.brownDark, w: 1.8, gap: 0 }) +
    k.blob(106, 69, 3.5, 3, { fill: P.brownDark, ink: false }) +
    k.line([[33, 52], [50, 68], [74, 78], [96, 76]], { w: 1.6, op: 0.45 }),

  cat: (k) => {
    const ginger = '#f2b36b'
    const ear: Pt[] = [[26, 56], [30, 18, 1], [56, 38]]
    const inner: Pt[] = [[32, 48], [34, 28, 1], [48, 40]]
    return (
      k.shape(ear, { fill: ginger, w: 2.4 }) +
      k.shape(mirror(ear, 60), { fill: ginger, w: 2.4 }) +
      k.shape(inner, { fill: P.pink, ink: false, edge: false }) +
      k.shape(mirror(inner, 60), { fill: P.pink, ink: false, edge: false }) +
      k.blob(60, 68, 40, 34, { fill: ginger, w: 2.6 }) +
      [[52, 38, 50, 48], [60, 36, 60, 47], [68, 38, 70, 48]].map(([a, b, c, d]) => k.line([[a, b], [c, d]], { w: 2.2, ink: '#c9803d' })).join('') +
      k.cheek(36, 78, 7) +
      k.cheek(84, 78, 7) +
      k.eye(46, 64, 5) +
      k.eye(74, 64, 5) +
      k.shape([[55, 74], [65, 74], [60, 80, 1]], { fill: P.nose, w: 1.6, gap: 0, off: 0 }) +
      k.line([[60, 80], [60, 84]], { w: 1.8 }) +
      k.line([[52, 85], [56, 88], [60, 84], [64, 88], [68, 85]], { w: 1.8 }) +
      [[-1, 0], [-1, 6], [1, 0], [1, 6]].map(([s, dy]) => k.line([[60 + s * 18, 80 + dy], [60 + s * 44, 76 + dy * 1.6]], { w: 1.3 })).join('')
    )
  },

  duck: (k) =>
    k.line([[8, 104], [24, 100], [40, 104], [56, 100]], { w: 2, ink: P.blue }) +
    k.line([[64, 104], [80, 100], [96, 104], [112, 100]], { w: 2, ink: P.blue }) +
    k.shape([[20, 74], [30, 60], [52, 58], [74, 64], [96, 56], [108, 60], [104, 80], [88, 94], [58, 98], [32, 92], [20, 84]], { fill: P.yellow, w: 2.6 }) +
    k.shape([[56, 70], [70, 78], [86, 74], [78, 84], [62, 82]], { fill: '#f0bd45', w: 1.8 }) +
    k.blob(38, 42, 21, 20, { fill: P.yellow, w: 2.6 }) +
    k.shape([[20, 42], [5, 46], [6, 53], [21, 52]], { fill: P.orange, w: 2, gap: 0 }) +
    k.cheek(32, 50, 5) +
    k.eye(32, 37, 4.2),

  egg: (k) =>
    k.blob(60, 50, 27, 34, { fill: '#f8efdf', w: 2.6, n: 16 }) +
    k.blob(51, 36, 5, 9, { fill: '#fff', ink: false, op: 0.9, rot: 0.3, edge: false }) +
    k.shape([[28, 70], [92, 70], [86, 90], [72, 98], [48, 98], [34, 90]], { fill: P.blue, w: 2.6 }) +
    k.shape([[46, 98], [74, 98], [80, 106], [60, 110], [40, 106]], { fill: P.blue, w: 2.2 }) +
    k.line([[36, 79], [84, 79]], { w: 1.5, ink: '#fff', op: 0.8 }),

  fish: (k) =>
    k.shape([[30, 60], [12, 40], [10, 60, 1], [12, 80]], { fill: P.orange, w: 2.4 }) +
    k.shape([[52, 40], [62, 24], [80, 30], [76, 40]], { fill: '#f6b56a', w: 2 }) +
    k.shape([[26, 60], [42, 42], [66, 36], [90, 44], [104, 60], [90, 76], [66, 84], [42, 78]], { fill: P.orange, w: 2.6 }) +
    k.line([[52, 50], [58, 60], [52, 70]], { w: 1.6, op: 0.55 }) +
    k.line([[64, 48], [70, 60], [64, 72]], { w: 1.6, op: 0.55 }) +
    k.eye(86, 55, 4.6) +
    k.line([[92, 68], [98, 66]], { w: 1.8 }) +
    k.blob(106, 34, 4, 4, { fill: P.bluePale, w: 1.4 }) +
    k.blob(112, 22, 3, 3, { fill: P.bluePale, w: 1.4 }),

  grapes: (k) =>
    k.line([[60, 30], [62, 18], [68, 10]], { w: 3, ink: P.brownDark }) +
    k.shape([[62, 22], [76, 12], [92, 16], [84, 26], [70, 28]], { fill: P.green, w: 2 }) +
    [[38, 40], [54, 38], [70, 38], [86, 40], [46, 56], [62, 55], [78, 56], [54, 72], [70, 72], [62, 88]]
      .map(([x, y]) => k.blob(x, y, 10.5, 10.5, { fill: P.purple, w: 2, n: 10 }) + `<circle cx="${x - 3.5}" cy="${y - 3.5}" r="2.4" fill="#fff" opacity=".6"/>`)
      .join(''),

  hat: (k) =>
    k.blob(60, 80, 54, 14, { fill: '#f1d48f', w: 2.6, n: 16 }) +
    k.shape([[32, 80], [34, 52], [46, 38], [74, 38], [86, 52], [88, 80]], { fill: '#f1d48f', w: 2.6 }) +
    k.shape([[33, 64], [87, 64], [88, 76], [32, 76]], { fill: P.red, w: 2, off: 0.6 }) +
    k.blob(80, 70, 6, 6, { fill: '#fff', w: 1.6 }) +
    k.dot(80, 70, 2.2, P.yellow),

  igloo: (k) => {
    const dome = arc(60, 96, 50, 180, 360, 10, 52)
    const rows = [80, 64, 50].map((y) => {
      const half = Math.sqrt(Math.max(0, 1 - ((96 - y) / 50) ** 2)) * 52
      return k.line([[60 - half + 3, y], [60 + half - 3, y]], { w: 1.6, ink: '#8db3cc' })
    })
    const joints = [
      [36, 80, 96], [62, 80, 96], [86, 80, 96], [24, 64, 80], [48, 64, 80], [74, 64, 80], [96, 64, 80], [38, 50, 64], [60, 50, 64], [82, 50, 64],
    ]
      .filter(([x]) => x < 44 || x > 76)
      .map(([x, y1, y2]) => k.line([[x, y1], [x, y2]], { w: 1.5, ink: '#8db3cc' }))
    return (
      k.blob(60, 98, 58, 7, { fill: '#fff', w: 1.8 }) +
      k.shape([...dome, [112, 97], [8, 97]], { fill: '#eef6fb', w: 2.6 }) +
      rows.join('') +
      joints.join('') +
      k.shape([[44, 97], [44, 80], [52, 70], [68, 70], [76, 80], [76, 97]], { fill: '#4d6f8c', w: 2.4 }) +
      k.dot(22, 22, 2.2, '#9cc3dd') +
      k.dot(98, 18, 2.6, '#9cc3dd') +
      k.dot(108, 40, 1.8, '#9cc3dd')
    )
  },

  jelly: (k) =>
    k.blob(60, 98, 50, 9, { fill: '#fff', w: 2.2, n: 16 }) +
    k.shape([[28, 94], [26, 66], [34, 44], [48, 32], [72, 32], [86, 44], [94, 66], [92, 94]], { fill: '#ec5f70', w: 2.6, cls: 'wobble', attrs: 'style="transform-origin:60px 96px"' }) +
    k.line([[46, 38], [42, 66], [44, 92]], { w: 1.5, ink: '#c43d50', op: 0.7 }) +
    k.line([[74, 38], [78, 66], [76, 92]], { w: 1.5, ink: '#c43d50', op: 0.7 }) +
    k.blob(42, 54, 5, 12, { fill: '#fff', ink: false, op: 0.55, edge: false }),

  kite: (k) => {
    const [t, r, b, l, c]: Pt[] = [[60, 8], [96, 44], [60, 90], [24, 44], [60, 44]]
    const tri = (a: Pt, d: Pt, fill: string) => k.shape([[a[0], a[1], 1], [d[0], d[1], 1], [c[0], c[1], 1]], { fill, ink: false, smooth: false, off: 0.5, edge: false })
    return (
      tri(t, r, P.red) +
      tri(r, b, P.yellow) +
      tri(b, l, P.blue) +
      tri(l, t, P.green) +
      k.shape([[60, 8, 1], [96, 44, 1], [60, 90, 1], [24, 44, 1]], { w: 2.6, smooth: false }) +
      k.line([[60, 10], [60, 88]], { w: 1.6 }) +
      k.line([[26, 44], [94, 44]], { w: 1.6 }) +
      k.line([[60, 90], [52, 100], [62, 106], [54, 116]], { w: 1.8 }) +
      k.shape([[52, 100, 1], [46, 95, 1], [46, 105, 1]], { fill: P.red, w: 1.4, smooth: false, gap: 0 }) +
      k.shape([[62, 106, 1], [68, 101, 1], [68, 111, 1]], { fill: P.yellow, w: 1.4, smooth: false, gap: 0 })
    )
  },

  lion: (k) => {
    const mane: Pt[] = Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2
      const r = i % 2 ? 50 : 42
      return [60 + Math.cos(a) * r, 62 + Math.sin(a) * r * 0.94] as Pt
    })
    return (
      k.shape(mane, { fill: '#de8f45', w: 2.6 }) +
      k.blob(38, 36, 9, 9, { fill: '#f3c46e', w: 2 }) +
      k.blob(82, 36, 9, 9, { fill: '#f3c46e', w: 2 }) +
      k.blob(60, 64, 30, 28, { fill: '#f3c46e', w: 2.4 }) +
      k.blob(60, 78, 13, 9, { fill: '#fbe6bd', ink: false, edge: false }) +
      k.cheek(41, 72, 6) +
      k.cheek(79, 72, 6) +
      k.eye(49, 58, 4.4) +
      k.eye(71, 58, 4.4) +
      k.shape([[54, 70], [66, 70], [60, 77, 1]], { fill: P.brownDark, w: 1.6, gap: 0, off: 0 }) +
      k.line([[60, 77], [60, 81]], { w: 1.8 }) +
      k.line([[53, 82], [57, 85], [60, 81], [63, 85], [67, 82]], { w: 1.8 })
    )
  },

  moon: (k) => {
    const outer = arc(58, 60, 42, 320, 40, 12)
    const inner = arc(80, 60, 27, 71.5, 288.5, 9)
    const tips = [outer[0], outer[outer.length - 1]].map(([x, y]) => [x, y, 1] as Pt)
    return (
      k.shape([tips[0], ...outer.slice(1, -1), tips[1], ...inner.slice(1, -1)], { fill: '#f6dd84', w: 2.6 }) +
      k.line([[30, 52], [35, 56], [40, 52]], { w: 2 }) +
      k.line([[32, 70], [38, 74], [44, 70]], { w: 2 }) +
      k.cheek(30, 64, 5) +
      star(k, 96, 26, 9) +
      star(k, 102, 88, 7) +
      star(k, 84, 104, 5)
    )
  },

  nest: (k) =>
    k.blob(43, 54, 11, 13, { fill: P.bluePale, w: 2 }) +
    k.blob(77, 54, 11, 13, { fill: P.bluePale, w: 2 }) +
    k.blob(60, 49, 11, 13, { fill: P.bluePale, w: 2 }) +
    k.shape([[12, 66], [108, 66], [100, 86], [82, 98], [38, 98], [20, 86]], { fill: '#b78a5c', w: 2.6 }) +
    [[18, 70, 46, 84], [30, 88, 70, 76], [56, 92, 96, 78], [74, 68, 104, 84], [26, 76, 60, 70]]
      .map(([a, b, c, d]) => k.line([[a, b], [(a + c) / 2, (b + d) / 2 + 3], [c, d]], { w: 1.6, ink: P.brownDark }))
      .join('') +
    k.line([[10, 66], [34, 62], [60, 66], [86, 62], [110, 66]], { w: 2.4, ink: P.brownDark }),

  octopus: (k) => {
    const legs: Pt[][] = [
      [[38, 70], [26, 86], [16, 92], [12, 84]],
      [[46, 76], [40, 96], [32, 108], [24, 106]],
      [[56, 78], [56, 98], [52, 112]],
      [[64, 78], [66, 98], [72, 112]],
      [[74, 76], [82, 96], [90, 106], [98, 104]],
      [[82, 70], [94, 86], [104, 92], [108, 84]],
    ]
    return (
      legs.map((l) => tube(k, l, 9, P.purple)).join('') +
      k.blob(60, 50, 34, 32, { fill: P.purple, w: 2.6 }) +
      k.blob(48, 30, 4, 4, { fill: '#c7b2dd', ink: false, edge: false }) +
      k.blob(74, 34, 3, 3, { fill: '#c7b2dd', ink: false, edge: false }) +
      k.cheek(40, 62, 6) +
      k.cheek(80, 62, 6) +
      k.eye(49, 52, 5) +
      k.eye(71, 52, 5) +
      k.line([[52, 64], [60, 69], [68, 64]], { w: 2 })
    )
  },

  pig: (k) => {
    const pink = '#f5b1bb'
    const ear: Pt[] = [[30, 42], [24, 16, 1], [50, 30]]
    return (
      k.shape(ear, { fill: pink, w: 2.4 }) +
      k.shape(mirror(ear, 60), { fill: pink, w: 2.4 }) +
      k.blob(60, 64, 42, 36, { fill: pink, w: 2.6 }) +
      k.cheek(32, 74, 7) +
      k.cheek(88, 74, 7) +
      k.eye(44, 54, 4.6) +
      k.eye(76, 54, 4.6) +
      k.blob(60, 74, 16, 12, { fill: '#ee93a2', w: 2.2 }) +
      k.blob(54, 74, 2.6, 4, { fill: INK, ink: false, off: 0 }) +
      k.blob(66, 74, 2.6, 4, { fill: INK, ink: false, off: 0 }) +
      k.line([[52, 92], [60, 95], [68, 92]], { w: 2 })
    )
  },

  queen: (k) => {
    const hair = '#e2b35f'
    return (
      k.shape([[30, 120], [38, 100], [60, 94], [82, 100], [90, 120]], { fill: P.purple, w: 2.4 }) +
      k.shape([[32, 56], [40, 38], [60, 32], [80, 38], [88, 56], [92, 84], [80, 96], [40, 96], [28, 84]], { fill: hair, w: 2.4 }) +
      k.blob(60, 66, 24, 26, { fill: '#f7d9bf', w: 2.4 }) +
      k.shape([[38, 50], [50, 40], [70, 40], [82, 50], [70, 48], [50, 48]], { fill: hair, w: 2 }) +
      k.shape([[38, 40], [36, 16, 1], [48, 28, 1], [60, 10, 1], [72, 28, 1], [84, 16, 1], [82, 40]], { fill: '#f2c14e', w: 2.4 }) +
      k.dot(60, 30, 3.4, P.red) +
      k.dot(46, 34, 2.6, P.blue) +
      k.dot(74, 34, 2.6, P.blue) +
      k.cheek(46, 74, 5.5) +
      k.cheek(74, 74, 5.5) +
      k.eye(51, 64, 3.8) +
      k.eye(69, 64, 3.8) +
      k.line([[54, 78], [60, 81], [66, 78]], { w: 1.8 })
    )
  },

  rainbow: (k) =>
    [P.red, P.orange, P.yellow, P.green, P.blue]
      .map((c, i) => tube(k, arc(60, 92, 50 - i * 8, 180, 360, 14), 7, c))
      .join('') +
    k.blob(16, 94, 15, 10, { fill: '#fff', w: 2.2 }) +
    k.blob(28, 98, 12, 8, { fill: '#fff', w: 2.2 }) +
    k.blob(104, 94, 15, 10, { fill: '#fff', w: 2.2 }) +
    k.blob(92, 98, 12, 8, { fill: '#fff', w: 2.2 }),

  sun: (k) =>
    Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2
      const [c, s] = [Math.cos(a), Math.sin(a)]
      return k.shape(
        [[60 + c * 38 - s * 6, 60 + s * 38 + c * 6], [60 + c * 54, 60 + s * 54, 1], [60 + c * 38 + s * 6, 60 + s * 38 - c * 6]],
        { fill: P.orange, w: 2, gap: 0 },
      )
    }).join('') +
    k.blob(60, 60, 34, 34, { fill: P.yellow, w: 2.6, n: 16 }) +
    k.cheek(42, 66, 6) +
    k.cheek(78, 66, 6) +
    k.eye(49, 54, 4.4) +
    k.eye(71, 54, 4.4) +
    k.line([[50, 70], [60, 76], [70, 70]], { w: 2.2 }),

  tiger: (k) => {
    const orange = '#f29a45'
    return (
      k.blob(31, 36, 11, 11, { fill: orange, w: 2.2 }) +
      k.blob(89, 36, 11, 11, { fill: orange, w: 2.2 }) +
      k.blob(31, 37, 5, 5, { fill: '#fff', ink: false, edge: false }) +
      k.blob(89, 37, 5, 5, { fill: '#fff', ink: false, edge: false }) +
      k.blob(60, 64, 40, 34, { fill: orange, w: 2.6 }) +
      [[50, 32, 54, 44], [60, 30, 60, 42], [70, 32, 66, 44], [22, 58, 34, 62], [21, 70, 33, 70], [98, 58, 86, 62], [99, 70, 87, 70]]
        .map(([a, b, c, d]) => k.line([[a, b], [c, d]], { w: 3.4 }))
        .join('') +
      k.blob(50, 80, 14, 11, { fill: '#fff', w: 1.6, gap: 0.1 }) +
      k.blob(70, 80, 14, 11, { fill: '#fff', w: 1.6, gap: 0.1 }) +
      k.eye(46, 58, 4.6) +
      k.eye(74, 58, 4.6) +
      k.shape([[54, 70], [66, 70], [60, 76, 1]], { fill: P.nose, w: 1.6, gap: 0, off: 0 }) +
      k.line([[60, 76], [60, 82], [56, 86]], { w: 1.8 }) +
      k.line([[60, 82], [64, 86]], { w: 1.8 })
    )
  },

  umbrella: (k) =>
    k.line([[60, 18], [60, 98], [58, 106], [51, 109], [46, 103]], { w: 3.2, ink: P.brownDark }) +
    k.shape(
      [
        [9, 64, 1], [14, 42], [32, 22], [60, 14], [88, 22], [106, 42], [111, 64, 1], [99, 58], [86, 64, 1],
        [73, 58], [60, 64, 1], [47, 58], [34, 64, 1], [21, 58],
      ],
      { fill: P.red, w: 2.6 },
    ) +
    k.line([[60, 15], [34, 30], [34, 63]], { w: 1.5, op: 0.6 }) +
    k.line([[60, 15], [86, 30], [86, 63]], { w: 1.5, op: 0.6 }) +
    k.line([[60, 15], [60, 63]], { w: 1.5, op: 0.6 }) +
    k.shape([[18, 80], [21, 86], [18, 89], [15, 86]], { fill: P.blue, w: 1.2, gap: 0 }) +
    k.shape([[100, 86], [103, 92], [100, 95], [97, 92]], { fill: P.blue, w: 1.2, gap: 0 }),

  van: (k) =>
    k.shape([[8, 86], [9, 46], [16, 34], [70, 34], [86, 50], [106, 56], [112, 68], [112, 86]], { fill: '#7fc1b8', w: 2.6 }) +
    k.shape([[18, 42], [42, 42], [42, 58], [18, 58]], { fill: P.bluePale, w: 2, smooth: false, off: 0.5 }) +
    k.shape([[50, 42], [68, 42], [80, 58], [50, 58]], { fill: P.bluePale, w: 2, smooth: false, off: 0.5 }) +
    k.line([[46, 40], [46, 86]], { w: 1.8, op: 0.6 }) +
    k.blob(108, 68, 3.6, 4, { fill: P.yellow, w: 1.4 }) +
    k.line([[50, 66], [56, 66]], { w: 2.2 }) +
    [30, 88].map((x) => k.blob(x, 87, 12, 12, { fill: '#5b514d', w: 2.4 }) + k.blob(x, 87, 4.6, 4.6, { fill: '#d8d3cb', w: 1.4, gap: 0 })).join(''),

  worm: (k) =>
    k.line([[4, 104], [40, 100], [80, 104], [116, 100]], { w: 2.6, ink: P.brownDark }) +
    tube(k, [[14, 94], [30, 78], [48, 88], [66, 98], [84, 84], [94, 64], [92, 48]], 16, '#f1a3a6') +
    [[30, 80], [48, 89], [66, 96]].map(([x, y]) => k.line([[x - 4, y - 7], [x + 4, y + 7]], { w: 1.4, op: 0.45 })).join('') +
    k.blob(92, 46, 13, 12, { fill: '#f1a3a6', w: 2.2 }) +
    k.eye(88, 43, 3.2, '') +
    k.eye(98, 44, 3.2, '') +
    k.line([[88, 51], [93, 54], [98, 51]], { w: 1.6 }) +
    k.cheek(84, 50, 3.6),

  'yo-yo': (k) =>
    k.line([[60, 62], [70, 36], [84, 16], [88, 10]], { w: 1.8 }) +
    k.blob(90, 8, 5, 5, { w: 1.8 }) +
    k.blob(60, 70, 36, 36, { fill: P.red, w: 2.6, n: 16 }) +
    k.blob(60, 70, 22, 22, { fill: '#ec8a7c', w: 1.8, n: 14 }) +
    k.blob(60, 70, 7, 7, { fill: '#fff', w: 1.8 }) +
    k.blob(46, 52, 6, 3.5, { fill: '#fff', ink: false, op: 0.7, rot: -0.7, edge: false }),

  zebra: (k) => {
    const ear: Pt[] = [[36, 40], [30, 12, 1], [50, 30]]
    const stripes: Pt[][] = [
      [[34, 48], [44, 52]], [[33, 60], [44, 62]], [[86, 48], [76, 52]], [[87, 60], [76, 62]],
      [[52, 24], [54, 36]], [[60, 22], [60, 34]], [[68, 24], [66, 36]],
    ]
    return (
      k.shape([[48, 30], [52, 14, 1], [58, 26], [62, 10, 1], [66, 26], [72, 14, 1], [74, 30]], { fill: INK, w: 1.6, smooth: false }) +
      k.shape(ear, { fill: '#fff', w: 2.2 }) +
      k.shape(mirror(ear, 60), { fill: '#fff', w: 2.2 }) +
      k.shape([[34, 50], [38, 30], [60, 22], [82, 30], [86, 50], [82, 82], [80, 96], [60, 104], [40, 96], [38, 82]], { fill: '#fff', w: 2.6 }) +
      stripes.map((s) => k.line(s, { w: 4.2 })).join('') +
      k.blob(60, 90, 20, 14, { fill: '#9a948e', w: 2.2 }) +
      k.blob(53, 90, 2.4, 3.2, { fill: INK, ink: false, off: 0 }) +
      k.blob(67, 90, 2.4, 3.2, { fill: INK, ink: false, off: 0 }) +
      k.cheek(41, 72, 5) +
      k.cheek(79, 72, 5) +
      k.eye(47, 58, 4.4) +
      k.eye(73, 58, 4.4)
    )
  },
}


// The second word for most letters, so a game doesn't keep showing the same pictures.
Object.assign(PICTURES, {
  ant: (k) =>
    [[54, 74, 46, 96], [62, 74, 62, 98], [70, 72, 78, 96]].map(([a, b, c, d]) => k.line([[a, b], [c, d], [c + 5, d]], { w: 2 })).join('') +
    k.line([[90, 46], [96, 30], [102, 26]], { w: 1.8 }) +
    k.line([[84, 46], [84, 28], [90, 22]], { w: 1.8 }) +
    k.blob(34, 72, 22, 17, { fill: '#9a4f3b', w: 2.4 }) +
    k.blob(61, 68, 12, 10, { fill: '#9a4f3b', w: 2.2 }) +
    k.blob(86, 60, 16, 15, { fill: '#a85a44', w: 2.4 }) +
    k.cheek(82, 66, 4) +
    k.eye(90, 56, 3.4) +
    k.line([[86, 66], [91, 69], [96, 66]], { w: 1.6 }),

  bus: (k) =>
    k.shape([[10, 98], [10, 26], [18, 16], [102, 16], [110, 26], [110, 98]], { fill: P.red, w: 2.6 }) +
    [26, 54].map((y) => [18, 41, 64, 87].map((x) => k.shape([[x, y], [x + 17, y], [x + 17, y + 16], [x, y + 16]], { fill: P.bluePale, w: 1.8, smooth: false, off: 0.5 })).join('')).join('') +
    k.line([[12, 48], [108, 48]], { w: 2.4, ink: P.cream }) +
    k.blob(103, 86, 3, 3.4, { fill: P.yellow, w: 1.2 }) +
    [30, 90].map((x) => k.blob(x, 99, 11, 11, { fill: '#5b514d', w: 2.2 }) + k.blob(x, 99, 4, 4, { fill: '#d8d3cb', w: 1.2, gap: 0 })).join(''),

  car: (k) =>
    k.shape([[8, 84], [12, 66], [30, 60], [42, 42], [80, 42], [94, 60], [108, 64], [112, 84]], { fill: P.blue, w: 2.6 }) +
    k.shape([[46, 48], [60, 48], [60, 60], [38, 60]], { fill: P.bluePale, w: 1.8, smooth: false, off: 0.5 }) +
    k.shape([[66, 48], [78, 48], [88, 60], [66, 60]], { fill: P.bluePale, w: 1.8, smooth: false, off: 0.5 }) +
    k.blob(108, 70, 3.4, 4, { fill: P.yellow, w: 1.3 }) +
    k.line([[54, 68], [60, 68]], { w: 2 }) +
    [30, 90].map((x) => k.blob(x, 86, 12, 12, { fill: '#5b514d', w: 2.4 }) + k.blob(x, 86, 4.6, 4.6, { fill: '#d8d3cb', w: 1.4, gap: 0 })).join(''),

  drum: (k) =>
    k.line([[36, 14], [70, 34]], { w: 3, ink: P.brownDark }) +
    k.line([[86, 12], [56, 34]], { w: 3, ink: P.brownDark }) +
    k.dot(36, 14, 4.5, P.cream) +
    k.dot(86, 12, 4.5, P.cream) +
    k.shape([[20, 44], [100, 44], [100, 92], [86, 100], [34, 100], [20, 92]], { fill: P.red, w: 2.6 }) +
    k.line([[22, 50], [40, 92], [60, 50], [80, 92], [98, 50]], { w: 2, ink: P.yellow, smooth: false }) +
    k.blob(60, 44, 40, 11, { fill: P.cream, w: 2.4, n: 16 }),

  elephant: (k) => {
    const grey = '#b7b6c6'
    return (
      [[30, 92], [46, 94], [62, 94], [76, 92]].map(([x, y]) => k.shape([[x - 7, 74], [x + 7, 74], [x + 7, y], [x - 7, y]], { fill: grey, w: 2.2 })).join('') +
      k.blob(50, 72, 34, 24, { fill: grey, w: 2.6 }) +
      k.line([[16, 70], [10, 80]], { w: 2.2 }) +
      k.line([[96, 66], [108, 58], [110, 44], [104, 40]], { w: 8, wob: 0 }) +
      k.line([[96, 66], [108, 58], [110, 44], [104, 40]], { w: 4.6, wob: 0, ink: grey }) +
      k.blob(84, 56, 22, 20, { fill: grey, w: 2.4 }) +
      k.blob(70, 58, 13, 17, { fill: '#c9c8d6', w: 2.2 }) +
      k.blob(70, 58, 7, 10, { fill: P.pink, ink: false, edge: false }) +
      k.cheek(92, 64, 4.5) +
      k.eye(90, 51, 3.6)
    )
  },

  frog: (k) => {
    const green = '#8fca6e'
    return (
      k.blob(60, 104, 50, 8, { fill: '#7fbf8a', w: 2 }) +
      k.blob(36, 98, 12, 6, { fill: green, w: 2 }) +
      k.blob(84, 98, 12, 6, { fill: green, w: 2 }) +
      k.blob(60, 74, 36, 26, { fill: green, w: 2.6 }) +
      k.blob(43, 46, 13, 13, { fill: green, w: 2.4 }) +
      k.blob(77, 46, 13, 13, { fill: green, w: 2.4 }) +
      k.blob(43, 46, 8, 8, { fill: '#fff', w: 1.6 }) +
      k.blob(77, 46, 8, 8, { fill: '#fff', w: 1.6 }) +
      k.eye(44, 47, 3.8) +
      k.eye(78, 47, 3.8) +
      k.line([[38, 74], [50, 82], [70, 82], [82, 74]], { w: 2.2 }) +
      k.cheek(34, 72, 6) +
      k.cheek(86, 72, 6)
    )
  },

  guitar: (k) =>
    `<g transform="rotate(-24 60 62)">` +
    k.shape([[56, 6], [64, 6], [65, 16], [55, 16]], { fill: P.brownDark, w: 2, smooth: false }) +
    k.shape([[56, 16], [64, 16], [64, 52], [56, 52]], { fill: P.brown, w: 2, smooth: false }) +
    k.blob(60, 58, 19, 17, { fill: '#e09243', w: 2.4 }) +
    k.blob(60, 86, 26, 24, { fill: '#e09243', w: 2.6 }) +
    k.blob(60, 70, 8, 8, { fill: '#5a4334', w: 1.8 }) +
    k.shape([[50, 94], [70, 94], [70, 99], [50, 99]], { fill: P.brownDark, w: 1.6, smooth: false }) +
    [57, 60, 63].map((x) => k.line([[x, 12], [x, 96]], { w: 0.9, wob: 0 })).join('') +
    `</g>`,

  house: (k) =>
    k.shape([[82, 40], [82, 22], [94, 22], [94, 50]], { fill: P.red, w: 2, smooth: false }) +
    k.blob(92, 14, 6, 4, { fill: '#fff', w: 1.4 }) +
    k.blob(100, 8, 4, 3, { fill: '#fff', w: 1.2 }) +
    k.shape([[24, 56], [96, 56], [96, 106], [24, 106]], { fill: '#f6e2b0', w: 2.6, smooth: false }) +
    k.shape([[14, 60, 1], [60, 20, 1], [106, 60, 1]], { fill: P.red, w: 2.6, smooth: false }) +
    k.shape([[52, 106], [52, 82], [60, 76], [68, 82], [68, 106]], { fill: P.blue, w: 2.2 }) +
    [[30, 68], [76, 68]].map(([x, y]) => k.shape([[x, y], [x + 14, y], [x + 14, y + 14], [x, y + 14]], { fill: P.bluePale, w: 1.8, smooth: false }) + k.line([[x + 7, y], [x + 7, y + 14]], { w: 1.4 }) + k.line([[x, y + 7], [x + 14, y + 7]], { w: 1.4 })).join(''),

  jam: (k) =>
    k.shape([[30, 40], [90, 40], [93, 98], [27, 98]], { fill: '#d23f55', w: 2.6 }) +
    k.shape([[36, 60], [84, 60], [84, 84], [36, 84]], { fill: '#fff8e8', w: 1.8, smooth: false, off: 0.6 }) +
    k.shape([[60, 80], [52, 70], [54, 64], [60, 67], [66, 64], [68, 70]], { fill: P.red, w: 1.4, gap: 0 }) +
    k.blob(40, 50, 3, 7, { fill: '#fff', ink: false, op: 0.6, edge: false }) +
    k.shape([[24, 40], [30, 30], [40, 26], [60, 24], [80, 26], [90, 30], [96, 40], [86, 44], [74, 40], [60, 44], [46, 40], [34, 44]], { fill: '#f6efe2', w: 2.2 }) +
    [[40, 32], [56, 30], [72, 30], [84, 34]].map(([x, y]) => k.dot(x, y, 3, P.red)).join(''),

  key: (k) =>
    k.blob(32, 58, 20, 20, { fill: P.yellow, w: 2.6 }) +
    k.blob(32, 58, 7, 7, { fill: P.paper, w: 2 }) +
    k.shape([[50, 54], [106, 54], [106, 63], [100, 63], [100, 74], [92, 74], [92, 63], [84, 63], [84, 70], [76, 70], [76, 63], [50, 63]], { fill: P.yellow, w: 2.2, smooth: false }),

  leaf: (k) =>
    k.line([[24, 100], [36, 86]], { w: 3, ink: P.brownDark }) +
    k.shape([[34, 88, 1], [30, 56], [46, 30], [76, 16], [100, 14, 1], [96, 42], [82, 70], [58, 86]], { fill: P.green, w: 2.6 }) +
    k.line([[36, 86], [56, 62], [78, 38], [98, 16]], { w: 1.8, ink: P.greenDark }) +
    [[48, 72, 40, 58], [58, 60, 50, 44], [68, 48, 64, 32], [56, 64, 70, 70], [68, 52, 82, 56]].map(([a, b, c, d]) => k.line([[a, b], [c, d]], { w: 1.4, ink: P.greenDark })).join(''),

  monkey: (k) => {
    const brown = '#a8714a'
    const face = '#f3d3ab'
    return (
      k.blob(24, 60, 13, 13, { fill: brown, w: 2.4 }) +
      k.blob(96, 60, 13, 13, { fill: brown, w: 2.4 }) +
      k.blob(24, 60, 7, 7, { fill: face, ink: false, edge: false }) +
      k.blob(96, 60, 7, 7, { fill: face, ink: false, edge: false }) +
      k.blob(60, 60, 34, 32, { fill: brown, w: 2.6 }) +
      k.shape([[60, 48], [70, 40], [82, 46], [84, 62], [76, 84], [60, 90], [44, 84], [36, 62], [38, 46], [50, 40]], { fill: face, w: 2 }) +
      k.line([[56, 28], [60, 22], [66, 28]], { w: 2.2 }) +
      k.eye(50, 56, 4.2) +
      k.eye(70, 56, 4.2) +
      k.dot(56, 68, 1.8) +
      k.dot(64, 68, 1.8) +
      k.line([[48, 74], [60, 82], [72, 74]], { w: 2 }) +
      k.cheek(44, 70, 4.5) +
      k.cheek(76, 70, 4.5)
    )
  },

  net: (k) =>
    k.line([[18, 108], [58, 58]], { w: 4, ink: P.brown }) +
    k.shape([[60, 48], [66, 80], [80, 98], [96, 86], [104, 52]], { fill: '#ffffff', ink: false, op: 0.5, edge: false }) +
    [[64, 60, 102, 58], [66, 72, 100, 70], [72, 84, 96, 82], [70, 50, 76, 96], [82, 50, 86, 98], [94, 50, 96, 88]].map(([a, b, c, d]) => k.line([[a, b], [c, d]], { w: 1.1, op: 0.7 })).join('') +
    k.line([[60, 48], [66, 80], [80, 98], [96, 86], [104, 52]], { w: 1.8 }) +
    k.blob(82, 46, 23, 11, { fill: 'none', w: 3, ink: P.red, rot: -0.15 }),

  penguin: (k) =>
    k.blob(46, 104, 9, 4.5, { fill: P.orange, w: 1.8 }) +
    k.blob(74, 104, 9, 4.5, { fill: P.orange, w: 1.8 }) +
    k.blob(30, 70, 7, 18, { fill: '#3b3a45', w: 2, rot: 0.4 }) +
    k.blob(90, 70, 7, 18, { fill: '#3b3a45', w: 2, rot: -0.4 }) +
    k.blob(60, 62, 30, 42, { fill: '#3b3a45', w: 2.6 }) +
    k.shape([[60, 40], [76, 50], [82, 76], [74, 98], [60, 102], [46, 98], [38, 76], [44, 50]], { fill: '#fff', ink: false, edge: false }) +
    k.eye(52, 42, 3.8) +
    k.eye(68, 42, 3.8) +
    `<circle cx="52" cy="42" r="6" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="68" cy="42" r="6" fill="none" stroke="#fff" stroke-width="2.4"/>` +
    k.shape([[54, 50], [66, 50], [60, 58, 1]], { fill: P.orange, w: 1.6, gap: 0, off: 0.5 }) +
    k.cheek(46, 54, 4.5) +
    k.cheek(74, 54, 4.5),

  rocket: (k) =>
    k.shape([[50, 92], [60, 116, 1], [70, 92]], { fill: P.orange, w: 2, gap: 0 }) +
    k.shape([[54, 92], [60, 106, 1], [66, 92]], { fill: P.yellow, ink: false, edge: false }) +
    k.shape([[42, 70], [26, 92, 1], [44, 90]], { fill: P.red, w: 2.2, smooth: false }) +
    k.shape([[78, 70], [94, 92, 1], [76, 90]], { fill: P.red, w: 2.2, smooth: false }) +
    k.shape([[60, 6, 1], [76, 30], [78, 90], [42, 90], [44, 30]], { fill: '#f4f1ea', w: 2.6 }) +
    k.shape([[60, 7, 1], [72, 24], [48, 24]], { fill: P.red, ink: false, edge: false, off: 0.5 }) +
    k.blob(60, 50, 10, 10, { fill: P.bluePale, w: 2.4 }) +
    k.blob(57, 47, 3, 3, { fill: '#fff', ink: false, edge: false }),

  snake: (k) =>
    k.line([[20, 98], [44, 102], [64, 92], [62, 74], [42, 66], [44, 48], [66, 40], [84, 42]], { w: 18, wob: 0 }) +
    k.line([[20, 98], [44, 102], [64, 92], [62, 74], [42, 66], [44, 48], [66, 40], [84, 42]], { w: 13.6, wob: 0, ink: '#8cc76a' }) +
    [[32, 100], [56, 98], [52, 70], [50, 54]].map(([x, y]) => k.dot(x, y, 2.6, '#5f9d48')).join('') +
    k.line([[100, 46], [108, 48], [112, 44]], { w: 1.8, ink: P.red }) +
    k.line([[108, 48], [112, 52]], { w: 1.8, ink: P.red }) +
    k.blob(90, 42, 13, 11, { fill: '#8cc76a', w: 2.2 }) +
    k.eye(92, 38, 3.2) +
    k.cheek(86, 46, 3.6),

  teapot: (k) =>
    k.line([[24, 58], [12, 52], [10, 72], [28, 82]], { w: 7, wob: 0 }) +
    k.line([[24, 58], [12, 52], [10, 72], [28, 82]], { w: 3.4, wob: 0, ink: '#e8f2fa' }) +
    k.shape([[88, 72], [100, 56], [108, 42], [114, 44], [106, 62], [94, 86]], { fill: '#e8f2fa', w: 2.4 }) +
    k.blob(56, 74, 36, 28, { fill: '#e8f2fa', w: 2.6 }) +
    [[44, 70], [62, 66], [52, 86], [70, 84]].map(([x, y]) => k.blob(x, y, 5, 5, { fill: P.blue, w: 1.4, gap: 0 })).join('') +
    k.blob(56, 48, 20, 6, { fill: P.blue, w: 2.2 }) +
    k.blob(56, 40, 5, 5, { fill: P.blue, w: 2 }),

  vase: (k) =>
    [[60, 52, 44, 24], [60, 52, 60, 16], [60, 52, 78, 26]].map(([a, b, c, d]) => k.line([[a, b], [(a + c) / 2, (b + d) / 2 + 4], [c, d]], { w: 2, ink: P.greenDark })).join('') +
    [[44, 24, P.pink], [60, 16, P.yellow], [78, 26, '#fff']]
      .map(([x, y, c]) => [0, 1, 2, 3, 4].map((i) => k.blob((x as number) + Math.cos(i * 1.257) * 6, (y as number) + Math.sin(i * 1.257) * 6, 5, 5, { fill: c as string, w: 1.4, gap: 0 })).join('') + k.dot(x as number, y as number, 3, P.orange))
      .join('') +
    k.shape([[46, 106], [40, 84], [48, 66], [52, 52], [68, 52], [72, 66], [80, 84], [74, 106]], { fill: P.blue, w: 2.6 }) +
    k.line([[44, 80], [76, 80]], { w: 2, ink: '#fff', op: 0.7 }),

  whale: (k) =>
    [[54, 30, 46, 14], [58, 28, 58, 12], [62, 30, 70, 14]].map(([a, b, c, d]) => k.line([[a, b], [c, d]], { w: 2.4, ink: P.blue })).join('') +
    k.shape([[18, 62], [6, 44, 1], [20, 52], [28, 40, 1], [26, 62]], { fill: '#6f9fcf', w: 2.2 }) +
    k.shape([[22, 66], [30, 50], [56, 38], [88, 42], [108, 60], [102, 80], [70, 88], [38, 84]], { fill: '#7fb0dc', w: 2.6 }) +
    k.shape([[46, 80], [70, 86], [100, 78], [96, 84], [70, 90], [48, 86]], { fill: '#d8e9f5', ink: false, edge: false }) +
    k.eye(86, 58, 3.8) +
    k.line([[90, 70], [98, 68]], { w: 2 }) +
    k.cheek(82, 66, 4.6),
} satisfies Record<string, Draw>)

export const PICTURE_IDS = Object.keys(PICTURES)

export const picture = (id: string, cls = '') => svg('0 0 120 120', PICTURES[id](new Ink(`pic-${id}`)), `picture ${cls}`.trim())
