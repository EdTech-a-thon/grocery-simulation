// The mechanical gate.
//
// Everything here is cheap, certain, and checkable without opening a browser or
// spending a token: the contract in house-style.md, restated as code. A drawing
// that fails any of it is sent back to be redrawn without ever reaching the
// renderer or the judge, which is what keeps the cost of a bad attempt near
// zero. Whether the drawing is any *good* is a separate question, and not one
// string matching can answer — that is the judge's job.

import { isPackaged, readLayers } from './layers.mjs'

/** Things the house style forbids outright, and what to say when one shows up. */
const banned = [
  [/<text[\s>]/i, 'contains <text> — the house style forbids type on the artwork'],
  [/<tspan[\s>]/i, 'contains <tspan> — the house style forbids type on the artwork'],
  [/<image[\s>]/i, 'contains <image> — the drawing must be self-contained'],
  [/<script[\s>]/i, 'contains <script>'],
  [/<style[\s>]/i, 'contains <style>'],
  [/<foreignObject[\s>]/i, 'contains <foreignObject>'],
  [/<use[\s>]/i, 'contains <use>'],
  [/\shref\s*=/i, 'references something outside the file via href'],
  [/<defs[\s>]/i, 'contains <defs> — no gradients, patterns or filters'],
  [/<(linear|radial)Gradient[\s>]/i, 'uses a gradient — the house style is flat fills'],
  [/<pattern[\s>]/i, 'uses a pattern fill'],
  [/<(mask|clipPath|filter)[\s>]/i, 'uses a mask, clip path or filter'],
  [/<!--/, 'contains a comment'],
  [/<metadata[\s>]/i, 'contains metadata'],
  [/<\?xml/i, 'has an XML prolog — emit the bare <svg> element'],
  [/<!DOCTYPE/i, 'has a doctype — emit the bare <svg> element'],
  [/#000000|#000\b/i, 'uses pure black — the darkest ink in the store is #1f2937'],
]

/** The elements that actually put ink on the page. */
const shapes = /<(path|rect|circle|ellipse|polygon|polyline|line)[\s>]/gi

const shapeFloor = 15
// Raised from 40 after a tray of four sausages — twelve shapes of meat on top of
// a twelve-shape tray, before either printed face — could not be drawn inside it.
// An illustrator told to cut back to fit produced a flat block with dashes on it,
// which is to say the ceiling was causing the failure it was meant to prevent.
const shapeCeiling = 55
const byteCeiling = 20_000

/**
 * Every way this drawing breaks the contract, as sentences a model can act on.
 * An empty array means it is worth rendering.
 */
export function validate(svg, { packaged }) {
  const problems = []

  if (!svg.trimStart().startsWith('<svg')) {
    problems.push('does not begin with <svg — reply with the SVG document alone, no prose and no code fence')
    return problems
  }

  const openingTag = (svg.match(/<svg[\s\S]*?>/) || [''])[0]
  if (!/viewBox="0 0 160 220"/.test(openingTag)) {
    problems.push('the root <svg> must carry exactly viewBox="0 0 160 220"')
  }
  if (/\s(width|height)\s*=/.test(openingTag)) {
    problems.push('the root <svg> must not set width or height — the viewBox alone')
  }
  if (!/<\/svg\s*>\s*$/.test(svg)) {
    problems.push('must end with a single closing </svg>')
  }
  if (svg.length > byteCeiling) {
    problems.push(`is ${svg.length} bytes, over the ${byteCeiling} byte ceiling — simplify`)
  }

  for (const [pattern, complaint] of banned) {
    if (pattern.test(svg)) problems.push(complaint)
  }

  // A colour that is not a colour paints nothing, and the browser says nothing
  // about it either — the shape simply vanishes. Cheap to catch here.
  const allowedColour = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|none|transparent|currentColor)$/i
  for (const match of svg.matchAll(/\s(fill|stroke)="([^"]*)"/g)) {
    if (!allowedColour.test(match[2].trim())) {
      problems.push(
        `has an invalid ${match[1]} value "${match[2]}" — use a hex colour like #d8c09a, or none`,
      )
    }
  }

  const shapeCount = (svg.match(shapes) || []).length
  if (shapeCount < shapeFloor) {
    problems.push(
      `has only ${shapeCount} shapes, under the ${shapeFloor} the house style asks for — it will read as a blob at tile size; add structure, shading and detail`,
    )
  } else if (shapeCount > shapeCeiling) {
    problems.push(
      `has ${shapeCount} shapes, over the ${shapeCeiling} ceiling — it will turn to noise at tile size; simplify`,
    )
  }

  let layers
  try {
    layers = readLayers(svg).layers
  } catch (error) {
    problems.push(`could not be split into layers: ${error.message}`)
    return problems
  }

  if (!layers['item']) {
    problems.push('is missing the <g id="item"> layer')
  }

  if (packaged) {
    for (const id of ['label', 'brand', 'brand-cg']) {
      if (!layers[id]) problems.push(`is missing the <g id="${id}"> layer, which a packaged product needs`)
    }
  } else {
    for (const id of ['label', 'brand', 'brand-cg']) {
      if (layers[id]) {
        problems.push(
          `has a <g id="${id}"> layer, but this is loose, unpackaged food — draw the food alone in <g id="item"> and nothing else`,
        )
      }
    }
  }

  const known = new Set(['item', 'label', 'brand', 'brand-cg'])
  for (const id of Object.keys(layers)) {
    if (!known.has(id)) problems.push(`has an unexpected layer id "${id}"`)
  }

  if (packaged && isPackaged(layers)) {
    // The shop's own line is meant to be plainer than the name brand, not
    // emptier. Both extremes are worth catching before a person looks.
    const ink = (group) => (group.match(shapes) || []).length
    const brand = ink(layers['brand'])
    const cg = ink(layers['brand-cg'])
    if (cg < 3 || cg < Math.ceil(brand * 0.5)) {
      problems.push(
        `the brand-cg layer has ${cg} shapes against brand's ${brand} — that is a blank package, not a plainer one.` +
          ' Keep the same motif at the same size, in its own real colours, with fewer tones.',
      )
    }
    if (cg > brand) {
      problems.push('the brand-cg layer has more shapes than brand — the shop\'s own package must be the plainer of the two')
    }
  }

  return problems
}
