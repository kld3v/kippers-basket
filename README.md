# Kipper's Basket

A gentle phonics game for a two-year-old. Kipper's seven toys have gone missing. He sets off with his best friend Tiger, and the friends they meet (rabbit, badger, weasel, robin, hedgehog, mouse, owl, and Neddy Dog, who is in every game) have each found one. They give it back when she finds the letter a word starts with: "Igloo! Which letter does igloo start with?" Seven letters a game, drawn from the whole alphabet (44 words), then home to bed.

Two ways to play, chosen on the first screen:

- **Story**: the original storybook. Kipper and Tiger trot along a path that scrolls past; tap the rustling bush to see who's hiding.
- **3D**: you play Kipper, running round a 3D meadow with Tiger at your heel. The bush (or log, or burrow) with a golden star over it is where the next friend is hiding; run up to it and they pop out with a question. Flowers chime as you run through them, butterflies scatter, the pond splashes. If nobody steers for a while, Kipper trots over by himself.
  - Keyboard: **WASD** or arrows to run, **Space** to jump, **B** to bark, drag (or Q/E) to look round, wheel to zoom. Press the letter to answer.
  - iPad/phone: thumb joystick on the left, jump and woof buttons on the right, drag on the right to look round, or just tap the grass to run there.

Nothing is ever marked wrong out loud. A wrong tile fades away with "That one says tuh. Try again!", so every round ends on a win. If she wanders off, the question is asked again, then the sound is given as a hint and the right tile wiggles.

## Run it

```bash
npm install
npm run dev
```

Open the **Network** address Vite prints (for example `http://192.168.1.20:5173`) on the iPad or phone, on the same wifi. Turn the volume up (on an iPhone, check the silent switch). Landscape is best.

## Grown-ups

Hold the little key in the top right of the title screen for a second.

- **Letters to practise**: the whole alphabet by default. The presets narrow it to the UK phonics sets, `s a t p i n` first.
- **Choices**: 2, 3 or 4 tiles. **Letters look like**: lowercase or capitals.
- **Say the letter**: sounds (phonics) or names.
- **Back-up voice**: the device voice used for lines without a recording. **Captions** show what is being said.
- **Your voice for each sound**: speech engines can only guess at a pure "sss" or "ih" (they say "suh"), so record your own and the game uses yours. Recording needs the game opened over https, so it works on the Netlify link but not on the `http://192.168...` dev address.
- **Right first time**: a per-letter tally. Letters she gets wrong come up more often.

## Voices

Lines are pre-recorded with ElevenLabs into `public/voice/` (George narrates, each animal has its own voice), so nothing is generated while she plays and no key is in the page. Any line without a recording falls back to the device's own speech.

So far 122 of 452 lines are recorded (the story intro and the questions for words a to j). To record the rest, put a key in `.env.local` (gitignored) and run:

```bash
echo 'ELEVENLABS_API_KEY=sk_...' > .env.local
npm run voices -- --dry   # how many lines and characters are left
npm run voices            # records only what's missing, then redeploy
```

For the fallback voice on an iPad: Settings › Accessibility › Spoken Content › Voices › English › UK, download an Enhanced voice, then pick it under Grown-ups › Back-up voice.

## Toddler-proofing

- Share › **Add to Home Screen**: opens full screen with no browser bar and, once deployed, plays offline after the first visit.
- iPad **Guided Access** (Settings › Accessibility › Guided Access, then triple-click the side button) keeps her inside the game.

## Deploy

Same as dune-game: `netlify deploy --prod` (it runs `npm run build`). Live at https://kippers-basket.netlify.app. The site isn't linked to GitHub, so pushing alone changes nothing live.

## Developing

- `/gallery.html` shows every drawing, `/models.html?set=dogs|friends|toys|things` every 3D model. `/icon.html` draws the app icon.
- URL switches: `?mode=meadow` for 3D, `?scene=play|question|ending` skips ahead, `?fast` speeds everything up, `?autoplay` answers by itself, `?captions` shows subtitles, `?debug` exposes `window.__kb`.

## How it's made

- Vite + TypeScript, and no image files. Every picture is SVG drawn in code (`src/art/`) with a small seeded "ink and watercolour" kit (`src/art/ink.ts`): wobbly lines, colour washes that sit slightly off the line, and pen gaps.
- One game script (`src/script.ts`) drives either stage: `src/stages/flat.ts` (the storybook, plain DOM) or `src/stages/meadow/` (React Three Fiber, loaded only when 3D is picked). In 3D every character, toy and tree is built from simple shapes in code (`src/stages/meadow/models/`, see `/models.html`), toon-shaded in the storybook colours with ink outlines; an ink pass also draws lines wherever depth jumps (second difference of 1/z, so slopes don't smudge). `play.ts` is the game physics (steering relative to the camera, jumping, wading, Tiger following, the camera).
- Speech plays the recorded MP3 for a line when there is one (`src/voice-manifest.json`), otherwise the browser's own voice. Sound effects are synthesised with Web Audio. A grown-up's own letter recordings live in IndexedDB on that device.
- The words, friends and lines are all in `src/content.ts`.
- Why not Mixamo: it only rigs humanoids, so there are no dogs; Kipper, Tiger and Neddy are one parametric dog built in code.

Kipper is Mick Inkpen's character and this is a home-made game for the family. The dog's name is one constant (`DOG` in `src/content.ts`) if it ever goes somewhere public.
