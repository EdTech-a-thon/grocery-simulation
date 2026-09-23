// The planning pass.
//
// Before anything is drawn, each packaged product is given the package format a
// shop would really sell it in, and a one-line note on what its label shows.
// Left to decide that inside the drawing call, the model picks a different
// answer every run — pasta sauce arrives as a jar, then a pouch, then a tin —
// and the shelf stops looking like one shop.
//
// The result is written to forms.json and meant to be read and corrected by
// hand. It is committed, so the artwork is reproducible: the same plan and the
// same house style redraw the same shop.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { client, meter } from './anthropic.mjs'
import { forms } from './catalog.mjs'

const planningModel = 'claude-haiku-4-5'

/** How many products to plan in one call. */
const batchSize = 30

const Plan = z.object({
  products: z.array(
    z.object({
      id: z.string(),
      form: z.enum(forms),
      motif: z
        .string()
        .describe(
          'In a dozen words or fewer, the single bold image the label shows — "a halved ripe tomato on ' +
            'a cream panel", "three golden crackers stacked". Contents of the package, never words.',
        ),
    }),
  ),
})

const instructions = `You are laying out the packaging for a classroom grocery shop.

For each product, choose the package format a real supermarket would sell it in,
from the list the schema allows, and describe the one bold image its label shows.

Rules of thumb that keep the shelf believable:
  - what it is really sold in wins over what would be fun to draw
  - pourable liquids in bottles or cartons, wet food in tins or jars, dry food in
    boxes, bags or canisters, chilled dairy in tubs or blocks
  - a label shows the food inside, appetising and singular. Never words, never a
    mascot, never a person.

Answer for every product you are given, using its exact id.`

export async function plan(products) {
  const packaged = products.filter((product) => product.packaged)
  const planned = {}

  for (let at = 0; at < packaged.length; at += batchSize) {
    const batch = packaged.slice(at, at + batchSize)
    const listing = batch
      .map((product) => `${product.id} — ${product.name} (${product.note}), ${product.aisle} aisle`)
      .join('\n')

    const response = await client.messages.parse({
      model: planningModel,
      max_tokens: 8000,
      system: instructions,
      output_config: { format: zodOutputFormat(Plan) },
      messages: [{ role: 'user', content: listing }],
    })

    meter(planningModel, response.usage)

    for (const entry of response.parsed_output?.products ?? []) {
      planned[entry.id] = { form: entry.form, motif: entry.motif }
    }
    process.stdout.write(`  planned ${Math.min(at + batchSize, packaged.length)}/${packaged.length}\n`)
  }

  const missing = packaged.filter((product) => !planned[product.id]).map((product) => product.id)
  if (missing.length) {
    process.stdout.write(`  no plan came back for: ${missing.join(', ')}\n`)
  }

  // Sorted, so a re-plan produces a readable diff rather than a reshuffle.
  const ordered = Object.fromEntries(Object.keys(planned).sort().map((id) => [id, planned[id]]))
  const file = join(import.meta.dirname, 'forms.json')
  writeFileSync(file, `${JSON.stringify(ordered, null, 2)}\n`)
  return { file, count: Object.keys(ordered).length }
}
