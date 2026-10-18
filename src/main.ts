import './styles.css'
import './art/art.css'
import { loadClips } from './audio/clips'
import { sfx, unlockAudio } from './audio/sfx'
import { speech } from './audio/speech'
import { LINES, pick } from './content'
import { holdToOpen, openGrownups } from './grownups'
import { Cancelled, Run } from './run'
import { endingOnly, game, questionLoop } from './script'
import { loadSettings, saveSettings, type Settings } from './settings'
import { Shell } from './shell'
import type { Stage, StageHost } from './stages/types'

type Mode = 'story' | 'meadow'
type Script = typeof game

const params = new URLSearchParams(location.search)
let settings = loadSettings()
const shell = new Shell(document.querySelector<HTMLElement>('#game')!)
let run: Run | null = null
let stage: Stage | null = null
let mode: Mode | null = null

function applySettings(s: Settings) {
  settings = s
  saveSettings(s)
  speech.mode = s.say
  speech.preferred = s.voice
  speech.pickVoice()
}

speech.mode = settings.say
speech.preferred = settings.voice
speech.onCaption = (text) => {
  shell.caption.textContent = text
  shell.caption.classList.toggle('on', !!text && (settings.captions || !speech.available || params.has('captions')))
}
void speech.init()
void loadClips()

const host: StageHost = {
  root: shell.scene,
  // Kipper and Tiger answer a tap with a woof, unless someone else is talking.
  onDogTap(who) {
    sfx.hop()
    if (shell.root.dataset.scene !== 'play') void speech.say(who, [pick(LINES[who].woof)])
  },
  onFriendTap() {
    sfx.giggle()
  },
}

/** The 3D meadow is only downloaded when it's chosen, so the storybook starts fast. */
async function loadStage(next: Mode): Promise<Stage> {
  if (stage && mode === next) return stage
  stage?.dispose()
  stage = null
  shell.root.dataset.mode = next
  shell.root.dataset.loading = ''
  const s = next === 'story' ? new (await import('./stages/flat')).FlatStage(host) : await (await import('./stages/meadow')).createMeadow(host)
  delete shell.root.dataset.loading
  stage = s
  mode = next
  return s
}

async function start(next: Mode, script: Script = game) {
  run?.cancel()
  speech.stop()
  const r = (run = new Run())
  shell.scenePhase('play')
  const s = await loadStage(next)
  if (r.cancelled) return
  s.reset()
  shell.night(false)
  shell.hud.reset()
  try {
    await script(r, shell, s, settings)
    shell.scenePhase('end')
  } catch (e) {
    if (!(e instanceof Cancelled)) throw e
  }
}

function toTitle() {
  run?.cancel()
  speech.stop()
  stage?.reset()
  shell.night(false)
  shell.hud.show(false)
  shell.scenePhase('title')
}

/** Every tap that starts audio has to be a real click: iOS won't unlock sound from pointerdown. */
function wake() {
  unlockAudio()
  speech.unlock()
}

function fullscreen() {
  const standalone = matchMedia('(display-mode: standalone)').matches
  if (!standalone && matchMedia('(pointer: coarse)').matches && document.fullscreenEnabled) {
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
  }
}

for (const [button, m] of [
  [shell.storyButton, 'story'],
  [shell.meadowButton, 'meadow'],
] as const)
  button.addEventListener('click', () => {
    wake()
    fullscreen()
    void start(m)
  })
shell.againButton.addEventListener('click', () => {
  wake()
  void start(mode ?? 'story')
})
shell.homeButton.addEventListener('click', toTitle)
document.addEventListener('click', unlockAudio, true)

holdToOpen(shell.gate, () => {
  speech.stop()
  openGrownups(settings, applySettings)
})

// Pinch-zoom and long-press menus get in the way of small hands.
for (const ev of ['gesturestart', 'contextmenu', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault())
document.addEventListener('visibilitychange', () => document.hidden && speech.stop())

shell.scenePhase('title')
const firstMode: Mode = params.get('mode') === 'meadow' ? 'meadow' : 'story'
const debugScene = params.get('scene')
if (debugScene === 'question') void start(firstMode, questionLoop)
else if (debugScene === 'ending') void start(firstMode, endingOnly)
else if (debugScene === 'play') void start(firstMode)
else void loadStage(firstMode)

if (params.has('debug')) Object.assign(window, { __kb: { shell, speech, start, get stage() { return stage }, get settings() { return settings } } })

// Offline: register the worker, then put everything this first visit already loaded into its cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js')
      const loaded = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin))
      await (await caches.open('kb-v1')).addAll(['/', ...loaded])
    } catch {
      // Offline play is a bonus; the game works without it.
    }
  })
}
