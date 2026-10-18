# Kipper's Basket

A gentle phonics game for a two-year-old. Kipper's toys have gone missing. Friends along the path (rabbit, badger, weasel, robin, hedgehog, mouse) have each found one, and they give it back when she finds the letter a word starts with: "Igloo! Which letter does igloo start with?" Five toys, then home to bed.

Nothing is ever marked wrong out loud. A wrong tile fades away with "That one says tuh. Try again!", so every round ends on a win. If she wanders off, the question is asked again, then the sound is given as a hint and the right tile wiggles.

## Run it

```bash
npm install
npm run dev
```

Open the **Network** address Vite prints (for example `http://192.168.1.20:5173`) on the iPad or phone, on the same wifi. Turn the volume up (on an iPhone, check the silent switch). Landscape is best.

## Grown-ups

Hold the little key in the top right of the title screen for a second.

- **Letters to practise** start with `s a t p i n`, the first set taught in UK phonics. The presets add the next sets in Letters and Sounds order.
- **Choices**: 2, 3 or 4 tiles. **Letters look like**: lowercase or capitals.
- **Say the letter**: sounds (phonics) or names.
- **Voice**: pick the nicest one the device has. **Captions** show what is being said.
- **Your voice for each sound**: speech engines can only guess at a pure "sss" or "ih" (they say "suh"), so record your own and the game uses yours. Recording needs the game opened over https, so it works on the Netlify link but not on the `http://192.168...` dev address.
- **Right first time**: a per-letter tally. Letters she gets wrong come up more often.

## Better voices

- **iPad / iPhone**: Settings › Accessibility › Spoken Content › Voices › English › UK, download an Enhanced or Premium voice (Serena, Kate, Daniel), then choose it under Grown-ups › Voice.
- **Android**: install or update Google's Speech Services.

## Toddler-proofing

- Share › **Add to Home Screen**: opens full screen with no browser bar and, once deployed, plays offline after the first visit.
- iPad **Guided Access** (Settings › Accessibility › Guided Access, then triple-click the side button) keeps her inside the game.

## Deploy

Same as dune-game: `netlify deploy --prod` (it runs `npm run build`). Not deployed yet.

## Developing

- `/gallery.html` shows every drawing on one page. `/icon.html` draws the app icon (`public/icon*.png` were screenshotted from it).
- URL switches: `?scene=play|question|ending` skips ahead, `?fast` speeds everything up, `?autoplay` answers by itself, `?captions` shows subtitles, `?debug` exposes `window.__kb`.

## How it's made

- Vite + TypeScript, no framework and no image files. Every picture is SVG drawn in code (`src/art/`) with a small seeded "ink and watercolour" kit (`src/art/ink.ts`): wobbly lines, colour washes that sit slightly off the line, and pen gaps.
- Speech is the browser's own (Web Speech API, British voices preferred); sound effects are synthesised with Web Audio. A grown-up's recordings live in IndexedDB on that device.
- The words, friends and lines are all in `src/content.ts`.
- Why not Mixamo: it only rigs and animates humanoids (no dogs), downloads need an Adobe login, and Kipper's flat watercolour look suits 2D. For 3D later, Quaternius has free (CC0) animated animals in glTF.

Kipper is Mick Inkpen's character and this is a home-made game for the family. The dog's name is one constant (`DOG` in `src/content.ts`) if it ever goes somewhere public.
