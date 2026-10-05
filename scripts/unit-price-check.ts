// Lists every name brand beside its CG Value twin with both unit prices, counts
// how many twins are smaller, the same size, and bigger, and fails if a product
// has no size or a twin does not behave like its kind:
//
//   smaller   cheaper on the sticker, dearer per unit
//   same      cheaper on the sticker and per unit
//   bigger    dearer on the sticker, cheaper per unit
//
// Each pair is checked twice, in US units and in the round metric packages a
// metric store stocks instead, which must also stay within metricTolerance of
// the US size, since they sell at the same price.
//
//   bun run check:sizes

import { aisles, catalogPrice } from '../src/lib/catalog'
import { isStoreBrand, productById, storeBrandIdOf } from '../src/lib/products'
import { formatMoney } from '../src/lib/currency'
import { baseMetricAmount, catalogSize, exactMetricAmount, formatSize, metricTolerance, unitPrice, type Measure } from '../src/lib/sizes'

type Kind = 'smaller' | 'same' | 'bigger'

const problems: string[] = []
const seen = new Set<string>()
const counts: Record<Kind, number> = { smaller: 0, same: 0, bigger: 0 }

for (const aisle of aisles) {
  for (const item of aisle.items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    if (!catalogSize(item.id)) problems.push(`${item.id} has no size`)
    for (const id of [item.id, storeBrandIdOf(item.id)]) {
      const us = catalogSize(id)
      const metric = catalogSize(id, 'metric')
      const exact = us && exactMetricAmount(us)
      if (!exact || !metric) continue
      const off = baseMetricAmount(metric) / exact - 1
      if (Math.abs(off) > metricTolerance) problems.push(`${id}: ${formatSize(metric)} is ${Math.round(off * 100)}% off ${formatSize(us)}`)
    }
    if (isStoreBrand(item.id) || !productById[storeBrandIdOf(item.id)]) continue

    const twinId = storeBrandIdOf(item.id)
    const name = { price: catalogPrice(item.id), size: catalogSize(item.id) }
    const twin = { price: catalogPrice(twinId), size: catalogSize(twinId) }
    if (!name.size || !twin.size) continue
    if (name.size.unit !== twin.size.unit) problems.push(`${item.id}: ${name.size.unit} beside ${twin.size.unit}`)

    const kind: Kind =
      twin.size.amount < name.size.amount ? 'smaller' : twin.size.amount > name.size.amount ? 'bigger' : 'same'
    const [nameMetric, twinMetric] = [catalogSize(item.id, 'metric')!, catalogSize(twinId, 'metric')!].map(baseMetricAmount)
    const metricKind: Kind = twinMetric < nameMetric ? 'smaller' : twinMetric > nameMetric ? 'bigger' : 'same'
    if (metricKind !== kind) problems.push(`${item.id}: a ${kind} CG twin is ${metricKind} in metric`)
    counts[kind] += 1

    const twinStickerCheaper = twin.price < name.price
    const expected = { smaller: [true, false], same: [true, true], bigger: [false, true] }[kind]
    if (twinStickerCheaper !== expected[0]) problems.push(`${item.id}: a ${kind} CG twin should be ${expected[0] ? 'cheaper' : 'dearer'} on the sticker`)

    const line = (['us', 'metric'] as Measure[]).map((measure) => {
      const nameSize = catalogSize(item.id, measure)!
      const twinSize = catalogSize(twinId, measure)!
      const twinUnitCheaper = unitPrice(twin.price, twinSize) < unitPrice(name.price, nameSize)
      if (twinUnitCheaper !== expected[1]) problems.push(`${item.id}: a ${kind} CG twin should be ${expected[1] ? 'cheaper' : 'dearer'} per unit in ${measure} units`)

      const nameShown = formatMoney(unitPrice(name.price, nameSize), 'USD')
      const twinShown = formatMoney(unitPrice(twin.price, twinSize), 'USD')
      if (nameShown === twinShown) problems.push(`${item.id}: both tags read ${nameShown} in ${measure} units`)
      return `${formatSize(nameSize).padStart(10)} $${name.price.toFixed(2).padStart(5)} ${nameShown.padStart(7)}   `
        + `CG ${formatSize(twinSize).padStart(10)} $${twin.price.toFixed(2).padStart(5)} ${twinShown.padStart(7)}`
    })
    console.log(`${kind.padEnd(8)} ${item.id.padEnd(24)}${line.join('  |  ')}`)
  }
}

const pairs = counts.smaller + counts.same + counts.bigger
console.log(`\nOf ${pairs} CG twins: ${counts.smaller} smaller, ${counts.same} the same size, ${counts.bigger} bigger.`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
