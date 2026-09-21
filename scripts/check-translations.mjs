// Checks that every language says everything English says, and that every
// product and aisle in the catalog has a word in each of them.
//
// A missing key is not a crash — t() falls back to English — so nothing on the
// shelves would look broken, which is exactly why it needs checking. Run it
// after editing a language file or adding a product:
//
//   bun scripts/check-translations.mjs

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const i18n = join(root, 'src/lib/i18n')

/** Reads the keys out of a language file without running TypeScript. */
function readPack(file) {
  const source = readFileSync(join(i18n, file), 'utf8')
  const section = (name) => {
    const start = source.indexOf(`\n  ${name}: {`)
    if (start === -1) return ''
    return source.slice(start, source.indexOf('\n  },', start))
  }
  return {
    ui: [...section('ui').matchAll(/^\s{4}'([^']+)':/gm)].map((match) => match[1]),
    aisles: [...section('aisles').matchAll(/^\s{4}'([^']+)':/gm)].map((match) => match[1]),
    products: [...section('products').matchAll(/^\s{4}'([^']+)': \{/gm)].map((match) => match[1]),
  }
}

const english = readPack('en.ts')
const others = readdirSync(i18n).filter((file) => /^(?!en|index|types)\w+\.ts$/.test(file))

const problems = []

function compare(language, part, expected, actual) {
  const have = new Set(actual)
  for (const key of expected) if (!have.has(key)) problems.push(`${language}: missing ${part} "${key}"`)
  const want = new Set(expected)
  for (const key of actual) if (!want.has(key)) problems.push(`${language}: unknown ${part} "${key}" (not in en.ts)`)
}

for (const file of others) {
  const pack = readPack(file)
  compare(file, 'phrase', english.ui, pack.ui)
  compare(file, 'aisle', english.aisles, pack.aisles)
  compare(file, 'product', english.products, pack.products)
}

// English itself is checked against the catalog, since it is what the catalog
// is named after.
const products = readFileSync(join(root, 'src/lib/products.ts'), 'utf8')
const nameBrands = [...products.matchAll(/id:\s*'([^']+)',\s*name:/g)].map((match) => match[1])
const translated = new Set(english.products)
for (const id of nameBrands) if (!translated.has(id)) problems.push(`en.ts: no words for product "${id}"`)
for (const id of english.products) if (!nameBrands.includes(id)) problems.push(`en.ts: "${id}" is not a product`)

const aisleDir = join(root, 'src/lib/aisles')
const titles = readdirSync(aisleDir).map((file) => JSON.parse(readFileSync(join(aisleDir, file), 'utf8')).title)
const namedAisles = new Set(english.aisles)
for (const title of titles) if (!namedAisles.has(title)) problems.push(`en.ts: no words for aisle "${title}"`)

if (problems.length) {
  console.error(`${problems.length} translation problem${problems.length === 1 ? '' : 's'}:`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log(
  `Translations complete: ${english.ui.length} phrases, ${english.aisles.length} aisles and ` +
  `${english.products.length} products in ${others.length + 1} languages.`,
)
