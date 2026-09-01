/**
 * A join code is made of two halves: the teacher's class identifier, chosen once
 * when they sign up, and a short label they give each class.
 *
 *     OTTER  -  P3
 *     ^ identifier ^ label
 *
 * The identifier is unique across the whole site, so a label only has to be
 * unique within one teacher — which means teachers can use the period or class
 * name they already have in their head. These rules are enforced on the server
 * in pb_hooks/classgrocery_shared.js; the copies here are so the teacher's
 * screen can show them the finished code as they type.
 */

export const joinPrefixPattern = /^[A-Z0-9]{3,12}$/
export const joinLabelPattern = /^[A-Z0-9]{1,6}$/

/**
 * The form codes are compared in: letters and digits only, uppercase. The dash
 * is decoration, so a student who leaves it out still lands in the right store.
 */
export function joinKey(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 19)
}

export function normalizeJoinPrefix(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export function normalizeJoinLabel(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

/** What the teacher hands out and what students read off the board. */
export function joinCodeFor(prefix: string, label: string) {
  return `${prefix}-${label}`
}

// Words a class can spell and say out loud across a noisy room, which is more
// than can be said for a random string. A number is added when one is taken.
const suggestionWords = [
  'ACORN', 'ANCHOR', 'BADGER', 'BASKET', 'BEACON', 'CACTUS', 'CANOE', 'CEDAR',
  'COMET', 'COMPASS', 'CORAL', 'DOLPHIN', 'FALCON', 'GARDEN', 'HARBOR', 'HERON',
  'JUNIPER', 'KITE', 'LANTERN', 'MAPLE', 'MARKET', 'MEADOW', 'OTTER', 'PEBBLE',
  'PENGUIN', 'PLANET', 'PUFFIN', 'RIVER', 'ROCKET', 'SAFFRON', 'SPARROW',
  'SUMMIT', 'THISTLE', 'TULIP', 'WALNUT', 'WILLOW',
]

/** A ready-made identifier, so nobody has to invent one on the spot. */
export function suggestJoinPrefix() {
  const word = suggestionWords[Math.floor(Math.random() * suggestionWords.length)]
  // Long words are already distinctive enough; short ones get a number so two
  // teachers reaching for the same obvious word do not collide as often.
  return word.length > 6 ? word : `${word}${Math.floor(Math.random() * 90) + 10}`
}
