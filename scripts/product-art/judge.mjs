// The taste gate: does it actually look good?
//
// Nothing upstream of here can answer that. The validator knows the drawing
// obeys the contract and the renderer knows the ink landed in the right part of
// the frame, but only something that can see the picture can say whether a child
// would call it a jar of pasta sauce. So the rendered tile goes to a stronger
// model than the one that drew it — a weak judge of its own work is no gate at
// all — and its criticism is what the next attempt is told.

import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { client, meter } from './anthropic.mjs'

export const defaultJudgeModel = 'claude-opus-5'

const Verdict = z.object({
  guess: z
    .string()
    .describe('What you would call this object if you came across it with no label. Be blunt.'),
  recognisable: z
    .boolean()
    .describe('Would a nine-year-old name this product correctly within about a second?'),
  wellMade: z
    .boolean()
    .describe(
      'Is the craft sound — believable proportions, consistent light from the upper left, real shading, ' +
        'no stray shapes, no accidental holes, nothing left half-drawn?',
    ),
  legibleSmall: z
    .boolean()
    .describe('In the small thumbnail, does it still read as the product rather than a coloured smudge?'),
  cgReadsAsPlainerTwin: z
    .boolean()
    .describe(
      'For a packaged product: is the second image clearly the SAME product in a plainer, cheaper-looking ' +
        'package — not a different product, and not a broken or empty one? Answer true for loose food, ' +
        'which has no second image.',
    ),
  problems: z
    .array(z.string())
    .describe(
      'Each specific, physical thing to fix, phrased so an illustrator could act on it without seeing ' +
        'your other notes — "the bottle cap is wider than the bottle", not "improve the proportions". ' +
        'Empty if you are accepting it.',
    ),
  score: z.number().int().min(1).max(5).describe('1 unusable, 3 passable, 4 good, 5 could ship in a real app.'),
  verdict: z.enum(['accept', 'redraw']),
})

const rubric = `You are the art director for a classroom grocery shop. Children aged 8 to 11
see these drawings as small tiles on a shelf and tap the one they want to buy.

You are shown, for one product:
  1. the name-brand package, large
  2. the shop's own "CG Value" package, large — the same drawing with a plainer
     printed panel (absent for loose food like fruit, which has no brand)
  3. the name-brand package again at true tile size

Accept a drawing only when all of this holds:
  - you would name the product correctly without being told
  - the craft is sound: believable proportions, light from the upper left,
    genuine shading rather than flat silhouette, nothing half-drawn or stray
  - it still reads at tile size
  - the CG package is recognisably the same product, visibly plainer, and still
    looks like food someone would buy

Hold a real standard. The art it is replacing was three coloured squiggles, and
"better than that" is not the bar — the bar is artwork you would ship in a
children's app. But do not reject over taste you cannot justify physically: every
complaint you make has to name something in the picture.

Be concrete and be brief.`

/**
 * One verdict on one drawing. `shots` are PNG buffers: the name-brand tile, the
 * CG tile (omitted for loose food), and the small thumbnail.
 */
export async function judge(product, shots, { model = defaultJudgeModel } = {}) {
  const content = []

  const show = (label, png) => {
    content.push({ type: 'text', text: label })
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: png.toString('base64') },
    })
  }

  content.push({
    type: 'text',
    text:
      `Product: ${product.name} — ${product.note} (${product.aisle} aisle).\n` +
      (product.packaged
        ? `It is packaged: ${product.form ?? 'format chosen by the illustrator'}.`
        : 'It is loose, unpackaged food, so there is no CG package to compare.'),
  })

  show('The name-brand package:', shots.name)
  if (shots.cg) show("The shop's own CG Value package:", shots.cg)
  show('The name-brand package at true tile size:', shots.thumb)

  const response = await client.messages.parse({
    model,
    max_tokens: 4000,
    system: rubric,
    output_config: { effort: 'medium', format: zodOutputFormat(Verdict) },
    messages: [{ role: 'user', content }],
  })

  meter(model, response.usage)

  const verdict = response.parsed_output
  if (!verdict) throw new Error('the judge returned nothing parseable')
  return verdict
}
