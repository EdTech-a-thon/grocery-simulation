// Builds the ClassGrocery store-brand artwork.
//
// A CG package is deliberately the *same* package as the name brand: identical
// paths, identical text, identical colors. What marks it as the store brand is
// the house trim — the art is nudged up to make room for a green CG band along
// the bottom, the way a supermarket's own label carries the same banner across
// every product in the line.
//
// Re-run it whenever a product is added:  bun run images:cg

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const source = 'static/images'
const target = 'static/images/cg'

/** The house green, the same one the app itself is built around. */
const bandColor = '#15803d'
/** What the band says. */
const bandText = 'CG Value'
/** How tall the band is, as a share of the artwork's own height. */
const bandShare = 0.16
/** Wide artwork gets a slightly taller band so it still reads once scaled down. */
const bandShareOfWidth = 0.13
const tallestBand = 0.32

/** The artwork's own coordinate box, whatever units the file was drawn in. */
function viewport(svg) {
  const viewBox = svg.match(/viewBox\s*=\s*"([^"]+)"/)
  if (viewBox) {
    const [x, y, width, height] = viewBox[1].trim().split(/[\s,]+/).map(Number)
    return { x, y, width, height }
  }
  const width = Number((svg.match(/\swidth\s*=\s*"([\d.]+)/) || [])[1] || 100)
  const height = Number((svg.match(/\sheight\s*=\s*"([\d.]+)/) || [])[1] || 100)
  return { x: 0, y: 0, width, height }
}

// Inkscape writes its closing tag as `</svg\n>`, so the tag name and the bracket
// cannot be matched as one literal.
const closingTag = /<\/svg\s*>\s*$/

function storeBrandVersion(svg) {
  const { x, y, width, height } = viewport(svg)
  const band = Math.max(height * bandShare, Math.min(height * tallestBand, width * bandShareOfWidth))
  const top = y + height - band
  const middle = x + width / 2

  // Everything the file already drew, scaled about its top edge so the art
  // shrinks into the space above the band instead of hiding behind it.
  const openingTag = svg.match(/<svg[\s\S]*?>/)[0]
  const before = svg.slice(0, svg.indexOf(openingTag) + openingTag.length)
  const art = svg.slice(before.length).replace(closingTag, '')
  const lifted = `<g transform="translate(${middle} ${y}) scale(${1 - band / height}) translate(${-middle} ${-y})">`

  // Big enough to read, small enough that the wordmark still clears the sides
  // of a narrow package.
  const wordmark = Math.min(band * 0.62, (width * 0.82) / (bandText.length * 0.6))

  const trim =
    `<g><rect x="${x}" y="${top}" width="${width}" height="${band}" fill="${bandColor}"/>` +
    `<text x="${middle}" y="${top + band * 0.72}" text-anchor="middle"` +
    ` font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${wordmark}"` +
    ` fill="#ffffff">${bandText}</text></g>`

  return `${before}${lifted}${art}</g>${trim}</svg>`
}

mkdirSync(target, { recursive: true })

let written = 0
for (const name of readdirSync(source).sort()) {
  if (!name.endsWith('.svg')) continue
  const from = join(source, name)
  if (!statSync(from).isFile()) continue

  writeFileSync(join(target, name), storeBrandVersion(readFileSync(from, 'utf8')))
  written += 1
}

console.log(`Wrote ${written} store-brand images to ${target}`)
