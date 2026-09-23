// Draws the shop.
//
// Every product tile in the store is generated here: a small, cheap model draws,
// and nothing it draws is trusted. Each attempt passes three gates before it is
// kept — the contract in house-style.md, checked as text; the framing, measured
// in a real browser; and finally whether it looks like the thing at all, which
// only something that can see the picture can judge, so a stronger model is
// shown the rendered tile and asked. A rejected attempt is redrawn with the
// criticism attached, up to a few times, and if it never passes it is left out
// and listed in the report rather than shipped.
//
// Because the drawing is layered, one pass produces both packages: the name
// brand and the shop's own plainer CG Value twin, cut from the same paths.
//
//   bun scripts/make-product-art.mjs --plan            # choose package formats, once
//   bun scripts/make-product-art.mjs --limit 8         # a pilot batch
//   bun scripts/make-product-art.mjs                   # everything still missing
//   bun scripts/make-product-art.mjs --only salsa,soup --force
//   bun scripts/make-product-art.mjs --report          # rebuild the review page only
//
// Needs ANTHROPIC_API_KEY, except for --report.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { catalog } from './product-art/catalog.mjs'
import { compose } from './product-art/layers.mjs'
import { draw, drawingModel } from './product-art/draw.mjs'
import { defaultJudgeModel, judge } from './product-art/judge.mjs'
import { plan } from './product-art/plan.mjs'
import { framing, openRenderer } from './product-art/render.mjs'
import { spend } from './product-art/anthropic.mjs'
import { validate } from './product-art/validate.mjs'

const masters = 'art/masters'
const review = 'art/review'
const shipped = 'static/images'

const options = {
  plan: false,
  report: false,
  force: false,
  judge: true,
  judgeModel: defaultJudgeModel,
  attempts: 3,
  concurrency: 6,
  limit: Infinity,
  only: null,
}

const argv = process.argv.slice(2)
for (let at = 0; at < argv.length; at += 1) {
  const flag = argv[at]
  const value = () => argv[(at += 1)]
  if (flag === '--plan') options.plan = true
  else if (flag === '--report') options.report = true
  else if (flag === '--force') options.force = true
  else if (flag === '--no-judge') options.judge = false
  else if (flag === '--judge') options.judgeModel = value()
  else if (flag === '--attempts') options.attempts = Number(value())
  else if (flag === '--concurrency') options.concurrency = Number(value())
  else if (flag === '--limit') options.limit = Number(value())
  else if (flag === '--only') options.only = value().split(',').map((id) => id.trim())
  else {
    process.stderr.write(`unknown flag ${flag}\n`)
    process.exit(1)
  }
}

const products = catalog()

if (options.plan) {
  const { file, count } = await plan(products)
  process.stdout.write(`\nWrote package formats for ${count} products to ${file}\n`)
  process.stdout.write('Read it over and correct anything odd before drawing.\n\n')
  process.stdout.write(`${spend()}\n`)
  process.exit(0)
}

/** Where a product's three files live. */
function paths(id) {
  return {
    master: join(masters, `${id}.svg`),
    name: join(shipped, `${id}.svg`),
    cg: join(shipped, 'cg', `${id}.svg`),
    shot: join(review, `${id}.png`),
    shotCg: join(review, `${id}-cg.png`),
  }
}

