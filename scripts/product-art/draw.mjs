// The drawing pass: one Haiku call per attempt.
//
// The house style is the whole system prompt and never varies, so it is marked
// for caching and read back on every product after the first. What changes per
// call is a short brief, and — on a retry — the drawing that was rejected
// together with the reasons. Feeding the criticism back is the part that makes
// retries worth paying for: a blind second attempt is a coin flip, whereas an
// attempt told "the jar is floating in the top third of the frame" usually
// fixes exactly that.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { client, meter } from './anthropic.mjs'
import { referenceFor } from './references.mjs'

const houseStyle = readFileSync(join(import.meta.dirname, 'house-style.md'), 'utf8')

export const drawingModel = 'claude-haiku-4-5'

/** The brief for one product. */
function brief(product) {
  const lines = [
    `Draw: ${product.name}`,
    `Aisle: ${product.aisle}`,
    `Described on the shelf as: ${product.note}`,
  ]

  if (product.packaged) {
    lines.push(
      `Package: ${product.form ?? 'choose the format a shop would really use'}`,
      product.motif
        ? `What the label shows: ${product.motif}`
        : 'What the label shows: choose a bold motif of the contents',
      'This is a packaged product: emit all four layers — item, label, brand, brand-cg.',
    )

    // The reference does the work the format table cannot: it hands over the
    // geometry instead of describing it.
    const reference = referenceFor(product.form)
    if (reference) {
      lines.push(
        '',
        `Start from this verified drawing of a ${reference.slug.replace(/-/g, ' ')} and adapt it.`,
        'Keep its construction, its proportions, its shading discipline and its layer structure.',
        reference.adapt
          ? `It is a near neighbour rather than an exact match, so change this: ${reference.adapt}.`
          : 'It is the right format, so keep the package as it is and change what is printed on it.',
        'Replace the motif in `brand` and `brand-cg` with this product\'s own, at the same size.',
        '',
        reference.svg,
      )
    }
  } else {
    lines.push(
      'This is loose, unpackaged food sold by weight or by the piece.',
      'Emit only <g id="item">. No label, no brand, no brand-cg.',
    )
  }

  return lines.join('\n')
}

/** What to tell the model about the attempt that was turned down. */
function rejection(attempt) {
  const reasons = attempt.problems.map((problem) => `- it ${problem}`).join('\n')
  return [
    'That drawing was rejected. Here it is again:',
    '',
    attempt.svg,
    '',
    'What was wrong with it:',
    reasons,
    '',
    'Redraw it from scratch, fixing every one of those. Reply with the SVG alone.',
  ].join('\n')
}

/** Anything the model wrapped around the document, taken back off. */
function unwrap(text) {
  const fenced = text.match(/```(?:svg|xml)?\s*([\s\S]*?)```/)
  const body = (fenced ? fenced[1] : text).trim()
  const start = body.indexOf('<svg')
  const end = body.lastIndexOf('</svg')
  if (start === -1 || end === -1) return body
  return body.slice(start, body.indexOf('>', end) + 1)
}

/**
 * One attempt at one product. `history` is the attempts already turned down,
 * newest last; only the most recent is shown back, since an older draft is
 * paid-for context that rarely changes the next attempt.
 */
export async function draw(product, history = []) {
  const messages = [{ role: 'user', content: brief(product) }]

  const last = history.at(-1)
  if (last) {
    messages.push(
      { role: 'assistant', content: last.svg },
      { role: 'user', content: rejection(last) },
    )
  }

  const response = await client.messages.create({
    model: drawingModel,
    max_tokens: 8000,
    system: [{ type: 'text', text: houseStyle, cache_control: { type: 'ephemeral' } }],
    messages,
  })

  meter(drawingModel, response.usage)

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  return unwrap(text)
}
