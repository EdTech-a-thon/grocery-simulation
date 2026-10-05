// Cuts the shipped artwork out of the layered masters.
//
// A master in art/masters holds every layer a product needs: the object itself,
// the blank printed panel, and two alternative faces for that panel. This writes
// the two files the app actually serves:
//
//   static/images/<id>.svg      the name brand   — item + label + brand
//   static/images/cg/<id>.svg   the CG twin      — item + label + brand-cg
//
// Because both are cut from the same drawing, a product and its ClassGrocery
// twin share a silhouette by construction: they are literally the same paths,
// differing only in what is printed on the panel. That is what an own-label
// package really is — the same package printed more plainly.
//
// Food sold loose has no printed panel and no twin, so it gets the name-brand
// file only, and any twin left over from an earlier run is removed.
//
// Artwork that predates the masters has no panel to swap, so its twin keeps the
// original treatment: the art nudged up to make room for a green CG band along
// the bottom. Redraw one with scripts/make-product-art.mjs and it moves onto the
// layered path automatically.
//
//   bun run images:ship

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { catalog } from './product-art/catalog.mjs'
import { compose } from './product-art/layers.mjs'

const masters = 'art/masters'
const shipped = 'static/images'
const twins = 'static/images/cg'

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

/** The original treatment, for artwork drawn before the masters existed. */
function bandedTwin(svg) {
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

mkdirSync(twins, { recursive: true })

const tally = { drawn: 0, banded: 0, loose: 0, untouched: 0 }

for (const product of catalog()) {
  const master = join(masters, `${product.id}.svg`)
  const name = join(shipped, `${product.id}.svg`)
  const twin = join(twins, `${product.id}.svg`)

  if (existsSync(master)) {
    const svg = readFileSync(master, 'utf8')
    writeFileSync(name, compose(svg, 'name'))
    if (product.packaged) {
      writeFileSync(twin, compose(svg, 'cg'))
      tally.drawn += 1
    } else {
      if (existsSync(twin)) rmSync(twin)
      tally.loose += 1
    }
    continue
  }

  // Not drawn yet: leave the old name-brand art alone, and give it a twin the
  // old way if it is a packaged product.
  if (!existsSync(name)) continue
  if (product.packaged) {
    writeFileSync(twin, bandedTwin(readFileSync(name, 'utf8')))
    tally.banded += 1
  } else {
    if (existsSync(twin)) rmSync(twin)
    tally.untouched += 1
  }
}

console.log(`Shipped ${tally.drawn} redrawn packaged products with their CG twins`)
console.log(`         ${tally.loose} redrawn loose products, which have no twin`)
console.log(`         ${tally.banded} not yet redrawn, still using the banded fallback twin`)
console.log(`         ${tally.untouched} loose and not yet redrawn, left as they are`)