/** One product, through as many attempts as it takes or as it is allowed. */
async function make(product, renderer) {
  const history = []

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    let svg
    try {
      svg = await draw(product, history)
    } catch (error) {
      history.push({ svg: '', problems: [`could not be drawn: ${error.message}`] })
      continue
    }

    // Gate one: the contract, as text. Cheap and certain.
    const problems = validate(svg, { packaged: product.packaged })

    // Gate two: does it parse, and did the ink land in the frame?
    let box = null
    if (!problems.length) {
      const composed = compose(svg, 'name')
      const measured = await renderer.measure(composed)
      if (measured.parseError) problems.push(`is not well-formed SVG: ${measured.parseError}`)
      else {
        box = measured.box
        problems.push(...framing(box))
      }
    }

    // Gate three: does it look like the thing?
    let verdict = null
    if (!problems.length && options.judge) {
      const nameSvg = compose(svg, 'name')
      const shots = {
        name: await renderer.shoot(nameSvg, { width: 288, height: 396 }),
        thumb: await renderer.shoot(nameSvg, { width: 120, height: 165 }),
        cg: product.packaged ? await renderer.shoot(compose(svg, 'cg'), { width: 288, height: 396 }) : null,
      }

      try {
        verdict = await judge(product, shots, { model: options.judgeModel })
      } catch (error) {
        history.push({ svg, problems: [`could not be judged: ${error.message}`] })
        continue
      }

      if (verdict.verdict !== 'accept') {
        const notes = verdict.problems.length
          ? verdict.problems
          : [`does not read as ${product.name} — it looks like ${verdict.guess}`]
        problems.push(...notes)
      }
    }

    if (problems.length) {
      history.push({ svg, problems, verdict, attempt })
      continue
    }

    return { svg, verdict, attempts: attempt, history }
  }

  return { svg: null, attempts: options.attempts, history }
}

/** Keep an accepted drawing, and the tiles the review page shows. */
async function keep(product, svg, renderer) {
  const where = paths(product.id)
  const nameSvg = compose(svg, 'name')

  writeFileSync(where.master, svg.endsWith('\n') ? svg : `${svg}\n`)
  writeFileSync(where.name, nameSvg)
  writeFileSync(where.shot, await renderer.shoot(nameSvg, { width: 288, height: 396 }))

  if (product.packaged) {
    const cgSvg = compose(svg, 'cg')
    writeFileSync(where.cg, cgSvg)
    writeFileSync(where.shotCg, await renderer.shoot(cgSvg, { width: 288, height: 396 }))
  } else {
    // Loose food has no shop-brand twin; clear any stale one from an older run.
    for (const stale of [where.cg, where.shotCg]) if (existsSync(stale)) rmSync(stale)
  }
}

function reviewPage(results) {
  const card = (result) => {
    const { product, verdict, attempts, kept, history } = result
    const notes = kept
      ? (verdict?.problems ?? []).map((problem) => `<li>${problem}</li>`).join('')
      : (history.at(-1)?.problems ?? []).map((problem) => `<li>${problem}</li>`).join('')

    return `<article class="${kept ? 'kept' : 'dropped'}">
      <header><h2>${product.name}</h2>
        <p>${product.id} · ${product.aisle}${product.packaged ? ` · ${product.form ?? 'packaged'}` : ' · loose'}</p></header>
      <div class="tiles">
        ${kept ? `<img src="${product.id}.png" alt="${product.name}">` : '<div class="none">not kept</div>'}
        ${kept && product.packaged ? `<img src="${product.id}-cg.png" alt="${product.name}, CG Value">` : ''}
      </div>
      <footer>
        <p>${kept ? `kept after ${attempts} attempt${attempts === 1 ? '' : 's'}` : `dropped after ${attempts} attempts`}
           ${verdict ? ` · scored ${verdict.score}/5 · read as “${verdict.guess}”` : ''}</p>
        ${notes ? `<ul>${notes}</ul>` : ''}
      </footer>
    </article>`
  }

  const kept = results.filter((result) => result.kept)
  return `<!doctype html><meta charset="utf-8"><title>Product art review</title>
<style>
  :root { color-scheme: light dark }
  body { font: 15px/1.5 system-ui, sans-serif; margin: 0; padding: 24px; background: #faf8f4; color: #1f2937 }
  h1 { margin: 0 0 4px }
  .summary { color: #4b5563; margin-bottom: 24px }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px }
  article { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; border-left: 4px solid #15803d }
  article.dropped { border-left-color: #b91c1c }
  h2 { font-size: 16px; margin: 0 }
  header p, footer p { margin: 2px 0; color: #6b7280; font-size: 12px }
  .tiles { display: flex; gap: 8px; justify-content: center; background: #e8e4dc; border-radius: 8px; margin: 8px 0; padding: 8px }
  .tiles img { width: 120px; height: 165px; object-fit: contain }
  .none { width: 120px; height: 165px; display: grid; place-items: center; color: #b91c1c; font-size: 12px }
  ul { margin: 4px 0 0; padding-left: 18px; font-size: 12px; color: #b45309 }
  @media (prefers-color-scheme: dark) {
    body { background: #111827; color: #f3f4f6 } article { background: #1f2937; border-color: #374151 }
    header p, footer p { color: #9ca3af }
  }
</style>
<h1>Product art review</h1>
<p class="summary">${kept.length} of ${results.length} kept.
  Green means it passed every gate; red means it was dropped and the old art is still in place.</p>
<div class="grid">${results.map(card).join('')}</div>
`
}

