// The list of things to draw.
//
// The catalog itself is the app's own src/lib/products.ts — imported rather than
// copied, so a product added to the shop is a product this pipeline draws, with
// no second list to keep in step. (Run the generator with `bun`, which imports
// TypeScript directly.)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isStoreBrand, products } from '../../src/lib/products.ts'
import { isPackagedProduct } from '../../src/lib/unbranded.ts'

const here = join(import.meta.dirname)

/** Which aisle each product sits in, for the drawing brief. */
function aisleOf() {
  const aisles = [
    'dry-goods', 'canned-and-sauces', 'sauces-and-condiments', 'dairy',
    'frozen-foods', 'bakery', 'produce', 'meat', 'seafood', 'beverages',
    'snacks', 'household',
  ]
  const byProduct = {}
  for (const file of aisles) {
    const aisle = JSON.parse(readFileSync(join(here, '../../src/lib/aisles', `${file}.json`), 'utf8'))
    for (const item of aisle.items) {
      if (!byProduct[item.id]) byProduct[item.id] = aisle.title
    }
  }
  return byProduct
}

/** Package formats the planning pass may choose from. */
export const forms = [
  'tin can', 'glass jar', 'glass bottle', 'squeeze bottle', 'screw-top plastic bottle',
  'plastic jug', 'gable-top carton', 'brick carton', 'cardboard box', 'printed bag',
  'stand-up pouch', 'plastic tub', 'foam tray under film', 'bread bag', 'cardboard canister',
  'egg carton', 'wrapped block', 'multipack shrink-wrap', 'squeeze tube', 'shaker jar',
  'blister tray in a sleeve', 'aerosol can',
]

/**
 * Every name brand in the shop, with what the drawing brief needs: whether it is
 * packaged at all, and — once the planning pass has run — which package format
 * it takes.
 */
export function catalog() {
  const aisles = aisleOf()
  let plan = {}
  try {
    plan = JSON.parse(readFileSync(join(here, 'forms.json'), 'utf8'))
  } catch {
    // The planning pass has not run yet; the drawing pass will say so.
  }

  return products
    .filter((product) => !isStoreBrand(product.id))
    .map((product) => ({
      id: product.id,
      name: product.name,
      note: product.note,
      aisle: aisles[product.id] ?? 'Grocery',
      packaged: isPackagedProduct(product.id),
      form: plan[product.id]?.form ?? null,
      motif: plan[product.id]?.motif ?? null,
    }))
}
