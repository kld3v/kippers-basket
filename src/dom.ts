/** createElement with a class and text, for the hand-built grown-up screens. */
export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text) el.textContent = text
  return el
}

/** Text with its stretched words ("a-a-apple!") kept whole when it wraps, which the browser won't by default. */
export const keepWhole = (text: string) => text.split(/(\S+-\S+)/).map((t) => (/\S-\S/.test(t) ? h('span', 'whole', t) : t))

/** A button that only ever runs its handler. */
export function button(cls: string, text: string, onClick: () => void) {
  const b = h('button', cls, text)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}
