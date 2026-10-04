// Lists every name brand beside its CG Value twin with both unit prices, and
// fails if a product has no size or a CG twin is not plainly better or worse.
//
//   bun run check:sizes

import { aisles, catalogPrice } from '../src/lib/catalog'
import { isStoreBrand, productById, storeBrandIdOf } from '../src/lib/products'
import { catalogSize, formatSize, formatUnitPrice, unitPrice } from '../src/lib/sizes'

const problems: string[] = []
const seen = new Set<string>()
let cheaperButWorse = 0
let pairs = 0

for (const aisle of aisles) {
  for (const item of aisle.items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    if (!catalogSize(item.id)) problems.push(`${item.id} has no size`)
    if (isStoreBrand(item.id) || !productById[storeBrandIdOf(item.id)]) continue

    const twinId = storeBrandIdOf(item.id)
    const name = { price: catalogPrice(item.id), size: catalogSize(item.id) }
    const twin = { price: catalogPrice(twinId), size: catalogSize(twinId) }
    if (!name.size || !twin.size) continue
    pairs += 1

    const nameShown = formatUnitPrice(unitPrice(name.price, name.size))
    const twinShown = formatUnitPrice(unitPrice(twin.price, twin.size))
    const twinWorse = unitPrice(twin.price, twin.size) > unitPrice(name.price, name.size)
    if (twinWorse) cheaperButWorse += 1
    if (nameShown === twinShown) problems.push(`${item.id}: both tags read ${nameShown}`)

    console.log(
      `${twinWorse ? 'CG worse ' : 'CG better'}  ${item.id.padEnd(24)}`
      + `${formatSize(name.size).padStart(10)} $${name.price.toFixed(2)} ${nameShown.padStart(7)}   `
      + `CG ${formatSize(twin.size).padStart(10)} $${twin.price.toFixed(2)} ${twinShown.padStart(7)}`,
    )
  }
}

console.log(`\n${cheaperButWorse} of ${pairs} CG twins cost more per unit than the name brand.`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
