import { productById, storeBrandIdOf, storeBrandPrice } from './products'
import dryGoodsAisle from './aisles/dry-goods.json'
import cannedAndSaucesAisle from './aisles/canned-and-sauces.json'
import saucesAndCondimentsAisle from './aisles/sauces-and-condiments.json'
import dairyAisle from './aisles/dairy.json'
import frozenFoodsAisle from './aisles/frozen-foods.json'
import bakeryAisle from './aisles/bakery.json'
import produceAisle from './aisles/produce.json'
import meatAisle from './aisles/meat.json'
import seafoodAisle from './aisles/seafood.json'
import beveragesAisle from './aisles/beverages.json'
import snacksAisle from './aisles/snacks.json'
import householdAisle from './aisles/household.json'

export type AisleItem = { id: string; price?: number; sale?: boolean }
export type AisleConfig = { title: string; items: AisleItem[] }

/** One product as it appears on a shelf, priced for the store being shopped. */
export type ShelfItem = {
  id: string
  name: string
  note: string
  image: string
  price: number
  aisleTitle: string
  sale?: boolean
}

// The product catalog lives in the bundle, not the database. PocketBase only
// records which of these a store stocks and what it charges for them.
const catalogAisles = [
  dryGoodsAisle, cannedAndSaucesAisle, saucesAndCondimentsAisle, dairyAisle,
  frozenFoodsAisle, bakeryAisle, produceAisle, meatAisle, seafoodAisle,
  beveragesAisle, snacksAisle, householdAisle,
] as AisleConfig[]

/** The CG twin of one aisle entry, priced off whatever the name brand costs here. */
function storeBrandTwin(item: AisleItem): AisleItem {
  const twin: AisleItem = { id: storeBrandIdOf(item.id) }
  // An aisle may set its own price (dairy does, for milk). When it has, the
  // twin is discounted from that rather than from the catalog price.
  if (item.price !== undefined) twin.price = storeBrandPrice(item.price)
  if (item.sale) twin.sale = true
  return twin
}

/**
 * The shoppable aisles: every product immediately followed by its CG store
 * brand, so the two prices a shopper is choosing between are side by side.
 * Whether a store actually carries either is a separate question — see
 * isStocked() in shop.svelte.ts.
 */
export const aisles: AisleConfig[] = catalogAisles.map((aisle) => ({
  ...aisle,
  items: aisle.items.flatMap((item) => [item, storeBrandTwin(item)]),
}))

/** How many products fit on one shelf unit. */
export const shelfCapacity = 9

// A product's shelf price before any store override: the aisle may set one
// (only milk and its CG twin do today), otherwise the catalog price applies.
const aisleItemById = new Map<string, AisleItem>()
for (const aisle of aisles) for (const item of aisle.items) if (!aisleItemById.has(item.id)) aisleItemById.set(item.id, item)

export function catalogPrice(productId: string) {
  return aisleItemById.get(productId)?.price ?? productById[productId]?.price ?? 0
}

export function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}
