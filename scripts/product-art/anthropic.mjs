// The client, and the running tab.
//
// Every call made by the pipeline is metered here so a run can report what it
// cost, and so a low cache-read figure — the usual reason a batch of small
// requests is more expensive than it should be — is visible rather than
// guessed at.

import Anthropic from '@anthropic-ai/sdk'

export const client = new Anthropic()

/** Published per-million-token rates, for the run's own arithmetic. */
const rates = {
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-opus-5': { input: 5, output: 25 },
}

const tab = {}

export function meter(model, usage) {
  const entry = (tab[model] ??= { calls: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 })
  entry.calls += 1
  entry.input += usage.input_tokens ?? 0
  entry.output += usage.output_tokens ?? 0
  entry.cacheWrite += usage.cache_creation_input_tokens ?? 0
  entry.cacheRead += usage.cache_read_input_tokens ?? 0
}

export function spend() {
  const lines = []
  let total = 0
  for (const [model, entry] of Object.entries(tab)) {
    const rate = rates[model] ?? { input: 0, output: 0 }
    // Cache writes bill at 1.25x the input rate and reads at 0.1x.
    const cost =
      (entry.input * rate.input +
        entry.cacheWrite * rate.input * 1.25 +
        entry.cacheRead * rate.input * 0.1 +
        entry.output * rate.output) /
      1_000_000
    total += cost
    lines.push(
      `  ${model.padEnd(18)} ${String(entry.calls).padStart(4)} calls  ` +
        `in ${entry.input}  cache w/r ${entry.cacheWrite}/${entry.cacheRead}  ` +
        `out ${entry.output}  $${cost.toFixed(2)}`,
    )
  }
  lines.push(`  ${'total'.padEnd(18)} ${' '.repeat(10)} $${total.toFixed(2)}`)
  return lines.join('\n')
}
