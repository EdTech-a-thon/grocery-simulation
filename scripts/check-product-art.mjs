// Checks the drawings, and lays them out to be looked at. Spends nothing.
//
// This is the half of the pipeline that needs no model at all: the contract in
// house-style.md checked as text, the framing measured in a real browser, and a
// contact sheet so a whole batch can be judged in one glance instead of one file
// at a time. An illustrator — human or otherwise — runs it to find out whether
// the work is acceptable before anyone else looks.
//
//   bun scripts/check-product-art.mjs                 # every master
//   bun scripts/check-product-art.mjs salsa soup      # just these
//   bun scripts/check-product-art.mjs --quiet         # problems only, no sheet
//
// Exits non-zero when anything failed, so it can gate a commit.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { catalog } from './product-art/catalog.mjs'
import { compose } from './product-art/layers.mjs'
import { framing, openRenderer, proportion } from './product-art/render.mjs'
import { referenceFor } from './product-art/references.mjs'
import { validate } from './product-art/validate.mjs'

const masters = 'art/masters'
const review = 'art/review'

const argv = process.argv.slice(2)
const quiet = argv.includes('--quiet')
const wanted = argv.filter((argument) => !argument.startsWith('--'))

mkdirSync(review, { recursive: true })

const products = new Map(catalog().map((product) => [product.id, product]))
const drawn = existsSync(masters)
  ? readdirSync(masters)
      .filter((name) => name.endsWith('.svg'))
      .map((name) => name.slice(0, -'.svg'.length))
      .sort()
  : []

const queue = (wanted.length ? wanted : drawn).filter((id) => {
  if (!products.has(id)) {
    process.stdout.write(`${id}: not a product in the catalog\n`)
    return false
  }
  if (!existsSync(join(masters, `${id}.svg`))) {
    process.stdout.write(`${id}: nothing drawn yet\n`)
    return false
  }
  return true
})

if (!queue.length) {
  process.stdout.write(`Nothing to check. Masters live in ${masters}/<id>.svg\n`)
  process.exit(wanted.length ? 1 : 0)
}

const renderer = await openRenderer()
const checked = []

// Each reference is measured once and reused, so a batch of twenty tins costs
// one measurement of the tin rather than twenty.
const referenceBoxes = new Map()
async function referenceBox(reference) {
  if (!referenceBoxes.has(reference.slug)) {
    const measured = await renderer.measure(compose(reference.svg, 'name'))
    referenceBoxes.set(reference.slug, measured.box ?? null)
  }
  return referenceBoxes.get(reference.slug)
}

for (const id of queue) {
  const product = products.get(id)
  const svg = readFileSync(join(masters, `${id}.svg`), 'utf8')
  const problems = validate(svg, { packaged: product.packaged })

  let variants = null
  if (!problems.length) {
    variants = { name: compose(svg, 'name'), cg: product.packaged ? compose(svg, 'cg') : null }
    const measured = await renderer.measure(variants.name)
    if (measured.parseError) problems.push(`is not well-formed SVG: ${measured.parseError}`)
    else {
      problems.push(...framing(measured.box))

      // Adapting a reference means keeping its package and changing its print.
      // A drawing that has quietly become a different shape is the wrong
      // package, however valid the file is.
      const reference = product.packaged && product.form ? referenceFor(product.form) : null
      if (reference && !reference.adapt) {
        const wanted = await referenceBox(reference)
        if (wanted) {
          problems.push(...proportion(measured.box, wanted, reference.slug.replace(/-/g, ' ')))
        }
      }
    }
  }

  if (variants) {
    writeFileSync(join(review, `${id}.png`), await renderer.shoot(variants.name, { width: 288, height: 396 }))
    if (variants.cg) {
      writeFileSync(join(review, `${id}-cg.png`), await renderer.shoot(variants.cg, { width: 288, height: 396 }))
    }
  }

  checked.push({ product, problems, variants })
}

// ------------------------------------------------------------- the contact sheet

if (!quiet) {
  const cell = (entry) => {
    const { product, variants, problems } = entry
    const tile = (svg, caption) =>
      svg
        ? `<figure><div class="tile">${svg.replace('<svg ', '<svg width="112" height="154" ')}</div>` +
          `<figcaption>${caption}</figcaption></figure>`
        : ''

    return `<article class="${problems.length ? 'bad' : 'ok'}">
      <div class="pair">
        ${tile(variants?.name, 'name brand')}
        ${variants?.cg ? tile(variants.cg, 'CG Value') : '<figure><div class="tile loose">sold loose</div><figcaption>no twin</figcaption></figure>'}
      </div>
      <h2>${product.name}</h2>
      <p class="meta">${product.id}${problems.length ? ` · ${problems.length} problem${problems.length === 1 ? '' : 's'}` : ''}</p>
    </article>`
  }

  const page = `<!doctype html><meta charset="utf-8"><title>Contact sheet</title>
<style>
  body { margin: 0; padding: 20px; background: #f3f0ea; font: 13px system-ui, sans-serif; color: #1f2937 }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px }
  article { background: #fff; border-radius: 10px; padding: 10px; border: 2px solid #15803d }
  article.bad { border-color: #b91c1c }
  .pair { display: flex; gap: 6px; justify-content: center; background: #e8e4dc; border-radius: 6px; padding: 6px }
  figure { margin: 0; text-align: center }
  figcaption { font-size: 10px; color: #6b7280; margin-top: 2px }
  .tile { width: 112px; height: 154px; display: grid; place-items: center }
  .loose { color: #9ca3af; font-size: 10px }
  h2 { font-size: 13px; margin: 8px 0 0; text-align: center }
  .meta { margin: 1px 0 0; font-size: 10px; color: #6b7280; text-align: center }
</style>
<div class="grid">${checked.map(cell).join('')}</div>`

  const sheetHtml = join(review, 'sheet.html')
  writeFileSync(sheetHtml, page)

  const rows = Math.ceil(checked.length / 5)
  const png = await renderer.shootPage(page, { width: 1240, height: 40 + rows * 268 })
  writeFileSync(join(review, 'sheet.png'), png)
}

await renderer.close()

// -------------------------------------------------------------------- the verdict

const failed = checked.filter((entry) => entry.problems.length)

for (const entry of checked) {
  if (!entry.problems.length) {
    if (!quiet) process.stdout.write(`ok       ${entry.product.id}\n`)
    continue
  }
  process.stdout.write(`PROBLEM  ${entry.product.id}\n`)
  for (const problem of entry.problems) process.stdout.write(`         · ${problem}\n`)
}

process.stdout.write(`\n${checked.length - failed.length}/${checked.length} pass the mechanical checks.\n`)
if (!quiet) process.stdout.write(`Contact sheet: ${join(review, 'sheet.png')}\n`)
process.exit(failed.length ? 1 : 0)
