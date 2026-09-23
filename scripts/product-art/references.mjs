// Which drawing an illustrator should start from.
//
// Two rounds of this pipeline established the thing that governs its design: a
// small model can adapt a working set of path coordinates competently, and
// cannot turn a written description of a package into the right geometry. Told
// "a cone shoulder tapering to a narrow neck and a ribbed flip cap", it drew a
// rectangle; handed a squeeze bottle and asked to make it a ketchup bottle, it
// succeeds. So every packaged product is drawn by adapting a reference in
// art/references rather than from prose, and the format table in house-style.md
// is there to explain what it is looking at, not to be drawn from.
//
// Several formats share a reference, because adapting a near neighbour beats
// inventing from nothing: a bread bag is a printed bag, a canister is a can with
// a different lid. Where the nearest reference is only approximate the
// illustrator is told so, and told what to change — that is honest about what it
// is being given and stops it copying a detail that does not belong.
//
// A format with no reference at all returns null, and the run says so rather
// than quietly drawing it badly. Adding one is the fix: draw it, verify it with
// scripts/check-references.mjs, and name it here.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const references = join(import.meta.dirname, '../../art/references')

/**
 * Package format -> the reference to start from, and what to change about it
 * when it is not an exact match.
 */
const mapping = {
  'tin can': ['tin-can'],
  'glass jar': ['glass-jar'],
  'shaker jar': ['glass-jar', 'swap the screw lid for a wide perforated cap and make the body shorter and stouter'],
  'glass bottle': ['squeeze-bottle', 'straighten the waist, lengthen the neck, and swap the flip cap for a small crown cap'],
  'squeeze bottle': ['squeeze-bottle'],
  'screw-top plastic bottle': ['squeeze-bottle', 'straighten the body, remove the waist, and use a short ribbed screw cap with a neck ring'],
  'cardboard box': ['cardboard-box'],
  'brick carton': ['cardboard-box', 'narrow it, square off the shoulders, and add a small foil screw cap set off-centre on the top'],
  'cardboard canister': ['tin-can', 'replace the metal rim with an elliptical card rim and add a plastic overcap'],
  'aerosol can': ['tin-can', 'narrow it, dome the shoulder, and add a plastic actuator cap on top'],
  'printed bag': ['printed-bag'],
  'stand-up pouch': ['printed-bag', 'give it a gusseted flat base so it stands, square the top seal, and add a zip line below it'],
  'bread bag': ['printed-bag', 'soften and bulge the body, gather the neck to one side and close it with a small tag, and show the loaf slices through it'],
  'plastic tub': ['plastic-tub'],
  'foam tray under film': ['foam-tray'],
  'egg carton': ['egg-carton'],
}

/** The reference for a format, or null when none has been drawn yet. */
export function referenceFor(form) {
  const entry = mapping[form]
  if (!entry) return null

  const [slug, adapt = null] = entry
  const file = join(references, `${slug}.svg`)
  if (!existsSync(file)) return null

  return { slug, adapt, svg: readFileSync(file, 'utf8').trim() }
}

/** Formats in the plan that no reference covers yet. */
export function missingReferences(products) {
  const gaps = new Map()
  for (const product of products) {
    if (!product.packaged || !product.form) continue
    if (referenceFor(product.form)) continue
    if (!gaps.has(product.form)) gaps.set(product.form, [])
    gaps.get(product.form).push(product.id)
  }
  return gaps
}
