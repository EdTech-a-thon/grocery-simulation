// Checks the package-format references and lays them out side by side.
//
// A reference is a drawing of one package format, done by hand and verified, that
// an illustrator adapts into a particular product. They exist because a written
// description of a package — "a cone shoulder tapering to a narrow neck" — does
// not reliably become the right geometry, whereas a working set of coordinates
// does. They are the most load-bearing files in the pipeline: a flaw in one
// propagates into every product drawn from it, so they get their own checker.
//
//   bun scripts/check-references.mjs

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { compose } from './product-art/layers.mjs'
import { framing, openRenderer } from './product-art/render.mjs'
import { validate } from './product-art/validate.mjs'

const references = 'art/references'
const review = 'art/review'
mkdirSync(review, { recursive: true })

const slugs = readdirSync(references)
  .filter((name) => name.endsWith('.svg'))
  .map((name) => name.slice(0, -'.svg'.length))
  .sort()

const renderer = await openRenderer()
const checked = []

for (const slug of slugs) {
  const svg = readFileSync(join(references, `${slug}.svg`), 'utf8')
  const problems = validate(svg, { packaged: true })
  let variants = null

  if (!problems.length) {
    variants = { name: compose(svg, 'name'), cg: compose(svg, 'cg') }
    const measured = await renderer.measure(variants.name)
    if (measured.parseError) problems.push(`is not well-formed SVG: ${measured.parseError}`)
    else problems.push(...framing(measured.box))
  }

  checked.push({ slug, problems, variants })
}

const cell = ({ slug, variants, problems }) => {
  const tile = (svg) =>
    `<div class="tile">${(svg ?? '').replace('<svg ', '<svg width="104" height="143" ')}</div>`
  return `<article class="${problems.length ? 'bad' : 'ok'}">
    <div class="pair">${tile(variants?.name)}${tile(variants?.cg)}</div>
    <h2>${slug}</h2>
  </article>`
}

const page = `<!doctype html><meta charset="utf-8"><title>Format references</title>
<style>
  body { margin: 0; padding: 18px; background: #f3f0ea; font: 13px system-ui, sans-serif; color: #1f2937 }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px }
  article { background: #fff; border-radius: 10px; padding: 10px; border: 2px solid #15803d }
  article.bad { border-color: #b91c1c }
  .pair { display: flex; gap: 6px; justify-content: center; background: #e8e4dc; border-radius: 6px; padding: 6px }
  .tile { width: 104px; height: 143px; display: grid; place-items: center }
  h2 { font-size: 12px; margin: 8px 0 0; text-align: center; font-family: ui-monospace, monospace }
</style>
<div class="grid">${checked.map(cell).join('')}</div>`

writeFileSync(join(review, 'references.html'), page)
const rows = Math.ceil(checked.length / 4)
writeFileSync(
  join(review, 'references.png'),
  await renderer.shootPage(page, { width: 1000, height: 36 + rows * 226 }),
)
await renderer.close()

const failed = checked.filter((entry) => entry.problems.length)
for (const entry of checked) {
  if (!entry.problems.length) {
    process.stdout.write(`ok       ${entry.slug}\n`)
    continue
  }
  process.stdout.write(`PROBLEM  ${entry.slug}\n`)
  for (const problem of entry.problems) process.stdout.write(`         · ${problem}\n`)
}
process.stdout.write(`\n${checked.length - failed.length}/${checked.length} references pass.\n`)
process.stdout.write(`Sheet: ${join(review, 'references.png')}\n`)
process.exit(failed.length ? 1 : 0)
