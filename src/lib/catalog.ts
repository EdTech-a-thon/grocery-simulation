import { productById } from './products'
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
export const aisles = [
  dryGoodsAisle, cannedAndSaucesAisle, saucesAndCondimentsAisle, dairyAisle,
  frozenFoodsAisle, bakeryAisle, produceAisle, meatAisle, seafoodAisle,
  beveragesAisle, snacksAisle, householdAisle,
] as AisleConfig[]

/** How many products fit on one shelf unit. */
export const shelfCapacity = 9

// A product's shelf price before any store override: the aisle may set one
// (only milk does today), otherwise the catalog price applies.
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
