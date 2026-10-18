import './styles.css'
import './art/art.css'
import { loadClips } from './audio/clips'
import { sfx, unlockAudio } from './audio/sfx'
import { speech } from './audio/speech'
import { KIPPER_VOICE, LINES, pick } from './content'
import { jump, wiggle } from './fx'
import { holdToOpen, openGrownups } from './grownups'
import { Cancelled, Run } from './run'
import { endingOnly, game, questionLoop } from './script'
import { loadSettings, saveSettings, type Settings } from './settings'
import { Stage } from './stage'

const params = new URLSearchParams(location.search)
let settings = loadSettings()
const stage = new Stage(document.querySelector<HTMLElement>('#game')!)
let run: Run | null = null

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
  stage.caption.textContent = text
  stage.caption.classList.toggle('on', !!text && (settings.captions || !speech.available || params.has('captions')))
}
void speech.init()
void loadClips()

function scene(name: 'title' | 'play' | 'end') {
  stage.root.dataset.scene = name
}

async function start(script = game) {
  run?.cancel()
  speech.stop()
  const r = (run = new Run())
  stage.reset()
  scene('play')
  try {
    await script(r, stage, settings)
    scene('end')
  } catch (e) {
    if (!(e instanceof Cancelled)) throw e
  }
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

stage.playButton.addEventListener('click', () => {
  wake()
  fullscreen()
  void start()
})
stage.againButton.addEventListener('click', () => {
  wake()
  void start()
})
document.addEventListener('click', unlockAudio, true)

// Tapping Kipper always does something; he only barks when nobody else is talking.
stage.kipperSlot.addEventListener('pointerdown', () => {
  void stage.kipperJump(0.22)
  sfx.hop()
  if (!window.speechSynthesis?.speaking && stage.root.dataset.scene !== 'play') void speech.say([pick(LINES.woof)], KIPPER_VOICE)
})
stage.actors.addEventListener('pointerdown', (e) => {
  const bob = (e.target as Element).closest<HTMLElement>('.friend .bob')
  if (bob) {
    sfx.giggle()
    void wiggle(bob)
  }
})
stage.home.addEventListener('pointerdown', () => {
  if (stage.root.dataset.scene === 'title') void jump(stage.home.querySelector('svg')!, 12)
})

holdToOpen(stage.gate, () => {
  speech.stop()
  openGrownups(settings, applySettings)
})

// Pinch-zoom and long-press menus get in the way of small hands.
for (const ev of ['gesturestart', 'contextmenu', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault())
document.addEventListener('visibilitychange', () => document.hidden && speech.stop())

scene('title')

const debugScene = params.get('scene')
if (debugScene === 'question') void start(questionLoop)
else if (debugScene === 'ending') void start(endingOnly)
else if (debugScene === 'play') void start()

if (params.has('debug')) Object.assign(window, { __kb: { stage, speech, start, get settings() { return settings } } })

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
