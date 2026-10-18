import type { Friend, ToyId } from '../content'
import type { Run } from '../run'

/** One friend, one toy, one letter. */
export interface Round {
  index: number
  friend: Friend
  toy: ToyId
}

export type Mood = 'happy' | 'sad' | ''

/**
 * Where the story happens. The game script (src/script.ts) is the same for both;
 * the 2D storybook and the 3D meadow only differ in how they get Kipper to each friend.
 */
export interface Stage {
  /** Back to the opening scene: Kipper and Tiger beside the empty basket. */
  reset(): void
  /** Kipper's face; Tiger copies him. */
  mood(m: Mood): void
  /** Kipper and Tiger jump for joy. */
  cheer(): void
  /** The big moment after a right answer: everyone jumps about. */
  celebrate(r: Round): void
  /** From setting off until this round's friend has popped out to say hello. */
  find(run: Run, r: Round): Promise<void>
  talking(r: Round, on: boolean): void
  /** Where the friend's toy is on screen; the toy then disappears from their paws. */
  takeToy(r: Round): DOMRect
  farewell(run: Run, r: Round): Promise<void>
  goHome(run: Run): Promise<void>
  tuckIn(run: Run): Promise<void>
  /** Where a toy comes to rest around the basket, on screen. */
  restingPlace(toy: ToyId): DOMRect
  placeToy(toy: ToyId): void
  night(on: boolean): void
  snore(): void
  dispose(): void
}

/** What the shell gives a stage when it starts. */
export interface StageHost {
  /** The element the stage draws into. */
  root: HTMLElement
  /** A tap on Kipper or Tiger. */
  onDogTap(who: 'kipper' | 'tiger'): void
  /** A tap on a friend once they're out. */
  onFriendTap(): void
}
