// Everything the app needs to speak another language. To add a fourth language,
// copy en.ts, translate the right-hand side, and add it to `languages` below —
// no component needs to change.
//
// This is the same translation system Picture Practice uses, so a fix made in
// one project ports straight across to the other.
import en from './en'
import es from './es'
import fr from './fr'
import { isStoreBrand, nameBrandIdOf, storeBrandPrefix } from '../products'
import type { LanguagePack } from './types'

const languages: Record<string, LanguagePack> = { en, es, fr }

const STORAGE_KEY = 'classgrocery-language'

export const languageOptions = Object.entries(languages).map(([code, language]) => ({
  code,
  name: language.name,
}))

// The teacher's choice outlives the session, so a classroom computer stays in
// the language it was set to.
export const language = $state({ code: savedCode() })

function savedCode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && languages[saved]) return saved
  } catch {
    // Private browsing can refuse local storage. Fall through to the browser's
    // own language, which is a better guess than English.
  }
  return browserCode() ?? 'en'
}

// A family whose device is already in Spanish should land on a Spanish page
// without hunting for the picker. Only the part before the region matters —
// es-MX and es-ES are both our "es" — and the picker still wins once used,
// because a saved choice is read first.
function browserCode() {
  if (typeof navigator === 'undefined') return null
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const tag of preferred) {
    const code = String(tag ?? '').toLowerCase().split('-')[0]
    if (languages[code]) return code
  }
  return null
}

export function setLanguage(code: string) {
  if (!languages[code]) return
  language.code = code
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // The choice still applies for this session, it just will not be remembered.
  }
}

// Reading `language.code` here is what makes every `t(...)` in a component
// re-run when someone picks a different language.
export function current() {
  return languages[language.code] ?? en
}

function fill(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match))
}

// English fills any gap, so a half-finished translation still shows something
// readable rather than a raw key.
export function t(key: string, values: Record<string, string | number> = {}) {
  return fill(current().ui[key] ?? en.ui[key] ?? key, values)
}

/**
 * The one-or-many form of a string, for the handful of sentences that count
 * something: `cart.count.one` and `cart.count.other`. All three languages agree
 * that one is one and everything else is plural, so this is as much rule as the
 * app needs — a language that splits plurals further would need more.
 */
export function plural(key: string, count: number, values: Record<string, string | number> = {}) {
  return t(`${key}.${count === 1 ? 'one' : 'other'}`, { count, ...values })
}

/** An aisle's name, looked up by the English title in its JSON file. */
export function aisleTitle(englishTitle: string) {
  return current().aisles[englishTitle] ?? en.aisles[englishTitle] ?? englishTitle
}

function productEntry(productId: string) {
  const id = nameBrandIdOf(productId)
  return current().products[id] ?? en.products[id]
}

/**
 * What a product is called on the shelf. A CG Value twin is the name brand's
 * word with the store's own brand in front of it, which is a name and so is the
 * same in every language.
 */
export function productName(productId: string) {
  const name = productEntry(productId)?.name ?? productId
  return isStoreBrand(productId) ? `${storeBrandPrefix} ${name}` : name
}

/** The small print under a product, describing what is in the packet. */
export function productNote(productId: string) {
  return productEntry(productId)?.note ?? ''
}

// Prose on the welcome, about and privacy pages has links and emphasis inside a
// sentence. They are written into the translation the way Markdown writes them —
// `[visible words](name)` and `**bold words**` — so a translator can move them
// to wherever the sentence wants them rather than having it cut into pieces.
// `name` is looked up in the map of destinations the page passes to RichText.
const MARKUP = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g

export type TextSegment = { text: string; link?: string; bold?: boolean }

export function segments(key: string, values: Record<string, string | number> = {}): TextSegment[] {
  const text = t(key, values)
  const parts: TextSegment[] = []
  let consumed = 0
  for (const match of text.matchAll(MARKUP)) {
    if (match.index > consumed) parts.push({ text: text.slice(consumed, match.index) })
    if (match[3] !== undefined) parts.push({ text: match[3], bold: true })
    else parts.push({ text: match[1], link: match[2] })
    consumed = match.index + match[0].length
  }
  if (consumed < text.length) parts.push({ text: text.slice(consumed) })
  return parts
}
