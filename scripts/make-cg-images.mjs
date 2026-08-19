// Builds the ClassGrocery store-brand artwork.
//
// A CG package is deliberately the *same* package as the name brand: identical
// paths, identical text, identical proportions. Only the colors change, the way
// a supermarket's own label is the plain version of the box beside it. So this
// script copies each file in static/images verbatim and rewrites nothing but
// the color literals.
//
// Re-run it whenever a product is added:  bun run images:cg

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const source = 'static/images'
const target = 'static/images/cg'

/** How much of the original color survives. Lower is plainer. */
const saturationKept = 0.25
/** How far every color drifts towards a mid tone, flattening the contrast a little. */
const flattenTowards = 0.6
const flattenBy = 0.18
/** Colors this close to grey already read as plain, so leave them exactly as they are. */
const alreadyPlain = 0.08

function toHsl(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  if (max === min) return [0, 0, lightness]

  const span = max - min
  const saturation = lightness > 0.5 ? span / (2 - max - min) : span / (max + min)
  let hue
  if (max === r) hue = (g - b) / span + (g < b ? 6 : 0)
  else if (max === g) hue = (b - r) / span + 2
  else hue = (r - g) / span + 4
  return [hue / 6, saturation, lightness]
}

function channel(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function toRgb(hue, saturation, lightness) {
  if (saturation === 0) return [lightness, lightness, lightness]
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q
  return [channel(p, q, hue + 1 / 3), channel(p, q, hue), channel(p, q, hue - 1 / 3)]
}

const twoDigits = (value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, '0')

/** '#d84335' -> '#a7908c'. The store-brand version of one color. */
export function plainer(hex) {
  const digits = hex.slice(1)
  const full = digits.length === 3 ? digits.split('').map((d) => d + d).join('') : digits
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16) / 255)

  const [hue, saturation, lightness] = toHsl(r, g, b)
  if (saturation < alreadyPlain) return hex

  const plainerLightness = lightness + (flattenTowards - lightness) * flattenBy
  return '#' + toRgb(hue, saturation * saturationKept, plainerLightness).map(twoDigits).join('')
}

// A `#` inside url(...) points at a gradient, not a color, so it is left alone.
const colorLiteral = /(^|[^(])(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))\b/g

function storeBrandVersion(svg) {
  return svg.replace(colorLiteral, (_, before, hex) => before + plainer(hex))
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
