// Lists every name brand beside its CG Value twin with both unit prices, counts
// how many twins are smaller, the same size, and bigger, and fails if a product
// has no size or a twin does not behave like its kind:
//
//   smaller   cheaper on the sticker, dearer per unit
//   same      cheaper on the sticker and per unit
//   bigger    dearer on the sticker, cheaper per unit
//
//   bun run check:sizes

import { aisles, catalogPrice } from '../src/lib/catalog'
import { isStoreBrand, productById, storeBrandIdOf } from '../src/lib/products'
import { catalogSize, formatSize, formatUnitPrice, unitPrice } from '../src/lib/sizes'

type Kind = 'smaller' | 'same' | 'bigger'

const problems: string[] = []
const seen = new Set<string>()
const counts: Record<Kind, number> = { smaller: 0, same: 0, bigger: 0 }

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
    if (name.size.unit !== twin.size.unit) problems.push(`${item.id}: ${name.size.unit} beside ${twin.size.unit}`)

    const kind: Kind =
      twin.size.amount < name.size.amount ? 'smaller' : twin.size.amount > name.size.amount ? 'bigger' : 'same'
    counts[kind] += 1

    const twinUnitCheaper = unitPrice(twin.price, twin.size) < unitPrice(name.price, name.size)
    const twinStickerCheaper = twin.price < name.price
    const expected = { smaller: [true, false], same: [true, true], bigger: [false, true] }[kind]
    if (twinStickerCheaper !== expected[0]) problems.push(`${item.id}: a ${kind} CG twin should be ${expected[0] ? 'cheaper' : 'dearer'} on the sticker`)
    if (twinUnitCheaper !== expected[1]) problems.push(`${item.id}: a ${kind} CG twin should be ${expected[1] ? 'cheaper' : 'dearer'} per unit`)

    const nameShown = formatUnitPrice(unitPrice(name.price, name.size))
    const twinShown = formatUnitPrice(unitPrice(twin.price, twin.size))
    if (nameShown === twinShown) problems.push(`${item.id}: both tags read ${nameShown}`)

    console.log(
      `${kind.padEnd(8)} ${item.id.padEnd(24)}`
      + `${formatSize(name.size).padStart(10)} $${name.price.toFixed(2).padStart(5)} ${nameShown.padStart(7)}   `
      + `CG ${formatSize(twin.size).padStart(10)} $${twin.price.toFixed(2).padStart(5)} ${twinShown.padStart(7)}`,
    )
  }
}

const pairs = counts.smaller + counts.same + counts.bigger
console.log(`\nOf ${pairs} CG twins: ${counts.smaller} smaller, ${counts.same} the same size, ${counts.bigger} bigger.`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
