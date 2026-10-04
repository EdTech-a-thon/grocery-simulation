import { packStore, unpackStore, type Store } from './store'

// A store travels inside its link, after the # sign:
//
//     https://classgrocery.com/shop#<the whole store, compressed>
//
// Browsers never send the part after the # to any server, so a store's name,
// prices and coupons stay between the teacher's browser and the class's. There
// is nothing to sign up for and nothing for us to keep.

/** The store as one URL-safe string: packed, compressed, then base64url. */
export async function encodeStore(store: Store) {
  const json = new TextEncoder().encode(JSON.stringify(packStore(store)))
  const compressed = await transform(json, new CompressionStream('deflate-raw'))
  return toBase64Url(compressed)
}

/** The store inside a link, or null when the link is damaged or not a store. */
export async function decodeStore(encoded: string): Promise<Store | null> {
  try {
    const compressed = fromBase64Url(encoded.replace(/^#/, '').trim())
    const json = await transform(compressed, new DecompressionStream('deflate-raw'))
    return unpackStore(JSON.parse(new TextDecoder().decode(json)))
  } catch {
    return null
  }
}

/**
 * The store string out of anything a teacher pastes: a student link, their own
 * store page's link, or just the part after the #. Stray spaces from copying
 * out of an email or a class page are ignored.
 */
export function encodedFromLink(pasted: string) {
  const text = pasted.trim()
  return text.includes('#') ? text.slice(text.indexOf('#') + 1).trim() : text
}

/** The link students open. It drops them straight into the store. */
export function studentLink(encoded: string) {
  return `${origin()}/shop#${encoded}`
}

/** The teacher's own page for a store. Bookmarking it keeps the store for good. */
export function teacherLink(encoded: string) {
  return `${origin()}/teacher#${encoded}`
}

/**
 * Saves a store as a file the teacher can keep or send to a colleague. It is
 * the same packed store a link carries, just not compressed, so it can be read.
 */
export function downloadStoreFile(store: Store) {
  const contents = JSON.stringify({ classGroceryStore: packStore(store) }, null, 2)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  link.download = `${store.name.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'store'}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href)) // once the download has started
}

/** The store in a file from downloadStoreFile(), or null when it is not one. */
export function storeFromFile(contents: string): Store | null {
  try {
    return unpackStore(JSON.parse(contents)?.classGroceryStore)
  } catch {
    return null
  }
}

/**
 * Copies a link for the teacher. If the browser will not let the page use the
 * clipboard, the link is shown in a box instead, to be copied by hand. Says
 * whether it reached the clipboard.
 */
export async function copyLink(link: string, promptText: string) {
  if (await copyText(link)) return true
  window.prompt(promptText, link)
  return false
}

/** Copies text, and says whether the clipboard accepted it. */
export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false // the caller shows the text instead, so it can still be copied by hand
  }
}

function origin() {
  return typeof location === 'undefined' ? '' : location.origin
}

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(output).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string) {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