// ---------------------------------------------------------------------- the run

for (const directory of [masters, review, join(shipped, 'cg')]) mkdirSync(directory, { recursive: true })

let queue = products
if (options.only) queue = queue.filter((product) => options.only.includes(product.id))
if (!options.force && !options.report) {
  queue = queue.filter((product) => !existsSync(paths(product.id).master))
}
if (Number.isFinite(options.limit)) queue = queue.slice(0, options.limit)

if (options.report) {
  // Rebuild the page from whatever is already on disk, without spending a token.
  const results = products
    .filter((product) => existsSync(paths(product.id).master))
    .map((product) => ({ product, kept: true, attempts: 0, verdict: null, history: [] }))
  writeFileSync(join(review, 'index.html'), reviewPage(results))
  process.stdout.write(`Wrote ${join(review, 'index.html')} for ${results.length} products\n`)
  process.exit(0)
}

if (!queue.length) {
  process.stdout.write('Nothing to draw. Pass --force to redraw, or --only to pick products.\n')
  process.exit(0)
}

if (!process.env.ANTHROPIC_API_KEY) {
  process.stderr.write('ANTHROPIC_API_KEY is not set.\n')
  process.exit(1)
}

const unplanned = queue.filter((product) => product.packaged && !product.form)
if (unplanned.length) {
  process.stdout.write(
    `${unplanned.length} packaged products have no chosen package format. ` +
      'Run with --plan first, or they will each be drawn in whatever format the model picks.\n\n',
  )
}

process.stdout.write(
  `Drawing ${queue.length} products with ${drawingModel}, ` +
    `${options.judge ? `judged by ${options.judgeModel}` : 'unjudged'}, ` +
    `up to ${options.attempts} attempts each, ${options.concurrency} at a time.\n\n`,
)

const renderer = await openRenderer()
const results = []
let done = 0

async function worker(shared) {
  while (shared.length) {
    const product = shared.shift()
    const { svg, verdict, attempts, history } = await make(product, renderer)

    if (svg) await keep(product, svg, renderer)
    results.push({ product, verdict, attempts, history, kept: Boolean(svg) })

    done += 1
    const mark = svg ? `kept  ${verdict ? `${verdict.score}/5` : '    '}` : 'DROPPED  '
    process.stdout.write(
      `[${String(done).padStart(3)}/${queue.length}] ${mark} ${product.id} ` +
        `(${attempts} attempt${attempts === 1 ? '' : 's'})\n`,
    )
    if (!svg) {
      for (const problem of history.at(-1)?.problems ?? []) process.stdout.write(`        · ${problem}\n`)
    }
  }
}

const shared = [...queue]
await Promise.all(Array.from({ length: Math.min(options.concurrency, shared.length) }, () => worker(shared)))
await renderer.close()

// The report covers everything on disk, not just this run, so a pilot batch and
// a later full run are reviewed as one shop.
const onDisk = products
  .filter((product) => existsSync(paths(product.id).master))
  .map((product) => {
    const fresh = results.find((result) => result.product.id === product.id && result.kept)
    return fresh ?? { product, kept: true, attempts: 0, verdict: null, history: [] }
  })
const dropped = results.filter((result) => !result.kept)
writeFileSync(join(review, 'index.html'), reviewPage([...onDisk, ...dropped]))

const kept = results.filter((result) => result.kept).length
process.stdout.write(`\n${kept} kept, ${results.length - kept} dropped.\n`)
process.stdout.write(`Review: ${join(review, 'index.html')}\n\n${spend()}\n`)
if (dropped.length) {
  process.stdout.write(`\nStill on the old art: ${dropped.map((result) => result.product.id).join(', ')}\n`)
}
