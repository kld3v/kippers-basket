export class Cancelled extends Error {}

/** ?fast shortens every scripted pause, for testing a whole game quickly. */
export const SPEED = new URLSearchParams(location.search).has('fast') ? 0.15 : 1

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms * SPEED))

/** One play-through. Cancelling it unwinds every await inside the script. */
export class Run {
  private dead = false
  private aborts = new Set<() => void>()

  get cancelled() {
    return this.dead
  }

  cancel() {
    if (this.dead) return
    this.dead = true
    for (const abort of [...this.aborts]) abort()
    this.aborts.clear()
  }

  /** Run `fn` if this run is cancelled (for timers and listeners a script sets up). */
  onCancel(fn: () => void) {
    this.aborts.add(fn)
    return () => this.aborts.delete(fn)
  }

  /** Wait for `p`, but give up the moment the run is cancelled. */
  guard<T>(p: Promise<T>): Promise<T> {
    if (this.dead) return Promise.reject(new Cancelled())
    return new Promise<T>((resolve, reject) => {
      const off = this.onCancel(() => reject(new Cancelled()))
      p.then(
        (v) => {
          off()
          if (this.dead) reject(new Cancelled())
          else resolve(v)
        },
        (e) => {
          off()
          reject(e)
        },
      )
    })
  }

  wait(ms: number) {
    return this.guard(sleep(ms))
  }
}
