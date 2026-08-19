import { joinKey } from './joincodes'
import type { Store } from './pocketbase'

/**
 * The link a teacher hands to a class. It carries the code in the address, so a
 * student who follows it lands in the store without typing anything — which
 * matters most for the youngest classes, who are the slowest typists.
 */
export function joinLinkFor(store: Store) {
  const origin = typeof location === 'undefined' ? '' : location.origin
  return `${origin}/j/${joinKey(store.joinCode)}`
}

/** Copies the link, and says whether the clipboard accepted it. */
export async function copyJoinLink(store: Store) {
  try {
    await navigator.clipboard.writeText(joinLinkFor(store))
    return true
  } catch {
    return false // the caller shows the link instead, so it can still be copied by hand
  }
}
